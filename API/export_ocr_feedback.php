<?php
// API/export_ocr_feedback.php
// Protected admin endpoint to trigger an anonymized export of ocr_feedback rows
// Security: Requires authenticated user AND either ADMIN token header or ADMIN_USER_ID match.

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Access-Control-Allow-Credentials: true');
} else {
  header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Admin-Token');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require 'config.php';
require 'auth.php';
require 'security.php';
require_auth();

// Authorization: allow if
// - env OCR_FEEDBACK_ADMIN_TOKEN is set and matches header X-Admin-Token, OR
// - env OCR_FEEDBACK_ADMIN_USER_ID is set and equals current_user_id()
$adminToken = getenv('OCR_FEEDBACK_ADMIN_TOKEN') ?: null;
$adminUserIdEnv = getenv('OCR_FEEDBACK_ADMIN_USER_ID');
$currentUserId = current_user_id();

$providedToken = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? null;
$ok = false;
if ($adminToken && $providedToken && hash_equals($adminToken, $providedToken)) $ok = true;
if ($adminUserIdEnv && intval($adminUserIdEnv) === intval($currentUserId)) $ok = true;

if (!$ok) {
  http_response_code(403);
  echo json_encode(['success' => false, 'error' => 'Access denied (admin token or admin user required)']);
  exit;
}

// Input: optional query params: since (ISO date) or days (int)
$since = null;
if (isset($_GET['since']) && $_GET['since']) {
  $since = date('Y-m-d H:i:s', strtotime($_GET['since']));
} elseif (isset($_GET['days']) && is_numeric($_GET['days'])) {
  $days = (int)$_GET['days'];
  $since = date('Y-m-d H:i:s', strtotime("-{$days} days"));
} else {
  $since = date('Y-m-d H:i:s', strtotime('-1 day'));
}

function redact_text_for_export($s) {
  if ($s === null) return null;
  $s = preg_replace('/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/', '[EMAIL]', $s);
  $s = preg_replace_callback('/\d+/', function($m){ return str_repeat('X', max(1, strlen($m[0]))); }, $s);
  return mb_substr($s, 0, 500);
}

// Fetch rows
try {
  $stmt = $pdo->prepare("SELECT * FROM ocr_feedback WHERE created_at >= :since ORDER BY created_at ASC");
  $stmt->execute([':since' => $since]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'DB query failed']);
  error_log('export_ocr_feedback db error: ' . $e->getMessage());
  exit;
}

if (!$rows) {
  echo json_encode(['success' => true, 'exported' => 0, 'message' => "No rows to export since {$since}"]);
  exit;
}

$exportDir = getenv('OCR_FEEDBACK_EXPORT_DIR') ?: __DIR__ . '/../exports';
if (!is_dir($exportDir)) @mkdir($exportDir, 0755, true);
$ts = date('Ymd_His');
$fname = "ocr_feedback_{$ts}.jsonl";
$path = rtrim($exportDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $fname;
$fh = fopen($path, 'w');
if (!$fh) {
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Failed to open export file']);
  exit;
}

$counter = 0;
foreach ($rows as $r) {
  $entry = [
    'receipt_text_hash' => $r['receipt_text_hash'],
    'redacted_text' => redact_text_for_export($r['redacted_text']),
    'merchant' => (getenv('OCR_FEEDBACK_INCLUDE_MERCHANT') === '1') ? redact_text_for_export($r['merchant']) : null,
    'invoice_hash' => $r['invoice_hash'],
    'suggested_amount' => $r['suggested_amount'] !== null ? (float)$r['suggested_amount'] : null,
    'applied_amount' => $r['applied_amount'] !== null ? (float)$r['applied_amount'] : null,
    'suggested_category' => $r['suggested_category'],
    'applied_category' => $r['applied_category'],
    'action' => $r['action'],
    'candidates' => $r['candidates'] ? json_decode($r['candidates'], true) : null,
    'meta' => $r['meta'] ? json_decode($r['meta'], true) : null,
    'created_at' => $r['created_at'],
    'exported_at' => date('Y-m-d H:i:s')
  ];
  if (is_array($entry['candidates'])) $entry['candidates'] = array_slice($entry['candidates'], 0, 5);
  fwrite($fh, json_encode($entry, JSON_UNESCAPED_UNICODE) . "\n");
  $counter++;
}

fclose($fh);
// gzip file
$gzpath = $path . '.gz';
$fp_in = fopen($path, 'rb');
$fp_out = gzopen($gzpath, 'wb9');
while (!feof($fp_in)) {
  $data = fread($fp_in, 1024*512);
  gzwrite($fp_out, $data);
}
fclose($fp_in);
gzclose($fp_out);
@unlink($path);

// Optional upload to S3 using aws cli if configured
$s3Bucket = getenv('OCR_FEEDBACK_S3_BUCKET');
$s3Result = null;
if ($s3Bucket) {
  $s3Key = basename($gzpath);
  $cmd = sprintf('aws s3 cp %s s3://%s/%s', escapeshellarg($gzpath), escapeshellarg($s3Bucket), escapeshellarg($s3Key));
  exec($cmd, $out, $rc);
  if ($rc === 0) {
    $s3Result = ['bucket' => $s3Bucket, 'key' => $s3Key];
  } else {
    error_log('export_ocr_feedback: aws upload failed rc=' . $rc);
  }
}

$response = ['success' => true, 'exported' => $counter, 'file' => $gzpath];
if ($s3Result) $response['s3'] = $s3Result;

echo json_encode($response);
