<?php
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents('php://input'), true);
$nom = trim($data['nom'] ?? '');
$montant_objectif = isset($data['montant_objectif']) ? (float)$data['montant_objectif'] : 0.0;
$type_id = isset($data['type_id']) ? (int)$data['type_id'] : null;
$date_cible = $data['date_cible'] ?: null;
// Accept an 'automatique' flag (0|1) for future auto-savings plans
$automatique = isset($data['automatique']) && ($data['automatique'] == '1' || $data['automatique'] === true) ? 1 : 0;

if ($nom === '' || $montant_objectif <= 0) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => 'Paramètres invalides']);
  exit;
}

try {
  // Ensure there is a 'Objectif' category (handle non-AUTO_INCREMENT schemas too)
  $catStmt = $pdo->prepare("SELECT id_category FROM categories WHERE LOWER(name) = 'objectif' LIMIT 1");
  $catStmt->execute();
  $catId = $catStmt->fetchColumn();
  if (!$catId) {
    // Some dumps don't have AUTO_INCREMENT set on id_category — compute a new id and insert explicitly
    $newCatId = $pdo->query("SELECT COALESCE(MAX(id_category), 0) + 1 FROM categories")->fetchColumn();
    $insCat = $pdo->prepare("INSERT INTO categories (id_category, id_type, name, created_at) VALUES (:id, 3, 'Objectif', NOW())");
    $insCat->execute([':id' => $newCatId]);
    $catId = $newCatId;
  }

  // Re-use an existing subcategory if it already exists (avoid duplicates), otherwise create one
  $subCheck = $pdo->prepare("SELECT id_subcategory FROM subcategories WHERE category_id = :catId AND LOWER(name) = LOWER(:name) LIMIT 1");
  $subCheck->execute([':catId' => $catId, ':name' => $nom]);
  $subId = $subCheck->fetchColumn();
  if (!$subId) {
    // Some schemas lack AUTO_INCREMENT on id_subcategory — compute explicit id
    $newSubId = $pdo->query("SELECT COALESCE(MAX(id_subcategory), 0) + 1 FROM subcategories")->fetchColumn();
    $insSub = $pdo->prepare("INSERT INTO subcategories (id_subcategory, category_id, name, created_at) VALUES (:id, :catId, :name, NOW())");
    $insSub->execute([':id' => $newSubId, ':catId' => $catId, ':name' => $nom]);
    $subId = $newSubId;
  }

  // Insert into objectif_crees (respect the automatique flag)
  // Convert montant_objectif to canonical XOF before insertion (use user's currency)
  try {
    $uid = current_user_id();
    $curStmt = $pdo->prepare("SELECT currency FROM users WHERE id = :uid LIMIT 1");
    $curStmt->execute([':uid' => $uid]);
    $userCurrency = strtoupper(trim($curStmt->fetchColumn() ?? 'EUR'));
    if ($userCurrency !== 'XOF') {
      $rate = get_conversion_rate($userCurrency, 'XOF');
      if ($rate !== null) {
        $montant_objectif = round($montant_objectif * $rate, 2);
      }
    }
  } catch (Exception $e) { error_log('add_goal.php: currency conversion failed: ' . $e->getMessage()); }

  // Some schemas have no AUTO_INCREMENT on id_objectif; compute an explicit id and insert it to ensure the row is created
  $newObjId = $pdo->query("SELECT COALESCE(MAX(id_objectif), 0) + 1 FROM objectif_crees")->fetchColumn();
  $insObj = $pdo->prepare("INSERT INTO objectif_crees (id_objectif, user_id, id_subcategory, montant, date_depot, automatique) VALUES (:id, :uid, :subId, :montant, NOW(), :automatique)");
  $insObj->execute([':id' => $newObjId, ':uid' => $uid, ':subId' => $subId, ':montant' => $montant_objectif, ':automatique' => $automatique]);

  $newId = $newObjId;

  // Return the created goal row (same shape as get_objectifs_crees)
  $select = $pdo->prepare("\n    SELECT\n      o.id_objectif,\n      o.user_id,\n      o.id_subcategory,\n      s.name,\n      o.montant AS montant_objectif,\n      DATE(o.date_depot) AS date_creation,\n      COALESCE(SUM(t.Montant), 0) AS total_collected,\n      ROUND(LEAST(100, COALESCE(SUM(t.Montant), 0) / o.montant * 100), 2) AS progress_pct,\n      COUNT(t.id_transaction) AS nb_versements\n    FROM objectif_crees o\n    LEFT JOIN subcategories s ON s.id_subcategory = o.id_subcategory\n    LEFT JOIN transactions t ON t.subcategory_id = o.id_subcategory AND t.id_utilisateur = o.user_id\n    WHERE o.id_objectif = :id\n    GROUP BY o.id_objectif\n  ");
  $select->execute([':id' => $newId]);
  $goal = $select->fetch(PDO::FETCH_ASSOC);

  echo json_encode(['success'=>true,'goal'=>$goal]);
} catch (PDOException $e) {
  error_log('add_goal.php PDOException: ' . $e->getMessage());
  error_log('add_goal.php payload: ' . json_encode($data));
  http_response_code(500);
  echo json_encode(['success'=>false,'error'=>'Erreur serveur']);
}
