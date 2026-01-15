<?php
// CLI worker to process recurring transactions for a single user.
// Usage: php recurring_worker.php <user_id>

require __DIR__ . '/config.php';
require __DIR__ . '/lib/recurring_helper.php';

// Accept from CLI args or query param (in case called via web)
$uid = null;
if (php_sapi_name() === 'cli') {
  global $argv;
  if (isset($argv[1])) $uid = (int)$argv[1];
} else {
  if (isset($_GET['uid'])) $uid = (int)$_GET['uid'];
  // Restrict web-based calls to localhost for safety
  $remote = $_SERVER['REMOTE_ADDR'] ?? '';
  if (!in_array($remote, ['127.0.0.1', '::1'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'forbidden']);
    file_put_contents(__DIR__ . '/recurring_worker.log', date(DATE_ATOM) . " denied remote call from {$remote}\n", FILE_APPEND);
    exit(1);
  }
}

if (empty($uid)) {
  file_put_contents(__DIR__ . '/recurring_worker.log', date(DATE_ATOM) . " missing uid\n", FILE_APPEND);
  exit(1);
}

try {
  $created = process_recurring_for_user($pdo, $uid);
  $count = is_array($created) ? count($created) : 0;
  file_put_contents(__DIR__ . '/recurring_worker.log', date(DATE_ATOM) . " uid={${uid}} created={$count}\n", FILE_APPEND);
  exit(0);
} catch (Throwable $e) {
  file_put_contents(__DIR__ . '/recurring_worker.log', date(DATE_ATOM) . " uid={${uid}} error=" . $e->getMessage() . "\n", FILE_APPEND);
  exit(2);
}
