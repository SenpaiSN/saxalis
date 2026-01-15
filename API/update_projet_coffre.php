
<?php
// DEPRECATED: This endpoint has been archived. Use `update_objectif.php` to modify objectives in `objectif_crees`.
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');
http_response_code(410);
echo json_encode(['success' => false, 'error' => 'API dépréciée: utilisez `update_objectif.php`']);
exit;
