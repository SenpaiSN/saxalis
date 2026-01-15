<?php
// api/add_transaction.php

// 1) CORS + JSON
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin) {
  // allow the specific origin when present (required when using credentials)
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Access-Control-Allow-Credentials: true');
} else {
  header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization');
header('Access-Control-Max-Age: 86400');
header('Content-Type: application/json; charset=utf-8');

// Handle CORS preflight quickly and exit
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

require 'config.php';
require 'auth.php';
require 'security.php';
require_auth();

// 3) Récupération du JSON
$data = json_decode(file_get_contents('php://input'), true);

// 3.5) CSRF Token verification
try {
  verify_csrf_token();
} catch (Exception $e) {
  http_response_code(403);
  echo json_encode(['success'=>false,'error'=>'CSRF token invalid or missing']);
  exit;
}

// 4) Validation stricte du payload avec fonctions de security.php
try {
  if (!isset($data['Date'], $data['Type'], $data['id_type'], $data['category_id'], $data['Montant'])) {
    throw new ValidationException('Champs manquants: Date, Type, id_type, category_id, Montant');
  }
  
  // Validate each field
  $date = validate_date($data['Date']);
  $type = validate_string($data['Type'], 'Type', 1, 50);
  $id_type = validate_int($data['id_type'], 'id_type');
  $category_id = validate_int($data['category_id'], 'category_id');
  $montant = validate_float($data['Montant'], 'Montant');
  $subcategory_id = isset($data['subcategory_id']) ? validate_int($data['subcategory_id'], 'subcategory_id', true) : null;
  $notes = isset($data['Notes']) ? validate_string($data['Notes'], 'Notes', 0, 1000, true) : '';
} catch (ValidationException $e) {
  http_response_code(400);
  echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
  exit;
}

// 4.5) Gestion de la devise optionnelle et calcul du Montant_eur
$currency = validate_currency($data['currency'] ?? 'EUR', ['EUR', 'XOF']);

// prepare subcategory id (nullable): keep NULL when not provided or empty
$subcatId = $subcategory_id;
$amount = abs($montant);
$amount_eur = null;
if ($currency === 'EUR') {
  $amount_eur = $amount;
} else {
  $rate = get_conversion_rate($currency, 'EUR');
  if ($rate !== null) {
    // si montant en XOF par exemple, convertir en EUR pour Montant_eur
    $amount_eur = round($amount * $rate, 2);
  } else {
    // inconnue -> considérer comme EUR
    $amount_eur = $amount;
  }
}

// Normalize Date/Time: accept 'YYYY-MM-DD', 'YYYY-MM-DDTHH:MM', 'YYYY-MM-DD HH:MM:SS', or omit
// Interpret incoming naive datetimes as in the user's locale (Europe/Paris) and store as UTC.
$rawDate = trim($date);
if ($rawDate === '') {
  // default to now in UTC
  $dateTime = (new DateTime('now', new DateTimeZone('UTC')))->format('Y-m-d H:i:s');
} else {
  // normalize T separator -> space
  $rawDate = str_replace('T', ' ', $rawDate);

  // Try strict parse in expected format first
  $dt = DateTime::createFromFormat('Y-m-d H:i:s', $rawDate, new DateTimeZone('Europe/Paris'));
  if (!$dt) {
    // Fallback to flexible parse but still assume Europe/Paris
    try {
      $dt = new DateTime($rawDate, new DateTimeZone('Europe/Paris'));
    } catch (Exception $e) {
      $dt = null;
    }
  }

  if (!$dt) {
    // fallback to server now in UTC
    $dateTime = (new DateTime('now', new DateTimeZone('UTC')))->format('Y-m-d H:i:s');
  } else {
    // convert to UTC for storage
    $dt->setTimezone(new DateTimeZone('UTC'));
    $dateTime = $dt->format('Y-m-d H:i:s');
  }
}

// Validate id_type: if client sent an invalid id, try to resolve it from the provided Type string (robust fallback)
$idType = $id_type;
$providedTypeCode = $type;
try {
  if ($idType <= 0) {
    // try to resolve using code
    $codeStmt = $pdo->prepare("SELECT id_type FROM transaction_types WHERE LOWER(code) = LOWER(:code) LIMIT 1");
    $codeStmt->execute([':code' => $providedTypeCode]);
    $found = $codeStmt->fetchColumn();
    if ($found) $idType = (int)$found;
  } else {
    // ensure it exists
    $chk = $pdo->prepare("SELECT COUNT(1) FROM transaction_types WHERE id_type = :id");
    $chk->execute([':id' => $idType]);
    $c = (int)$chk->fetchColumn();
    if ($c === 0) {
      $codeStmt = $pdo->prepare("SELECT id_type FROM transaction_types WHERE LOWER(code) = LOWER(:code) LIMIT 1");
      $codeStmt->execute([':code' => $providedTypeCode]);
      $found = $codeStmt->fetchColumn();
      if ($found) $idType = (int)$found;
    }
  }
} catch (Exception $e) {
  // ignore and keep original idType
}

// 5) Préparation de l'INSERT (ajout des champs currency et Montant_eur)
$stmt = $pdo->prepare("
  INSERT INTO transactions
    (id_utilisateur, id_type, `Date`, `Type`,
     category_id, subcategory_id,
     Montant, Montant_eur, currency, Notes)
  VALUES
    (:uid, :idType, :date, :type,
     :catId, :subcatId,
     :amount, :amount_eur, :currency, :notes)
");

// 6) Exécution avec les bons types
try {
  $stmt->execute([
    ':uid'         => current_user_id(),
    ':idType'      => $idType,
    ':date'        => $dateTime,                 // format 'YYYY-MM-DD HH:MM:SS'
    ':type'        => $type,                     // validated and sanitized
    ':catId'       => $category_id,              // validated
    ':subcatId'    => $subcatId,
    ':amount'      => $amount,                   // validated float
    ':amount_eur'  => $amount_eur,
    ':currency'    => $currency,                 // validated
    ':notes'       => $notes                     // validated and sanitized
  ]);

  // 7) On renvoie l’ID créé
  $insertedId = (int)$pdo->lastInsertId();

  // 7.5) Auto-detection: si c'est un dépôt d'objectif (id_type = 3) et qu'il y a une sous-catégorie
  if ($idType === 3 && $subcatId !== null) {
    try {
      $uid = current_user_id();
      $pdo->beginTransaction();

      // Récupérer tous les objectifs créés correspondant à cet utilisateur + sous-catégorie
      $objStmt = $pdo->prepare("SELECT id_objectif, user_id, id_subcategory, montant, date_depot FROM objectif_crees WHERE user_id = :uid AND id_subcategory = :subcat");
      $objStmt->execute([':uid' => $uid, ':subcat' => $subcatId]);
      $objectifs = $objStmt->fetchAll(PDO::FETCH_ASSOC);

      foreach ($objectifs as $o) {
        // calculer le total des versements pour cette sous-catégorie
        $sumStmt = $pdo->prepare("SELECT COALESCE(SUM(Montant), 0) AS total, MAX(`Date`) AS date_atteint, COUNT(id_transaction) AS nb FROM transactions WHERE id_type = 3 AND subcategory_id = :subcat AND id_utilisateur = :uid");
        $sumStmt->execute([':subcat' => $subcatId, ':uid' => $uid]);
        $res = $sumStmt->fetch(PDO::FETCH_ASSOC);
        $totalCollected = (float)$res['total'];

        if ($totalCollected >= (float)$o['montant']) {
          // vérifier si l'objectif n'a pas déjà été déplacé
          $existsStmt = $pdo->prepare("SELECT COUNT(1) FROM objectif_atteints WHERE id_objectif = :idobj");
          $existsStmt->execute([':idobj' => $o['id_objectif']]);
          $already = (int)$existsStmt->fetchColumn();
          if ($already === 0) {
            // récupérer le nom de la sous-catégorie
            $nameStmt = $pdo->prepare("SELECT name FROM subcategories WHERE id_subcategory = :subcat LIMIT 1");
            $nameStmt->execute([':subcat' => $subcatId]);
            $subName = $nameStmt->fetchColumn();

            $progressPct = $o['montant'] > 0 ? round(min(100, $totalCollected / (float)$o['montant'] * 100), 2) : 100.0;

            $ins = $pdo->prepare("INSERT INTO objectif_atteints (id_objectif, user_id, id_subcategory, name, montant_objectif, date_creation, date_atteint, total_collected, progress_pct, nb_versements) VALUES (:id_objectif, :user_id, :id_subcategory, :name, :montant_objectif, :date_creation, :date_atteint, :total_collected, :progress_pct, :nb_versements)");
            $ins->execute([
              ':id_objectif' => $o['id_objectif'],
              ':user_id' => $o['user_id'],
              ':id_subcategory' => $o['id_subcategory'],
              ':name' => $subName,
              ':montant_objectif' => $o['montant'],
              ':date_creation' => $o['date_depot'],
              ':date_atteint' => $res['date_atteint'],
              ':total_collected' => $totalCollected,
              ':progress_pct' => $progressPct,
              ':nb_versements' => (int)$res['nb']
            ]);

            // supprimer l'objectif déplacé
            $del = $pdo->prepare("DELETE FROM objectif_crees WHERE id_objectif = :idobj");
            $del->execute([':idobj' => $o['id_objectif']]);

            // optionnel: log
            error_log("Objectif atteint déplacé: id_objectif={$o['id_objectif']} subcategory={$subcatId} total={$totalCollected}");
          }
        }
      }

      $pdo->commit();
    } catch (Exception $e) {
      // rollback si pb, mais ne pas faire échouer l'insert de transaction
      if ($pdo->inTransaction()) {
        $pdo->rollBack();
      }
      error_log("auto-detect objectif error: " . $e->getMessage());
    }
  }

  echo json_encode([
    'success'        => true,
    'id_transaction' => $insertedId
  ]);

} catch (PDOException $e) {
  // 8) Gestion des erreurs SQL (debug temporaire)
  error_log("add_transaction error: " . $e->getMessage());
  http_response_code(500);
  echo json_encode([
    'success' => false,
    'error'   => 'Erreur serveur, réessayez plus tard',
    'debug'   => $e->getMessage()
  ]);
}
