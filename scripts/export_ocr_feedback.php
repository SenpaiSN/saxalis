<?php
/**
 * scripts/export_ocr_feedback.php
 *
 * Usage (CLI):
 *  php scripts/export_ocr_feedback.php --since=2026-01-01
 *  php scripts/export_ocr_feedback.php --days=7
 *
 * Environment variables:
 *  OCR_FEEDBACK_EXPORT_DIR (default: exports/)
 *  OCR_FEEDBACK_INCLUDE_MERCHANT (1 to include merchant in export, default 0)
 *  OCR_FEEDBACK_S3_BUCKET (optional) + S3 credentials in env to upload
 */

chdir(dirname(__DIR__)); // make project root the CWD
require 'API/config.php';

$options = getopt('', ['since::', 'days::']);

$since = null;
if (isset($options['since']) && $options['since']) {
  $since = date('Y-m-d H:i:s', strtotime($options['since']));
} elseif (isset($options['days']) && is_numeric($options['days'])) {
  $days = (int)$options['days'];
  $since = date('Y-m-d H:i:s', strtotime("-{$days} days"));
} else {
  // default to last 1 day
  $since = date('Y-m-d H:i:s', strtotime('-1 day'));
}

$exportDir = getenv('OCR_FEEDBACK_EXPORT_DIR') ?: __DIR__ . '/../exports';
if (!is_dir($exportDir)) @mkdir($exportDir, 0755, true);

$includeMerchant = getenv('OCR_FEEDBACK_INCLUDE_MERCHANT') === '1';

function redact_text($s) {
  if ($s === null) return null;
  // Replace emails
  $s = preg_replace('/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/', '[EMAIL]', $s);
  // Replace long digit sequences (phone, card, amounts) with Xs
  $s = preg_replace_callback('/\d+/', function($m){ return str_repeat('X', max(1, strlen($m[0]))); }, $s);
  // limit length to 500 (already constrained in DB) but ensure no PII at end
  return mb_substr($s, 0, 500);
}

// Fetch rows
try {
  $stmt = $pdo->prepare("SELECT * FROM ocr_feedback WHERE created_at >= :since ORDER BY created_at ASC");
  $stmt->execute([':since' => $since]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
  fwrite(STDERR, "DB query failed: " . $e->getMessage() . PHP_EOL);
  exit(2);
}

if (!$rows) {
  echo "No rows to export since {$since}\n";
  exit(0);
}

$ts = date('Ymd_His');
$fname = "ocr_feedback_{$ts}.jsonl";
$path = rtrim($exportDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $fname;

$fh = fopen($path, 'w');
if (!$fh) { fwrite(STDERR, "Failed to open export file $path for writing\n"); exit(3); }

$counter = 0;
foreach ($rows as $r) {
  $entry = [
    'receipt_text_hash' => $r['receipt_text_hash'],
    'redacted_text' => redact_text($r['redacted_text']),
    'merchant' => $includeMerchant ? redact_text($r['merchant']) : null,
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
  // Limit candidates to top5
  if (is_array($entry['candidates'])) $entry['candidates'] = array_slice($entry['candidates'], 0, 5);
  fwrite($fh, json_encode($entry, JSON_UNESCAPED_UNICODE) . "\n");
  $counter++;
}

fclose($fh);

// gzip the file
$gzpath = $path . '.gz';
$fp_in = fopen($path, 'rb');
$fp_out = gzopen($gzpath, 'wb9');
while (!feof($fp_in)) {
  $data = fread($fp_in, 1024*512);
  gzwrite($fp_out, $data);
}
fclose($fp_in);
gzclose($fp_out);
// remove uncompressed file
@unlink($path);

echo "Exported {$counter} rows to {$gzpath}\n";

// Optional: upload to S3 if configured (simple AWS SDK config via env)
$s3Bucket = getenv('OCR_FEEDBACK_S3_BUCKET');
if ($s3Bucket) {
  // try to use AWS CLI if available, fallback to skip
  $s3Key = basename($gzpath);
  $cmd = sprintf('aws s3 cp %s s3://%s/%s', escapeshellarg($gzpath), escapeshellarg($s3Bucket), escapeshellarg($s3Key));
  exec($cmd, $out, $rc);
  if ($rc === 0) {
    echo "Uploaded to s3://{$s3Bucket}/{$s3Key}\n";
    // optionally remove local file: keep for now
  } else {
    fwrite(STDERR, "Failed to upload to S3, aws CLI exited with code {$rc}\n");
  }
}

exit(0);
