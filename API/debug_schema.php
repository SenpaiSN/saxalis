<?php
require 'config.php';
require 'auth.php';

// Temporary debug endpoint - remove after debugging
require_auth();
header('Content-Type: application/json; charset=utf-8');

$result = ['success' => false, 'schema' => []];

try {
    $tables = ['subcategories', 'transaction_files', 'transactions', 'transaction_types', 'categories'];
    foreach ($tables as $t) {
        try {
            $stmt = $pdo->query("DESCRIBE `" . $t . "`");
            $cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $result['schema'][$t] = $cols;
        } catch (PDOException $e) {
            $result['schema'][$t] = ['error' => $e->getMessage()];
        }
    }

    $result['success'] = true;
} catch (Exception $e) {
    $result['error'] = $e->getMessage();
    error_log('debug_schema exception: ' . $e->getMessage());
}

@file_put_contents(__DIR__ . '/schema_debug.log', date('c') . " - " . json_encode($result) . "\n", FILE_APPEND);

echo json_encode($result);
