<?php
require 'config.php';
require 'auth.php';
require 'security.php';
require_auth();
verify_csrf_token();
header('Content-Type: application/json; charset=utf-8');

// Expect JSON body with { currency: 'XOF' }
$body = json_decode(file_get_contents('php://input'), true) ?? [];
try {
  $currency = validate_currency($body['currency'] ?? null, ['EUR', 'XOF']);
  $uid = $_SESSION['user']['id_utilisateur'] ?? null;
  if (!$uid) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Not authenticated']);
    exit;
  }

  $stmt = $pdo->prepare('UPDATE utilisateurs SET currency = :currency WHERE id_utilisateur = :id');
  $stmt->execute([':currency' => $currency, ':id' => $uid]);

  // update session copy
  if (!empty($_SESSION['user'])) {
    $_SESSION['user']['currency'] = $currency;
  }

  echo json_encode(['success' => true, 'currency' => $currency]);
} catch (ValidationException $ve) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => $ve->getMessage()]);
} catch (Exception $e) {
  error_log('update_user_pref.php: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Server error']);
}
