<?php
// Run goal plans (meant to be run via cron or manually)
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

try {
  // Fetch active plans for current user and only those whose goal exists in objectif_crees
  $uid = current_user_id();
  $stmt = $pdo->prepare("SELECT gp.*, o.id_subcategory FROM goal_plans gp JOIN objectif_crees o ON gp.goal_id = o.id_objectif WHERE gp.user_id = :uid AND gp.active = 1");
  $stmt->execute([':uid' => $uid]);
  $plans = $stmt->fetchAll(PDO::FETCH_ASSOC);

  $created = [];
  foreach ($plans as $plan) {
    $doRun = false;
    $today = new DateTime('now');
    $lastRun = $plan['last_run_date'] ? new DateTime($plan['last_run_date']) : null;

    if ($plan['type'] === 'monthly') {
      // Run if not already run this month and today >= schedule_day
      $firstOfMonth = new DateTime($today->format('Y-m-01'));
      $scheduleDay = max(1, min(28, (int)$plan['schedule_day']));
      $todayDay = (int)$today->format('j');
      if (is_null($lastRun) || $lastRun < $firstOfMonth) {
        if ($todayDay >= $scheduleDay) $doRun = true;
      }
      if ($doRun) {
        $amount = (float)$plan['amount'];
      }
    } elseif ($plan['type'] === 'percent') {
      // Compute last calendar month income
      $firstDayLastMonth = (new DateTime('first day of last month'))->format('Y-m-01');
      $lastDayLastMonth = (new DateTime('last day of last month'))->format('Y-m-t');
      $q = $pdo->prepare("SELECT COALESCE(SUM(Montant),0) AS income FROM transactions WHERE id_utilisateur = :uid AND (Type = 'income' OR id_type = 2) AND `Date` BETWEEN :start AND :end");
      $q->execute([':uid' => $uid, ':start' => $firstDayLastMonth, ':end' => $lastDayLastMonth]);
      $row = $q->fetch(PDO::FETCH_ASSOC);
      $income = (float)($row['income'] ?? 0);
      $amount = ($income * ((float)$plan['percent'] / 100.0));
      // run at most once per month
      $firstOfMonth = new DateTime($today->format('Y-m-01'));
      if (is_null($lastRun) || $lastRun < $firstOfMonth) $doRun = $amount > 0.009;
    } elseif ($plan['type'] === 'round_up') {
      // sum round ups since last_run_date (or since beginning of month)
      $since = $plan['last_run_date'] ? $plan['last_run_date'] : (new DateTime('first day of this month'))->format('Y-m-d');
      $q = $pdo->prepare("SELECT Montant FROM transactions WHERE id_utilisateur = :uid AND (Type = 'expense' OR id_type = 1) AND `Date` > :since");
      $q->execute([':uid' => $uid, ':since' => $since]);
      $rows = $q->fetchAll(PDO::FETCH_ASSOC);
      $sum = 0.0;
      foreach ($rows as $r) {
        $amt = abs((float)$r['Montant']);
        $round = ceil($amt) - $amt;
        // ignore tiny cents
        if ($round >= 0.01) $sum += $round;
      }
      $amount = $sum;
      $doRun = $amount > 0.009;
    }

    if ($doRun && isset($amount) && $amount > 0.009) {
      // Insert depot and transaction in a transaction
      $pdo->beginTransaction();
      try {
        $date = date('Y-m-d H:i:s');

        // Create a deposit as a transaction id_type = 3 into the goal's subcategory (no coffre_depots table)
        $txSql = "INSERT INTO transactions (id_utilisateur, id_type, `Date`, `Type`, subcategory_id, Montant, Notes, currency, Montant_eur) VALUES (:uid, :idType, :date, :type, :subcat, :amount, :notes, :currency, :amount_eur)";
        $txStmt = $pdo->prepare($txSql);
        $txStmt->execute([
          ':uid' => $uid,
          ':idType' => 3,
          ':date' => $date,
          ':type' => 'epargne',
          ':subcat' => $plan['id_subcategory'],
          ':amount' => $amount,
          ':notes' => "Plan {$plan['type']} (id: {$plan['id']})",
          ':currency' => 'EUR',
          ':amount_eur' => $amount
        ]);

        // update last_run_date to today
        $u = $pdo->prepare("UPDATE goal_plans SET last_run_date = :d WHERE id = :id");
        $u->execute([':d' => date('Y-m-d'), ':id' => $plan['id']]);

        $pdo->commit();
        $created[] = ['plan_id' => $plan['id'], 'amount' => $amount];
      } catch (PDOException $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log('run_goal_plans insert error: ' . $e->getMessage());
      }
    }
  }

  echo json_encode(['success' => true, 'created' => $created]);

} catch (PDOException $e) {
  error_log('run_goal_plans.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}