<?php
// CLI-only migration script: migrate full DB monetary values to canonical XOF per user
// Usage: php migrate_to_xof.php --confirm
if (php_sapi_name() !== 'cli') {
  echo "This script is for CLI only.\n";
  exit(1);
}
require __DIR__ . '/../config.php';

$confirm = in_array('--confirm', $argv, true);
if (!$confirm) {
  echo "Dry run: no changes will be made. Re-run with --confirm to apply changes.\n";
}
try {
  // get users with currency != XOF
  $users = $pdo->query("SELECT id, currency FROM users WHERE UPPER(COALESCE(currency,'EUR')) != 'XOF'")->fetchAll(PDO::FETCH_ASSOC);
  if (!$users) { echo "No users needing migration.\n"; exit(0); }
  echo "Found " . count($users) . " users to process.\n";

  foreach ($users as $u) {
    $uid = (int)$u['id'];
    $cur = strtoupper(trim($u['currency'] ?? 'EUR'));
    echo "-- Processing user $uid (from $cur -> XOF)\n";
    if (!$confirm) continue;

    // create backups
    $ts = time();
    $b1 = "objectif_crees_backup_{$uid}_{$ts}";
    $b2 = "objectif_atteints_backup_{$uid}_{$ts}";
    $b3 = "transactions_backup_{$uid}_{$ts}";
    try { $pdo->exec("CREATE TABLE `$b1` AS SELECT * FROM objectif_crees WHERE user_id = {$uid}"); } catch (Exception $e) { echo "Warning: backup $b1 failed: " . $e->getMessage() . "\n"; }
    try { $pdo->exec("CREATE TABLE `$b2` AS SELECT * FROM objectif_atteints WHERE user_id = {$uid}"); } catch (Exception $e) { echo "Warning: backup $b2 failed: " . $e->getMessage() . "\n"; }
    try { $pdo->exec("CREATE TABLE `$b3` AS SELECT * FROM transactions WHERE id_utilisateur = {$uid}"); } catch (Exception $e) { echo "Warning: backup $b3 failed: " . $e->getMessage() . "\n"; }

    // Convert transactions using existing logic (copy-paste of convert to XOF small routine)
    $rate = get_conversion_rate('EUR', 'XOF');
    if ($rate === null) { echo "No conversion rate available; skipping user $uid\n"; continue; }

    // Ensure Montant_eur populated
    $stmt = $pdo->prepare("UPDATE transactions SET Montant_eur = Montant WHERE id_utilisateur = :uid AND (Montant_eur IS NULL OR Montant_eur = 0) AND (currency IS NULL OR UPPER(currency) = 'EUR')");
    $stmt->execute([':uid' => $uid]);

    $lastId = 0; $chunk = 500; $convTx = 0;
    while (true) {
      $fetch = $pdo->prepare("SELECT id_transaction, Montant, Montant_eur, COALESCE(currency,'EUR') AS currency FROM transactions WHERE id_utilisateur = :uid AND id_transaction > :lastId ORDER BY id_transaction ASC LIMIT " . (int)$chunk);
      $fetch->execute([':uid' => $uid, ':lastId' => $lastId]);
      $rows = $fetch->fetchAll(PDO::FETCH_ASSOC);
      if (!$rows || count($rows) === 0) break;
      $pdo->beginTransaction();
      $update = $pdo->prepare("UPDATE transactions SET Montant = :mnt, currency = 'XOF' WHERE id_transaction = :id AND id_utilisateur = :uid");
      foreach ($rows as $r) {
        $lastId = (int)$r['id_transaction'];
        $curRow = strtoupper(trim($r['currency'] ?? 'EUR'));
        if ($curRow === 'XOF') continue;
        $mnt_eur = (!is_null($r['Montant_eur']) && (float)$r['Montant_eur'] != 0.0) ? (float)$r['Montant_eur'] : (float)$r['Montant'];
        $new = round($mnt_eur * $rate, 2);
        $update->execute([':mnt' => $new, ':id' => $r['id_transaction'], ':uid' => $uid]);
        $convTx++;
      }
      $pdo->commit();
    }

    // Convert objectif_crees
    $lastO = 0; $convO = 0; $chunkO = 200;
    while (true) {
      $fetchO = $pdo->prepare("SELECT id_objectif, montant, montant_eur FROM objectif_crees WHERE user_id = :uid AND id_objectif > :lastId ORDER BY id_objectif ASC LIMIT " . (int)$chunkO);
      $fetchO->execute([':uid' => $uid, ':lastId' => $lastO]);
      $rowsO = $fetchO->fetchAll(PDO::FETCH_ASSOC);
      if (!$rowsO || count($rowsO) === 0) break;
      $pdo->beginTransaction();
      $updO = $pdo->prepare("UPDATE objectif_crees SET montant_eur = COALESCE(montant_eur, montant)");
      $updO->execute();
      $upd2 = $pdo->prepare("UPDATE objectif_crees SET montant = :mnt WHERE id_objectif = :id AND user_id = :uid");
      foreach ($rowsO as $r) {
        $lastO = (int)$r['id_objectif'];
        $base = (!is_null($r['montant_eur']) && (float)$r['montant_eur'] != 0.0) ? (float)$r['montant_eur'] : (float)$r['montant'];
        $new = round($base * $rate, 2);
        $upd2->execute([':mnt' => $new, ':id' => $r['id_objectif'], ':uid' => $uid]);
        $convO++;
      }
      $pdo->commit();
    }

    // Convert objectif_atteints
    $lastA = 0; $convA = 0; $chunkA = 200;
    while (true) {
      $fetchA = $pdo->prepare("SELECT id_objectif_atteint, montant_objectif, total_collected FROM objectif_atteints WHERE user_id = :uid AND id_objectif_atteint > :lastId ORDER BY id_objectif_atteint ASC LIMIT " . (int)$chunkA);
      $fetchA->execute([':uid' => $uid, ':lastId' => $lastA]);
      $rowsA = $fetchA->fetchAll(PDO::FETCH_ASSOC);
      if (!$rowsA || count($rowsA) === 0) break;
      $pdo->beginTransaction();
      $updB = $pdo->prepare("UPDATE objectif_atteints SET montant_objectif_eur = COALESCE(montant_objectif_eur, montant_objectif), total_collected_eur = COALESCE(total_collected_eur, total_collected)");
      $updB->execute();
      $upd2 = $pdo->prepare("UPDATE objectif_atteints SET montant_objectif = :mnt_obj, total_collected = :tot, progress_pct = :pct WHERE id_objectif_atteint = :id AND user_id = :uid");
      foreach ($rowsA as $r) {
        $lastA = (int)$r['id_objectif_atteint'];
        $baseObj = (!is_null($r['montant_objectif_eur']) && (float)$r['montant_objectif_eur'] != 0.0) ? (float)$r['montant_objectif_eur'] : (float)$r['montant_objectif'];
        $baseTot = (!is_null($r['total_collected_eur']) && (float)$r['total_collected_eur'] != 0.0) ? (float)$r['total_collected_eur'] : (float)$r['total_collected'];
        $newObj = round($baseObj * $rate, 2);
        $newTot = round($baseTot * $rate, 2);
        $pct = $newObj != 0.0 ? round(min(100.0, ($newTot / $newObj) * 100.0), 2) : 0.0;
        $upd2->execute([':mnt_obj' => $newObj, ':tot' => $newTot, ':pct' => $pct, ':id' => $r['id_objectif_atteint'], ':uid' => $uid]);
        $convA++;
      }
      $pdo->commit();
    }

    echo "Converted transactions: $convTx, objectifs created: $convO, objectifs atteints: $convA for user $uid\n";
    // Persist user preference to XOF
    $uup = $pdo->prepare("UPDATE users SET currency = 'XOF' WHERE id = :uid");
    $uup->execute([':uid' => $uid]);
  }
  echo "Migration complete.\n";
} catch (PDOException $e) {
  echo "Migration failed: " . $e->getMessage() . "\n";
  exit(1);
}

?>