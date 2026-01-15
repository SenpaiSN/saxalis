<?php
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

// Lire payload
$data = json_decode(file_get_contents('php://input'), true);
if (
   !isset($data['period_year'], $data['period_month'], $data['target_amount'])
) {
  http_response_code(400);
  exit(json_encode(['success'=>false,'error'=>'Données incomplètes']));
}

$idU = current_user_id();
$y   = (int)$data['period_year'];
$m   = (int)$data['period_month'];
$t   = (float)$data['target_amount'];
$r   = !empty($data['rollover_enabled']) ? 1 : 0;

// Insertion
try {
  $stmt = $pdo->prepare("INSERT INTO monthly_goals (id_utilisateur, period_year, period_month, target_amount, rollover_enabled) VALUES (:u, :y, :m, :t, :r)");
  $stmt->execute(['u'=> $idU, 'y'=> $y, 'm'=> $m, 't'=> $t, 'r'=> $r]);
  $idGoal = $pdo->lastInsertId();
  echo json_encode(['success'=>true,'id_goal'=>(int)$idGoal,'period_year'=>$y,'period_month'=>$m,'target_amount'=>$t,'rollover_enabled'=>$r]);
} catch (PDOException $e) {
  error_log('goals_monthly.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success'=>false,'error'=>'Erreur serveur']);
}
