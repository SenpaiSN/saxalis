<?php
require 'config.php';
require 'auth.php';

// CORS handled by config.php

require_auth();
header('Content-Type: application/json; charset=utf-8');

try {
  $uid = current_user_id();

    $sql = "
      SELECT
        tx.id_transaction,
        tx.Date             AS date,
        tx.Montant          AS amount,
        tx.currency         AS currency,
        tx.Montant_eur      AS amount_eur,
        tx.Notes            AS notes,
        tx.id_type          AS id_type,
        tt.code             AS type,
        tx.category_id      AS id_category,
        c.name              AS category,
        tx.subcategory_id   AS id_subcategory,
        sc.name             AS subCategory,
        sc.icon             AS subcategory_icon,
		          COALESCE(
            (
              SELECT GROUP_CONCAT(file_path SEPARATOR '||')
              FROM transaction_files
              WHERE transaction_id = tx.id_transaction
            ),
            ''
          ) AS invoices
      FROM transactions tx
      JOIN transaction_types tt
        ON tx.id_type = tt.id_type
      LEFT JOIN categories c
        ON tx.category_id = c.id_category
      LEFT JOIN subcategories sc
        ON tx.subcategory_id = sc.id_subcategory
      WHERE tx.id_utilisateur = :uid
      ORDER BY tx.Date DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([':uid' => $uid]);
    $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success'      => true,
        'transactions' => $transactions
    ]);
} catch (PDOException $e) {
        error_log('get_transactions.php PDOException: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
