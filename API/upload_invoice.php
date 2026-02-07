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
$userId = (int)$_SESSION['user']['id_utilisateur'];
$file   = $_FILES['invoice'];

// SECURITY FIX: Vérifier que la transaction appartient à l'utilisateur
$stmt = $pdo->prepare("SELECT id_utilisateur FROM transactions WHERE id_transaction = :id");
$stmt->execute([':id' => $txId]);
$owner = $stmt->fetchColumn();

if ($owner === false) {
  http_response_code(404);
  exit(json_encode(['success'=>false,'error'=>'Transaction introuvable']));
}

if ((int)$owner !== $userId) {
  http_response_code(403);
  exit(json_encode(['success'=>false,'error'=>'Vous ne pouvez pas modifier cette transaction']));
}

$uploadDir = __DIR__ . '/../uploads/invoices/';
if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

// 2) SECURITY FIX: Valider type MIME réel avec finfo
$allowed = ['image/jpeg','image/png','application/pdf'];

// Vérifier le MIME type réel du fichier (pas celui fourni par le client)
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$realMime = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($realMime, $allowed)) {
  http_response_code(415);
  exit(json_encode([
    'success'=>false,
    'error'=>'Type de fichier non autorisé (détecté: ' . $realMime . ')'
  ]));
}

// Vérifier également l'extension
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
$allowedExt = ['jpg','jpeg','png','pdf'];
if (!in_array($ext, $allowedExt)) {
  http_response_code(415);
  exit(json_encode(['success'=>false,'error'=>'Extension de fichier non autorisée']));
}

// Vérifier la taille (< 5 Mo)
if ($file['size'] > 5*1024*1024) {
  http_response_code(413);
  exit(json_encode(['success'=>false,'error'=>'Fichier trop volumineux (maximum 5 Mo)']));
}

// 3) Sanitize filename et déplacer
$safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', basename($file['name']));
$filename = uniqid($txId.'_') . '_' . $safeName;
$targetPath = $uploadDir . $filename;

if (move_uploaded_file($file['tmp_name'], $targetPath)) {
  // OPTIONAL: Compression JPEG si image
  if ($realMime === 'image/jpeg' && function_exists('imagecreatefromjpeg')) {
    try {
      $img = imagecreatefromjpeg($targetPath);
      if ($img !== false) {
        imagejpeg($img, $targetPath, 80); // Quality 80%
        imagedestroy($img);
      }
    } catch (Exception $e) {
      // Ignore compression errors, file is already uploaded
      error_log('JPEG compression failed: ' . $e->getMessage());
    }
  }

  $stmt = $pdo->prepare("
    INSERT INTO transaction_files (transaction_id, file_path, file_type)
    VALUES (:tx, :path, :type)
  ");
  $stmt->execute([
    ':tx'   => $txId,
    ':path' => 'uploads/invoices/' . $filename,
    ':type' => $realMime
  ]);
  
  echo json_encode(['success'=>true, 'file_path' => 'uploads/invoices/' . $filename]);
} else {
  http_response_code(500);
  echo json_encode(['success'=>false,'error'=>'Échec upload']);
}
