<?php
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

$userId = current_user_id();
$out = ['success' => false, 'user' => null, 'file_checks' => []];

try {
    $stmt = $pdo->prepare('SELECT photo FROM utilisateurs WHERE id_utilisateur = :id');
    $stmt->execute([':id' => $userId]);
    $photo = $stmt->fetchColumn();
    if ($photo === false) {
        // try alternative table
        $stmt = $pdo->prepare('SELECT photo FROM users WHERE id = :id');
        $stmt->execute([':id' => $userId]);
        $photo = $stmt->fetchColumn();
    }

    $out['user'] = ['id' => $userId, 'photo' => $photo];

    if ($photo) {
        $relative = ltrim($photo, '/\\');
        $full = realpath(__DIR__ . '/../' . $relative);
        $out['file_checks']['expected_path'] = $relative;
        $out['file_checks']['full_path'] = $full;
        $out['file_checks']['exists'] = $full && file_exists($full);
        if ($full && file_exists($full)) {
            $out['file_checks']['size'] = filesize($full);
            $out['file_checks']['writable'] = is_writable($full);
        }
    }

    $out['success'] = true;
} catch (Throwable $e) {
    $out['error'] = $e->getMessage();
}

@file_put_contents(__DIR__ . '/check_avatar.log', date('c') . " - " . json_encode($out) . "\n", FILE_APPEND);

echo json_encode($out);
