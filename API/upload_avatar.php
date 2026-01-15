<?php
// Early debug and error-to-JSON handlers so fatal errors produce JSON response
$debug = isset($_GET['debug']) && $_GET['debug'] === '1';
ini_set('display_errors', 0);
error_reporting(E_ALL);
set_error_handler(function($severity, $message, $file, $line) {
  // convert warnings/notices to exceptions so they are caught
  throw new ErrorException($message, 0, $severity, $file, $line);
});
register_shutdown_function(function() use ($debug) {
  $err = error_get_last();
  if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    $out = ['success' => false, 'error' => 'Fatal server error'];
    if ($debug) $out['debug'] = $err['message'] . ' in ' . $err['file'] . ' on line ' . $err['line'];
    echo json_encode($out);
  }
});

require_once 'config.php';
require 'auth.php';
require_once 'upload_helper.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

$user_id = current_user_id();

if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => 'Fichier manquant']);
  exit;
}

$file = $_FILES['avatar'];
$allowed = ['image/jpeg','image/png','image/webp'];
$stored = store_uploaded_file($file, __DIR__ . '/../uploads/profiles/', $allowed, 2 * 1024 * 1024);
if ($stored === false) {
  http_response_code(415);
  echo json_encode(['success' => false, 'error' => 'Type ou taille invalide ou échec stockage']);
  exit;
}

$photoPath = 'uploads/profiles/' . basename($stored);

try {
  // Fetch previous photo (if any) so we can remove the old file after success
  $oldPhoto = null;
  $lastDbError = null;
  try {
    $stmt = $pdo->prepare('SELECT photo FROM utilisateurs WHERE id_utilisateur = :id');
    $stmt->execute([':id' => $user_id]);
    $oldPhoto = $stmt->fetchColumn();
  } catch (PDOException $e) {
    try {
      $stmt = $pdo->prepare('SELECT photo FROM users WHERE id = :id');
      $stmt->execute([':id' => $user_id]);
      $oldPhoto = $stmt->fetchColumn();
    } catch (PDOException $e2) {
      // ignore - old photo unknown
      $oldPhoto = null;
      $lastDbError = $e2->getMessage();
    }
  }

  // Try to update likely table/columns; support both schema variants
  $dbUpdated = false;
  try {
    $stmt = $pdo->prepare('UPDATE utilisateurs SET photo = :photo WHERE id_utilisateur = :id');
    $stmt->execute([':photo' => $photoPath, ':id' => $user_id]);
    $dbUpdated = true;
  } catch (PDOException $e) {
    // fallback to alternate naming
    try {
      $stmt = $pdo->prepare('UPDATE users SET photo = :photo WHERE id = :id');
      $stmt->execute([':photo' => $photoPath, ':id' => $user_id]);
      $dbUpdated = true;
    } catch (PDOException $e2) {
      error_log('upload_avatar.php DB update failed: ' . $e2->getMessage());
      $lastDbError = $e2->getMessage();
      // don't fail the upload if DB update fails; return stored path
    }
  }

  // If DB updated successfully, attempt to remove old photo file (don't block on failure)
  if ($dbUpdated) {
    if ($oldPhoto) {
      $oldFull = __DIR__ . '/../' . ltrim($oldPhoto, '/\\');
      $newFull = __DIR__ . '/../' . ltrim($photoPath, '/\\');
      // remove old only if it's a different filename and exists
      if ($oldFull !== $newFull && file_exists($oldFull) && is_file($oldFull)) {
        try { @unlink($oldFull); } catch (Exception $ex) { error_log('upload_avatar.php unlink failed: ' . $ex->getMessage()); }
      }
    }

    // update session user photo if session user exists
    if (session_status() !== PHP_SESSION_ACTIVE) session_start();
    if (!empty($_SESSION['user'])) {
      $_SESSION['user']['photo'] = $photoPath;
    }
  }

  if (!$dbUpdated && $debug) {
    // Return debug info to help diagnose why DB update failed during development
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'DB update failed', 'debug' => $lastDbError]);
    exit;
  }

  echo json_encode(['success' => true, 'path' => $photoPath]);
} catch (Throwable $e) {
  // Log the full throwable and return a JSON error. In debug mode, include message.
  error_log('upload_avatar.php Throwable: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
  http_response_code(500);
  if (!empty($debug)) {
    echo json_encode(['success' => false, 'error' => 'Erreur serveur', 'debug' => $e->getMessage()]);
  } else {
    echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
  }
}

?>
