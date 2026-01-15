<?php
// API: add_goal_transaction.php
// Creates a depot and a linked transaction (type Epargne) for a given goal

require 'config.php';
require 'auth.php';
require_auth();


// CORS handled centrally in config.php

header('Content-Type: application/json; charset=utf-8');

$input = json_decode(file_get_contents('php://input'), true);
$goal_id = isset($input['goal_id']) ? (int)$input['goal_id'] : 0;
$montant = isset($input['montant']) ? (float)$input['montant'] : 0.0;
// Normalize date: interpret client-provided naive datetimes as Europe/Paris and store as UTC. If absent, use current UTC.
if (isset($input['date']) && trim($input['date']) !== '') {
  $rawDate = str_replace('T',' ', trim($input['date']));
  $dt = DateTime::createFromFormat('Y-m-d H:i:s', $rawDate, new DateTimeZone('Europe/Paris'));
  if ($dt === false) {
    try {
      $dt = new DateTime($rawDate, new DateTimeZone('Europe/Paris'));
    } catch (Exception $e) {
      $dt = new DateTime('now', new DateTimeZone('UTC'));
    }
  }
  $dt->setTimezone(new DateTimeZone('UTC'));
  $date = $dt->format('Y-m-d H:i:s');
} else {
  $date = (new DateTime('now', new DateTimeZone('UTC')))->format('Y-m-d H:i:s');
}
$create_depot = isset($input['create_depot']) ? (bool)$input['create_depot'] : true;
$notes = $input['notes'] ?? null;

if (!$goal_id || $montant <= 0) {
  http_response_code(400);
  echo json_encode(['success'=>false,'error'=>'Paramètres invalides']);
  exit;
}

try {
  $uid = current_user_id();

  // Only support objectif_crees model: create a deposit as transaction id_type = 3 into the objective's subcategory
  $c2 = $pdo->prepare("SELECT id_objectif, user_id, id_subcategory FROM objectif_crees WHERE id_objectif = :id LIMIT 1");
  $c2->execute([':id' => $goal_id]);
  $obj = $c2->fetch(PDO::FETCH_ASSOC);

  if (!$obj) {
    http_response_code(404);
    echo json_encode(['success'=>false,'error'=>'Objectif introuvable']);
    exit;
  }

  if ((int)$obj['user_id'] !== $uid) {
    http_response_code(403);
    echo json_encode(['success'=>false,'error'=>'Accès refusé']);
    exit;
  }

  $pdo->beginTransaction();
  try {
    $txSql = "INSERT INTO transactions (id_utilisateur, id_type, `Date`, `Type`, subcategory_id, Montant, Notes, currency, Montant_eur) VALUES (:uid, :idType, :date, :type, :subcat, :amount, :notes, :currency, :amount_eur)";
    $txStmt = $pdo->prepare($txSql);
    $txStmt->execute([
      ':uid' => $uid,
      ':idType' => 3,
      ':date' => $date,
      ':type' => 'epargne',
      ':subcat' => $obj['id_subcategory'],
      ':amount' => $montant,
      ':notes' => $notes ?? "Dépôt objectif #{$goal_id}",
      ':currency' => 'EUR',
      ':amount_eur' => $montant
    ]);
    $txId = $pdo->lastInsertId();

    $pdo->commit();
    echo json_encode(['success'=>true,'transaction_id'=>$txId]);
  } catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $e;
  }
} catch (PDOException $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  error_log('add_goal_transaction.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success'=>false,'error'=>'Erreur serveur']);
}
