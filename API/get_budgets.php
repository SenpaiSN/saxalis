<?php
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

try {
  $uid = current_user_id();

  // read optional JSON filters (annee, mois, categorie, sousCategorie, filtreType, recherche)
  $input = json_decode(file_get_contents('php://input'), true) ?: [];
  $annee = isset($input['annee']) && $input['annee'] !== 'Tous' ? $input['annee'] : null;
  $mois = isset($input['mois']) && $input['mois'] !== 'Tous' ? $input['mois'] : null;
  $filtreType = isset($input['filtreType']) ? $input['filtreType'] : 'tous';
  $categorieFilter = isset($input['categorie']) && $input['categorie'] !== 'Toutes' ? $input['categorie'] : null;
  $sousCategorieFilter = isset($input['sousCategorie']) && $input['sousCategorie'] !== 'Toutes' ? $input['sousCategorie'] : null;
  // optional: return only subcategories with a budget > 0
  $onlyPositive = isset($input['onlyPositiveBudgets']) ? boolval($input['onlyPositiveBudgets']) : false;

  // If the active type filter excludes expenses, return empty result quickly
  if ($filtreType === 'income') {
    echo json_encode(['success' => true, 'subcategories' => [], 'categories' => [], 'range_start' => null, 'range_end' => null]);
    return;
  }

  // compute date range: last 3 complete months (exclude current month)
  if ($annee && $mois) {
    $monthStart = new DateTimeImmutable(sprintf('%04d-%02d-01', (int)$annee, (int)$mois));
  } else {
    $monthStart = new DateTimeImmutable(date('Y-m-01'));
  }
  $rangeStart = $monthStart->sub(new DateInterval('P3M'))->format('Y-m-01');
  $rangeEnd = $monthStart->format('Y-m-01');

  // 1) fetch subcategories with manual_budget (apply category/subcategory filters if provided)
  if ($sousCategorieFilter) {
    $sStmt = $pdo->prepare('SELECT s.id_subcategory, s.category_id, s.name, s.manual_budget, c.name AS category_name FROM subcategories s LEFT JOIN categories c ON s.category_id = c.id_category WHERE s.name = :sname ORDER BY s.name ASC');
    $sStmt->execute([':sname' => $sousCategorieFilter]);
  } elseif ($categorieFilter) {
    // translate category name -> id
    $cStmt = $pdo->prepare('SELECT id_category FROM categories WHERE name = :cname LIMIT 1');
    $cStmt->execute([':cname' => $categorieFilter]);
    $cRow = $cStmt->fetch(PDO::FETCH_ASSOC);
    $catId = $cRow ? (int)$cRow['id_category'] : null;
    if ($catId) {
      $sStmt = $pdo->prepare('SELECT s.id_subcategory, s.category_id, s.name, s.manual_budget, c.name AS category_name FROM subcategories s LEFT JOIN categories c ON s.category_id = c.id_category WHERE s.category_id = :cat ORDER BY s.name ASC');
      $sStmt->execute([':cat' => $catId]);
    } else {
      $sStmt = $pdo->prepare('SELECT s.id_subcategory, s.category_id, s.name, s.manual_budget, c.name AS category_name FROM subcategories s LEFT JOIN categories c ON s.category_id = c.id_category WHERE 0=1');
      $sStmt->execute();
    }
  } else {
    $sStmt = $pdo->prepare('SELECT s.id_subcategory, s.category_id, s.name, s.manual_budget, c.name AS category_name FROM subcategories s LEFT JOIN categories c ON s.category_id = c.id_category ORDER BY s.name ASC');
    $sStmt->execute();
  }
  $subs = $sStmt->fetchAll(PDO::FETCH_ASSOC);

  // 2) get per-month sums for each subcategory in the range (apply same category/subcategory filters)
  $sql = "SELECT subcategory_id, DATE_FORMAT(`Date`, '%Y-%m') as ym, SUM(Montant) AS total
            FROM transactions
            WHERE id_utilisateur = :uid AND id_type = 1 AND `Date` >= :start AND `Date` < :end";
  $params = [':uid' => $uid, ':start' => $rangeStart, ':end' => $rangeEnd];
  if ($sousCategorieFilter) {
    // limit by subcategory id (we have at most one in $subs)
    $ids = array_map(function($s){return (int)$s['id_subcategory'];}, $subs);
    if (count($ids) === 0) {
      echo json_encode(['success' => true, 'subcategories' => [], 'categories' => [], 'range_start' => $rangeStart, 'range_end' => $rangeEnd]);
      return;
    }
    $in = implode(',', array_map('intval', $ids));
    $sql .= " AND subcategory_id IN ($in)";
  } elseif ($categorieFilter && isset($catId)) {
    $sql .= " AND category_id = :catId"; $params[':catId'] = $catId;
  }
  $sql .= " GROUP BY subcategory_id, ym";

  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  // Build months list (3 last complete months excluding the current month)
  $months = [];
  for ($i = 1; $i <= 3; $i++) {
    $months[] = $monthStart->sub(new DateInterval('P' . $i . 'M'))->format('Y-m');
  }

  // aggregate per-month sums for each subcategory into a lookup [sid][ym] => total
  $monthly = [];
  foreach ($rows as $r) {
    $sid = $r['subcategory_id'] ?? 0;
    $ym = $r['ym'] ?? null;
    if (!$sid || !$ym) continue;
    if (!isset($monthly[$sid])) $monthly[$sid] = [];
    $monthly[$sid][$ym] = (float)$r['total'];
  }

  // 3) current month spend per subcategory (respect filters applied earlier)
  $curMonthStart = $monthStart->format('Y-m-01');
  $nextMonthStart = $monthStart->add(new DateInterval('P1M'))->format('Y-m-01');
  // Include transactions for the selected month (this includes future transactions that fall within the selected month)
  $curEnd = $nextMonthStart;

  $sql2 = "SELECT subcategory_id, SUM(Montant) AS total FROM transactions WHERE id_utilisateur = :uid AND id_type = 1 AND `Date` >= :curStart AND `Date` < :curEnd";
  $curParams = [':uid' => $uid, ':curStart' => $curMonthStart, ':curEnd' => $curEnd];
  if (isset($ids) && count($ids) > 0) {
    $in = implode(',', array_map('intval', $ids));
    $sql2 .= " AND subcategory_id IN ($in)";
  } elseif (isset($catId)) {
    $sql2 .= " AND category_id = :catId"; $curParams[':catId'] = $catId;
  }
  $sql2 .= " GROUP BY subcategory_id";
  $stmt = $pdo->prepare($sql2);
  $stmt->execute($curParams);
  $curRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  $current = [];
  foreach ($curRows as $r) {
    $sid = $r['subcategory_id'] ?? 0;
    if (!$sid) continue;
    $current[$sid] = (float)$r['total'];
  }

  // Determine avg mode (include_zero | ignore_empty). Default = ignore_empty
  $inputAvgMode = $input['avgMode'] ?? 'ignore_empty';
  $avgMode = in_array($inputAvgMode, ['include_zero','ignore_empty']) ? $inputAvgMode : 'ignore_empty';

  $resultSubs = [];
  foreach ($subs as $s) {
    $sid = (int)$s['id_subcategory'];
    // prepare ordered months sums (explicit zeros for missing months)
    $mSums = [];
    foreach ($months as $m) {
      $mSums[$m] = isset($monthly[$sid][$m]) ? (float)$monthly[$sid][$m] : 0.0;
    }
    $sum3 = array_sum($mSums);
    $nonZeroCount = count(array_filter($mSums, function($v){ return $v > 0; }));

    if ($avgMode === 'include_zero') {
      $budget_auto = $sum3 / 3.0;
    } else { // ignore_empty
      $budget_auto = $nonZeroCount > 0 ? ($sum3 / $nonZeroCount) : 0.0;
    }

    $spent_this_month = isset($current[$sid]) ? (float)$current[$sid] : 0.0;
    $manual = isset($s['manual_budget']) && $s['manual_budget'] !== null ? (float)$s['manual_budget'] : null;
    $used_budget = $manual !== null ? $manual : $budget_auto;
    $remaining = $used_budget - $spent_this_month;
    $percent_spent = $used_budget > 0 ? ($spent_this_month / $used_budget) * 100.0 : null;

    $resultSubs[] = [
      'id_subcategory' => $sid,
      'category_id' => (int)$s['category_id'],
      'category_name' => $s['category_name'] ?? null,
      'name' => $s['name'],
      'manual_budget' => $manual,
      'budget_auto' => round($budget_auto, 2),
      'budget_used' => round($used_budget, 2),
      'spent_this_month' => round($spent_this_month, 2),
      'remaining' => round($remaining, 2),
      'percent_spent' => $percent_spent !== null ? round($percent_spent, 2) : null,
      'months_sums' => $mSums,
      'months_with_data_count' => $nonZeroCount,
      'budget_source' => $manual !== null ? 'manual' : 'auto'
    ];
  }

  // Keep only subcategories that have at least one transaction in the selected month (including future transactions inside the month)
  $resultSubs = array_values(array_filter($resultSubs, function($r){ return isset($r['spent_this_month']) && $r['spent_this_month'] != 0.0; }));

  // also compute per-category aggregates (sum of subcategories or transactions directly)
  // categories (apply category filter if provided)
  if ($categorieFilter) {
    $cStmt = $pdo->prepare('SELECT id_category, name, manual_budget FROM categories WHERE name = :cname ORDER BY name ASC');
    $cStmt->execute([':cname' => $categorieFilter]);
  } else {
    $cStmt = $pdo->prepare('SELECT id_category, name, manual_budget FROM categories ORDER BY name ASC');
    $cStmt->execute();
  }
  $cats = $cStmt->fetchAll(PDO::FETCH_ASSOC);

  // per-month sums grouped by category (map by ym)
  $sqlc = "SELECT category_id, DATE_FORMAT(`Date`, '%Y-%m') as ym, SUM(Montant) AS total
            FROM transactions
            WHERE id_utilisateur = :uid AND id_type = 1 AND `Date` >= :start AND `Date` < :end
            GROUP BY category_id, ym";
  $stmt = $pdo->prepare($sqlc);
  $stmt->execute([':uid' => $uid, ':start' => $rangeStart, ':end' => $rangeEnd]);
  $rowsc = $stmt->fetchAll(PDO::FETCH_ASSOC);
  $monthlyC = [];
  foreach ($rowsc as $r) {
    $cid = $r['category_id'] ?? 0;
    $ym = $r['ym'] ?? null;
    if (!$cid || !$ym) continue;
    if (!isset($monthlyC[$cid])) $monthlyC[$cid] = [];
    $monthlyC[$cid][$ym] = (float)$r['total'];
  }

  $sqlc2 = "SELECT category_id, SUM(Montant) AS total FROM transactions WHERE id_utilisateur = :uid AND id_type = 1 AND `Date` >= :curStart AND `Date` < :curEnd GROUP BY category_id";
  $stmt = $pdo->prepare($sqlc2);
  $stmt->execute([':uid' => $uid, ':curStart' => $curMonthStart, ':curEnd' => $nextMonthStart]);
  $curRowsC = $stmt->fetchAll(PDO::FETCH_ASSOC);
  $currentC = [];
  foreach ($curRowsC as $r) {
    $cid = $r['category_id'] ?? 0;
    if (!$cid) continue;
    $currentC[$cid] = (float)$r['total'];
  }

  $resultCats = [];
  foreach ($cats as $c) {
    $cid = (int)$c['id_category'];
    $mSumsC = [];
    foreach ($months as $m) {
      $mSumsC[$m] = isset($monthlyC[$cid][$m]) ? (float)$monthlyC[$cid][$m] : 0.0;
    }
    $sum3c = array_sum($mSumsC);
    $nonZeroCountC = count(array_filter($mSumsC, function($v){ return $v > 0; }));
    if ($avgMode === 'include_zero') {
      $budget_auto = $sum3c / 3.0;
    } else {
      $budget_auto = $nonZeroCountC > 0 ? ($sum3c / $nonZeroCountC) : 0.0;
    }

    $spent_this_month = isset($currentC[$cid]) ? (float)$currentC[$cid] : 0.0;
    $manual = isset($c['manual_budget']) && $c['manual_budget'] !== null ? (float)$c['manual_budget'] : null;
    $used_budget = $manual !== null ? $manual : $budget_auto;
    $remaining = $used_budget - $spent_this_month;
    $percent_spent = $used_budget > 0 ? ($spent_this_month / $used_budget) * 100.0 : null;

    $resultCats[] = [
      'id_category' => $cid,
      'name' => $c['name'],
      'manual_budget' => $manual,
      'budget_auto' => round($budget_auto, 2),
      'budget_used' => round($used_budget, 2),
      'spent_this_month' => round($spent_this_month, 2),
      'remaining' => round($remaining, 2),
      'percent_spent' => $percent_spent !== null ? round($percent_spent, 2) : null,
      'months_sums' => $mSumsC,
      'months_with_data_count' => $nonZeroCountC,
      'budget_source' => $manual !== null ? 'manual' : 'auto'
    ];
  }

  // optionally filter to only budgets > 0
  if ($onlyPositive) {
    $resultSubs = array_values(array_filter($resultSubs, function($r){ return (isset($r['budget_used']) && $r['budget_used'] > 0); }));
    $resultCats = array_values(array_filter($resultCats, function($r){ return (isset($r['budget_used']) && $r['budget_used'] > 0); }));
  }

  echo json_encode(['success'=>true, 'subcategories' => $resultSubs, 'categories' => $resultCats, 'range_start' => $rangeStart, 'range_end' => $rangeEnd, 'months_considered' => $months, 'avg_mode' => $avgMode, 'filtered_only_positive' => $onlyPositive]);
} catch (PDOException $e) {
  error_log('get_budgets.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
