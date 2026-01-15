# Security Fixes - Before & After Code Comparison

This file shows exact code changes for each modified endpoint.

---

## 1. API/add_transaction.php

### BEFORE (Lines 22-36)
```php
require 'config.php';
require 'auth.php';
require_auth();

// 3) Récupération du JSON
$data = json_decode(file_get_contents('php://input'), true);

// 4) Validation minimale du payload (subcategory_id is optional)
if (
  !isset($data['Date'], 
         $data['Type'], 
         $data['id_type'], 
         $data['category_id'], 
         $data['Montant'])
) {
  http_response_code(400);
  echo json_encode(['success'=>false,'error'=>'Champs manquants']);
  exit;
}
```

### AFTER (Lines 22-51)
```php
require 'config.php';
require 'auth.php';
require 'security.php';  // ← NEW
require_auth();

// 3) Récupération du JSON
$data = json_decode(file_get_contents('php://input'), true);

// 3.5) CSRF Token verification  ← NEW
try {
  verify_csrf_token();
} catch (Exception $e) {
  http_response_code(403);
  echo json_encode(['success'=>false,'error'=>'CSRF token invalid or missing']);
  exit;
}

// 4) Validation stricte du payload avec fonctions de security.php  ← UPDATED
try {
  if (!isset($data['Date'], $data['Type'], $data['id_type'], $data['category_id'], $data['Montant'])) {
    throw new ValidationException('Champs manquants: Date, Type, id_type, category_id, Montant');
  }
  
  // Validate each field  ← NEW
  $date = validate_date($data['Date']);
  $type = validate_string($data['Type'], 'Type', 1, 50);
  $id_type = validate_int($data['id_type'], 'id_type');
  $category_id = validate_int($data['category_id'], 'category_id');
  $montant = validate_float($data['Montant'], 'Montant');
  $subcategory_id = isset($data['subcategory_id']) ? validate_int($data['subcategory_id'], 'subcategory_id', true) : null;
  $notes = isset($data['Notes']) ? validate_string($data['Notes'], 'Notes', 0, 1000, true) : '';
} catch (ValidationException $e) {
  http_response_code(400);
  echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
  exit;
}
```

### Key Improvements
- ✅ CSRF token required
- ✅ Type validation (Date, Type, Montant, etc.)
- ✅ Clear error messages with field names
- ✅ French decimal format support (123,45)
- ✅ Length constraints on strings
- ✅ XSS sanitization on notes

---

## 2. API/update_transaction.php

### BEFORE (Lines 1-15)
```php
<?php
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['id_transaction'], $data['Date'], $data['Type'], $data['Catégorie'], $data['Sous-catégorie'], $data['Montant'])) {
  http_response_code(400);
  echo json_encode(['error' => 'Données incomplètes']);
  exit;
}
```

### AFTER (Lines 1-35)
```php
<?php
require 'config.php';
require 'auth.php';
require 'security.php';  // ← NEW
require_auth();
header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents('php://input'), true);

// CSRF Token verification  ← NEW
try {
  verify_csrf_token();
} catch (Exception $e) {
  http_response_code(403);
  echo json_encode(['success'=>false,'error'=>'CSRF token invalid or missing']);
  exit;
}

// Validate inputs  ← NEW
try {
  if (!isset($data['id_transaction'], $data['Date'], $data['Type'], $data['Montant'])) {
    throw new ValidationException('Champs manquants: id_transaction, Date, Type, Montant');
  }
  
  $id_transaction = validate_int($data['id_transaction'], 'id_transaction');
  $date = validate_date($data['Date']);
  $type = validate_string($data['Type'], 'Type', 1, 50);
  $montant = validate_float($data['Montant'], 'Montant');
  $category_name = isset($data['Catégorie']) ? validate_string($data['Catégorie'], 'Catégorie', 0, 100, true) : '';
  $subcategory_name = isset($data['Sous-catégorie']) ? validate_string($data['Sous-catégorie'], 'Sous-catégorie', 0, 100, true) : '';
  $notes = isset($data['Notes']) ? validate_string($data['Notes'], 'Notes', 0, 1000, true) : '';
} catch (ValidationException $e) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
  exit;
}
```

