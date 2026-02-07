<?php
// API endpoint: search_categories.php
// Recherche unifiée de catégories across tous les types de transaction

session_start();
header('Content-Type: application/json; charset=utf-8');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Access-Control-Allow-Credentials: true');
} else {
  header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

require 'config.php';
require 'auth.php';
require_auth();

$query = $_GET['q'] ?? '';
$limit = isset($_GET['limit']) ? min(50, max(1, (int)$_GET['limit'])) : 10;

// Minimum 2 caractères pour éviter résultats trop larges
if (strlen(trim($query)) < 2) {
  echo json_encode(['success' => true, 'results' => []]);
  exit;
}

$uid = current_user_id();

try {
  $stmt = $pdo->prepare("
    SELECT 
      c.id_category,
      c.name,
      c.type_id,
      tt.code AS type_code,
      tt.label AS type_label,
      CASE 
        WHEN LOWER(c.name) = LOWER(:exactMatch) THEN 0
        WHEN LOWER(c.name) LIKE CONCAT(LOWER(:startsWith), '%') THEN 1
        ELSE 2
      END AS sort_order
    FROM categories c
    JOIN transaction_types tt ON c.type_id = tt.id_type
    WHERE 
      LOWER(c.name) LIKE CONCAT('%', LOWER(:query), '%')
      AND (tt.user_id = :uid OR tt.user_id IS NULL)
    ORDER BY sort_order, c.name
    LIMIT :limit
  ");

  $stmt->execute([
    ':query' => $query,
    ':exactMatch' => $query,
    ':startsWith' => $query,
    ':uid' => $uid,
    ':limit' => $limit
  ]);

  $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode([
    'success' => true,
    'results' => $results,
    'count' => count($results)
  ]);
} catch (PDOException $e) {
  error_log('search_categories error: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode([
    'success' => false,
    'error' => 'Erreur serveur'
  ]);
}
