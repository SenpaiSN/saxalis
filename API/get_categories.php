<?php
require 'config.php';
require 'auth.php';

// CORS handled centrally in config.php
require_auth();
header('Content-Type: application/json; charset=utf-8');

// Temporary: enable detailed errors to help debug 500 responses (remove in production)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// 🔄 Lecture des données JSON envoyées en POST
$input   = json_decode(file_get_contents('php://input'), true);
$id_type = $input['id_type'] ?? null;

try {
    if ($id_type) {
        // 🔍 Récupérer uniquement les catégories liées au type
        $stmt = $pdo->prepare("
            SELECT id_category, name, manual_budget
            FROM categories
            WHERE id_type = ?
            ORDER BY name ASC
        ");
        $stmt->execute([$id_type]);
    } else {
        // 🟡 Optionnel : si aucun type, renvoyer toutes les catégories
        $stmt = $pdo->query(
            "SELECT id_category, name, manual_budget
            FROM categories
            ORDER BY name ASC
        ");
    }

    echo json_encode([
        'success'    => true,
        'categories' => $stmt->fetchAll(PDO::FETCH_ASSOC)
    ]);
} catch (PDOException $e) {
    error_log('get_categories.php PDOException: ' . $e->getMessage());
    http_response_code(500);
    // Temporary: include PDO message to aid debugging (remove before production)
    echo json_encode(['success' => false, 'error' => 'Erreur serveur', 'detail' => $e->getMessage()]);
}
?>
