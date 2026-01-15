<?php
// API endpoint: ocr_feedback.php

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Access-Control-Allow-Credentials: true');
} else {
  header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require 'config.php';
require 'auth.php';
require 'security.php';
require_auth();

// Input: JSON body with fields:
// - action: 'accepted' | 'overridden' | 'rejected'
// - full_text (optional) - we hash it for privacy
// - merchant (optional)
// - invoice_hash (optional)
// - suggested_amount, suggested_category
// - applied_amount, applied_category
// - candidates (optional array)
// - meta (optional object)

$data = json_decode(file_get_contents('php://input'), true);
try {
  verify_csrf_token();
} catch (Exception $e) {
  http_response_code(403);
  echo json_encode(['success' => false, 'error' => 'CSRF token invalid or missing']);
  exit;
}

if (!is_array($data)) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
  exit;
}

$allowedActions = ['accepted','overridden','rejected'];
try {
  if (!isset($data['action']) || !in_array($data['action'], $allowedActions, true)) {
    throw new ValidationException('Missing or invalid action');
  }

  $action = validate_string($data['action'], 'action', 1, 16);
  $merchant = isset($data['merchant']) ? validate_string($data['merchant'], 'merchant', 0, 255, true) : null;
  $invoice_hash = isset($data['invoice_hash']) ? validate_string($data['invoice_hash'], 'invoice_hash', 0, 64, true) : null;

  $suggested_amount = isset($data['suggested_amount']) ? validate_float($data['suggested_amount'], 'suggested_amount', true) : null;
  $suggested_category = isset($data['suggested_category']) ? validate_string($data['suggested_category'], 'suggested_category', 0, 255, true) : null;
  $applied_amount = isset($data['applied_amount']) ? validate_float($data['applied_amount'], 'applied_amount', true) : null;
  $applied_category = isset($data['applied_category']) ? validate_string($data['applied_category'], 'applied_category', 0, 255, true) : null;

  // For privacy: accept full_text but store only its SHA-256 hash and a truncated redaction
  $fullText = isset($data['full_text']) ? validate_string($data['full_text'], 'full_text', 0, 5000, true) : null;
  $receipt_text_hash = $fullText ? hash('sha256', $fullText) : null;
  $redacted_text = $fullText ? substr($fullText, 0, 500) : null;

  // Candidates and meta should be JSON-serializable - store as JSON if provided
  $candidates = isset($data['candidates']) ? json_encode($data['candidates'], JSON_UNESCAPED_UNICODE) : null;
  $meta = isset($data['meta']) ? json_encode($data['meta'], JSON_UNESCAPED_UNICODE) : null;

} catch (ValidationException $e) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
  exit;
}

// Insert into DB
try {
  $stmt = $pdo->prepare("INSERT INTO ocr_feedback
    (id_utilisateur, receipt_text_hash, redacted_text, merchant, invoice_hash, suggested_amount, suggested_category, applied_amount, applied_category, action, candidates, meta)
    VALUES (:uid, :rhash, :red, :merchant, :invoice_hash, :s_amt, :s_cat, :a_amt, :a_cat, :action, :candidates, :meta)");

  $stmt->execute([
    ':uid' => current_user_id() ?: null,
    ':rhash' => $receipt_text_hash,
    ':red' => $redacted_text,
    ':merchant' => $merchant,
    ':invoice_hash' => $invoice_hash,
    ':s_amt' => $suggested_amount,
    ':s_cat' => $suggested_category,
    ':a_amt' => $applied_amount,
    ':a_cat' => $applied_category,
    ':action' => $action,
    ':candidates' => $candidates,
    ':meta' => $meta
  ]);

  echo json_encode(['success' => true, 'id' => (int)$pdo->lastInsertId()]);
} catch (PDOException $e) {
  error_log('ocr_feedback insert error: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Server error']);
}
