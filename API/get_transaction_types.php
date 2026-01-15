<?php
require 'config.php';
require 'auth.php';

// CORS handled centrally in config.php
require_auth();
header('Content-Type: application/json; charset=utf-8');

try {
  $stmt = $pdo->query("SELECT id_type, code, label FROM transaction_types ORDER BY id_type");
  echo json_encode(['success'=>true,'types'=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
} catch (PDOException $e) {
  error_log('get_transaction_types.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success'=>false,'error'=>'Erreur serveur']);
}
