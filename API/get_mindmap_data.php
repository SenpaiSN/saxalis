<?php
require_once 'config.php';
require_once 'auth.php';
require_auth();

header('Content-Type: application/json; charset=utf-8');

// Lire payload JSON (optionnel)
$input = json_decode(file_get_contents('php://input'), true) ?: [];
$filterYear = isset($input['year']) && $input['year'] !== '' ? (int)$input['year'] : null;
$filterMonth = isset($input['month']) && $input['month'] !== '' && $input['month'] !== 'all' ? (int)$input['month'] : null;
$filterType = isset($input['type_id']) && $input['type_id'] !== '' ? (int)$input['type_id'] : null;
$filterCategory = isset($input['category_id']) && $input['category_id'] !== '' ? (int)$input['category_id'] : null;
$filterSubcategory = isset($input['subcategory_id']) && $input['subcategory_id'] !== '' ? (int)$input['subcategory_id'] : null;

$uid = current_user_id();

try {
  // Construire clause date si demandée (params pour les 2 formats STR_TO_DATE)
  $dateWhere = '';
  $dateParams = [];
  if ($filterYear) {
    $start = "$filterYear-01-01";
    $end = "$filterYear-12-31";
    if ($filterMonth) {
      $start = sprintf('%04d-%02d-01', $filterYear, $filterMonth);
      $end = date('Y-m-d', strtotime($start . ' +1 month -1 day'));
    }
    // Note: on applique la condition côté JOIN sur transactions pour garder les catégories même si montants NULL
    $dateWhere = " AND ( (STR_TO_DATE(t.`Date`, '%d/%m/%Y') BETWEEN ? AND ?) OR (STR_TO_DATE(t.`Date`, '%Y-%m-%d') BETWEEN ? AND ?) ) ";
    $dateParams = [$start, $end, $start, $end];
  }

  // Construire filtres optionnels
  $typeWhere = $filterType ? ' AND tt.id_type = ? ' : '';
  $catWhere = $filterCategory ? ' AND c.id_category = ? ' : '';
  $subWhere = $filterSubcategory ? ' AND s.id_subcategory = ? ' : '';

  // Requête agrégée : récupère sums par type->category->subcategory pour l'utilisateur courant
  $sql = "
    SELECT
      tt.id_type AS id_type, tt.label AS type_label,
      c.id_category AS id_category, c.name AS category_name,
      s.id_subcategory AS id_subcategory, s.name AS subcategory_name,
      COALESCE(SUM(t.`Montant`), 0) AS total
    FROM transaction_types tt
    LEFT JOIN categories c ON c.id_type = tt.id_type $catWhere
    LEFT JOIN subcategories s ON s.category_id = c.id_category $subWhere
    LEFT JOIN transactions t ON t.subcategory_id = s.id_subcategory
      AND t.id_utilisateur = ? $dateWhere
    WHERE 1=1 $typeWhere
    GROUP BY tt.id_type, c.id_category, s.id_subcategory
    ORDER BY tt.id_type, c.id_category, s.id_subcategory
  ";

  // Assembler params dans l'ordre : type/category/subcategory (if any) -> uid -> dateParams
  $params = [];
  if ($filterType) $params[] = $filterType;
  if ($filterCategory) $params[] = $filterCategory;
  if ($filterSubcategory) $params[] = $filterSubcategory;
  $params[] = $uid;
  if (!empty($dateParams)) $params = array_merge($params, $dateParams);

  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  // Construire l'arbre à partir des lignes agrégées
  $tree = ["name" => "transaction_types", "children" => []];
  $types = [];

  foreach ($rows as $r) {
    $tid = (int)$r['id_type'];
    $cid = isset($r['id_category']) ? (int)$r['id_category'] : null;
    $sid = isset($r['id_subcategory']) ? (int)$r['id_subcategory'] : null;

    if (!isset($types[$tid])) {
      $types[$tid] = [
        "id" => $tid,
        "name" => $r['type_label'],
        "color" => getColorById($tid),
        "categories" => []
      ];
    }

    if ($cid !== null) {
      if (!isset($types[$tid]['categories'][$cid])) {
        $types[$tid]['categories'][$cid] = [
          "id" => $cid,
          "name" => $r['category_name'],
          "children" => [],
          "amount" => 0
        ];
      }

      // ajouter sous-catégorie (même si total == 0 on peut choisir d'exclure)
      $amount = $r['total'] !== null ? round(floatval($r['total']), 2) : 0.0;
      $types[$tid]['categories'][$cid]['children'][] = [
        "id" => $sid,
        "name" => $r['subcategory_name'],
        "amount" => $amount > 0 ? $amount : null
      ];

      if ($amount > 0) {
        $types[$tid]['categories'][$cid]['amount'] += $amount;
      }
    }
  }

  // Transformer structure pour sortie
  foreach ($types as $t) {
    $typeNode = ["name" => $t['name'], "color" => $t['color'], "children" => []];
    foreach ($t['categories'] as $c) {
      $catNode = [
        "name" => $c['name'],
        "children" => $c['children'],
        "amount" => $c['amount'] > 0 ? round($c['amount'], 2) : null
      ];
      if (!empty($catNode['children'])) {
        $typeNode['children'][] = $catNode;
      }
    }
    if (!empty($typeNode['children'])) {
      $tree['children'][] = $typeNode;
    }
  }

  echo json_encode($tree, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
  exit;
} catch (Throwable $e) {
  // Production-friendly: don't expose debug details. Server errors are logged by PHP.
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
  exit;
}

/**
 * Couleurs
 */
function getColorById($id) {
  $palette = [
    "#FF6B6B", "#4DABF7", "#51CF66", "#845EF7", "#FDBA4D",
    "#F783AC", "#63E6BE", "#FFD43B", "#A9E34B", "#5C7CFA"
  ];
  $idx = (int)$id - 1;
  return $palette[$idx % count($palette)];
}
