<?php
// api/current_goal.php
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

$userId = current_user_id();

// Préparer les paramètres de la période courante
$input = json_decode(file_get_contents('php://input'), true);
$currentMonth = isset($input['month']) ? intval($input['month']) : intval(date('n'));
$currentYear  = isset($input['year'])  ? intval($input['year'])  : intval(date('Y'));

try {
    $sql = "
        SELECT
            period_month,
            period_year,
            target_amount,
            rollover_enabled
        FROM monthly_goals
        WHERE id_utilisateur = :uid
          AND period_month   = :pm
          AND period_year    = :py
        LIMIT 1
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':uid' => $userId,
        ':pm'  => $currentMonth,
        ':py'  => $currentYear,
    ]);

    $goal = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'goal'    => $goal ?: null
    ]);
} catch (PDOException $e) {
    error_log('current_goal.php PDOException: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}