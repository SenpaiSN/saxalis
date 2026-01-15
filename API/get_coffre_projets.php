<?php
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

$uid = current_user_id();

// Deprecated endpoint
http_response_code(410);
echo json_encode(['success' => false, 'error' => 'API dépréciée: utilisez `get_objectifs_crees.php` et transactions (id_type=3 pour dépôts).']);
exit;
