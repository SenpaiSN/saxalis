<?php
require 'config.php';
require 'auth.php';
require 'security.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

// Attendez un body JSON: { target: 'XOF'|'EUR', confirm: true, csrf_token: '...' }
$data = json_decode(file_get_contents('php://input'), true);
// Verify CSRF token (will exit 403 if invalid)
try {
  verify_csrf_token();
} catch (Exception $e) {
  http_response_code(403);
  echo json_encode(['success' => false, 'error' => 'CSRF token invalide']);
  exit;
}

// Require explicit confirm === true to avoid accidental conversions
if (!isset($data['target']) || !isset($data['confirm']) || $data['confirm'] !== true) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => 'Paramètres manquants ou confirm non fourni']);
  exit;
}

$uid = current_user_id();
$target = strtoupper(trim($data['target']));
if (!in_array($target, ['XOF', 'EUR'])) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => 'Devise cible non supportée']);
  exit;
}

try {
  // Create a backup table for this user before any destructive change
  // Table name: transactions_backup_<uid>_<ts>
  $ts = time();
  $safeUid = (int)$uid;
  $backupTable = "transactions_backup_{$safeUid}_{$ts}";
  // Note: this creates a simple copy (schema + data) for recovery. Indexes/triggers are not preserved.
  try {
    //$pdo->exec("CREATE TABLE `{$backupTable}` AS SELECT * FROM transactions WHERE id_utilisateur = {$safeUid}");
	 $backupTable = null;
    // optional: set a comment or metadata table if needed
  } catch (PDOException $be) {
    error_log('convert_currency.php backup failed: ' . $be->getMessage());
    // Continue but warn in response later
    $backupTable = null;
  }

  // Ensure Montant_eur populated only for rows that are in EUR (avoid storing XOF values as Montant_eur)
  $stmt = $pdo->prepare("UPDATE transactions SET Montant_eur = Montant WHERE id_utilisateur = :uid AND (Montant_eur IS NULL OR Montant_eur = 0) AND (currency IS NULL OR UPPER(currency) = 'EUR')");
  $stmt->execute([':uid' => $uid]);

  // --- OBJECTIF TABLES: populate EUR backups and prepare for conversion ---
  // Add montant_eur to objectif_crees if missing and populate it from montant (assumed EUR)
  $check = $pdo->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'objectif_crees' AND COLUMN_NAME = 'montant_eur'");
  $check->execute();
  if ($check->fetchColumn() == 0) {
    try {
      $pdo->exec("ALTER TABLE objectif_crees ADD COLUMN montant_eur DECIMAL(14,2) NULL");
    } catch (PDOException $e) { error_log('convert_currency.php: failed to add montant_eur to objectif_crees: ' . $e->getMessage()); }
  }
  try {
    $fill = $pdo->prepare("UPDATE objectif_crees SET montant_eur = montant WHERE montant_eur IS NULL OR montant_eur = 0");
    $fill->execute();
  } catch (PDOException $e) { error_log('convert_currency.php: failed to populate objectif_crees.montant_eur: ' . $e->getMessage()); }

  // Add montant_objectif_eur and total_collected_eur to objectif_atteints if missing and populate
  $check2 = $pdo->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'objectif_atteints' AND COLUMN_NAME = 'montant_objectif_eur'");
  $check2->execute();
  if ($check2->fetchColumn() == 0) {
    try {
      $pdo->exec("ALTER TABLE objectif_atteints ADD COLUMN montant_objectif_eur DECIMAL(14,2) NULL, ADD COLUMN total_collected_eur DECIMAL(14,2) NULL");
    } catch (PDOException $e) { error_log('convert_currency.php: failed to add EUR backup cols to objectif_atteints: ' . $e->getMessage()); }
  }
  try {
    $fill2 = $pdo->prepare("UPDATE objectif_atteints SET montant_objectif_eur = montant_objectif WHERE montant_objectif_eur IS NULL OR montant_objectif_eur = 0");
    $fill2->execute();
    $fill3 = $pdo->prepare("UPDATE objectif_atteints SET total_collected_eur = total_collected WHERE total_collected_eur IS NULL OR total_collected_eur = 0");
    $fill3->execute();
  } catch (PDOException $e) { error_log('convert_currency.php: failed to populate objectif_atteints eur backups: ' . $e->getMessage()); }

  // End objectif preparation


  // Use row-by-row update in PHP to avoid numeric overflow issues in SQL
  if ($target === 'XOF') {
    $rate = get_conversion_rate('EUR', 'XOF');
    if ($rate === null) throw new Exception('Taux introuvable');

    // Query column precision to calculate max allowed value
    $colStmt = $pdo->prepare("SELECT NUMERIC_PRECISION, NUMERIC_SCALE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'Montant'");
    $colStmt->execute();
    $colInfo = $colStmt->fetch(PDO::FETCH_ASSOC);

    $precision = isset($colInfo['NUMERIC_PRECISION']) ? (int)$colInfo['NUMERIC_PRECISION'] : 12; // fallback
    $scale = isset($colInfo['NUMERIC_SCALE']) ? (int)$colInfo['NUMERIC_SCALE'] : 2;
    $maxWholeDigits = max(0, $precision - $scale);
    // maximum absolute value before overflow (approximate)
    $maxAllowed = pow(10, $maxWholeDigits) - pow(10, -$scale);

    // --- Convert objectif_crees to XOF in batches ---
    try {
      $chunkO = 200;
      $convObj = 0;
      $skippedObj = [];
      $lastObj = 0;
      while (true) {
        $fetchObj = $pdo->prepare("SELECT id_objectif, montant, montant_eur FROM objectif_crees WHERE user_id = :uid AND id_objectif > :lastId ORDER BY id_objectif ASC LIMIT " . (int)$chunkO);
        $fetchObj->execute([':uid' => $uid, ':lastId' => $lastObj]);
        $objs = $fetchObj->fetchAll(PDO::FETCH_ASSOC);
        if (!$objs || count($objs) === 0) break;
        $pdo->beginTransaction();
        $updObj = $pdo->prepare("UPDATE objectif_crees SET montant = :mnt WHERE id_objectif = :id AND user_id = :uid");
        foreach ($objs as $o) {
          $lastObj = (int)$o['id_objectif'];
          // if already converted (heuristic: montant_eur null and currency unknown) we use montant_eur presence to decide
          if (!is_null($o['montant_eur']) && (float)$o['montant_eur'] != 0.0) {
            $base = (float)$o['montant_eur'];
          } else {
            $base = (float)$o['montant'];
          }
          $new = round($base * $rate, 2);
          $updObj->execute([':mnt' => $new, ':id' => $o['id_objectif'], ':uid' => $uid]);
          $convObj++;
        }
        $pdo->commit();
      }
    } catch (PDOException $e) { error_log('convert_currency.php objectif_crees conversion failed: ' . $e->getMessage()); }

    // --- Convert objectif_atteints to XOF in batches and recalc progress_pct ---
    try {
      $chunkA = 200;
      $convA = 0;
      $lastA = 0;
      while (true) {
        $fetchA = $pdo->prepare("SELECT id_objectif_atteint, montant_objectif, total_collected, montant_objectif_eur, total_collected_eur FROM objectif_atteints WHERE user_id = :uid AND id_objectif_atteint > :lastId ORDER BY id_objectif_atteint ASC LIMIT " . (int)$chunkA);
        $fetchA->execute([':uid' => $uid, ':lastId' => $lastA]);
        $as = $fetchA->fetchAll(PDO::FETCH_ASSOC);
        if (!$as || count($as) === 0) break;
        $pdo->beginTransaction();
        $updA = $pdo->prepare("UPDATE objectif_atteints SET montant_objectif = :mnt_obj, total_collected = :tot, progress_pct = :pct WHERE id_objectif_atteint = :id AND user_id = :uid");
        foreach ($as as $a) {
          $lastA = (int)$a['id_objectif_atteint'];
          $baseObj = (!is_null($a['montant_objectif_eur']) && (float)$a['montant_objectif_eur'] != 0.0) ? (float)$a['montant_objectif_eur'] : (float)$a['montant_objectif'];
          $baseTot = (!is_null($a['total_collected_eur']) && (float)$a['total_collected_eur'] != 0.0) ? (float)$a['total_collected_eur'] : (float)$a['total_collected'];
          $newObj = round($baseObj * $rate, 2);
          $newTot = round($baseTot * $rate, 2);
          $pct = $newObj != 0.0 ? round(min(100.0, ($newTot / $newObj) * 100.0), 2) : 0.0;
          $updA->execute([':mnt_obj' => $newObj, ':tot' => $newTot, ':pct' => $pct, ':id' => $a['id_objectif_atteint'], ':uid' => $uid]);
          $convA++;
        }
        $pdo->commit();
      }
    } catch (PDOException $e) { error_log('convert_currency.php objectif_atteints conversion failed: ' . $e->getMessage()); }

    // Batch processing parameters for transactions
    $chunkSize = 500; // rows per batch
    $converted = 0;
    $skipped = [];

    $lastId = 0;
    while (true) {
      // Fetch next chunk: avoid OFFSET for large tables by using id > lastId
      $sql = "SELECT id_transaction, Montant, Montant_eur, COALESCE(currency, 'EUR') AS currency FROM transactions WHERE id_utilisateur = :uid AND id_transaction > :lastId ORDER BY id_transaction ASC LIMIT " . (int)$chunkSize;
      $fetch = $pdo->prepare($sql);
      $fetch->execute([':uid' => $uid, ':lastId' => $lastId]);
      $rows = $fetch->fetchAll(PDO::FETCH_ASSOC);
      if (!$rows || count($rows) === 0) break;

      $pdo->beginTransaction();
      $update = $pdo->prepare("UPDATE transactions SET Montant = :mnt, currency = 'XOF' WHERE id_transaction = :id AND id_utilisateur = :uid");
      foreach ($rows as $r) {
        $id = (int)$r['id_transaction'];
        $lastId = $id;
        $currentCurrency = strtoupper(trim($r['currency'] ?? 'EUR'));

        // If the row is already in target currency, skip to avoid double conversion
        if ($currentCurrency === 'XOF') {
          $skipped[] = ['id' => $id, 'value' => $r['Montant'], 'reason' => 'already_in_target'];
          continue;
        }

        // Prefer Montant_eur if present (assumed to be the original EUR amount), otherwise use Montant (assumed EUR)
        if (!is_null($r['Montant_eur']) && (float)$r['Montant_eur'] != 0.0) {
          $mnt_eur = (float)$r['Montant_eur'];
        } else {
          $mnt_eur = (float)$r['Montant'];
        }

        $new = round($mnt_eur * $rate, 2);

        // Check for non-finite or overflow against column precision
        if (!is_finite($new) || abs($new) > $maxAllowed) {
          // don't fail entire operation; record skipped entry and continue
          $skipped[] = ['id' => $id, 'value' => $new, 'reason' => 'out_of_range'];
          continue;
        }

        $update->execute([':mnt' => $new, ':id' => $id, ':uid' => $uid]);
        $converted++;
      }
      $pdo->commit();
      // loop until no more rows
    }

    $response = ['success' => true, 'converted_to' => 'XOF', 'converted_rows' => $converted, 'skipped' => $skipped, 'max_allowed' => $maxAllowed];
    if (isset($backupTable)) $response['backup_table'] = $backupTable;
    if (count($skipped) > 0) {
      $response['warning'] = 'Certaines lignes ont été ignorées car la valeur convertie dépasse la plage de la colonne `Montant` ou étaient déjà en devise cible. Exécutez la migration pour augmenter la précision (voir docs).';
    }
    echo json_encode($response);
    exit;
  }

  if ($target === 'EUR') {
    // Revert using Montant_eur — do in batches and validate Montant_eur
    $chunkSize = 500;
    $converted = 0;
    $skipped = [];
    $lastId = 0;
    while (true) {
      $sql = "SELECT id_transaction, Montant_eur, COALESCE(currency,'EUR') as currency FROM transactions WHERE id_utilisateur = :uid AND id_transaction > :lastId ORDER BY id_transaction ASC LIMIT " . (int)$chunkSize;
      $fetch = $pdo->prepare($sql);
      $fetch->execute([':uid' => $uid, ':lastId' => $lastId]);
      $rows = $fetch->fetchAll(PDO::FETCH_ASSOC);
      if (!$rows || count($rows) === 0) break;

      $pdo->beginTransaction();
      $update = $pdo->prepare("UPDATE transactions SET Montant = :mnt, currency = 'EUR' WHERE id_transaction = :id AND id_utilisateur = :uid");
      foreach ($rows as $r) {
        $id = (int)$r['id_transaction'];
        $lastId = $id;
        $currentCurrency = strtoupper(trim($r['currency'] ?? 'EUR'));

        if ($currentCurrency === 'EUR') {
          $skipped[] = ['id' => $id, 'reason' => 'already_in_target'];
          continue;
        }

        if (is_null($r['Montant_eur']) || !is_numeric($r['Montant_eur'])) {
          $skipped[] = ['id' => $id, 'reason' => 'no_montant_eur'];
          continue;
        }

        $mnt = round((float)$r['Montant_eur'], 2);
        $update->execute([':mnt' => $mnt, ':id' => $id, ':uid' => $uid]);
        $converted++;
      }
      $pdo->commit();
    }

    // --- Revert objectif_atteints using backed-up EUR columns if present ---
    try {
      $chunkA = 200;
      $convertedA = 0; $skippedA = [];
      $lastA = 0;
      while (true) {
        $fetchA = $pdo->prepare("SELECT id_objectif_atteint, montant_objectif_eur, total_collected_eur, user_id FROM objectif_atteints WHERE user_id = :uid AND id_objectif_atteint > :lastId ORDER BY id_objectif_atteint ASC LIMIT " . (int)$chunkA);
        $fetchA->execute([':uid' => $uid, ':lastId' => $lastA]);
        $rowsA = $fetchA->fetchAll(PDO::FETCH_ASSOC);
        if (!$rowsA || count($rowsA) === 0) break;
        $pdo->beginTransaction();
        $updA = $pdo->prepare("UPDATE objectif_atteints SET montant_objectif = :mnt_obj, total_collected = :tot, progress_pct = :pct WHERE id_objectif_atteint = :id AND user_id = :uid");
        foreach ($rowsA as $r) {
          $lastA = (int)$r['id_objectif_atteint'];
          if (is_null($r['montant_objectif_eur']) || is_null($r['total_collected_eur'])) { $skippedA[] = ['id' => $r['id_objectif_atteint'], 'reason' => 'no_eur_backup']; continue; }
          $mnt = round((float)$r['montant_objectif_eur'], 2);
          $tot = round((float)$r['total_collected_eur'], 2);
          $pct = $mnt != 0.0 ? round(min(100.0, ($tot / $mnt) * 100.0), 2) : 0.0;
          $updA->execute([':mnt_obj' => $mnt, ':tot' => $tot, ':pct' => $pct, ':id' => $r['id_objectif_atteint'], ':uid' => $uid]);
          $convertedA++;
        }
        $pdo->commit();
      }
    } catch (PDOException $e) { error_log('convert_currency.php objective_atteints revert failed: ' . $e->getMessage()); }

    // --- Revert objectif_crees using montant_eur if present ---
    try {
      $chunkO = 200;
      $convertedO = 0; $skippedO = [];
      $lastO = 0;
      while (true) {
        $fetchO = $pdo->prepare("SELECT id_objectif, montant_eur FROM objectif_crees WHERE user_id = :uid AND id_objectif > :lastId ORDER BY id_objectif ASC LIMIT " . (int)$chunkO);
        $fetchO->execute([':uid' => $uid, ':lastId' => $lastO]);
        $rowsO = $fetchO->fetchAll(PDO::FETCH_ASSOC);
        if (!$rowsO || count($rowsO) === 0) break;
        $pdo->beginTransaction();
        $updO = $pdo->prepare("UPDATE objectif_crees SET montant = :mnt WHERE id_objectif = :id AND user_id = :uid");
        foreach ($rowsO as $r) {
          $lastO = (int)$r['id_objectif'];
          if (is_null($r['montant_eur'])) { $skippedO[] = ['id' => $r['id_objectif'], 'reason' => 'no_eur_backup']; continue; }
          $mnt = round((float)$r['montant_eur'], 2);
          $updO->execute([':mnt' => $mnt, ':id' => $r['id_objectif'], ':uid' => $uid]);
          $convertedO++;
        }
        $pdo->commit();
      }
    } catch (PDOException $e) { error_log('convert_currency.php objectif_crees revert failed: ' . $e->getMessage()); }

    $response = ['success' => true, 'converted_to' => 'EUR', 'converted_rows' => $converted, 'skipped' => $skipped, 'reverted_objectif_atteints' => $convertedA, 'reverted_objectif_crees' => $convertedO];
    if (isset($backupTable)) $response['backup_table'] = $backupTable;
    echo json_encode($response);
    exit;
  }
} catch (PDOException $e) {
  error_log('convert_currency.php PDOException: ' . $e->getMessage() . ' | SQLCode: ' . $e->getCode());
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
} catch (Exception $e) {
  error_log('convert_currency.php Exception: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Erreur']);
}

?>