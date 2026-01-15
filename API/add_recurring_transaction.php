<?php
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

try {
  $uid = current_user_id();

  // create table if not exists (simple migration fallback)
  $pdo->exec("CREATE TABLE IF NOT EXISTS recurring_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(14,2) NOT NULL,
    type VARCHAR(50) NOT NULL,
    category VARCHAR(255) DEFAULT NULL,
    subcategory_id INT DEFAULT NULL,
    date_time DATETIME DEFAULT NULL,
    frequency VARCHAR(20) DEFAULT 'monthly',
    interval_count INT DEFAULT 1,
    end_date DATE DEFAULT NULL,
    last_run_date DATE DEFAULT NULL,
    active TINYINT(1) DEFAULT 1,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )");

  $input = json_decode(file_get_contents('php://input'), true);
  if (!$input) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Aucun payload.']);
    exit;
  }

  // Normalize DateTime input: interpret naive client datetimes as Europe/Paris and store as UTC
  $date = null;
  if (isset($input['Date']) && trim($input['Date']) !== '') {
    $rawDate = str_replace('T',' ', trim($input['Date']));
    $dt = DateTime::createFromFormat('Y-m-d H:i:s', $rawDate, new DateTimeZone('Europe/Paris'));
    if ($dt === false) {
      try { $dt = new DateTime($rawDate, new DateTimeZone('Europe/Paris')); } catch (Exception $e) { $dt = null; }
    }
    if ($dt) {
      $dt->setTimezone(new DateTimeZone('UTC'));
      $date = $dt->format('Y-m-d H:i:s');
    } else {
      $date = null;
    }
  }
  $type = isset($input['Type']) ? $input['Type'] : '';
  $amount = isset($input['Montant']) ? (float)$input['Montant'] : 0.0;
  $category = isset($input['Catégorie']) ? $input['Catégorie'] : null;
  $subcat = isset($input['Sous-catégorie']) ? $input['Sous-catégorie'] : null;
  $notes = isset($input['Notes']) ? $input['Notes'] : null;
  $frequency = isset($input['frequency']) ? $input['frequency'] : 'monthly';
  $interval = isset($input['interval']) ? (int)$input['interval'] : 1;
  $end_date = isset($input['end_date']) && $input['end_date'] ? $input['end_date'] : null;

  // Normalize subcategory: accept numeric id or name; if a name is provided, try to resolve to id
  if (!empty($subcat) && !is_numeric($subcat)) {
    try {
      $scStmt = $pdo->prepare("SELECT id_subcategory FROM subcategories WHERE LOWER(name) = LOWER(:name) LIMIT 1");
      $scStmt->execute([':name' => trim((string)$subcat)]);
      $scFound = $scStmt->fetchColumn();
      if ($scFound) {
        $subcat = (int)$scFound;
      } else {
        $subcat = null;
      }
    } catch (Exception $e) {
      $subcat = null;
    }
  } elseif ($subcat !== null) {
    $subcat = (int)$subcat;
  }

  // basic validation / normalization
  $allowedFreq = ['daily', 'weekly', 'monthly', 'yearly'];
  if (!in_array($frequency, $allowedFreq, true)) $frequency = 'monthly';
  if ($interval < 1) $interval = 1;

  $stmt = $pdo->prepare("INSERT INTO recurring_transactions (user_id, amount, type, category, subcategory_id, date_time, frequency, interval_count, end_date, notes) VALUES (:uid, :amount, :type, :cat, :subcat, :date, :freq, :interval, :end, :notes)");
  $stmt->execute([
    ':uid' => $uid,
    ':amount' => $amount,
    ':type' => $type,
    ':cat' => $category,
    ':subcat' => $subcat ? $subcat : null,
    ':date' => $date ? $date : null,
    ':freq' => $frequency,
    ':interval' => $interval,
    ':end' => $end_date,
    ':notes' => $notes
  ]);

  $id = $pdo->lastInsertId();

  // optionally create the initial occurrence now; respect explicit flags `skip_initial` or legacy `create_initial_immediately`
  $skip_initial = false;
  if (isset($input['skip_initial'])) {
    $skip_initial = (bool)$input['skip_initial'];
  } elseif (isset($input['create_initial_immediately'])) {
    $skip_initial = !(bool)$input['create_initial_immediately'];
  }
  $today = new DateTime('now');
  if (!$skip_initial) {
    try {
      // ensure recurring_plan_id and recurring_group_id exist on transactions table
      try {
        $pdo->exec("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurring_plan_id INT DEFAULT NULL");
        $pdo->exec("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurring_group_id INT DEFAULT NULL");
      } catch (Exception $e) {
        // older MySQL may not support IF NOT EXISTS — best-effort
        try { $pdo->exec("ALTER TABLE transactions ADD COLUMN recurring_plan_id INT DEFAULT NULL"); } catch (Exception $e2) { }
        try { $pdo->exec("ALTER TABLE transactions ADD COLUMN recurring_group_id INT DEFAULT NULL"); } catch (Exception $e2) { }
      }

      // resolve id_type from provided Type (fallback to common mappings)
      $providedType = trim((string)($type ?? ''));
      $idType = null;
      $resolvedCode = $providedType;
      try {
        if ($providedType !== '') {
          $tstmt = $pdo->prepare("SELECT id_type, code FROM transaction_types WHERE LOWER(code) = LOWER(:code) LIMIT 1");
          $tstmt->execute([':code' => $providedType]);
          $found = $tstmt->fetch(PDO::FETCH_ASSOC);
          if ($found) {
            $idType = (int)$found['id_type'];
            $resolvedCode = $found['code'];
          }
        }
      } catch (Exception $e) { /* ignore */ }

      if (is_null($idType)) {
        $map = ['dépense'=>'expense','depense'=>'expense','revenu'=>'income','epargne'=>'epargne','eparge'=>'epargne'];
        $mapped = $map[mb_strtolower($providedType)] ?? null;
        if ($mapped) {
          try {
            $tstmt = $pdo->prepare("SELECT id_type, code FROM transaction_types WHERE LOWER(code) = LOWER(:code) LIMIT 1");
            $tstmt->execute([':code' => $mapped]);
            $found = $tstmt->fetch(PDO::FETCH_ASSOC);
            if ($found) {
              $idType = (int)$found['id_type'];
              $resolvedCode = $found['code'];
            } else {
              $resolvedCode = $mapped;
            }
          } catch (Exception $e) { $resolvedCode = $mapped; }
        }
      }

      // resolve category id by name (if available)
      $categoryId = null;
      if (!empty($category)) {
        try {
          $cstmt = $pdo->prepare("SELECT id_category FROM categories WHERE LOWER(name) = LOWER(:name) LIMIT 1");
          $cstmt->execute([':name' => trim((string)$category)]);
          $catFound = $cstmt->fetchColumn();
          if ($catFound) $categoryId = (int)$catFound;
        } catch (Exception $e) { /* ignore */ }
      }

      $subcatId = $subcat ? (int)$subcat : null;

      $pdo->beginTransaction();
      $txDate = $date ? $date : $today->format('Y-m-d H:i:s');
      $txSql = "INSERT INTO transactions (id_utilisateur, id_type, `Date`, `Type`, category_id, subcategory_id, Montant, Notes, recurring_plan_id, recurring_group_id) VALUES (:uid, :idType, :date, :type, :cat, :subcat, :amount, :notes, :planid, :groupid)";
      $txStmt = $pdo->prepare($txSql);
      $txStmt->execute([
        ':uid' => $uid,
        ':idType' => $idType,
        ':date' => $txDate,
        ':type' => $resolvedCode,
        ':cat' => $categoryId,
        ':subcat' => $subcatId,
        ':amount' => $amount,
        ':notes' => $notes ? $notes : "Plan récurrent (id: {$id})",
        ':planid' => $id,
        ':groupid' => $id
      ]);

      // set last_run_date to the occurrence's date
      $u = $pdo->prepare("UPDATE recurring_transactions SET last_run_date = :d WHERE id = :id");
      $u->execute([':d' => substr($txDate,0,10), ':id' => $id]);
      $pdo->commit();
    } catch (PDOException $e) {
      if ($pdo->inTransaction()) $pdo->rollBack();
      error_log('add_recurring_transaction create initial occurrence error: ' . $e->getMessage());
    }
  }

  echo json_encode(['success' => true, 'id' => $id]);

} catch (PDOException $e) {
  error_log('add_recurring_transaction.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
