<?php
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents('php://input'), true);
$id = isset($data['id']) ? (int)$data['id'] : 0;
if (!$id) { http_response_code(400); echo json_encode(['success'=>false,'error'=>'ID manquant']); exit; }

try {
  $uid = current_user_id();
  $c = $pdo->prepare("SELECT o.user_id FROM goal_plans gp JOIN objectif_crees o ON gp.goal_id = o.id_objectif WHERE gp.id = :id LIMIT 1");
  $c->execute([':id' => $id]);
  $owner = $c->fetch(PDO::FETCH_ASSOC);
  if (!$owner || (int)$owner['user_id'] !== $uid) { http_response_code(403); echo json_encode(['success'=>false,'error'=>'Accès refusé']); exit; }

  $stmt = $pdo->prepare("DELETE FROM goal_plans WHERE id = :id");
  $stmt->execute([':id' => $id]);
  echo json_encode(['success'=>true]);
} catch (PDOException $e) {
  error_log('delete_goal_plan.php PDOException: ' . $e->getMessage());
  http_response_code(500); echo json_encode(['success'=>false,'error'=>'Erreur serveur']);
}
