<?php
require_once 'config.php';
require 'auth.php';
require 'security.php';
require_once 'upload_helper.php';
require_auth();
verify_csrf_token();
header('Content-Type: application/json; charset=utf-8');

$user_id = current_user_id();
$name = isset($_POST['name']) ? trim($_POST['name']) : '';
$email = isset($_POST['email']) ? trim($_POST['email']) : '';
$photo = null;

if (empty($name) || empty($email)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Champs obligatoires manquants']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Email invalide']);
    exit;
}

// Gestion de la photo de profil
if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
    $allowed = ['image/jpeg','image/png'];
    $stored = store_uploaded_file($_FILES['photo'], __DIR__ . '/../uploads/profiles/', $allowed, 2 * 1024 * 1024);
    if ($stored !== false) {
        $photo = 'uploads/profiles/' . basename($stored);
    }
}

// Séparer prénom/nom si besoin
$first_name = $last_name = '';
$parts = explode(' ', $name, 2);
$first_name = $parts[0];
$last_name = isset($parts[1]) ? $parts[1] : '';

try {
    $sql = 'UPDATE users SET first_name = ?, last_name = ?, email = ?' . ($photo ? ', photo = ?' : '') . ' WHERE id = ?';
    $params = [$first_name, $last_name, $email];
    if ($photo) $params[] = $photo;
    $params[] = $user_id;
    $stmt = $pdo->prepare($sql);
    $success = $stmt->execute($params);

    if ($success) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Erreur lors de la mise à jour']);
    }
} catch (PDOException $e) {
    error_log('update_user_profile.php PDOException: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
