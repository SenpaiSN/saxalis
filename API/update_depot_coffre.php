<?php
// API/update_depot_coffre.php
// Réponse strictement JSON
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
error_reporting(E_ERROR | E_PARSE);

require_once 'config.php';
require 'auth.php';
require_once 'upload_helper.php';
require_auth();

function send_json($arr) {
    echo json_encode($arr);
    exit;
}

// Récupération des données JSON ou POST (FormData)
http_response_code(410);
echo json_encode(['success'=>false,'error'=>'API dépréciée: utilisez les transactions (id_type=3) pour gérer les dépôts d\'objectifs.']);
exit;
