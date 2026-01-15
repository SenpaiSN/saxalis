<?php
require 'auth.php';
require 'config.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

$uid = current_user_id();
try {
  $stmt = $pdo->prepare('SELECT id_utilisateur as id, firstName, lastName, Email, photo, date_inscription FROM utilisateurs WHERE id_utilisateur = :id LIMIT 1');
  $stmt->execute([':id' => $uid]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$user) {
    echo json_encode(['success' => false]);
    exit;
  }
  echo json_encode(['success' => true, 'user' => $user]);
} catch (PDOException $e) {
  error_log('get_user.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  // If ?debug=1 is present, return the PDO message to aid debugging (disable in production)
  if (!empty($_GET['debug']) && $_GET['debug'] == '1') {
    echo json_encode(['success' => false, 'error' => 'Erreur serveur', 'detail' => $e->getMessage()]);
  } else {
    echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
  }
}

?>
