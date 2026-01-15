<?php
// API pour récupérer les dépôts avec info projet
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

// Deprecated endpoint
http_response_code(410);
echo json_encode(['success' => false, 'error' => 'API dépréciée: utilisez transactions (id_type=3) pour lister les dépôts d\'objectifs.']);
exit;
