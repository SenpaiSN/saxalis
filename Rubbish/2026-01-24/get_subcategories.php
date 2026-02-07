<?php
require 'auth.php';
// CORS handled by config.php

require_auth();
header('Content-Type: application/json; charset=utf-8');
require 'config.php';

// Lecture des données JSON envoyées en POST
$category_id = isset($_GET['category_id']) ? (int)$_GET['category_id'] : null;

try {
    if ($category_id) {
        $stmt = $pdo->prepare(
            "SELECT id_subcategory, category_id, name, icon, manual_budget
             FROM subcategories
             WHERE category_id = :cid
             ORDER BY name ASC"
        );
        $stmt->execute([':cid' => $category_id]);
    } else {
        $stmt = $pdo->query("SELECT id_subcategory, category_id, name, icon, manual_budget FROM subcategories ORDER BY name ASC");
    }

    $subcategories = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success'       => true,
        'subcategories' => $subcategories
    ]);
} catch (PDOException $e) {
    error_log('get_subcategories.php PDOException: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
?>
