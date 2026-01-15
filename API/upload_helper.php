<?php
// upload_helper.php - fonctions utilitaires pour stocker des fichiers uploadés en sécurité

/**
 * Valide et stocke un fichier uploadé de manière sécurisée.
 * Retourne le chemin relatif stocké en base (ou false en cas d'erreur).
 * @param array $file element de $_FILES
 * @param string $targetDir absolute or relative path where to store files
 * @param array $allowedMimes
 * @param int $maxBytes
 * @return string|false
 */
function store_uploaded_file(array $file, string $targetDir, array $allowedMimes, int $maxBytes = 5242880) {
  if (!isset($file) || $file['error'] !== UPLOAD_ERR_OK) return false;
  if ($file['size'] > $maxBytes) return false;

  // Vérifie le type MIME réel. Prefer using the fileinfo extension (finfo).
  // If finfo is unavailable (extension disabled), fall back to mime_content_type
  // or finally to the client-provided type (less secure).
  $mime = null;
  if (class_exists('finfo')) {
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']);
  } elseif (function_exists('mime_content_type')) {
    $mime = mime_content_type($file['tmp_name']);
  } else {
    // Last resort: use the browser-provided MIME type (not fully trusted)
    $mime = $file['type'] ?? null;
  }
  if ($mime === false || $mime === null) return false;
  if (!in_array($mime, $allowedMimes, true)) return false;

  // sanitize filename
  $base = preg_replace('/[^A-Za-z0-9._-]/u', '_', basename($file['name']));
  $base = mb_strimwidth($base, 0, 150);
  try {
    $uniq = bin2hex(random_bytes(6));
  } catch (Exception $e) {
    $uniq = uniqid();
  }
  $filename = time() . '_' . $uniq . '_' . $base;

  if (!is_dir($targetDir)) {
    if (!mkdir($targetDir, 0755, true)) return false;
  }

  $dest = rtrim($targetDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $filename;
  if (!move_uploaded_file($file['tmp_name'], $dest)) return false;
  @chmod($dest, 0644);

  // retourne chemin relatif utilisé par le projet
  return $dest;
}

?>
