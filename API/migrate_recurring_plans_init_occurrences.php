<?php
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

try {
  $uid = current_user_id();
  $stmt = $pdo->prepare("SELECT * FROM recurring_transactions WHERE user_id = :uid AND active = 1");
  $stmt->execute([':uid' => $uid]);
  $plans = $stmt->fetchAll(PDO::FETCH_ASSOC);

  $created = [];

  foreach ($plans as $plan) {
    // skip if there is already an occurrence linked to this plan
    $chk = $pdo->prepare("SELECT COUNT(*) FROM transactions WHERE id_utilisateur = :uid AND (recurring_group_id = :gid OR Notes LIKE :notes)");
    $chk->execute([':uid'=>$uid, ':gid'=>$plan['id'], ':notes' => "%Plan récurrent (id: {$plan['id']})%"]);
    $cnt = (int)$chk->fetchColumn();
    if ($cnt > 0) continue;

    // Prepare fields
    $txDate = $plan['date_time'] ? $plan['date_time'] : date('Y-m-d H:i:s');
    $providedType = trim((string)($plan['type'] ?? ''));
    $idType = null; $resolvedCode = $providedType;
    try {
      if ($providedType !== '') {
        $tstmt = $pdo->prepare("SELECT id_type, code FROM transaction_types WHERE LOWER(code) = LOWER(:code) LIMIT 1");
        $tstmt->execute([':code' => $providedType]);
        $found = $tstmt->fetch(PDO::FETCH_ASSOC);
        if ($found) { $idType = (int)$found['id_type']; $resolvedCode = $found['code']; }
      }
    } catch (Exception $e) { /* ignore */ }
    if (is_null($idType)) {
      $map = ['dépense'=>'expense','depense'=>'expense','revenu'=>'income','epargne'=>'epargne','eparge'=>'epargne'];
      $mapped = $map[mb_strtolower($providedType)] ?? null;
      if ($mapped) {
        try { $tstmt = $pdo->prepare("SELECT id_type, code FROM transaction_types WHERE LOWER(code) = LOWER(:code) LIMIT 1"); $tstmt->execute([':code' => $mapped]); $found = $tstmt->fetch(PDO::FETCH_ASSOC); if ($found) { $idType = (int)$found['id_type']; $resolvedCode = $found['code']; } else { $resolvedCode = $mapped; } } catch (Exception $e) { $resolvedCode = $mapped; }
      }
    }

    // category/subcategory
    $categoryId = null;
    if (!empty($plan['category'])) {
      try { $cstmt = $pdo->prepare("SELECT id_category FROM categories WHERE LOWER(name) = LOWER(:name) LIMIT 1"); $cstmt->execute([':name' => trim((string)$plan['category'])]); $catFound = $cstmt->fetchColumn(); if ($catFound) $categoryId = (int)$catFound; } catch (Exception $e) { }
    }
    $subcatId = isset($plan['subcategory_id']) && $plan['subcategory_id'] ? (int)$plan['subcategory_id'] : null;

    try {
      $pdo->beginTransaction();
      $txSql = "INSERT INTO transactions (id_utilisateur, id_type, `Date`, `Type`, category_id, subcategory_id, Montant, Notes, currency, Montant_eur, recurring_plan_id, recurring_group_id) VALUES (:uid, :idType, :date, :type, :cat, :subcat, :amount, :notes, :currency, :amount_eur, :planid, :groupid)";
      $txStmt = $pdo->prepare($txSql);
      $amount = $plan['amount'];
      $txStmt->execute([
        ':uid' => $uid,
        ':idType' => $idType,
        ':date' => $txDate,
        ':type' => $resolvedCode,
        ':cat' => $categoryId,
        ':subcat' => $subcatId,
        ':amount' => $amount,
        ':notes' => $plan['notes'] ? $plan['notes'] : "Plan récurrent (id: {$plan['id']})",
        ':currency' => 'EUR',
        ':amount_eur' => $amount,
        ':planid' => $plan['id'],
        ':groupid' => $plan['id']
      ]);

      $u = $pdo->prepare("UPDATE recurring_transactions SET last_run_date = :d WHERE id = :id");
      $u->execute([':d' => substr($txDate,0,10), ':id' => $plan['id']]);
      $pdo->commit();
      $created[] = ['plan_id' => $plan['id'], 'date' => $txDate, 'amount' => $amount];
    } catch (Exception $e) {
      if ($pdo->inTransaction()) $pdo->rollBack();
      error_log('migrate_recurring_plans init insert error: '.$e->getMessage());
    }
  }

  echo json_encode(['success'=>true, 'created' => $created]);
} catch (PDOException $e) {
  error_log('migrate_recurring_plans_init_occurrences.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
