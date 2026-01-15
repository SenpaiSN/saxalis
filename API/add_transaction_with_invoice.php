<?php
// add_transaction_with_invoice.php
// Accepts multipart/form-data with transaction fields + optional file 'invoice'

// Basic CORS + JSON response
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

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

require 'config.php';
require 'auth.php';
require 'security.php';
require 'upload_helper.php';

require_auth();

// Verify CSRF token (will read from $_POST['csrf_token'])
try {
  verify_csrf_token();
} catch (Exception $e) {
  http_response_code(403);
  echo json_encode(['success'=>false,'error'=>'CSRF token invalid or missing']);
  exit;
}

// Map expected POST fields. We accept both JSON and form fields; prefer POST form values for multipart.
$get = function($k, $def = null) {
  if (isset($_POST[$k])) return $_POST[$k];
  // fallback to JSON body
  $json = json_decode(file_get_contents('php://input'), true);
  if ($json && isset($json[$k])) return $json[$k];
  return $def;
};

try {
  if (empty($_POST) && empty($json = json_decode(file_get_contents('php://input'), true))) {
    // allow empty POST if file present and form fields used
  }

  // Required fields: Date, Type, id_type, category_id, Montant
  $date = validate_date($get('Date', ''));
  $type = validate_string($get('Type', ''), 'Type', 1, 50);
  $id_type = validate_int($get('id_type', 0), 'id_type');
  $category_id = validate_int($get('category_id', 0), 'category_id');
  $montant = validate_float($get('Montant', ''), 'Montant');
  $subcategory_id = isset($_POST['subcategory_id']) ? validate_int($get('subcategory_id', null), 'subcategory_id', true) : null;
  $notes = isset($_POST['Notes']) ? validate_string($get('Notes', ''), 'Notes', 0, 1000, true) : (isset($json['Notes']) ? validate_string($json['Notes'], 'Notes', 0, 1000, true) : '');
  $currency = validate_currency($get('currency', 'EUR'), ['EUR','XOF']);
} catch (ValidationException $e) {
  http_response_code(400);
  echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
  exit;
}

// Convert amount and normalize date/time similar to add_transaction.php
$amount = abs($montant);
$amount_eur = null;
if ($currency === 'EUR') {
  $amount_eur = $amount;
} else {
  $rate = get_conversion_rate($currency, 'EUR');
  if ($rate !== null) {
    $amount_eur = round($amount * $rate, 2);
  } else {
    $amount_eur = $amount;
  }
}

$rawDate = trim($date);
if ($rawDate === '') {
  $dateTime = (new DateTime('now', new DateTimeZone('UTC')))->format('Y-m-d H:i:s');
} else {
  $rawDate = str_replace('T', ' ', $rawDate);
  // Interpret naive client datetimes as Europe/Paris and convert to UTC for storage
  $dt = DateTime::createFromFormat('Y-m-d H:i:s', $rawDate, new DateTimeZone('Europe/Paris'));
  if ($dt === false) {
    try {
      $dt = new DateTime($rawDate, new DateTimeZone('Europe/Paris'));
    } catch (Exception $e) {
      $dt = new DateTime('now', new DateTimeZone('UTC'));
    }
  }
  $dt->setTimezone(new DateTimeZone('UTC'));
  $dateTime = $dt->format('Y-m-d H:i:s');
}

// Resolve id_type if <= 0 (same logic as add_transaction.php)
$idType = $id_type;
try {
  if ($idType <= 0) {
    $codeStmt = $pdo->prepare("SELECT id_type FROM transaction_types WHERE LOWER(code) = LOWER(:code) LIMIT 1");
    $codeStmt->execute([':code' => $type]);
    $found = $codeStmt->fetchColumn();
    if ($found) $idType = (int)$found;
  } else {
    $chk = $pdo->prepare("SELECT COUNT(1) FROM transaction_types WHERE id_type = :id");
    $chk->execute([':id' => $idType]);
    $c = (int)$chk->fetchColumn();
    if ($c === 0) {
      $codeStmt = $pdo->prepare("SELECT id_type FROM transaction_types WHERE LOWER(code) = LOWER(:code) LIMIT 1");
      $codeStmt->execute([':code' => $type]);
      $found = $codeStmt->fetchColumn();
      if ($found) $idType = (int)$found;
    }
  }
} catch (Exception $e) {
  // ignore
}

// Insert transaction
$stmt = $pdo->prepare("INSERT INTO transactions (id_utilisateur, id_type, `Date`, `Type`, category_id, subcategory_id, Montant, Montant_eur, currency, Notes) VALUES (:uid, :idType, :date, :type, :catId, :subcatId, :amount, :amount_eur, :currency, :notes)");
try {
  $stmt->execute([
    ':uid' => current_user_id(),
    ':idType' => $idType,
    ':date' => $dateTime,
    ':type' => $type,
    ':catId' => $category_id,
    ':subcatId' => $subcategory_id,
    ':amount' => $amount,
    ':amount_eur' => $amount_eur,
    ':currency' => $currency,
    ':notes' => $notes
  ]);

  $insertedId = (int)$pdo->lastInsertId();

  // If file provided, store it and create transaction_files record
  $file_path = null;
  if (isset($_FILES['invoice']) && $_FILES['invoice']['error'] === UPLOAD_ERR_OK) {
    $allowed = ['image/jpeg','image/png','application/pdf'];
    $targetDir = __DIR__ . '/../uploads/invoices';
    $stored = store_uploaded_file($_FILES['invoice'], $targetDir, $allowed, 5*1024*1024);
    if ($stored !== false) {
      $rel = 'uploads/invoices/' . basename($stored);
      $ins = $pdo->prepare("INSERT INTO transaction_files (transaction_id, file_path, file_type) VALUES (:tx, :path, :type)");
      $ins->execute([':tx' => $insertedId, ':path' => $rel, ':type' => mime_content_type($stored) ?: $_FILES['invoice']['type']]);
      $file_path = $rel;
    }
  }

  echo json_encode(['success' => true, 'id_transaction' => $insertedId, 'file_path' => $file_path]);
} catch (PDOException $e) {
  error_log('add_transaction_with_invoice error: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}

?>
