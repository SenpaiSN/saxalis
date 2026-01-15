<?php
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents('php://input'), true);
$id_category = isset($data['id_category']) ? (int)$data['id_category'] : 0;
$name = isset($data['name']) ? trim($data['name']) : '';
$new_id_type = isset($data['id_type']) ? (int)$data['id_type'] : null;

if ($id_category <= 0 || $name === '') {
  http_response_code(400);
  echo json_encode(['success'=>false,'error'=>'Champs manquants']);
  exit;
}

try {
  // ensure category exists
  $stmt = $pdo->prepare('SELECT id_type FROM categories WHERE id_category = ? LIMIT 1');
  $stmt->execute([$id_category]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$row) {
    http_response_code(404);
    echo json_encode(['success'=>false,'error'=>'Catégorie introuvable']);
    exit;
  }

  $target_type = $row['id_type'];
  if ($new_id_type !== null && $new_id_type > 0) {
    // verify requested id_type exists
    $chk = $pdo->prepare('SELECT COUNT(1) FROM transaction_types WHERE id_type = ?');
    $chk->execute([$new_id_type]);
    if ((int)$chk->fetchColumn() === 0) {
      http_response_code(400);
      echo json_encode(['success'=>false,'error'=>'id_type invalide']);
      exit;
    }
    $target_type = $new_id_type;
  }

  // Check duplicate name within target type (exclude current)
  $dup = $pdo->prepare('SELECT id_category FROM categories WHERE id_type = ? AND name = ? AND id_category != ?');
  $dup->execute([$target_type, $name, $id_category]);
  if ($dup->fetch()) {
    echo json_encode(['success'=>false,'error'=>'Catégorie déjà existante']);
    exit;
  }

  $manual_budget = array_key_exists('manual_budget', $data) ? (is_numeric($data['manual_budget']) ? (float)$data['manual_budget'] : null) : null;

  $stmt = $pdo->prepare('UPDATE categories SET name = ?, id_type = ?, manual_budget = ? WHERE id_category = ?');
  $stmt->execute([$name, $target_type, $manual_budget, $id_category]);

  echo json_encode(['success'=>true]);
} catch (PDOException $e) {
  error_log('update_category.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success'=>false,'error'=>'Erreur serveur']);
}
