<?php
// Helper to process recurring plans for a single user.
// Returns array of created occurrences: ['plan_id' => ..., 'amount' => ..., 'date' => ...]

function process_recurring_for_user(PDO $pdo, int $uid, DateTime $today = null) {
  $today = $today ?? new DateTime('now');
  $created = [];

  $stmt = $pdo->prepare("SELECT * FROM recurring_transactions WHERE user_id = :uid AND active = 1");
  $stmt->execute([':uid' => $uid]);
  $plans = $stmt->fetchAll(PDO::FETCH_ASSOC);

  foreach ($plans as $plan) {
    $lastRun = $plan['last_run_date'] ? new DateTime($plan['last_run_date']) : null;
    $freq = $plan['frequency'];
    $interval = max(1, (int)$plan['interval_count']);
    $scheduledDate = $plan['date_time'] ? new DateTime($plan['date_time']) : null;
    $endDate = $plan['end_date'] ? new DateTime($plan['end_date']) : null;

    // helper to add interval
    $addInterval = function(DateTime $d) use ($freq, $interval) {
      $r = clone $d;
      if ($freq === 'daily') {
        $r->add(new DateInterval('P' . $interval . 'D'));
      } elseif ($freq === 'weekly') {
        $r->add(new DateInterval('P' . ($interval * 7) . 'D'));
      } elseif ($freq === 'monthly') {
        $r->add(new DateInterval('P' . $interval . 'M'));
      } elseif ($freq === 'yearly') {
        $r->add(new DateInterval('P' . $interval . 'Y'));
      } else {
        $r->add(new DateInterval('P' . $interval . 'M'));
      }
      return $r;
    };

    try {
      $toCreate = [];

      if ($lastRun) {
        $candidate = $addInterval($lastRun);
        while ($candidate <= $today) {
          if ($endDate && $candidate > $endDate) break;
          $toCreate[] = clone $candidate;
          $candidate = $addInterval($candidate);
        }
      } else {
        if ($scheduledDate) {
          $candidate = clone $scheduledDate;
          while ($candidate <= $today) {
            if ($endDate && $candidate > $endDate) break;
            $toCreate[] = clone $candidate;
            $candidate = $addInterval($candidate);
          }
        }
      }

      if (count($toCreate) > 0) {
        foreach ($toCreate as $occurrenceDt) {
          $dateOnly = $occurrenceDt->format('Y-m-d');
          $checkStmt = $pdo->prepare("SELECT COUNT(*) as cnt FROM transactions WHERE id_utilisateur = :uid AND recurring_plan_id = :pid AND DATE(`Date`) = :d");
          $checkStmt->execute([':uid' => $uid, ':pid' => $plan['id'], ':d' => $dateOnly]);
          $cnt = (int)$checkStmt->fetchColumn();
          if ($cnt === 0) {
            $checkNotes = $pdo->prepare("SELECT COUNT(*) as cnt FROM transactions WHERE id_utilisateur = :uid AND Notes LIKE :notes AND DATE(`Date`) = :d");
            $checkNotes->execute([':uid'=>$uid, ':notes' => "%Plan récurrent (id: {$plan['id']})%", ':d'=>$dateOnly]);
            $cnt2 = (int)$checkNotes->fetchColumn();
            if ($cnt2 > 0) $cnt = $cnt2;
          }

          if ($cnt > 0) continue;

          try {
            $providedType = trim((string)($plan['type'] ?? ''));
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

            $categoryId = null;
            if (!empty($plan['category'])) {
              try {
                $cstmt = $pdo->prepare("SELECT id_category FROM categories WHERE LOWER(name) = LOWER(:name) LIMIT 1");
                $cstmt->execute([':name' => trim((string)$plan['category'])]);
                $catFound = $cstmt->fetchColumn();
                if ($catFound) $categoryId = (int)$catFound;
              } catch (Exception $e) { /* ignore */ }
            }

            $subcatId = isset($plan['subcategory_id']) && $plan['subcategory_id'] ? (int)$plan['subcategory_id'] : null;

            $pdo->beginTransaction();
            $txDate = $occurrenceDt->format('Y-m-d H:i:s');
            $txSql = "INSERT INTO transactions (id_utilisateur, id_type, `Date`, `Type`, category_id, subcategory_id, Montant, Notes, recurring_plan_id, recurring_group_id) VALUES (:uid, :idType, :date, :type, :cat, :subcat, :amount, :notes, :planid, :groupid)";
            $txStmt = $pdo->prepare($txSql);
            $txStmt->execute([
              ':uid' => $uid,
              ':idType' => $idType,
              ':date' => $txDate,
              ':type' => $resolvedCode,
              ':cat' => $categoryId,
              ':subcat' => $subcatId,
              ':amount' => $plan['amount'],
              ':notes' => $plan['notes'] ? $plan['notes'] : "Plan récurrent (id: {$plan['id']})",
              ':planid' => $plan['id'],
              ':groupid' => $plan['id']
            ]);

            $u = $pdo->prepare("UPDATE recurring_transactions SET last_run_date = :d WHERE id = :id");
            $u->execute([':d' => $occurrenceDt->format('Y-m-d'), ':id' => $plan['id']]);
            $pdo->commit();
            $created[] = ['plan_id' => $plan['id'], 'amount' => $plan['amount'], 'date'=> $txDate];
          } catch (PDOException $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            error_log('recurring_helper insert error: ' . $e->getMessage());
          }
        }
      }
    } catch (Exception $e) {
      error_log('recurring_helper processing error: ' . $e->getMessage());
    }
  }

  return $created;
}
