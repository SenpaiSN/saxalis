# 🔒 Security Fixes - Backend

## Overview

This document outlines the security improvements implemented to protect SaXalis from CSRF attacks and input validation exploits.

**Status**: ✅ Implemented in API endpoints (transactions, categories)  
**Remaining**: Apply to remaining endpoints (goals, objectives, etc.)

---

## 1. CSRF Protection (Cross-Site Request Forgery)

### Problem
Attackers could craft requests from other websites to perform unwanted actions on behalf of authenticated users.

```
⚠️ Example Attack:
1. User is logged into saxalis.free.nf
2. User visits attacker.com
3. attacker.com has: <img src="https://saxalis.free.nf/API/delete_transaction.php?id=1">
4. Browser automatically includes session cookies
5. Transaction is deleted without user confirmation
```

### Solution: CSRF Token System

#### Backend: Generate & Validate Tokens

```php
// security.php - New helper file
session_start();

// 1. Generate token (once per session)
function generate_csrf_token() {
  if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
  }
  return $_SESSION['csrf_token'];
}

// 2. Verify token on all POST/PUT/DELETE
function verify_csrf_token() {
  $token = $_POST['csrf_token'] ?? json_decode(file_get_contents('php://input'), true)['csrf_token'] ?? null;
  if (!hash_equals($_SESSION['csrf_token'] ?? '', $token)) {
    http_response_code(403);
    die(json_encode(['error' => 'CSRF token invalid']));
  }
}
```

#### Frontend: Send Token with Requests

Update your React components to include the CSRF token:

```typescript
// 1. Get token from backend
const getCsrfToken = async () => {
  const response = await fetch('/API/get_csrf_token.php');
  const data = await response.json();
  return data.csrf_token;
};

// 2. Include in API calls
const csrfToken = await getCsrfToken();
const response = await fetch('/API/add_transaction.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    csrf_token: csrfToken,
    Date: '2026-01-09',
    Montant: 100,
    // ... other fields
  }),
  credentials: 'include'
});
```

### API Endpoints Updated

✅ **With CSRF Protection**:
- `add_transaction.php`
- `update_transaction.php`
- `delete_transaction.php`
- `add_category.php`
- `delete_category.php`

❌ **Still Need CSRF Protection**:
- `add_goal.php`
- `update_goal.php`
- `delete_goal.php`
- `add_subcategory.php`
- `update_subcategory.php`
- `delete_subcategory.php`
- `add_recurring_transaction.php`
- `update_objectif.php`
- And all other POST/PUT/DELETE endpoints

---

## 2. Input Validation

### Problem
Without validation, attackers could send:
- Non-numeric values for montant: `"abc"`, `null`, `undefined`
- Invalid dates: `"2026-13-45"`, empty strings
- Huge strings: 10MB+ text in notes field (DoS)
- SQL injection attempts (though PDO prepared statements help)

### Solution: Centralized Validation Functions

New file: `security.php` provides:

```php
// Validates float values (amount/montant)
validate_float($value, $fieldname, $allow_null = false)
// Converts "123,45" (French) → 123.45

// Validates integers (IDs)
validate_int($value, $fieldname, $allow_null = false)
// Rejects "123abc", null, floats

// Validates strings with length constraints
validate_string($value, $fieldname, $min_len = 0, $max_len = 500)
// Sanitizes HTML: "Notes&<script>" → "Notes&amp;&lt;script&gt;"

// Validates dates (YYYY-MM-DD only)
validate_date($value, $fieldname)
// Rejects "2026-13-45", "01/09/2026", empty strings

// Validates currency codes
validate_currency($value, $allowed = ['EUR', 'XOF'])
// Only allows: EUR, XOF (extensible list)
```

### Usage Examples

#### Before (Unsafe)
```php
$montant = (float)$_POST['montant'];  // "abc" → 0 silently!
$date = $_POST['date'];               // No validation
$id = $_POST['id'];                   // Could be string, null
```

#### After (Secure)
```php
try {
  $montant = validate_float($_POST['montant'], 'montant');
  $date = validate_date($_POST['date'], 'date');
  $id = validate_int($_POST['id'], 'id');
} catch (ValidationException $e) {
  http_response_code(400);
  echo json_encode(['error' => $e->getMessage()]);
  exit;
}
```

### API Endpoints Updated

✅ **With Input Validation**:
- `add_transaction.php` - Validates: Date, Type, Montant, category_id, currency
- `update_transaction.php` - Same validations
- `delete_transaction.php` - Validates: id_transaction
- `add_category.php` - Validates: id_type, name, manual_budget
- `delete_category.php` - Validates: id_category, reassign_to_subcategory_id

### Benefits
1. **Type Safety**: Catches invalid data early
2. **Range Protection**: Prevents huge/malicious strings (DoS)
3. **Format Validation**: Dates must be YYYY-MM-DD, currency must be in allowlist
4. **XSS Prevention**: String values sanitized with `htmlspecialchars()`
5. **Better Error Messages**: Client gets clear validation errors

---

## 3. Implementation Checklist

### Immediate (Already Done)
- [x] Create `security.php` with CSRF + validation helpers
- [x] Update `add_transaction.php` - CSRF + validation
- [x] Update `delete_transaction.php` - CSRF + validation
- [x] Update `update_transaction.php` - CSRF + validation
- [x] Update `add_category.php` - CSRF + validation
- [x] Update `delete_category.php` - CSRF + validation

### Short-term (Needed for Release)
- [ ] Create `get_csrf_token.php` endpoint (returns token to frontend)
- [ ] Update React API calls in `src/services/api.ts`:
  - Get CSRF token before POST requests
  - Include `csrf_token` in all POST body
