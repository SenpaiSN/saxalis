<?php
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

try {
  // detect cron secret (configure $cron_secret in API/config.local.php) to allow secure automated runs
  $cron_token = isset($_GET['cron_secret']) ? $_GET['cron_secret'] : (isset($_POST['cron_secret']) ? $_POST['cron_secret'] : null);
  $trusted_cron = false;
  if ($cron_token && isset($cron_secret) && is_string($cron_secret) && hash_equals($cron_secret, $cron_token)) {
    $trusted_cron = true;
  }

  // require explicit manual trigger to run the generation (avoid accidental external runs)
  $force = (isset($_GET['force']) && $_GET['force'] === '1') || (isset($_POST['force']) && $_POST['force'] === '1');
  if (!$force && !$trusted_cron) {
    echo json_encode(['success' => false, 'error' => 'runner_disabled', 'message' => 'Runner disabled by default; call with ?force=1 to run manually or provide a valid cron_secret.']);
    exit;
  }

  // Determine target user(s): single current user or all users when invoked securely via cron_secret
  if ($trusted_cron) {
    $userStmt = $pdo->prepare("SELECT DISTINCT user_id FROM recurring_transactions WHERE active = 1");
    $userStmt->execute();
    $userIds = $userStmt->fetchAll(PDO::FETCH_COLUMN);
  } else {
    $userIds = [current_user_id()];
  }

  $created = [];
  $today = new DateTime('now');

  // ensure transactions table has recurring_plan_id and recurring_group_id to link generated occurrences
  try {
    $pdo->exec("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurring_plan_id INT DEFAULT NULL");
    $pdo->exec("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurring_group_id INT DEFAULT NULL");
  } catch (Exception $e) {
    try { $pdo->exec("ALTER TABLE transactions ADD COLUMN recurring_plan_id INT DEFAULT NULL"); } catch (Exception $e2) { /* ignore */ }
    try { $pdo->exec("ALTER TABLE transactions ADD COLUMN recurring_group_id INT DEFAULT NULL"); } catch (Exception $e2) { /* ignore */ }
  }

  // use helper to process plans per user (keeps behavior consistent and allows reuse)
  include_once __DIR__ . '/lib/recurring_helper.php';

  foreach ($userIds as $uid) {
    try {
      $createdForUser = process_recurring_for_user($pdo, (int)$uid, $today);
      if (is_array($createdForUser) && count($createdForUser) > 0) $created = array_merge($created, $createdForUser);
    } catch (Exception $e) {
      error_log('run_recurring_transactions processing user ' . $uid . ' error: ' . $e->getMessage());
    }
  }

  echo json_encode(['success' => true, 'created' => $created]);

} catch (PDOException $e) {
  error_log('run_recurring_transactions.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
