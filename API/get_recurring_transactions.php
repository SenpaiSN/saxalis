<?php
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

try {
  $uid = current_user_id();
  $stmt = $pdo->prepare("SELECT * FROM recurring_transactions WHERE user_id = :uid ORDER BY id DESC");
  $stmt->execute([':uid' => $uid]);
  $plans = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode(['success' => true, 'plans' => $plans]);
} catch (PDOException $e) {
  error_log('get_recurring_transactions.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
