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
  if (!isset($data['id_type'], $data['name'])) {
    throw new ValidationException('id_type and name are required');
  }
  
  $id_type = validate_int($data['id_type'], 'id_type');
  $name = validate_string($data['name'], 'name', 1, 100);
  $manual_budget = isset($data['manual_budget']) ? validate_float($data['manual_budget'], 'manual_budget', true) : null;
} catch (ValidationException $e) {
  http_response_code(400);
  echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
  exit;
}

try {
  // Vérifier doublon
  $stmt = $pdo->prepare('SELECT id_category FROM categories WHERE id_type = ? AND name = ?');
  $stmt->execute([$id_type, $name]);
  if ($stmt->fetch()) {
    echo json_encode(['success'=>false,'error'=>'Catégorie déjà existante']);
    exit;
  }

  $stmt = $pdo->prepare('INSERT INTO categories (id_type, name, manual_budget) VALUES (?, ?, ?)');
  $stmt->execute([$id_type, $name, $manual_budget]);
  echo json_encode(['success'=>true,'id'=>$pdo->lastInsertId()]);
} catch (PDOException $e) {
  error_log('add_category.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success'=>false,'error'=>'Erreur serveur']);
}

?>
