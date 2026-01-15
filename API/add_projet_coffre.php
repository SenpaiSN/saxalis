<?php
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents('php://input'), true);

$nom              = trim($data['nom']);
$montant_objectif = (float)$data['montant_objectif'];
$type_id          = (int)$data['type_id'];
$date_cible       = $data['date_cible'] ?: null;

// DEPRECATED: coffre_* endpoints removed in migration to `objectif_crees` + transactions
http_response_code(410);
echo json_encode(['success' => false, 'error' => 'API dépréciée. Créez un objectif via la table `objectif_crees`.']);
exit;
