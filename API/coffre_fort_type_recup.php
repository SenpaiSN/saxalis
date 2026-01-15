<?php
// DEPRECATED: project types (type_projet) removed with migration to `objectif_crees` + transactions
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');
http_response_code(410);
echo json_encode(['success' => false, 'error' => 'API dépréciée: les types de projet ont été supprimés. Utilisez `objectif_crees` et transactions.']);
exit;
