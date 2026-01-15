<?php
header('Content-Type: application/json; charset=utf-8');
require 'config.php';
require 'auth.php';
require 'security.php';
require_auth();
verify_csrf_token();

$uid = current_user_id();
try {
  $stmt = $pdo->prepare("DELETE FROM transactions WHERE id_utilisateur = :uid");
  $stmt->execute([':uid' => $uid]);
  echo json_encode(['success' => true]);
} catch (PDOException $e) {
  error_log('delete_all_transactions.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
