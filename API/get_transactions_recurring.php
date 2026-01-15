<?php
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

try {
  $uid = current_user_id();
  $sql = "SELECT tx.id_transaction, tx.`Date` AS date, tx.Montant AS amount, tx.currency, tx.Notes AS notes, tx.id_type, tx.Type AS type, tx.category_id, tx.subcategory_id, tx.recurring_plan_id, tx.recurring_group_id FROM transactions tx WHERE tx.id_utilisateur = :uid AND tx.recurring_group_id IS NOT NULL ORDER BY tx.Date DESC LIMIT 200";
  $stmt = $pdo->prepare($sql);
  $stmt->execute([':uid' => $uid]);
  $txs = $stmt->fetchAll(PDO::FETCH_ASSOC);
  echo json_encode(['success'=>true, 'transactions' => $txs]);
} catch (PDOException $e) {
  error_log('get_transactions_recurring.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
