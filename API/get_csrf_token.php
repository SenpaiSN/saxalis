<?php
/**
 * get_csrf_token.php
 * Returns a CSRF token for the current session
 * Called by frontend before making POST requests
 */

if (session_status() === PHP_SESSION_NONE) {
  session_start();
}

require 'security.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: https://saxalis.free.nf');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept');

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}

// Handle dev/localhost
if (isset($_SERVER['HTTP_ORIGIN'])) {
  $origin = $_SERVER['HTTP_ORIGIN'];
  $parsed = parse_url($origin);
  $host = isset($parsed['host']) ? $parsed['host'] : '';
  
  if (preg_match('/^(localhost|127\.0\.0\.1|::1)$/', $host)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
  }
}

// Generate and return token
$token = generate_csrf_token();

echo json_encode([
  'success' => true,
  'csrf_token' => $token
]);

?>
