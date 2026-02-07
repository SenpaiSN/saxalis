<?php
// API: add_goal_withdrawal.php
// Withdraw funds from a goal and create an expense transaction linked to it

require 'config.php';
require 'auth.php';
require_auth();
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
$notes = $input['notes'] ?? null;
$category_id = isset($input['category_id']) ? (int)$input['category_id'] : null;
$subcategory_id = isset($input['subcategory_id']) ? (int)$input['subcategory_id'] : null;
// Allow caller to indicate transaction type (defaults to expense (1))
$id_type = isset($input['id_type']) ? (int)$input['id_type'] : 1;

if (!$goal_id || $montant <= 0) {
  http_response_code(400);
  echo json_encode(['success'=>false,'error'=>'Paramètres invalides']);
  exit;
}

try {
  $uid = current_user_id();

  // Only support objectif_crees model
  $chk = $pdo->prepare("SELECT id_objectif, user_id, id_subcategory, montant FROM objectif_crees WHERE id_objectif = :id LIMIT 1");
  $chk->execute([':id' => $goal_id]);
  $obj = $chk->fetch(PDO::FETCH_ASSOC);

  if (!$obj) {
    http_response_code(404);
    echo json_encode(['success'=>false,'error'=>'Objectif introuvable']);
    exit;
  }

  // Ownership
  if ((int)$obj['user_id'] !== $uid) {
    http_response_code(403);
    echo json_encode(['success'=>false,'error'=>'Accès refusé']);
    exit;
  }

  // Calculate net savings (deposits and withdrawals both id_type = 3) into the subcategory
  // Deposits are positive, withdrawals are stored as negative montants
  $stmt = $pdo->prepare("SELECT COALESCE(SUM(Montant),0) FROM transactions WHERE subcategory_id = :subcat AND id_type = 3 AND id_utilisateur = :uid");
  $stmt->execute([':subcat' => $obj['id_subcategory'], ':uid' => $uid]);
  $availableNet = (float)$stmt->fetchColumn();

  // available is the net (already includes negative withdrawals)
  $available = $availableNet;

  if ($montant > $available) {
    http_response_code(400);
    echo json_encode(['success'=>false,'error'=>'Fonds insuffisants sur cet objectif','available'=>$available]);
    exit;
  }

  // CORRECTION: Enregistrer le retrait comme épargne négative (id_type=3, montant négatif)
  // Cela réduit l'épargne sans affecter les dépenses (solde = revenus - dépenses - épargne nette)
  // Les retraits d'objectifs ne sont PAS des dépenses, c'est une déduction d'épargne
  
  $txSql = "INSERT INTO transactions (id_utilisateur, id_type, `Date`, `Type`, category_id, subcategory_id, Montant, Notes, currency, Montant_eur) VALUES (:uid, :idType, :date, :type, :cat, :subcat, :amount, :notes, :currency, :amount_eur)";
  $txStmt = $pdo->prepare($txSql);

  $currency = 'EUR';
  $amount_eur = -$montant;  // Montant négatif pour réduire l'épargne

  $txStmt->execute([
    ':uid' => $uid,
    ':idType' => 3,  // Épargne, pas dépense
    ':date' => $date,
    ':type' => 'epargne',  // Type épargne
    ':cat' => null,  // Pas de catégorie pour les retraits
    ':subcat' => $obj['id_subcategory'],  // La sous-catégorie de l'objectif
    ':amount' => -$montant,  // Montant négatif
    ':notes' => $notes ?? "Retrait objectif #{$goal_id}",
    ':currency' => $currency,
    ':amount_eur' => $amount_eur
  ]);

  $txId = $pdo->lastInsertId();

  echo json_encode(['success'=>true,'transaction_id'=>$txId]);

} catch (PDOException $e) {
  error_log('add_goal_withdrawal.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success'=>false,'error'=>'Erreur serveur']);
}