### Key Improvements
- ✅ CSRF token required
- ✅ Type-safe ID handling
- ✅ String length validation
- ✅ Better error messages

---

## 3. API/delete_transaction.php

### BEFORE (Complete file)
```php
<?php
header('Content-Type: application/json; charset=utf-8');
require 'config.php';
require 'auth.php';
require_auth();
$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['id_transaction'])) {
  http_response_code(400);
  echo json_encode(['error' => 'ID manquant']);
  exit;
}

try {
  // ownership check
  $uid = current_user_id();
  $check = $pdo->prepare("SELECT id_utilisateur FROM transactions WHERE id_transaction = :id LIMIT 1");
  $check->execute([':id' => $data['id_transaction']]);
  $row = $check->fetch(PDO::FETCH_ASSOC);
  if (!$row) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Transaction introuvable']);
    exit;
  }
  if ((int)$row['id_utilisateur'] !== $uid) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès refusé']);
    exit;
  }

  // perform delete with ownership enforced to avoid race conditions
  $stmt = $pdo->prepare("DELETE FROM transactions WHERE id_transaction = :id AND id_utilisateur = :uid");
  $stmt->execute([':id' => $data['id_transaction'], ':uid' => $uid]);
  echo json_encode(['success' => true]);
} catch (PDOException $e) {
  error_log('delete_transaction.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
```

### AFTER (Complete file)
```php
<?php
header('Content-Type: application/json; charset=utf-8');
require 'config.php';
require 'auth.php';
require 'security.php';  // ← NEW
require_auth();

$data = json_decode(file_get_contents('php://input'), true);

// CSRF Token verification  ← NEW
try {
  verify_csrf_token();
} catch (Exception $e) {
  http_response_code(403);
  echo json_encode(['success'=>false,'error'=>'CSRF token invalid or missing']);
  exit;
}

// Validate input  ← NEW
try {
  if (!isset($data['id_transaction'])) {
    throw new ValidationException('id_transaction is required');
  }
  $id_transaction = validate_int($data['id_transaction'], 'id_transaction');
} catch (ValidationException $e) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
  exit;
}

try {
  // ownership check
  $uid = current_user_id();
  $check = $pdo->prepare("SELECT id_utilisateur FROM transactions WHERE id_transaction = :id LIMIT 1");
  $check->execute([':id' => $id_transaction]);  // ← Uses validated variable
  $row = $check->fetch(PDO::FETCH_ASSOC);
  if (!$row) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Transaction introuvable']);
    exit;
  }
  if ((int)$row['id_utilisateur'] !== $uid) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Accès refusé']);
    exit;
  }

  // perform delete with ownership enforced to avoid race conditions
  $stmt = $pdo->prepare("DELETE FROM transactions WHERE id_transaction = :id AND id_utilisateur = :uid");
  $stmt->execute([':id' => $id_transaction, ':uid' => $uid]);
  echo json_encode(['success' => true]);
} catch (PDOException $e) {
  error_log('delete_transaction.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
```

### Key Improvements
- ✅ CSRF token required
- ✅ Type-safe ID validation
- ✅ Consistent error handling

---

## 4. API/add_category.php

### BEFORE
```php
<?php
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents('php://input'), true);
$id_type = isset($data['id_type']) ? (int)$data['id_type'] : 0;
$name = isset($data['name']) ? trim($data['name']) : '';

if ($id_type <= 0 || $name === '') {
  http_response_code(400);
  echo json_encode(['success'=>false,'error'=>'Champs manquants']);
  exit;
}

try {
  // Vérifier doublon
  $stmt = $pdo->prepare('SELECT id_category FROM categories WHERE id_type = ? AND name = ?');
  $stmt->execute([$id_type, $name]);
  if ($stmt->fetch()) {
    echo json_encode(['success'=>false,'error'=>'Catégorie déjà existante']);
    exit;
  }

  $manual_budget = isset($data['manual_budget']) ? (is_numeric($data['manual_budget']) ? (float)$data['manual_budget'] : null) : null;
  // ...
```

