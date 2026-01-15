<?php
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

$uid = current_user_id();
try {
  $stmt = $pdo->prepare("SELECT * FROM goal_plans WHERE user_id = :uid AND active = 1");
  $stmt->execute([':uid' => $uid]);
  $plans = $stmt->fetchAll(PDO::FETCH_ASSOC);
  echo json_encode(['success' => true, 'plans' => $plans]);
} catch (PDOException $e) {
  error_log('get_goal_plans.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}