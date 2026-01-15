<?php
// scripts/inspect_latest_export.php
chdir(dirname(__DIR__));
$exportDir = getenv('OCR_FEEDBACK_EXPORT_DIR') ?: __DIR__ . '/../exports';
$files = glob(rtrim($exportDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'ocr_feedback_*.jsonl.gz');
if (!$files) { echo "No export files found in {$exportDir}\n"; exit(1); }
rsort($files);
$latest = $files[0];
echo "Inspecting: $latest\n\n";
$gz = gzopen($latest, 'rb');
if (!$gz) { echo "Failed to open $latest\n"; exit(2); }
$line = gzgets($gz, 8192);
gzclose($gz);
if (!$line) { echo "File empty or can't read\n"; exit(3); }
$json = json_decode($line, true);
if (!$json) { echo "Failed to parse JSON: $line\n"; exit(4); }
print_r($json);
