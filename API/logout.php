<?php
require 'config.php';
require 'auth.php';

// Assurer qu'aucun output n'est envoyé avant l'en-tête JSON
if (session_status() === PHP_SESSION_NONE) {
	session_start();
}

// Use centralized destroy function to ensure session is cleaned consistently
if (function_exists('destroy_session')) {
  destroy_session();
} else {
  // fallback to manual cleanup
  $_SESSION = [];
  if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
      $params['path'], $params['domain'],
      $params['secure'], $params['httponly']
    );
  }
  @session_destroy();
}

// Renvoyer toujours un JSON clair
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['success' => true]);
exit;
?>
