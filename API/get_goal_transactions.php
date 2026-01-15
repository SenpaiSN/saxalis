<?php
require 'config.php';
require 'auth.php';
require_auth();

// CORS handled centrally in config.php

header('Content-Type: application/json; charset=utf-8');

$input = json_decode(file_get_contents('php://input'), true);
$projet_id = isset($input['projet_id']) ? (int)$input['projet_id'] : null;
if (!$projet_id) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => 'Paramètre projet_id manquant']);
  exit;
}

try {
  $uid = current_user_id();

  // Treat projet_id as id_objectif from objectif_crees:
  // - deposits are transactions with id_type=3 and subcategory_id = objectif.id_subcategory
  // - withdrawals or related ops are transactions where goal_id = id
  $chk = $pdo->prepare("SELECT id_objectif, id_subcategory FROM objectif_crees WHERE id_objectif = :id LIMIT 1");
  $chk->execute([':id' => $projet_id]);
  $obj = $chk->fetch(PDO::FETCH_ASSOC);

  if (!$obj) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Objectif introuvable']);
    exit;
  }

  $sql = "SELECT t.* FROM transactions t WHERE ((t.id_type = 3 AND t.subcategory_id = :subcat) OR (t.goal_id = :id)) AND t.id_utilisateur = :uid ORDER BY t.Date DESC";
  $stmt = $pdo->prepare($sql);
  $stmt->execute([':subcat' => $obj['id_subcategory'], ':id' => $projet_id, ':uid' => $uid]);
  $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode(['success' => true, 'transactions' => $transactions]);
} catch (PDOException $e) {
  error_log('get_goal_transactions.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
