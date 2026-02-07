<?php
/**
 * Test: vérifier si curl peut accéder aux API externes sur InfinityFree
 * Fichier temporaire pour diagnostic
 */

require 'config.php';
require 'auth.php';
require_auth();

header('Content-Type: application/json; charset=utf-8');

// Test 1: Vérifier si curl existe
$curl_enabled = extension_loaded('curl');

// Test 2: Essayer un appel simple à Google
$ch = curl_init('https://www.google.com');
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT => 5,
  CURLOPT_SSL_VERIFYPEER => false
]);
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
curl_close($ch);

// Test 3: Essayer Mindee API
$mindee_test = null;
if ($curl_enabled) {
  $ch = curl_init('https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict');
  curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => [],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 5,
    CURLOPT_SSL_VERIFYPEER => false
  ]);
  $response = curl_exec($ch);
  $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $curl_error = curl_error($ch);
  curl_close($ch);
  
  $mindee_test = [
    'http_code' => $http_code,
    'error' => $curl_error,
    'accessible' => $http_code > 0 && !$curl_error
  ];
}

echo json_encode([
  'curl_enabled' => $curl_enabled,
  'google_test' => [
    'http_code' => $http_code,
    'error' => $curl_error,
    'accessible' => $http_code > 0 && !$curl_error
  ],
  'mindee_test' => $mindee_test,
  'conclusion' => !$curl_enabled ? 'curl not available' : ($http_code == 0 ? 'InfinityFree blocks external API calls' : 'External APIs seem accessible')
], JSON_PRETTY_PRINT);
?>
