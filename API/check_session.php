<?php


require 'config.php';
require 'auth.php'; // auth.php ensures session is started

// CORS handled centrally in config.php

header('Content-Type: application/json; charset=utf-8');



if (!empty($_SESSION['user'])) {
  // Ensure we have the fresh date_inscription in the session (useful when the column was added after a session was created)
  if (empty($_SESSION['user']['date_inscription']) && !empty($_SESSION['user']['id_utilisateur'])) {
    try {
      $stmt = $pdo->prepare('SELECT date_inscription, photo, Email, firstName, lastName, currency FROM utilisateurs WHERE id_utilisateur = :id LIMIT 1');
      $stmt->execute([':id' => $_SESSION['user']['id_utilisateur']]);
      $row = $stmt->fetch(PDO::FETCH_ASSOC);
      if ($row) {
        if (!empty($row['date_inscription'])) $_SESSION['user']['date_inscription'] = $row['date_inscription'];
        if (!empty($row['photo'])) $_SESSION['user']['photo'] = $row['photo'];
        if (!empty($row['Email'])) $_SESSION['user']['email'] = $row['Email'];
        if (!empty($row['firstName'])) $_SESSION['user']['firstName'] = $row['firstName'];
        if (!empty($row['lastName'])) $_SESSION['user']['lastName'] = $row['lastName'];
        if (!empty($row['currency'])) $_SESSION['user']['currency'] = strtoupper($row['currency']);
      }
    } catch (Exception $e) {
      // ignore DB lookup failure; still return session user
      error_log('check_session: failed to refresh user fields - ' . $e->getMessage());
    }
  }

  // Ensure currency is present in the session response even if the session was created earlier
  try {
    if (empty($_SESSION['user']['currency']) && !empty($_SESSION['user']['id_utilisateur'])) {
      $stmt2 = $pdo->prepare('SELECT currency FROM utilisateurs WHERE id_utilisateur = :id LIMIT 1');
      $stmt2->execute([':id' => $_SESSION['user']['id_utilisateur']]);
      $r2 = $stmt2->fetch(PDO::FETCH_ASSOC);
      if ($r2 && !empty($r2['currency'])) {
        $_SESSION['user']['currency'] = strtoupper($r2['currency']);
      }
    }
  } catch (Exception $e) {
    error_log('check_session: failed to refresh currency - ' . $e->getMessage());
  }

  echo json_encode(['success' => true, 'user' => $_SESSION['user']]);
} else {
  echo json_encode(['success' => false]);
}

