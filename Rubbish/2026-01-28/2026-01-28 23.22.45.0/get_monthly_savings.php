<?php
require 'config.php';
require 'auth.php';

// CORS handled by config.php
require_auth();
header('Content-Type: application/json; charset=utf-8');

try {
  $uid = current_user_id();

  // Accept month param as 'YYYY-MM' via GET (or fallback to current month)
  $month = isset($_GET['month']) ? trim((string)$_GET['month']) : date('Y-m');

  // Basic validation (YYYY-MM)
  if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Paramètre month invalide, format attendu: YYYY-MM']);
    exit;
  }

  // Use Montant_eur when available, otherwise Montant
  $revenueSql = "
    SELECT COALESCE(SUM(COALESCE(Montant_eur, Montant)), 0) AS total
    FROM transactions
    WHERE id_utilisateur = :uid
      AND LOWER(`Type`) = 'income'
      AND DATE_FORMAT(`Date`, '%Y-%m') = :month
      AND (subcategory_id IS NULL OR subcategory_id != 360)
  ";

  $expenseSql = "
    SELECT COALESCE(SUM(ABS(COALESCE(Montant_eur, Montant))), 0) AS total
    FROM transactions
    WHERE id_utilisateur = :uid
      AND LOWER(`Type`) = 'expense'
      AND DATE_FORMAT(`Date`, '%Y-%m') = :month
  ";

  $revStmt = $pdo->prepare($revenueSql);
  $revStmt->execute([':uid' => $uid, ':month' => $month]);
  $rev = (float)$revStmt->fetchColumn();

  $expStmt = $pdo->prepare($expenseSql);
  $expStmt->execute([':uid' => $uid, ':month' => $month]);
  $exp = (float)$expStmt->fetchColumn();

  $savings = round($rev - $exp, 2);
  $savings_pct = null;
  if ($rev > 0) {
    $savings_pct = round(($savings / $rev) * 100, 2);
  }

  echo json_encode([
    'success'  => true,
    'month'    => $month,
    'revenues' => round($rev, 2),
    'expenses' => round($exp, 2),
    'savings'  => $savings,
    'savings_pct' => $savings_pct
  ]);

} catch (PDOException $e) {
  error_log('get_monthly_savings.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
