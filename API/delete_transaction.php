<?php
header('Content-Type: application/json; charset=utf-8');
require 'config.php';
require 'auth.php';
require 'security.php';
require_auth();

$data = json_decode(file_get_contents('php://input'), true);

// CSRF Token verification
try {
  verify_csrf_token();
} catch (Exception $e) {
  http_response_code(403);
  echo json_encode(['success'=>false,'error'=>'CSRF token invalid or missing']);
  exit;
}

// Validate input
try {
  if (!isset($data['id_transaction'])) {
    throw new ValidationException('id_transaction is required');
  }
  $id_transaction = validate_int($data['id_transaction'], 'id_transaction');
} catch (ValidationException $e) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
  exit;
}

try {
  // ownership check
  $uid = current_user_id();
  $check = $pdo->prepare("SELECT id_utilisateur FROM transactions WHERE id_transaction = :id LIMIT 1");
  $check->execute([':id' => $id_transaction]);
  $row = $check->fetch(PDO::FETCH_ASSOC);
  if (!$row) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Transaction introuvable']);
    exit;
  }
  if ((int)$row['id_utilisateur'] !== $uid) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès refusé']);
    exit;
  }

  // perform delete with ownership enforced to avoid race conditions
  $stmt = $pdo->prepare("DELETE FROM transactions WHERE id_transaction = :id AND id_utilisateur = :uid");
  $stmt->execute([':id' => $id_transaction, ':uid' => $uid]);
  echo json_encode(['success' => true]);
} catch (PDOException $e) {
  error_log('delete_transaction.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
