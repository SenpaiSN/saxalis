<?php
header('Content-Type: application/json; charset=utf-8');
require 'config.php';

// Only accept POST here — return JSON 405 for other methods to avoid serving HTML/index page
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
  http_response_code(405);
  echo json_encode(['success' => false, 'error' => 'Method Not Allowed']);
  exit;
}

// Robust input handling: accept JSON body or form-encoded POST
$raw = file_get_contents('php://input');
$input = json_decode($raw, true);
if (!is_array($input)) {
  // fallback to regular form POST
  $input = $_POST;
}

try {
  if (empty($input['email']) || empty($input['mot_de_passe'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Email et mot de passe requis']);
    exit;
  }

  $stmt = $pdo->prepare("SELECT id_utilisateur, firstName, lastName, Email, Mot_de_passe, photo, date_inscription FROM utilisateurs WHERE Email = :email LIMIT 1");
  $stmt->execute(['email' => $input['email']]);
  $user = $stmt->fetch();

  if (!$user || !password_verify($input['mot_de_passe'], $user['Mot_de_passe'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Identifiants invalides']);
    exit;
  }

  if (session_status() === PHP_SESSION_NONE) session_start();

  // prevent session fixation
  session_regenerate_id(true);

  $_SESSION['user'] = [
    'id_utilisateur' => (int)$user['id_utilisateur'],
    'firstName'      => $user['firstName'],
    'lastName'       => $user['lastName'],
    'email'          => $user['Email'],
    'date_inscription' => isset($user['date_inscription']) ? $user['date_inscription'] : null
  ];
  if (!empty($user['photo'])) $_SESSION['user']['photo'] = $user['photo'];



  // After successful login, trigger background processing of recurring occurrences for this user.
  try {
    $uid = (int)$_SESSION['user']['id_utilisateur'];
    $php = defined('PHP_BINARY') ? PHP_BINARY : 'php';
    $workerCmd = escapeshellarg($php) . ' -f ' . escapeshellarg(__DIR__ . '/recurring_worker.php') . ' -- ' . escapeshellarg($uid);

    if (stripos(PHP_OS, 'WIN') === 0) {
      // Windows: use start /B to launch without waiting
      $cmd = "start /B " . $workerCmd;
      @pclose(@popen($cmd, 'r'));
    } else {
      // Unix-like: background the process
      $cmd = $workerCmd . ' > /dev/null 2>&1 &';
      @exec($cmd);
    }

    // Background worker trigger removed (use cron job instead for better control)
  } catch (Throwable $e) {
    error_log('login recurring processing error: ' . $e->getMessage());
  }

  echo json_encode(['success' => true, 'user' => $_SESSION['user']]);
} catch (Throwable $e) {
  // catch-all to ensure we always return JSON instead of HTML error pages
  error_log('login.php error: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
