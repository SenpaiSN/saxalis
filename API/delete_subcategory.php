<?php
require 'config.php';
require 'auth.php';
require_auth();

header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents('php://input'), true);
if (empty($data['id_subcategory'])) {
  http_response_code(400);
  echo json_encode(['success'=>false,'error'=>'id_subcategory missing']);
  exit;
}

$id = (int)$data['id_subcategory'];
$reassign_to = isset($data['reassign_to_subcategory_id']) && $data['reassign_to_subcategory_id'] !== '' ? (int)$data['reassign_to_subcategory_id'] : null;
$uid = current_user_id();

try {
  // ensure subcategory exists
  $stmt = $pdo->prepare('SELECT category_id FROM subcategories WHERE id_subcategory = :id LIMIT 1');
  $stmt->execute([':id' => $id]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$row) {
    http_response_code(404);
    echo json_encode(['success'=>false,'error'=>'Sous-catégorie introuvable']);
    exit;
  }

  // count related items (transactions & objectifs for this user)
  $txStmt = $pdo->prepare('SELECT COUNT(1) FROM transactions WHERE subcategory_id = :id AND id_utilisateur = :uid');
  $txStmt->execute([':id' => $id, ':uid' => $uid]);
  $txCount = (int)$txStmt->fetchColumn();

  $objStmt = $pdo->prepare('SELECT COUNT(1) FROM objectif_crees WHERE id_subcategory = :id AND user_id = :uid');
  $objStmt->execute([':id' => $id, ':uid' => $uid]);
  $objCount = (int)$objStmt->fetchColumn();

  if (($txCount > 0 || $objCount > 0) && $reassign_to === null) {
    // return counts so UI can prompt the user
    echo json_encode(['success'=>false, 'error'=>'contains_related', 'counts' => ['transactions' => $txCount, 'objectifs' => $objCount]]);
    exit;
  }

  if ($reassign_to !== null) {
    // verify target exists
    $chk = $pdo->prepare('SELECT COUNT(1) FROM subcategories WHERE id_subcategory = :tid LIMIT 1');
    $chk->execute([':tid' => $reassign_to]);
    if ((int)$chk->fetchColumn() === 0) {
      http_response_code(400);
      echo json_encode(['success'=>false,'error'=>'reassign target not found']);
      exit;
    }

    if ($reassign_to === $id) {
      http_response_code(400);
      echo json_encode(['success'=>false,'error'=>'cannot reassign to same subcategory']);
      exit;
    }

    // perform reassignment + delete in a transaction
    try {
      $pdo->beginTransaction();

      // move transactions owned by this user
      $uTx = $pdo->prepare('UPDATE transactions SET subcategory_id = :target WHERE subcategory_id = :id AND id_utilisateur = :uid');
      $uTx->execute([':target' => $reassign_to, ':id' => $id, ':uid' => $uid]);

      // move objectives created by this user
      $uObj = $pdo->prepare('UPDATE objectif_crees SET id_subcategory = :target WHERE id_subcategory = :id AND user_id = :uid');
      $uObj->execute([':target' => $reassign_to, ':id' => $id, ':uid' => $uid]);

      // delete the subcategory
      $del = $pdo->prepare('DELETE FROM subcategories WHERE id_subcategory = :id');
      $del->execute([':id' => $id]);

      $pdo->commit();
      echo json_encode(['success' => true, 'reassigned_transactions' => $uTx->rowCount(), 'reassigned_objectifs' => $uObj->rowCount()]);
      exit;
    } catch (Exception $e) {
      if ($pdo->inTransaction()) $pdo->rollBack();
      error_log('delete_subcategory: reassignment failed: ' . $e->getMessage());
      http_response_code(500);
      echo json_encode(['success'=>false,'error'=>'reassign failed']);
      exit;
    }
  }

  // no related items or reassign performed — safe to delete
  $del = $pdo->prepare('DELETE FROM subcategories WHERE id_subcategory = :id');
  $del->execute([':id' => $id]);
  echo json_encode(['success' => true]);

} catch (PDOException $e) {
  http_response_code(500);
  error_log('delete_subcategory.php PDOException: ' . $e->getMessage());
  echo json_encode(['success'=>false,'error'=>'db error']);
}
