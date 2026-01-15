<?php
require 'config.php';
require 'auth.php';
require_auth();

// CORS handled centrally in config.php

header('Content-Type: application/json; charset=utf-8');

$uid = current_user_id();

try {
  // Return objectifs_crees mapped to a 'goals' structure for backwards compatibility
  // Use transactions for deposits (id_type=3 into the objectif subcategory) and withdrawals (transactions with goal_id)
  $sql = "
    SELECT
      o.id_objectif AS id,
      s.name AS nom,
      o.montant AS montant_objectif,
      DATE(o.date_depot) AS date_creation,
      NULL AS date_cible,
      NULL AS type_nom,
      COALESCE((SELECT SUM(Montant) FROM transactions WHERE subcategory_id = o.id_subcategory AND id_type = 3 AND id_utilisateur = :uid), 0) AS total_deposits,
      COALESCE((SELECT SUM(Montant) FROM transactions WHERE goal_id = o.id_objectif AND id_type = 1 AND id_utilisateur = :uid), 0) AS total_withdrawn,
      (COALESCE((SELECT SUM(Montant) FROM transactions WHERE subcategory_id = o.id_subcategory AND id_type = 3 AND id_utilisateur = :uid), 0) - COALESCE((SELECT SUM(Montant) FROM transactions WHERE goal_id = o.id_objectif AND id_type = 1 AND id_utilisateur = :uid), 0)) AS montant_depose,
      (o.montant - (COALESCE((SELECT SUM(Montant) FROM transactions WHERE subcategory_id = o.id_subcategory AND id_type = 3 AND id_utilisateur = :uid), 0) - COALESCE((SELECT SUM(Montant) FROM transactions WHERE goal_id = o.id_objectif AND id_type = 1 AND id_utilisateur = :uid), 0))) AS reste
    FROM objectif_crees o
    LEFT JOIN subcategories s ON s.id_subcategory = o.id_subcategory
    WHERE o.user_id = :uid
    ORDER BY o.date_depot DESC
  ";

  $stmt = $pdo->prepare($sql);
  $stmt->execute([':uid' => $uid]);
  $goals = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode(['success' => true, 'goals' => $goals]);
} catch (PDOException $e) {
  http_response_code(500);
  error_log('get_goals.php PDOException: ' . $e->getMessage());
  echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