- [ ] Apply CSRF + validation to goals/objectives endpoints:
  - `add_goal.php`, `delete_goal.php`, `update_objectif.php`
- [ ] Apply CSRF + validation to subcategories:
  - `add_subcategory.php`, `delete_subcategory.php`, `update_subcategory.php`
- [ ] Apply to recurring transactions:
  - `add_recurring_transaction.php`, `update_recurring_transaction.php` (if exists), `delete_recurring_transaction.php`
- [ ] Test all endpoints in Postman/curl with valid + invalid inputs
- [ ] Deploy to production

### Medium-term (Important)
- [ ] Add rate limiting (fail2ban or PHP middleware)
- [ ] Configure CORS whitelist (only `saxalis.free.nf`)
- [ ] Enable HTTPS + HSTS headers
- [ ] Hash passwords (if stored in plaintext - check login.php)
- [ ] Sanitize error messages (don't expose DB structure)
- [ ] Add request logging (for audit trail)

---

## 4. Frontend Integration

### Create CSRF Service

File: `src/services/csrf.ts`

```typescript
let cachedToken: string | null = null;

export async function getCsrfToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  
  const response = await fetch('/API/get_csrf_token.php', {
    method: 'GET',
    credentials: 'include'
  });
  const data = await response.json();
  cachedToken = data.csrf_token;
  return cachedToken;
}

export function clearCsrfToken() {
  cachedToken = null;
}
```

### Update API Calls

File: `src/services/api.ts`

```typescript
import { getCsrfToken } from './csrf';

export async function addTransaction(tx: Transaction) {
  const csrfToken = await getCsrfToken();
  return fetch('/API/add_transaction.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      csrf_token: csrfToken,
      ...tx
    }),
    credentials: 'include'
  });
}

export async function deleteTransaction(id: number) {
  const csrfToken = await getCsrfToken();
  return fetch('/API/delete_transaction.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      csrf_token: csrfToken,
      id_transaction: id
    }),
    credentials: 'include'
  });
}
```

---

## 5. Testing

### Manual Testing

```bash
# Test 1: Valid request with CSRF token
curl -X POST https://saxalis.free.nf/API/add_transaction.php \
  -H "Content-Type: application/json" \
  -H "Cookie: PHPSESSID=abc123" \
  -d '{
    "csrf_token": "valid_token_from_session",
    "Date": "2026-01-09",
    "Type": "expense",
    "Montant": 50.00,
    "category_id": 1
  }'

# Test 2: Missing CSRF token (should fail with 403)
curl -X POST https://saxalis.free.nf/API/add_transaction.php \
  -H "Content-Type: application/json" \
  -H "Cookie: PHPSESSID=abc123" \
  -d '{
    "Date": "2026-01-09",
    "Type": "expense",
    "Montant": 50.00,
    "category_id": 1
  }'
# Expected: {"success":false,"error":"CSRF token invalid or missing"}

# Test 3: Invalid montant (should fail with 400)
curl -X POST https://saxalis.free.nf/API/add_transaction.php \
  -H "Content-Type: application/json" \
  -H "Cookie: PHPSESSID=abc123" \
  -d '{
    "csrf_token": "valid_token",
    "Date": "2026-01-09",
    "Type": "expense",
    "Montant": "abc",
    "category_id": 1
  }'
# Expected: {"success":false,"error":"Montant must be a valid number"}

# Test 4: French decimal format (should work)
curl -X POST https://saxalis.free.nf/API/add_transaction.php \
  -H "Content-Type: application/json" \
  -H "Cookie: PHPSESSID=abc123" \
  -d '{
    "csrf_token": "valid_token",
    "Date": "2026-01-09",
    "Type": "expense",
    "Montant": "50,50",
    "category_id": 1
  }'
# Expected: {"success":true,"id_transaction":12345}
```

---

## 6. Error Responses

### CSRF Errors
```json
HTTP 403 Forbidden
{
  "success": false,
  "error": "CSRF token invalid or missing"
}
```

### Validation Errors
```json
HTTP 400 Bad Request
{
  "success": false,
  "error": "Montant must be a valid number"
}
```

### Authorization Errors
```json
HTTP 403 Forbidden
{
  "success": false,
  "error": "Accès refusé"
}
```

---

## 7. Migration Guide

If you have existing code calling these endpoints without CSRF tokens:

1. **Get the token first**:
   ```javascript
   const token = await fetch('/API/get_csrf_token.php').then(r => r.json());
   ```

2. **Add it to every POST request**:
   ```javascript
   body: JSON.stringify({
     csrf_token: token.csrf_token,
     // ... other fields
   })
   ```

3. **Test thoroughly** before deploying to production

---

## 8. Summary

| Vulnerability | Before | After |
|---|---|---|
| **CSRF Attacks** | ❌ No protection | ✅ Token verification |
| **Type Validation** | ❌ Loose coercion | ✅ Strict validation |
| **String Injection** | ⚠️ Limited | ✅ XSS protection |
| **Date Validation** | ❌ None | ✅ Format + validity check |
| **Error Messages** | ❌ Could leak info | ✅ Safe generic messages |

---

## Next Steps

1. Create `get_csrf_token.php` endpoint
2. Update frontend `api.ts` to use CSRF
3. Apply same pattern to remaining endpoints
4. Add rate limiting & CORS
5. Deploy & test thoroughly

For questions, refer to [COMPREHENSIVE_AUDIT.md](COMPREHENSIVE_AUDIT.md#sécurité) security section.
