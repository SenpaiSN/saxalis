<?php
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

$uid = current_user_id();

try {
  // Aggregate deposits and withdrawals using LEFT JOINs and sub-aggregates to avoid repeating parameters
  $sql = "
    SELECT
      o.id_objectif,
      o.id_subcategory,
      s.name,
      o.montant AS montant_objectif,
      DATE(o.date_depot) AS date_creation,
      o.date_cible,
      COALESCE(d.total_deposits, 0) AS total_deposits,
      COALESCE(w.total_withdrawn, 0) AS total_withdrawn,
      (COALESCE(d.total_deposits, 0) - COALESCE(w.total_withdrawn, 0)) AS total_collected,
      COALESCE(ROUND(LEAST(100, (COALESCE(d.total_deposits, 0) - COALESCE(w.total_withdrawn, 0)) / NULLIF(o.montant, 0) * 100), 2), 0) AS progress_pct,
      COALESCE(d.nb_deposits, 0) AS nb_versements,
      COALESCE(w.nb_withdrawals, 0) AS nb_retraits
    FROM objectif_crees o
    LEFT JOIN subcategories s ON s.id_subcategory = o.id_subcategory
    LEFT JOIN (
      SELECT subcategory_id, id_utilisateur, SUM(Montant) AS total_deposits, COUNT(id_transaction) AS nb_deposits
      FROM transactions
      WHERE id_type = 3
      GROUP BY subcategory_id, id_utilisateur
    ) d ON d.subcategory_id = o.id_subcategory AND d.id_utilisateur = o.user_id
    LEFT JOIN (
      SELECT goal_id, id_utilisateur, SUM(Montant) AS total_withdrawn, COUNT(id_transaction) AS nb_withdrawals
      FROM transactions
      WHERE  id_type = 2 and subcategory_id=360
      GROUP BY goal_id, id_utilisateur
    ) w ON w.goal_id = o.id_objectif AND w.id_utilisateur = o.user_id
    WHERE o.user_id = :uid
    ORDER BY o.date_depot DESC
  ";

  $stmt = $pdo->prepare($sql);
  $stmt->execute([':uid' => $uid]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode(['success' => true, 'objectifs_crees' => $rows]);
} catch (PDOException $e) {
  http_response_code(500);
  error_log('get_objectifs_crees.php PDOException: ' . $e->getMessage());
  echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
