<?php
require 'config.php';
require 'auth.php';
require 'security.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents('php://input'), true);

// CSRF Token verification
try {
  verify_csrf_token();
} catch (Exception $e) {
  http_response_code(403);
  echo json_encode(['success'=>false,'error'=>'CSRF token invalid or missing']);
  exit;
}

// Validate inputs
try {
  if (!isset($data['id_transaction'], $data['Date'], $data['Type'], $data['Montant'])) {
    throw new ValidationException('Champs manquants: id_transaction, Date, Type, Montant');
  }
  
  $id_transaction = validate_int($data['id_transaction'], 'id_transaction');
  $date = validate_date($data['Date']);
  $type = validate_string($data['Type'], 'Type', 1, 50);
  $montant = validate_float($data['Montant'], 'Montant');
  $category_name = isset($data['Catégorie']) ? validate_string($data['Catégorie'], 'Catégorie', 0, 100, true) : '';
  $subcategory_name = isset($data['Sous-catégorie']) ? validate_string($data['Sous-catégorie'], 'Sous-catégorie', 0, 100, true) : '';
  $notes = isset($data['Notes']) ? validate_string($data['Notes'], 'Notes', 0, 1000, true) : '';
} catch (ValidationException $e) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
  exit;
}

try {
  // verify ownership and fetch previous transaction state
  $uid = current_user_id();
  $check = $pdo->prepare("SELECT id_utilisateur, subcategory_id, category_id, Montant FROM transactions WHERE id_transaction = :id LIMIT 1");
  $check->execute([':id' => $id_transaction]);
  $owner = $check->fetch(PDO::FETCH_ASSOC);
  if (!$owner) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Transaction introuvable']);
    exit;
  }
  if ((int)$owner['id_utilisateur'] !== $uid) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès refusé']);
    exit;
  }

  $previous_subcat = $owner['subcategory_id'] ?? null;
  $previous_cat = $owner['category_id'] ?? null;

  // Compute Montant_eur if currency provided
  $currency = validate_currency($data['currency'] ?? 'EUR', ['EUR', 'XOF']);
  $amount = abs($montant);
  $amount_eur = null;
  if ($currency === 'EUR') {
    $amount_eur = $amount;
  } else {
    $rate = get_conversion_rate($currency, 'EUR');
    if ($rate !== null) {
      $amount_eur = round($amount * $rate, 2);
    } else {
      $amount_eur = $amount;
    }
  }

  // Resolve category_id / subcategory_id when the client provided names instead of IDs
  $catId = null;
  if (isset($data['category_id']) && $data['category_id'] !== '') {
    $catId = validate_int($data['category_id'], 'category_id', true);
  } elseif (!empty($category_name)) {
    $stmtC = $pdo->prepare("SELECT id_category FROM categories WHERE name = :name LIMIT 1");
    $stmtC->execute([':name' => $category_name]);
    $catFound = $stmtC->fetchColumn();
    if ($catFound) $catId = (int)$catFound;
  }

  $subcatId = null;
  if (isset($data['subcategory_id']) && $data['subcategory_id'] !== '') {
    $subcatId = validate_int($data['subcategory_id'], 'subcategory_id', true);
  } elseif (!empty($subcategory_name)) {
    // prefer matching subcategory within the resolved category if possible
    if ($catId) {
      $stmtS = $pdo->prepare("SELECT id_subcategory FROM subcategories WHERE name = :name AND category_id = :cid LIMIT 1");
      $stmtS->execute([':name' => $subcategory_name, ':cid' => $catId]);
      $sFound = $stmtS->fetchColumn();
      if ($sFound) $subcatId = (int)$sFound;
    }
    if (!$subcatId) {
      $stmtS2 = $pdo->prepare("SELECT id_subcategory FROM subcategories WHERE name = :name LIMIT 1");
      $stmtS2->execute([':name' => $subcategory_name]);
      $sFound2 = $stmtS2->fetchColumn();
      if ($sFound2) $subcatId = (int)$sFound2;
    }
  }

  // Normalize Date/Time input (accept date or datetime). Interpret naive client dates as Europe/Paris and store as UTC.
  $rawDate = trim($date);
  if ($rawDate === '') {
    $dateTime = (new DateTime('now', new DateTimeZone('UTC')))->format('Y-m-d H:i:s');
  } else {
    $rawDate = str_replace('T', ' ', $rawDate);
    // Try strict Y-m-d H:i:s first assuming Europe/Paris
    $dt = DateTime::createFromFormat('Y-m-d H:i:s', $rawDate, new DateTimeZone('Europe/Paris'));
    if ($dt === false) {
      // Fallback to flexible parse but still assume Europe/Paris
      try {
        $dt = new DateTime($rawDate, new DateTimeZone('Europe/Paris'));
      } catch (Exception $e) {
        $dt = new DateTime('now', new DateTimeZone('UTC'));
      }
    }
    $dt->setTimezone(new DateTimeZone('UTC'));
    $dateTime = $dt->format('Y-m-d H:i:s');
  }

  // Prepare UPDATE: include category_id / subcategory_id when resolved
  $updateSql = "UPDATE transactions SET
    `Date`           = :date,
    `Type`           = :type,
    `Catégorie`      = :cat,
    `Sous-catégorie` = :subcat,
    `Montant`        = :mnt,
    `Montant_eur`    = :mnt_eur,
    `currency`       = :currency,
    `Notes`          = :notes";
  if ($catId !== null) $updateSql .= ", category_id = :cat_id";
  if ($subcatId !== null) $updateSql .= ", subcategory_id = :subcat_id";
  // ensure update only affects the current user's transaction as a defensive check
  $updateSql .= " WHERE id_transaction = :id AND id_utilisateur = :uid";

  $params = [
    ':date'   => $dateTime,
    ':type'   => $type,                // validated and sanitized
    ':cat'    => $category_name,        // validated and sanitized
    ':subcat' => $subcategory_name,     // validated and sanitized
    ':mnt'    => $amount,               // validated float
    ':mnt_eur'=> $amount_eur,
    ':currency'=> $currency,            // validated
    ':notes'  => $notes,                // validated and sanitized
    ':id'     => $id_transaction,       // validated int
    ':uid'    => $uid
  ];
  if ($catId !== null) $params[':cat_id'] = $catId;
  if ($subcatId !== null) $params[':subcat_id'] = $subcatId;

  $stmt = $pdo->prepare($updateSql);
  $stmt->execute($params);

  // After update, check objectives for affected subcategories (previous and current)
  $affected = [];
  if ($previous_subcat) $affected[] = (int)$previous_subcat;
  if ($subcatId) $affected[] = (int)$subcatId;
  $affected = array_values(array_unique($affected));

  try {
    foreach ($affected as $affSubcat) {
      // Determine if we should check this subcategory for created objectives
      $uid = current_user_id();
      $chk = $pdo->prepare("SELECT id_objectif FROM objectif_crees WHERE id_subcategory = :subcat AND user_id = :uid LIMIT 1");
      $chk->execute([':subcat' => $affSubcat, ':uid' => $uid]);
      $found = $chk->fetchColumn();
      if (!$found) continue;

      $pdo->beginTransaction();
      $objStmt = $pdo->prepare("SELECT id_objectif, user_id, id_subcategory, montant, date_depot FROM objectif_crees WHERE user_id = :uid AND id_subcategory = :subcat");
      $objStmt->execute([':uid' => $uid, ':subcat' => $affSubcat]);
      $objectifs = $objStmt->fetchAll(PDO::FETCH_ASSOC);

      foreach ($objectifs as $o) {
        $sumStmt = $pdo->prepare("SELECT COALESCE(SUM(Montant), 0) AS total, MAX(`Date`) AS date_atteint, COUNT(id_transaction) AS nb FROM transactions WHERE subcategory_id = :subcat AND id_utilisateur = :uid");
        $sumStmt->execute([':subcat' => $affSubcat, ':uid' => $uid]);
        $res = $sumStmt->fetch(PDO::FETCH_ASSOC);
        $totalCollected = (float)$res['total'];

        if ($totalCollected >= (float)$o['montant']) {
          $existsStmt = $pdo->prepare("SELECT COUNT(1) FROM objectif_atteints WHERE id_objectif = :idobj");
          $existsStmt->execute([':idobj' => $o['id_objectif']]);
          $already = (int)$existsStmt->fetchColumn();
          if ($already === 0) {
            $nameStmt = $pdo->prepare("SELECT name FROM subcategories WHERE id_subcategory = :subcat LIMIT 1");
            $nameStmt->execute([':subcat' => $affSubcat]);
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

            $del = $pdo->prepare("DELETE FROM objectif_crees WHERE id_objectif = :idobj");
            $del->execute([':idobj' => $o['id_objectif']]);

            error_log("Objectif atteint déplacé après update: id_objectif={$o['id_objectif']} subcategory={$affSubcat} total={$totalCollected}");
          }
        }
      }

      $pdo->commit();
    }
  } catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('post-update objectif check error: ' . $e->getMessage());
  }

  echo json_encode(['success' => true]);
} catch (PDOException $e) {
  error_log('update_transaction.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
