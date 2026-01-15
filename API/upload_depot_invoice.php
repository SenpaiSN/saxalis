<?php
// upload_depot_invoice.php
header('Content-Type: application/json');
require_once 'config.php';

$response = ["success" => false];

if (!isset($_POST['depot_id']) || !isset($_FILES['facture'])) {
    $response["error"] = "Données manquantes (depot_id ou fichier)";
    echo json_encode($response);
    exit;
}

$depot_id = intval($_POST['depot_id']);
$file = $_FILES['facture'];

// Vérification des erreurs d'upload
if ($file['error'] !== UPLOAD_ERR_OK) {
    $response["error"] = "Erreur lors de l'upload du fichier.";
    echo json_encode($response);
    exit;
}

// Vérification de l'extension
$allowed = ['pdf', 'jpg', 'jpeg', 'png'];
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if (!in_array($ext, $allowed)) {
    $response["error"] = "Extension de fichier non autorisée.";
    echo json_encode($response);
    exit;
}

// Génération d'un nom unique
$unique = uniqid($depot_id . '_');
$filename = $unique . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $file['name']);
$targetDir = __DIR__ . '/../uploads/invoices/';
$targetPath = $targetDir . $filename;
$relativePath = 'uploads/invoices/' . $filename;

if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    $response["error"] = "Impossible de sauvegarder le fichier.";
    echo json_encode($response);
    exit;
}

// This endpoint is deprecated because coffre_depots are removed in favor of transactions + files can be attached via transaction file endpoints.
http_response_code(410);
echo json_encode(['success' => false, 'error' => 'API dépréciée : dépôt de coffre supprimé.']);
exit;