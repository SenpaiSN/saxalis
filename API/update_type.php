<?php
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents('php://input'), true);
$id_type = isset($data['id_type']) ? (int)$data['id_type'] : 0;
$code = isset($data['code']) ? strtolower(trim($data['code'])) : null;
$label = isset($data['label']) ? trim($data['label']) : null;

if ($id_type <= 0 || $label === null || $label === '') {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => 'Champs manquants']);
  exit;
}

if ($code !== null && $code !== '' && !preg_match('/^[a-z0-9_\-]{1,50}$/', $code)) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => 'Code invalide']);
  exit;
}

try {
  // Ensure type exists
  $chk = $pdo->prepare('SELECT COUNT(1) FROM transaction_types WHERE id_type = ?');
  $chk->execute([$id_type]);
  if ((int)$chk->fetchColumn() === 0) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Type introuvable']);
    exit;
  }

  // If code provided, ensure uniqueness
  if ($code !== null && $code !== '') {
    $dup = $pdo->prepare('SELECT id_type FROM transaction_types WHERE code = ? AND id_type != ?');
    $dup->execute([$code, $id_type]);
    if ($dup->fetch()) {
      echo json_encode(['success' => false, 'error' => 'Code déjà utilisé']);
      exit;
    }
  }

  // Perform update
  if ($code !== null && $code !== '') {
    $stmt = $pdo->prepare('UPDATE transaction_types SET code = ?, label = ? WHERE id_type = ?');
    $stmt->execute([$code, $label, $id_type]);
  } else {
    $stmt = $pdo->prepare('UPDATE transaction_types SET label = ? WHERE id_type = ?');
    $stmt->execute([$label, $id_type]);
  }

  echo json_encode(['success' => true]);
} catch (PDOException $e) {
  error_log('update_type.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
