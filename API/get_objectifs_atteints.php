<?php
require 'config.php';
require 'auth.php';
require_auth();

// CORS handled centrally in config.php

header('Content-Type: application/json; charset=utf-8');

$uid = current_user_id();

try {
  $sql = "
    SELECT
      id_objectif_atteint,
      id_objectif,
      id_subcategory,
      name,
      montant_objectif,
      DATE(date_creation) AS date_creation,
      date_atteint,
      total_collected,
      progress_pct,
      nb_versements
    FROM objectif_atteints
    WHERE user_id = :uid
    ORDER BY date_atteint DESC, date_creation DESC
  ";

  $stmt = $pdo->prepare($sql);
  $stmt->execute([':uid' => $uid]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode(['success' => true, 'objectifs_atteints' => $rows]);
} catch (PDOException $e) {
  http_response_code(500);
  error_log('get_objectifs_atteints.php PDOException: ' . $e->getMessage());
  echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
