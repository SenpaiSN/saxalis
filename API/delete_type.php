<?php
require 'config.php';
require 'auth.php';
require_auth();

header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents('php://input'), true);
if (empty($data['id_type'])) {
  http_response_code(400);
  echo json_encode(['success'=>false,'error'=>'id_type missing']);
  exit;
}

$id = (int)$data['id_type'];
$reassign_to_type = isset($data['reassign_to_type_id']) && $data['reassign_to_type_id'] !== '' ? (int)$data['reassign_to_type_id'] : null;

try {
  // ensure type exists
  $stmt = $pdo->prepare('SELECT COUNT(1) FROM transaction_types WHERE id_type = :id');
  $stmt->execute([':id' => $id]);
  if ((int)$stmt->fetchColumn() === 0) {
    http_response_code(404);
    echo json_encode(['success'=>false,'error'=>'Type introuvable']);
    exit;
  }

  // find categories under this type
  $catStmt = $pdo->prepare('SELECT id_category FROM categories WHERE id_type = :id');
  $catStmt->execute([':id' => $id]);
  $cats = $catStmt->fetchAll(PDO::FETCH_COLUMN);
  $catCount = count($cats);

  if ($catCount > 0 && $reassign_to_type === null) {
    echo json_encode(['success'=>false,'error'=>'contains_related','counts' => ['categories' => $catCount]]);
    exit;
  }

  if ($reassign_to_type !== null) {
    // verify target exists
    $chk = $pdo->prepare('SELECT COUNT(1) FROM transaction_types WHERE id_type = :tid');
    $chk->execute([':tid' => $reassign_to_type]);
    if ((int)$chk->fetchColumn() === 0) {
      http_response_code(400);
      echo json_encode(['success'=>false,'error'=>'reassign target not found']);
      exit;
    }

    try {
      $pdo->beginTransaction();

      // reassign categories
      $upd = $pdo->prepare('UPDATE categories SET id_type = :target WHERE id_type = :id');
      $upd->execute([':target' => $reassign_to_type, ':id' => $id]);

      // delete the type
      $del = $pdo->prepare('DELETE FROM transaction_types WHERE id_type = :id');
      $del->execute([':id' => $id]);

      $pdo->commit();
      echo json_encode(['success' => true, 'reassigned_categories' => $upd->rowCount()]);
      exit;
    } catch (Exception $e) {
      if ($pdo->inTransaction()) $pdo->rollBack();
      error_log('delete_type: reassignment failed: ' . $e->getMessage());
      http_response_code(500);
      echo json_encode(['success'=>false,'error'=>'reassign failed']);
      exit;
    }
  }

  // safe to delete if no categories
  $del = $pdo->prepare('DELETE FROM transaction_types WHERE id_type = :id');
  $del->execute([':id' => $id]);
  echo json_encode(['success' => true]);

} catch (PDOException $e) {
  http_response_code(500);
  error_log('delete_type.php PDOException: ' . $e->getMessage());
  echo json_encode(['success'=>false,'error'=>'db error']);
}