### AFTER
```php
<?php
require 'config.php';
require 'auth.php';
require 'security.php';  // ← NEW
require_auth();
header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents('php://input'), true);

// CSRF Token verification  ← NEW
try {
  verify_csrf_token();
} catch (Exception $e) {
  http_response_code(403);
  echo json_encode(['success'=>false,'error'=>'CSRF token invalid or missing']);
  exit;
}

// Validate inputs  ← NEW
try {
  if (!isset($data['id_type'], $data['name'])) {
    throw new ValidationException('id_type and name are required');
  }
  
  $id_type = validate_int($data['id_type'], 'id_type');
  $name = validate_string($data['name'], 'name', 1, 100);
  $manual_budget = isset($data['manual_budget']) ? validate_float($data['manual_budget'], 'manual_budget', true) : null;
} catch (ValidationException $e) {
  http_response_code(400);
  echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
  exit;
}

try {
  // Vérifier doublon
  $stmt = $pdo->prepare('SELECT id_category FROM categories WHERE id_type = ? AND name = ?');
  $stmt->execute([$id_type, $name]);
  if ($stmt->fetch()) {
    echo json_encode(['success'=>false,'error'=>'Catégorie déjà existante']);
    exit;
  }

  $stmt = $pdo->prepare('INSERT INTO categories (id_type, name, manual_budget) VALUES (?, ?, ?)');
  $stmt->execute([$id_type, $name, $manual_budget]);
  echo json_encode(['success'=>true,'id'=>$pdo->lastInsertId()]);
  // ...
```

### Key Improvements
- ✅ CSRF token required
- ✅ Strict type validation
- ✅ String length limits
- ✅ Float validation for budget

---

## 5. API/delete_category.php

### BEFORE (First 15 lines)
```php
<?php
require 'config.php';
require 'auth.php';
require_auth();

header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents('php://input'), true);
if (empty($data['id_category'])) {
  http_response_code(400);
  echo json_encode(['success'=>false,'error'=>'id_category missing']);
  exit;
}

$id = (int)$data['id_category'];
$reassign_to_subcategory = isset($data['reassign_to_subcategory_id']) && $data['reassign_to_subcategory_id'] !== '' ? (int)$data['reassign_to_subcategory_id'] : null;
```

### AFTER (First 30 lines)
```php
<?php
require 'config.php';
require 'auth.php';
require 'security.php';  // ← NEW
require_auth();

header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents('php://input'), true);

// CSRF Token verification  ← NEW
try {
  verify_csrf_token();
} catch (Exception $e) {
  http_response_code(403);
  echo json_encode(['success'=>false,'error'=>'CSRF token invalid or missing']);
  exit;
}

// Validate inputs  ← NEW
try {
  if (!isset($data['id_category'])) {
    throw new ValidationException('id_category is required');
  }
  
  $id_category = validate_int($data['id_category'], 'id_category');
  $reassign_to_subcategory = isset($data['reassign_to_subcategory_id']) ? validate_int($data['reassign_to_subcategory_id'], 'reassign_to_subcategory_id', true) : null;
} catch (ValidationException $e) {
  http_response_code(400);
  echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
  exit;
}

$uid = current_user_id();
```

### Key Improvements
- ✅ CSRF token required
- ✅ Type-safe validation for both IDs
- ✅ Better error messages
- ✅ Consistent error handling

---

## Common Validation Patterns

### Pattern 1: Float Validation (Montant)

**BEFORE**:
```php
$amount = abs((float)$data['Montant']);  // "abc" becomes 0 silently!
```

