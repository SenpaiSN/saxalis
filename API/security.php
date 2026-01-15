<?php
/**
 * security.php - Security utilities for CSRF protection and input validation
 * Usage: include this file in all API endpoints that handle POST/PUT/DELETE
 */

if (session_status() === PHP_SESSION_NONE) {
  session_start();
}

/**
 * Generate a CSRF token for the current session
 * Should be called once per session and stored in HTML forms
 */
function generate_csrf_token() {
  if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
  }
  return $_SESSION['csrf_token'];
}

/**
 * Verify CSRF token from POST/JSON request
 * Looks for token in $_POST['csrf_token'] or JSON body csrf_token field
 * Calls http_response_code(403) and exits if token is invalid
 */
function verify_csrf_token() {
  // Get token from POST or JSON body
  $token = null;
  
  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Try POST data first
    if (isset($_POST['csrf_token'])) {
      $token = $_POST['csrf_token'];
    } else {
      // Try JSON body
      $input = json_decode(file_get_contents('php://input'), true);
      if (isset($input['csrf_token'])) {
        $token = $input['csrf_token'];
      }
    }
  }

  if (empty($token) || !hash_equals($_SESSION['csrf_token'] ?? '', $token)) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => 'CSRF token invalid or missing']);
    exit;
  }
}

/**
 * Validate a float/decimal field (montant, amount)
 * Returns validated float or null if invalid
 * Accepts: "123.45", "123,45" (French comma), 123.45, 123
 */
function validate_float($value, $fieldname = 'amount', $allow_null = false) {
  if ($value === null || $value === '') {
    if ($allow_null) {
      return null;
    }
    throw new ValidationException("$fieldname is required");
  }

  // Replace French comma with dot
  if (is_string($value)) {
    $value = str_replace(',', '.', $value);
  }

  $float = filter_var($value, FILTER_VALIDATE_FLOAT);
  if ($float === false) {
    throw new ValidationException("$fieldname must be a valid number");
  }

  return $float;
}

/**
 * Validate an integer field
 * Returns validated int or null if invalid
 */
function validate_int($value, $fieldname = 'id', $allow_null = false) {
  if ($value === null || $value === '') {
    if ($allow_null) {
      return null;
    }
    throw new ValidationException("$fieldname is required");
  }

  $int = filter_var($value, FILTER_VALIDATE_INT);
  if ($int === false) {
    throw new ValidationException("$fieldname must be a valid integer");
  }

  return $int;
}

/**
 * Validate a string field
 * $min_len, $max_len: length constraints
 */
function validate_string($value, $fieldname = 'text', $min_len = 0, $max_len = 500, $allow_null = false) {
  if ($value === null || $value === '') {
    if ($allow_null) {
      return null;
    }
    throw new ValidationException("$fieldname is required");
  }

  if (!is_string($value)) {
    $value = (string)$value;
  }

  $len = mb_strlen($value, 'UTF-8');
  if ($len < $min_len) {
    throw new ValidationException("$fieldname must be at least $min_len characters");
  }
  if ($len > $max_len) {
    throw new ValidationException("$fieldname must not exceed $max_len characters");
  }

  // Basic XSS prevention: trim and sanitize
  return htmlspecialchars(trim($value), ENT_QUOTES, 'UTF-8');
}

/**
 * Validate a date field. Accepts:
 *  - YYYY-MM-DD
 *  - YYYY-MM-DD HH:MM
 *  - YYYY-MM-DD HH:MM:SS
 *  - YYYY-MM-DDTHH:MM (ISO with T)
 *  - YYYY-MM-DDTHH:MM:SS
 */
function validate_date($value, $fieldname = 'date') {
  if ($value === null || $value === '') {
    throw new ValidationException("$fieldname is required");
  }

  // Accept date-only or date with optional time
  if (!preg_match('/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?$/', $value)) {
    throw new ValidationException("$fieldname must be in YYYY-MM-DD or YYYY-MM-DD HH:MM[:SS] format");
  }

  // Validate the date portion is correct
  $datePart = preg_replace('/[ T].*/', '', $value);
  $d = DateTime::createFromFormat('Y-m-d', $datePart);
  if (!$d || $d->format('Y-m-d') !== $datePart) {
    throw new ValidationException("$fieldname is not a valid date");
  }

  // Keep original value (may include time) so downstream normalization can convert to a full timestamp
  return trim($value);
}

/**
 * Validate a currency code (EUR, XOF, etc.)
 */
function validate_currency($value, $allowed = ['EUR', 'XOF']) {
  if ($value === null || $value === '') {
    return 'EUR'; // default
  }

  $code = strtoupper(trim($value));
  if (!in_array($code, $allowed)) {
    throw new ValidationException("currency must be one of: " . implode(', ', $allowed));
  }

  return $code;
}

/**
 * Custom exception for validation errors
 */
class ValidationException extends Exception {}

?>
