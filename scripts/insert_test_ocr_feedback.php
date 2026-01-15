<?php
// scripts/insert_test_ocr_feedback.php
chdir(dirname(__DIR__));
require 'API/config.php';

try {
  $stmt = $pdo->prepare("INSERT INTO ocr_feedback
    (id_utilisateur, receipt_text_hash, redacted_text, merchant, invoice_hash, suggested_amount, suggested_category, applied_amount, applied_category, action, candidates, meta)
    VALUES (:uid, :rhash, :red, :merchant, :invoice_hash, :s_amt, :s_cat, :a_amt, :a_cat, :action, :candidates, :meta)");

  $now = date('Y-m-d H:i:s');
  $exampleCandidates = json_encode([
    ['raw' => '12,34', 'value' => 12.34, 'score100' => 90],
    ['raw' => '1234', 'value' => 1234.00, 'score100' => 30]
  ], JSON_UNESCAPED_UNICODE);
  $meta = json_encode(['test' => true]);

  $stmt->execute([
    ':uid' => current_user_id() ?: null,
    ':rhash' => hash('sha256', 'test receipt content ' . $now),
    ':red' => 'Test receipt: montant 12,34 - info',
    ':merchant' => 'Exemple Marchand',
    ':invoice_hash' => hash('sha256', 'invoice-data-'.$now),
    ':s_amt' => 12.34,
    ':s_cat' => 'Courses',
    ':a_amt' => 12.34,
    ':a_cat' => 'Courses',
    ':action' => 'accepted',
    ':candidates' => $exampleCandidates,
    ':meta' => $meta
  ]);

  echo "Inserted test ocr_feedback row.\n";
} catch (Exception $e) {
  echo "Insert failed: " . $e->getMessage() . "\n";
  exit(1);
}
