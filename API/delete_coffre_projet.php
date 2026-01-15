<?php

require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');
$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['id_projet'])) {
  http_response_code(400);
  echo json_encode(['error' => 'ID projet manquant']);
  exit;
}

http_response_code(410);
echo json_encode(['success' => false, 'error' => 'API dépréciée: supprimée au profit des objectifs (`objectif_crees`).']);
exit;
