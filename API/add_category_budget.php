<?php
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents('php://input'), true);
foreach (['category_id','year','month','amount'] as $f) {
    if (!isset($data[$f]) || !is_numeric($data[$f])) {
        http_response_code(400);
        exit(json_encode(['success'=>false,'error'=>"Champ $f manquant ou invalide"]));
    }
}

$userId     = current_user_id();
$catId      = (int) $data['category_id'];
$subcatId   = isset($data['subcategory_id']) ? (int)$data['subcategory_id'] : null;
$year       = (int) $data['year'];
$month      = (int) $data['month'];
$amount     = (float) $data['amount'];

$sql = "
  INSERT INTO `category_budgets`
    (`user_id`,`category_id`,`subcategory_id`,`year`,`month`,`amount`)
  VALUES
    (:uid,:cid,:scid,:yr,:mo,:amt)
  ON DUPLICATE KEY UPDATE
    `amount`     = VALUES(`amount`),
    `updated_at` = NOW()
";

try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':uid'  => $userId,
        ':cid'  => $catId,
        ':scid' => $subcatId,
        ':yr'   => $year,
        ':mo'   => $month,
        ':amt'  => $amount
    ]);
    // Récupérer l’ID de la ligne affectée (insert ou update)
    $newId = isset($newId)
           ? $newId
           : $pdo->lastInsertId();
    echo json_encode(['success'=>true,'id_budget_cat'=>$newId]);
} catch (PDOException $e) {
    error_log("add_category_budget SQL Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success'=>false,'error'=>'Erreur base de données']);
}
