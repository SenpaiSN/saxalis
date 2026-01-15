<?php
require 'config.php';
require 'auth.php';
require 'security.php';
require_auth();
verify_csrf_token();
header('Content-Type: application/json; charset=utf-8');

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!is_array($data) || empty($data['current_password']) || empty($data['new_password'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Champs manquants']);
    exit;
}

$current = (string)$data['current_password'];
$new = (string)$data['new_password'];

if (strlen($new) < 8) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Le nouveau mot de passe doit comporter au moins 8 caractères']);
    exit;
}

$user_id = current_user_id();

try {
    $stmt = $pdo->prepare('SELECT Mot_de_passe FROM utilisateurs WHERE id_utilisateur = ? LIMIT 1');
    $stmt->execute([$user_id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Utilisateur introuvable']);
        exit;
    }

    $hash = $row['Mot_de_passe'];
    if (!password_verify($current, $hash)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Mot de passe actuel incorrect']);
        exit;
    }

    $newHash = password_hash($new, PASSWORD_DEFAULT);
    $upd = $pdo->prepare('UPDATE utilisateurs SET Mot_de_passe = ? WHERE id_utilisateur = ?');
    $ok = $upd->execute([$newHash, $user_id]);

    if ($ok) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Erreur lors de la mise à jour']);
    }
} catch (PDOException $e) {
    error_log('update_password.php PDOException: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
