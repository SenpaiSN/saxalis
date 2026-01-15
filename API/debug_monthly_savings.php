<?php
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

// Simple debug helper: calls the same queries as get_monthly_savings and returns details + sample transactions
try {
  $uid = current_user_id();
  $month = isset($_GET['month']) ? trim((string)$_GET['month']) : date('Y-m');

  if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Paramètre month invalide, format: YYYY-MM']);
    exit;
  }

  $sql = "SELECT id_transaction, Date, Montant, Montant_eur, currency, Type, Notes FROM transactions WHERE id_utilisateur = :uid AND DATE_FORMAT(`Date`, '%Y-%m') = :month ORDER BY Date ASC LIMIT 100";
  $stmt = $pdo->prepare($sql);
  $stmt->execute([':uid' => $uid, ':month' => $month]);
  $txs = $stmt->fetchAll(PDO::FETCH_ASSOC);

  // Aggregate
  $revTotal = 0.0; $expTotal = 0.0;
  foreach ($txs as $t) {
    $amt = isset($t['Montant_eur']) && $t['Montant_eur'] !== null ? (float)$t['Montant_eur'] : (float)$t['Montant'];
    if (strtolower($t['Type']) === 'income') $revTotal += $amt;
    else if (strtolower($t['Type']) === 'expense') $expTotal += abs($amt);
  }

  echo json_encode([
    'success' => true,
    'month' => $month,
    'revenues' => round($revTotal,2),
    'expenses' => round($expTotal,2),
    'savings' => round($revTotal - $expTotal, 2),
    'transactions_sample' => $txs
  ]);

} catch (PDOException $e) {
  error_log('debug_monthly_savings.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
