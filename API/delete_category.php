<?php
require 'config.php';
require 'auth.php';
require 'security.php';
require_auth();

header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents('php://input'), true);

// CSRF Token verification
try {
  verify_csrf_token();
} catch (Exception $e) {
  http_response_code(403);
  echo json_encode(['success'=>false,'error'=>'CSRF token invalid or missing']);
  exit;
}

// Validate inputs
try {
  if (!isset($data['id_category'])) {
    throw new ValidationException('id_category is required');
  }
  
  $id_category = validate_int($data['id_category'], 'id_category');
  $reassign_to_subcategory = isset($data['reassign_to_subcategory_id']) ? validate_int($data['reassign_to_subcategory_id'], 'reassign_to_subcategory_id', true) : null;
} catch (ValidationException $e) {
  http_response_code(400);
  echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
  exit;
}

$uid = current_user_id();

try {
  // ensure category exists
  $stmt = $pdo->prepare('SELECT id_type FROM categories WHERE id_category = :id LIMIT 1');
  $stmt->execute([':id' => $id_category]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$row) {
    http_response_code(404);
    echo json_encode(['success'=>false,'error'=>'Catégorie introuvable']);
    exit;
  }

  // collect subcategories under this category
  $scStmt = $pdo->prepare('SELECT id_subcategory FROM subcategories WHERE category_id = :id');
  $scStmt->execute([':id' => $id_category]);
  $subcats = $scStmt->fetchAll(PDO::FETCH_COLUMN);

  // counts
  $subCount = count($subcats);
  $txCount = 0;
  $objCount = 0;
  if ($subCount > 0) {
    $in = implode(',', array_map('intval', $subcats));
    $txSql = "SELECT COUNT(1) FROM transactions WHERE subcategory_id IN ($in) AND id_utilisateur = :uid";
    $txStmt = $pdo->prepare($txSql);
    $txStmt->execute([':uid' => $uid]);
    $txCount = (int)$txStmt->fetchColumn();

    $objSql = "SELECT COUNT(1) FROM objectif_crees WHERE id_subcategory IN ($in) AND user_id = :uid";
    $objStmt = $pdo->prepare($objSql);
    $objStmt->execute([':uid' => $uid]);
    $objCount = (int)$objStmt->fetchColumn();
  }

  if (($txCount > 0 || $objCount > 0) && $reassign_to_subcategory === null) {
    echo json_encode(['success'=>false,'error'=>'contains_related','counts' => ['subcategories' => $subCount, 'transactions' => $txCount, 'objectifs' => $objCount]]);
    exit;
  }

  if ($reassign_to_subcategory !== null) {
    // verify target exists
    $chk = $pdo->prepare('SELECT COUNT(1) FROM subcategories WHERE id_subcategory = :tid LIMIT 1');
    $chk->execute([':tid' => $reassign_to_subcategory]);
    if ((int)$chk->fetchColumn() === 0) {
      http_response_code(400);
      echo json_encode(['success'=>false,'error'=>'reassign target not found']);
      exit;
    }

    try {
      $pdo->beginTransaction();

      if ($subCount > 0) {
        // update transactions from all subcats to target
        $updateSql = "UPDATE transactions SET subcategory_id = :target WHERE subcategory_id IN ($in) AND id_utilisateur = :uid";
        $uTx = $pdo->prepare($updateSql);
        $uTx->execute([':target' => $reassign_to_subcategory, ':uid' => $uid]);

        // move objectifs
        $updateObjSql = "UPDATE objectif_crees SET id_subcategory = :target WHERE id_subcategory IN ($in) AND user_id = :uid";
        $uObj = $pdo->prepare($updateObjSql);
        $uObj->execute([':target' => $reassign_to_subcategory, ':uid' => $uid]);

        // delete old subcategories
        $delSc = $pdo->prepare("DELETE FROM subcategories WHERE category_id = :id");
        $delSc->execute([':id' => $id_category]);
      }

      // delete category
      $delCat = $pdo->prepare('DELETE FROM categories WHERE id_category = :id');
      $delCat->execute([':id' => $id_category]);

      $pdo->commit();
      echo json_encode(['success' => true, 'reassigned_transactions' => isset($uTx) ? $uTx->rowCount() : 0, 'reassigned_objectifs' => isset($uObj) ? $uObj->rowCount() : 0, 'deleted_subcategories' => $subCount]);
      exit;
    } catch (Exception $e) {
      if ($pdo->inTransaction()) $pdo->rollBack();
      error_log('delete_category: reassignment failed: ' . $e->getMessage());
      http_response_code(500);
      echo json_encode(['success'=>false,'error'=>'reassign failed']);
      exit;
    }
  }

  // no related items or reassign performed — safe to delete subcategories (if none) and category
  if ($subCount === 0) {
    $delCat = $pdo->prepare('DELETE FROM categories WHERE id_category = :id');
    $delCat->execute([':id' => $id_category]);
    echo json_encode(['success' => true]);
    exit;
  }

  // fallback (shouldn't reach here)
  echo json_encode(['success' => false, 'error' => 'Unhandled case']);

} catch (PDOException $e) {
  http_response_code(500);
  error_log('delete_category.php PDOException: ' . $e->getMessage());
  echo json_encode(['success'=>false,'error'=>'db error']);
}

