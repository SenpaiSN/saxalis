<?php
// DEPRECATED: coffre_depots endpoints removed in migration to `objectif_crees` + transactions
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');
http_response_code(410);
echo json_encode(['success' => false, 'error' => 'API dépréciée: utilisez les objectifs (`objectif_crees`) et les transactions (id_type=3 pour dépôts).']);
exit;