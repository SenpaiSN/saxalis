<?php
header('Content-Type: application/json; charset=utf-8');
require 'config.php';

$data = json_decode(file_get_contents('php://input'), true);
if (!isset($data['email'], $data['mot_de_passe'], $data['firstName'], $data['lastName'])) {
  http_response_code(400);
  echo json_encode(['error' => 'Champs manquants']);
  exit;
}

if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
  http_response_code(400);
  echo json_encode(['error' => 'Email invalide']);
  exit;
}

try {
  // vérifier unicité email
  $check = $pdo->prepare('SELECT id_utilisateur FROM utilisateurs WHERE Email = ?');
  $check->execute([$data['email']]);
  if ($check->fetch()) {
    http_response_code(409);
    echo json_encode(['success' => false, 'error' => 'Email déjà utilisé']);
    exit;
  }

  $hash = password_hash($data['mot_de_passe'], PASSWORD_DEFAULT);
  $stmt = $pdo->prepare("INSERT INTO utilisateurs (Email, Mot_de_passe, firstName, lastName) VALUES (:email, :pwd, :fn, :ln)");
  $stmt->execute([
    ':email' => $data['email'],
    ':pwd'   => $hash,
    ':fn'    => $data['firstName'],
    ':ln'    => $data['lastName']
  ]);

  $newId = $pdo->lastInsertId();
  // fetch date_inscription to return it immediately
  $stmt2 = $pdo->prepare('SELECT date_inscription FROM utilisateurs WHERE id_utilisateur = ? LIMIT 1');
  $stmt2->execute([$newId]);
  $row = $stmt2->fetch(PDO::FETCH_ASSOC);
  $date_inscription = $row['date_inscription'] ?? null;

  echo json_encode([
    'success' => true,
    'user'    => [
      'id_utilisateur' => $newId,
      'email'          => $data['email'],
      'firstName'      => $data['firstName'],
      'lastName'       => $data['lastName'],
      'date_inscription' => $date_inscription
    ]
  ]);
} catch (PDOException $e) {
  error_log('register.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
