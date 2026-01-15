<?php
// Simple test harness for date normalization logic used by API endpoints
function normalize_date_to_utc($rawDate) {
  if (trim($rawDate) === '') return (new DateTime('now', new DateTimeZone('UTC')))->format('Y-m-d H:i:s');
  $rawDate = str_replace('T', ' ', trim($rawDate));
  $dt = DateTime::createFromFormat('Y-m-d H:i:s', $rawDate, new DateTimeZone('Europe/Paris'));
  if ($dt === false) {
    try {
      $dt = new DateTime($rawDate, new DateTimeZone('Europe/Paris'));
    } catch (Exception $e) {
      $dt = new DateTime('now', new DateTimeZone('UTC'));
    }
  }
  $dt->setTimezone(new DateTimeZone('UTC'));
  return $dt->format('Y-m-d H:i:s');
}

$tests = [
  ['input' => '2026-01-11 12:34', 'expected' => '2026-01-11 11:34'], // UTC+1 -> subtract 1h
  ['input' => '2026-07-11 12:34', 'expected' => '2026-07-11 10:34'], // CEST UTC+2 -> subtract 2h
  ['input' => '2026-01-11', 'expected' => '2026-01-10 23:00'], // date interpreted as 2026-01-11 00:00 CET -> 2026-01-10 23:00 UTC
  ['input' => '2026-07-11', 'expected' => '2026-07-10 22:00'], // 2026-07-11 00:00 CEST -> 2026-07-10 22:00 UTC
  ['input' => '', 'expected' => null],
];

$all_ok = true;
foreach ($tests as $t) {
  $out = normalize_date_to_utc($t['input']);
  if ($t['expected'] === null) {
    echo "Input: '{$t['input']}' => Output: {$out}\n";
    continue;
  }
  if (strpos($out, $t['expected']) === 0) {
    echo "OK: '{$t['input']}' => {$out} (expected starts with {$t['expected']})\n";
  } else {
    echo "FAIL: '{$t['input']}' => {$out} (expected starts with {$t['expected']})\n";
    $all_ok = false;
  }
}

if ($all_ok) {
  echo "All tests passed.\n";
} else {
  echo "Some tests failed.\n";
}
