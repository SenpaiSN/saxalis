<?php
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents('php://input'), true);
$id = isset($data['id']) ? (int)$data['id'] : 0;
$fields = [];
$params = [];
if (!$id) { http_response_code(400); echo json_encode(['success'=>false,'error'=>'ID manquant']); exit; }

// Only allow owner to update
try {
  $uid = current_user_id();
  $c = $pdo->prepare("SELECT o.user_id FROM goal_plans gp JOIN objectif_crees o ON gp.goal_id = o.id_objectif WHERE gp.id = :id LIMIT 1");
  $c->execute([':id' => $id]);
  $owner = $c->fetch(PDO::FETCH_ASSOC);
  if (!$owner || (int)$owner['user_id'] !== $uid) { http_response_code(403); echo json_encode(['success'=>false,'error'=>'Accès refusé']); exit; }

  $allowed = ['type','amount','percent','schedule_day','active'];
  foreach ($allowed as $k) {
    if (isset($data[$k])) { $fields[] = "{$k} = :{$k}"; $params[':'.$k] = $data[$k]; }
  }
  if (count($fields) === 0) { echo json_encode(['success'=>true]); exit; }

  $params[':id'] = $id;
  $sql = "UPDATE goal_plans SET " . implode(', ', $fields) . " WHERE id = :id";
  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  echo json_encode(['success'=>true]);
} catch (PDOException $e) {
  error_log('update_goal_plan.php PDOException: ' . $e->getMessage());
  http_response_code(500); echo json_encode(['success'=>false,'error'=>'Erreur serveur']);
}
