<?php
require 'config.php';
require 'auth.php';

// Temporary debug endpoint - remove after debugging
require_auth();
header('Content-Type: application/json; charset=utf-8');

$result = ['success' => false, 'info' => []];

try {
    // list tables
    $tablesStmt = $pdo->query("SHOW TABLES");
    $tables = $tablesStmt->fetchAll(PDO::FETCH_COLUMN);
    $result['info']['tables'] = $tables;

    // check transactions table count
    if (in_array('transactions', $tables)) {
        $c = $pdo->query("SELECT COUNT(*) as c FROM transactions")->fetch(PDO::FETCH_ASSOC);
        $result['info']['transactions_count'] = $c['c'] ?? null;
    }

    // check transaction_files table
    if (in_array('transaction_files', $tables)) {
        $c2 = $pdo->query("SELECT COUNT(*) as c FROM transaction_files")->fetch(PDO::FETCH_ASSOC);
        $result['info']['transaction_files_count'] = $c2['c'] ?? null;
    }

    // Try the original query but with LIMIT 1 to provoke the same error if any
    $sql = "SELECT tx.id_transaction FROM transactions tx LIMIT 1";
    try {
        $stmt = $pdo->query($sql);
        $one = $stmt->fetch(PDO::FETCH_ASSOC);
        $result['info']['sample_transaction'] = $one;
    } catch (PDOException $e) {
        $result['error_sql_test'] = $e->getMessage();
        error_log("debug_get_transactions SQL error: " . $e->getMessage());
    }

    $result['success'] = true;
} catch (Exception $e) {
    $msg = $e->getMessage();
    error_log("debug_get_transactions exception: " . $msg);
    $result['error'] = $msg;
}

// append to a debug log file for convenience
@file_put_contents(__DIR__ . '/get_transactions_debug.log', date('c') . " - " . json_encode($result) . "\n", FILE_APPEND);

echo json_encode($result);
