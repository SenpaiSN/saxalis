<?php
require 'config.php';
require 'auth.php';
require_auth();

// CORS handled centrally in config.php

header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents('php://input'), true);
$goalId = isset($data['id']) ? (int)$data['id'] : 0;
if (!$goalId) {
  http_response_code(400);
  echo json_encode(['success'=>false,'error'=>'ID manquant']);
  exit;
}

try {
  // Deprecated: deleting coffre_projets removed
  http_response_code(410);
  echo json_encode(['success' => false, 'error' => 'API dépréciée: utilisez la suppression d\'objectifs (`objectif_crees`)']);
  exit;
} catch (PDOException $e) {
  error_log('delete_goal.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success'=>false,'error'=>'Erreur serveur']);
}
