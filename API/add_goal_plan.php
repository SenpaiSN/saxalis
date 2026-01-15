<?php
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents('php://input'), true);
$goal_id = isset($data['goal_id']) ? (int)$data['goal_id'] : 0;
$type = $data['type'] ?? null; // monthly|percent|round_up
$amount = isset($data['amount']) ? (float)$data['amount'] : null;
$percent = isset($data['percent']) ? (float)$data['percent'] : null;
$schedule_day = isset($data['schedule_day']) ? (int)$data['schedule_day'] : 1;

if (!$goal_id || !$type) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => 'Paramètres manquants']);
  exit;
}

$uid = current_user_id();
try {
  // ownership check against objectif_crees
  $c = $pdo->prepare("SELECT user_id FROM objectif_crees WHERE id_objectif = :id LIMIT 1");
  $c->execute([':id' => $goal_id]);
  $owner = $c->fetch(PDO::FETCH_ASSOC);
  if (!$owner || (int)$owner['user_id'] !== $uid) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès refusé']);
    exit;
  }

  $stmt = $pdo->prepare("INSERT INTO goal_plans (goal_id, user_id, type, amount, percent, schedule_day) VALUES (:goal_id, :uid, :type, :amount, :percent, :sd)");
  $stmt->execute([':goal_id' => $goal_id, ':uid' => $uid, ':type' => $type, ':amount' => $amount, ':percent' => $percent, ':sd' => $schedule_day]);

  echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
} catch (PDOException $e) {
  error_log('add_goal_plan.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
