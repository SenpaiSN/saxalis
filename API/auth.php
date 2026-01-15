<?php
// auth.php - centralise la vérification de session
if (session_status() === PHP_SESSION_NONE) {
  session_start();
}

/**
 * Envoie une réponse 401 JSON et exit si non authentifié
 */
function require_auth() {
  if (empty($_SESSION['user']['id_utilisateur'])) {
    http_response_code(401);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => 'Non authentifié']);
    exit;
  }
}

/**
 * Retourne l'id utilisateur courant (int)
 */
function current_user_id(): int {
  return isset($_SESSION['user']['id_utilisateur']) ? (int) $_SESSION['user']['id_utilisateur'] : 0;
}

?>
