<?php
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

// 2. Lire le payload JSON
$input = json_decode(file_get_contents('php://input'), true);

// 3. Valider les champs obligatoires
foreach (['category_id', 'year', 'month'] as $field) {
    if (!isset($input[$field]) || !is_numeric($input[$field])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error'   => "Champ $field manquant ou invalide"
        ]);
        exit;
    }
}

$uid = current_user_id();
$cid = (int) $input['category_id'];
$year = (int) $input['year'];
$month = (int) $input['month'];
$scid = null;

// 4. Récupérer la sous-catégorie si fournie
if (isset($input['subcategory_id']) && is_numeric($input['subcategory_id'])) {
    $scid = (int) $input['subcategory_id'];
}

// 5. Construire la requête SQL
//    Si $scid est null, on accepte tous les budgets sans sous-catégorie
$where = "
    user_id      = :uid
  AND category_id = :cid
  AND year        = :year
  AND month       = :month
";

if ($scid !== null) {
    $where .= " AND subcategory_id = :scid";
} else {
    // optionnel : n'ajoute aucune condition pour subcategory_id
    // ou bien : "AND subcategory_id IS NULL" selon le besoin métier
}

// 6. Préparer et exécuter
$sql  = "SELECT amount FROM category_budgets WHERE $where";
$stmt = $pdo->prepare($sql);

$params = [
    ':uid'   => $uid,
    ':cid'   => $cid,
    ':year'  => $year,
    ':month' => $month
];

if ($scid !== null) {
    $params[':scid'] = $scid;
}

try {
    $stmt->execute($params);
    $budget = $stmt->fetch(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'budget' => $budget]);
} catch (PDOException $e) {
    error_log('get_category_budget.php PDOException: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