**AFTER**:
```php
$montant = validate_float($data['Montant'], 'Montant');  // Throws error if invalid
// Supports: 123, 123.45, "123", "123.45", "123,45" (French)
```

### Pattern 2: Integer Validation (IDs)

**BEFORE**:
```php
$id = (int)$data['id_transaction'];  // "abc" becomes 0, "123abc" becomes 123
```

**AFTER**:
```php
$id_transaction = validate_int($data['id_transaction'], 'id_transaction');
// Only accepts valid integers, rejects strings, floats, null
```

### Pattern 3: String Validation

**BEFORE**:
```php
$name = isset($data['name']) ? trim($data['name']) : '';  // No sanitization
```

**AFTER**:
```php
$name = validate_string($data['name'], 'name', 1, 100);
// - Validates type is string
// - Checks length (1-100)
// - Sanitizes HTML: &<> → &amp; &lt; &gt;
// - Throws error if invalid
```

### Pattern 4: Date Validation

**BEFORE**:
```php
$date = trim((string)($data['Date'] ?? ''));  // Could be any format
```

**AFTER**:
```php
$date = validate_date($data['Date']);
// Only accepts YYYY-MM-DD format
// Validates it's actually a valid date
// Rejects: "2026-13-45", "01/09/2026", empty strings
```

### Pattern 5: CSRF Protection

**BEFORE**:
```php
// No CSRF protection - any origin could POST requests
```

**AFTER**:
```php
try {
  verify_csrf_token();  // 403 if missing/invalid
} catch (Exception $e) {
  http_response_code(403);
  echo json_encode(['success'=>false,'error'=>'CSRF token invalid or missing']);
  exit;
}
```

---

## Error Response Examples

### CSRF Token Missing (403)
**Request**:
```bash
curl -X POST .../add_transaction.php \
  -H "Content-Type: application/json" \
  -d '{"Date":"2026-01-09","Montant":50,"category_id":1}'
```

**Response**:
```json
HTTP 403 Forbidden
{
  "success": false,
  "error": "CSRF token invalid or missing"
}
```

### Validation Error: Invalid Montant (400)
**Request**:
```bash
curl -X POST .../add_transaction.php \
  -H "Content-Type: application/json" \
  -d '{"csrf_token":"abc123","Date":"2026-01-09","Montant":"invalid","category_id":1}'
```

**Response**:
```json
HTTP 400 Bad Request
{
  "success": false,
  "error": "Montant must be a valid number"
}
```

### Validation Error: Invalid Date (400)
**Request**:
```bash
curl -X POST .../add_transaction.php \
  -H "Content-Type: application/json" \
  -d '{"csrf_token":"abc123","Date":"2026-13-45","Montant":50,"category_id":1}'
```

**Response**:
```json
HTTP 400 Bad Request
{
  "success": false,
  "error": "Date is not a valid date"
}
```

### Success Response (200)
**Request**:
```bash
curl -X POST .../add_transaction.php \
  -H "Content-Type: application/json" \
  -d '{"csrf_token":"abc123","Date":"2026-01-09","Type":"expense","Montant":50,"id_type":1,"category_id":1}'
```

**Response**:
```json
HTTP 200 OK
{
  "success": true,
  "id_transaction": 12345
}
```

---

## Summary

| Endpoint | CSRF | Date | Float | Int | String | Notes |
|----------|------|------|-------|-----|--------|-------|
| add_transaction | ✅ | ✅ | ✅ | ✅ | ✅ | Full validation |
| update_transaction | ✅ | ✅ | ✅ | ✅ | ✅ | Full validation |
| delete_transaction | ✅ | - | - | ✅ | - | ID only |
| add_category | ✅ | - | ✅ | ✅ | ✅ | Full validation |
| delete_category | ✅ | - | - | ✅ | - | IDs only |

All endpoints now include proper error handling and clear error messages. Frontend should use the integration patterns in `api-csrf-integration.ts`.
