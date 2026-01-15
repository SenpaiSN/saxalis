<?php
require 'config.php';
require 'auth.php';
require_auth();

header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents('php://input'), true);
$code = isset($data['code']) ? strtolower(trim($data['code'])) : '';
$label = isset($data['label']) ? trim($data['label']) : '';

if ($code === '' || $label === '') {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => 'Champs manquants']);
  exit;
}

// validation simple: code alphanumérique + underscore
if (!preg_match('/^[a-z0-9_\-]{1,50}$/', $code)) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => 'Code invalide']);
  exit;
}

try {
  // Empêcher doublons sur le code
  $stmt = $pdo->prepare('SELECT id_type FROM transaction_types WHERE code = ?');
  $stmt->execute([$code]);
  if ($stmt->fetch()) {
    echo json_encode(['success' => false, 'error' => 'Code déjà existant']);
    exit;
  }

  $stmt = $pdo->prepare('INSERT INTO transaction_types (code, label) VALUES (?, ?)');
  $stmt->execute([$code, $label]);
  echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
} catch (PDOException $e) {
  // log sauf message détaillé côté client
  error_log('add_type.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
  exit;
}

