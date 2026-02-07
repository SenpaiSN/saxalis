<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require 'config.php';

// 1) Vérifier auth et présence du fichier + transaction_id
if (empty($_SESSION['user']['id_utilisateur'])) {
  http_response_code(401);
  exit(json_encode(['success'=>false,'error'=>'Non connecté']));
}
if (empty($_POST['transaction_id']) || !isset($_FILES['invoice'])) {
  http_response_code(400);
  exit(json_encode(['success'=>false,'error'=>'Données manquantes']));
}

$txId   = (int)$_POST['transaction_id'];
$file   = $_FILES['invoice'];
$uploadDir = __DIR__ . '/../uploads/invoices/';
if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

// 2) Valider type/poids (< 5 Mo, jpeg/png/pdf)
$allowed = ['image/jpeg','image/png','application/pdf'];
if (!in_array($file['type'], $allowed) || $file['size'] > 5*1024*1024) {
  http_response_code(415);
  exit(json_encode(['success'=>false,'error'=>'Type ou taille invalide']));
}

// 3) Déplacer et sauvegarder le chemin
$filename   = uniqid($txId.'_') . '_' . basename($file['name']);
$targetPath = $uploadDir . $filename;
if (move_uploaded_file($file['tmp_name'], $targetPath)) {
  $stmt = $pdo->prepare("
    INSERT INTO transaction_files (transaction_id, file_path, file_type)
    VALUES (:tx, :path, :type)
  ");
  $stmt->execute([
    ':tx'   => $txId,
    ':path' => 'uploads/invoices/' . $filename,
    ':type' => $file['type']
  ]);
  // Return relative path of the stored file so clients can attach it without re-fetching
  echo json_encode(['success'=>true, 'file_path' => 'uploads/invoices/' . $filename]);
} else {
  http_response_code(500);
  echo json_encode(['success'=>false,'error'=>'Échec upload']);
}
