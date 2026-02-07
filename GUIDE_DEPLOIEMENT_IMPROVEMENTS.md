# 🚀 Guide de Déploiement & Améliorations - SaXalis

---

## ✅ Checklist de Production

### 1. Configuration Database

```bash
# 1) SSH into server
ssh user@host

# 2) Create database
mysql -u root -p
> CREATE DATABASE if0_40680976_suivi_depenses CHARACTER SET utf8mb4;
> CREATE USER 'if0_40680976'@'localhost' IDENTIFIED BY 'strong_password';
> GRANT ALL PRIVILEGES ON if0_40680976.* TO 'if0_40680976'@'localhost';
> FLUSH PRIVILEGES;

# 3) Import schema
mysql -u if0_40680976 -p if0_40680976_suivi_depenses < BASE\ DE\ DONNEES/if0_40680976_suivi_depenses.sql

# 4) Verify
mysql -u if0_40680976 -p if0_40680976_suivi_depenses
> SHOW TABLES;
> SELECT COUNT(*) FROM users;
```

### 2. Configuration Backend

**Créer `API/config.local.php` (NOT in git):**

```php
<?php
// API/config.local.php - Production credentials

// Database
$host = 'localhost';
$port = '3306';
$db = 'if0_40680976_suivi_depenses';
$user = 'if0_40680976';
$pass = 'your_strong_password_here';
$charset = 'utf8mb4';

// Session cookie security
ini_set('session.cookie_httponly', 1);  // No JavaScript access
ini_set('session.cookie_secure', 1);    // HTTPS only
ini_set('session.cookie_samesite', 'Strict');

// CORS origin in production
define('CORS_ALLOWED_ORIGINS', [
  'https://saxalis.free.nf',
  'https://www.saxalis.free.nf'
]);

// Timezone
date_default_timezone_set('UTC');

// Error logging
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/logs/php_errors.log');
?>
```

**Verify config.php includes it:**

```php
// In config.php
if (file_exists(__DIR__ . '/config.local.php')) {
  include __DIR__ . '/config.local.php';
}
```

### 3. Configuration Frontend (.env.local)

```bash
# .env.local (at root)
VITE_API_BASE_URL=https://saxalis.free.nf
VITE_ENVIRONMENT=production
```

### 4. Build & Deploy

```bash
# Frontend
npm ci  # Install dependencies (locked versions)
npm run build  # Create dist/ bundle

# Upload dist/ to server
# Example: sftp/rsync to /var/www/saxalis.free.nf/

# Backend (already on server via git or FTP)
# Ensure API/config.local.php is configured
# Ensure logs/ directory exists with proper permissions

# Set permissions
chmod 755 /var/www/saxalis.free.nf/
chmod 644 /var/www/saxalis.free.nf/*.php
chmod 755 /var/www/saxalis.free.nf/API/
chmod 644 /var/www/saxalis.free.nf/API/*.php
chmod 755 /var/www/saxalis.free.nf/uploads/
chmod 755 /var/www/saxalis.free.nf/API/logs/
```

### 5. SSL Certificate

```bash
# Let's Encrypt (free)
certbot certonly --webroot -w /var/www/saxalis.free.nf -d saxalis.free.nf -d www.saxalis.free.nf

# Auto-renewal
certbot renew --dry-run
```

### 6. Testing Production

```bash
# Test API endpoint
curl -X GET https://saxalis.free.nf/API/check_session.php

# Test CORS
curl -H "Origin: https://saxalis.free.nf" https://saxalis.free.nf/API/check_session.php

# Test login
curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"user","password":"pass"}' \
  https://saxalis.free.nf/API/login.php
```

### 7. Monitoring & Logs

**PHP Error Logs:**
```bash
# Tail errors
tail -f /var/www/saxalis.free.nf/API/logs/php_errors.log

# Check disk space
df -h /var

# Check database size
mysql -u if0_40680976 -p
> SELECT table_name, ROUND(((data_length + index_length) / 1024 / 1024), 2) as 'Size in MB' FROM information_schema.TABLES WHERE table_schema = 'if0_40680976_suivi_depenses';
```

**Backup Strategy:**
```bash
# Daily backup (cron job)
0 2 * * * mysqldump -u if0_40680976 -p'password' if0_40680976_suivi_depenses > /backup/suivi_depenses_$(date +\%Y\%m\%d).sql

# Keep last 30 days
find /backup -name "suivi_depenses_*.sql" -mtime +30 -delete
```

---

## 📋 Standards & Conventions

### Backend (PHP)

**File naming:**
```
API/
├── add_*.php        // Create resources
├── get_*.php        // Retrieve resources
├── update_*.php     // Modify resources
├── delete_*.php     // Remove resources
├── config.php       // Global config
├── auth.php         // Session utilities
├── security.php     // Validation & CSRF
└── migrations/      // Schema changes
```

**Response format:**
```php
// Success
http_response_code(200);  // or 201 for POST
echo json_encode([
  'success' => true,
  'data' => [...],
  'message' => 'Optional success message'
]);

// Error
http_response_code(400);  // or 401, 403, 500
echo json_encode([
  'success' => false,
  'error' => 'Human-readable error message'
]);
```

**Validation:**
```php
// Always validate at start of endpoint
try {
  $montant = validate_float($data['Montant']);
  $date = validate_date($data['Date']);
  // ...
} catch (ValidationException $e) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
  exit;
}
```

### Frontend (React)

**Component structure:**
```typescript
// Functional component with hooks
export default function MyComponent() {
  // 1) State
  const [state, setState] = useState(...);

  // 2) Effects
  useEffect(() => {
    // Initialization
  }, []);

  // 3) Handlers
  const handleClick = async () => {
    // Event handler
  };

  // 4) Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

**API call pattern:**
```typescript
async function fetchData() {
  try {
    const res = await api.endpoint({...});
    if (res.ok) {
      setState(res.data);
    } else {
      toast.error(res.error);
    }
  } catch (error) {
    toast.error('Network error');
  }
}
```

**Styling:**
```typescript
// Use TailwindCSS classes
<div className="p-4 bg-white dark:bg-slate-900 rounded-lg shadow">
  <h1 className="text-lg font-bold text-slate-900 dark:text-white">
    Title
  </h1>
</div>
```

---

## 🎯 Recommendations for Improvement

### Phase 1: Short-term (1-2 weeks)

#### 1.1 Add TypeScript to Backend

**Why:** Type safety, IDE autocomplete, fewer bugs

```bash
# Install PHP development tools
composer require vimeo/psalm psalm/plugin-laravel
```

**Or create a PHP types file:**
```php
// API/types.php
<?php
/**
 * @param float $amount
 * @param string $currency EUR|XOF
 * @return float Amount in XOF
 */
function convertToCanonical(float $amount, string $currency): float {
  // ...
}
?>
```

#### 1.2 Add Unit Tests

**Frontend (Vitest):**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

**Example test:**
```typescript
// src/app/components/__tests__/filterTransactions.test.ts
import { describe, it, expect } from 'vitest';
import { filterTransactions } from '../searchUtils';

describe('filterTransactions', () => {
  it('should filter by category', () => {
    const transactions = [...];
    const filtered = filterTransactions(transactions, {
      categorie: 'Alimentation'
    });
    expect(filtered.every(t => t.categorie === 'Alimentation')).toBe(true);
  });
});
```

**Backend (PHPUnit):**
```bash
composer require phpunit/phpunit --dev
```

#### 1.3 Implement Proper Error Boundaries

**React Component:**
```typescript
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

### Phase 2: Medium-term (1 month)

#### 2.1 Implement WebSocket for Real-time Updates

**Why:** Multiple devices/sessions, real-time collaboration

```typescript
// src/services/websocket.ts
export function connectWebSocket(userId: number) {
  const ws = new WebSocket('wss://saxalis.free.nf/ws');
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'transaction_created') {
      // Update UI in real-time
      dispatch({ type: 'ADD_TRANSACTION', payload: data.transaction });
    }
  };

  return ws;
}
```

**PHP WebSocket Server (using Ratchet):**
```bash
composer require cboden/ratchet
```

#### 2.2 Add Advanced Reporting

**Features:**
- [ ] PDF export of transactions
- [ ] Excel export with charts
- [ ] Monthly/yearly summaries
- [ ] Tax report generation

**Example endpoint:**
```php
// API/export_transactions.php
$format = $_GET['format']; // 'pdf', 'xlsx', 'csv'

if ($format === 'pdf') {
  // Use TCPDF or similar
  require 'vendor/autoload.php';
  $pdf = new TCPDF();
  // ... generate PDF
  $pdf->Output('transactions.pdf', 'D');
}
```

#### 2.3 Implement Bank API Integration

**Services:**
- [ ] Plaid (US/UK/EU) - Read-only access
- [ ] Open Banking (PSD2) - EU standard
- [ ] Manual CSV import

**Pattern:**
```typescript
// In component
async function handleBankConnect() {
  const linkToken = await api.getBankLinkToken();
  // Open Plaid Link modal
  const publicToken = await plaid.open();
  // Exchange for access token
  await api.exchangePublicToken(publicToken);
  // Sync transactions
  await api.syncBankTransactions();
}
```

### Phase 3: Long-term (3-6 months)

#### 3.1 Mobile App (React Native)

```bash
npx create-react-native-app SaXalisMobile
npx expo install expo-secure-store  # For token storage
npx expo install react-native-camera  # For receipt scanning
```

#### 3.2 AI/ML Features

**Recommendations:**
```python
# Backend (Python service)
from sklearn.ensemble import RandomForestClassifier

# Train on ocr_feedback data
# Auto-categorize new transactions
def predict_category(merchant: str, amount: float) -> str:
  # ...
  return predicted_category
```

**Auto vs Manual thresholds:**
```typescript
// Frontend
if (confidence > 0.95) {
  // Auto-apply suggestion
  applyExtractionDirectly();
} else if (confidence > 0.70) {
  // Show suggestion for confirmation
  showSuggestionModal();
} else {
  // Ask user to manually enter
  showManualForm();
}
```

#### 3.3 Investment Portfolio Tracking

**New tables:**
```sql
CREATE TABLE investments (
  id INT PRIMARY KEY,
  user_id INT,
  symbol VARCHAR(10),  -- AAPL, BTC, etc
  quantity DECIMAL(20,8),
  purchase_price DECIMAL(10,2),
  purchase_date DATE,
  current_value DECIMAL(10,2),
  updated_at TIMESTAMP
);
```

---

## 🔒 Security Hardening

### Current Status: ✅ Good

- [x] Session-based auth with secure cookies
- [x] CSRF tokens for all POST requests
- [x] SQL injection prevention (PDO prepared statements)
- [x] Input validation (validate_* functions)
- [x] CORS with whitelist
- [x] Password hashing (PHP password_hash)

### Additional Measures

#### 1. Rate Limiting

```php
// API/middleware/rate_limit.php
function check_rate_limit($user_id, $endpoint, $max_requests = 100, $window = 3600) {
  $key = "rate_limit:{$user_id}:{$endpoint}";
  $current = apcu_fetch($key) ?? 0;
  
  if ($current >= $max_requests) {
    http_response_code(429);  // Too Many Requests
    exit;
  }
  
  apcu_store($key, $current + 1, $window);
}

// In endpoint
check_rate_limit(current_user_id(), 'add_transaction', 1000, 3600);
```

#### 2. API Key for External Services

```php
// config.php
define('MINDEE_API_KEY', getenv('MINDEE_API_KEY'));

// Frontend should NOT have this key
// All OCR requests should go through backend proxy
```

#### 3. Content Security Policy (CSP)

```php
// In config.php
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' unpkg.com; style-src 'self' 'unsafe-inline'");
```

#### 4. HSTS (HTTP Strict Transport Security)

```php
// config.php
header("Strict-Transport-Security: max-age=31536000; includeSubDomains");
```

---

## 📊 Monitoring & Analytics

### Server Monitoring

```bash
# CPU/RAM/Disk
htop
df -h
free -h

# MySQL monitoring
mysqld --verbose --help | grep -A 20 "max_connections"

# PHP-FPM status
php-fpm -t  # Test config
systemctl status php-fpm
```

### Application Metrics

**Create dashboard endpoint:**
```php
// API/admin/metrics.php
// Requires admin auth
function get_metrics() {
  return [
    'active_users' => $pdo->query("SELECT COUNT(DISTINCT id_utilisateur) FROM sessions WHERE last_activity > NOW() - INTERVAL 1 HOUR")->fetchColumn(),
    'transactions_today' => $pdo->query("SELECT COUNT(*) FROM transactions WHERE DATE(Date) = CURDATE()")->fetchColumn(),
    'total_transactions' => $pdo->query("SELECT COUNT(*) FROM transactions")->fetchColumn(),
    'database_size_mb' => 0, // See earlier snippet
    'api_response_time_ms' => $response_time
  ];
}
```

### Logging Strategy

```php
// Create logger helper
function log_event($level, $message, $context = []) {
  $logFile = __DIR__ . '/logs/' . date('Y-m-d') . '.log';
  $timestamp = date('Y-m-d H:i:s');
  $userId = current_user_id() ?? 'ANON';
  $logEntry = "[$timestamp] [$level] [User:$userId] $message " . json_encode($context);
  error_log($logEntry . "\n", 3, $logFile);
}

// Usage
log_event('INFO', 'Transaction added', ['id_transaction' => 123]);
log_event('ERROR', 'Database connection failed', ['error' => $e->getMessage()]);
```

---

## 📚 Documentation Best Practices

### Keep Updated

- [ ] Update [ANALYSE_TECHNIQUE_DETAILLEE.md](ANALYSE_TECHNIQUE_DETAILLEE.md) when schema changes
- [ ] Update [API_REFERENCE.md](API_REFERENCE.md) when adding endpoints
- [ ] Document breaking changes in CHANGELOG.md
- [ ] Keep README.md with setup instructions

### API Documentation (auto-generated)

```php
/**
 * POST /API/add_transaction.php
 * 
 * Creates a new transaction for the authenticated user.
 * 
 * @param float $Montant Transaction amount (required)
 * @param string $currency EUR or XOF (default: EUR)
 * @param string $Date YYYY-MM-DD (default: today)
 * @param int $id_type 1=expense, 2=income, 3=saving
 * @param int $category_id Category ID
 * @param int $subcategory_id Subcategory ID (optional)
 * @param string $Notes Transaction notes (optional)
 * 
 * @return {success: true, data: {id_transaction: int, ...}}
 * @throw 400 Bad Request (validation)
 * @throw 401 Unauthorized
 * @throw 403 Forbidden (CSRF)
 */
```

---

## 🎓 Team Onboarding

### Day 1: Architecture Overview
- [ ] Read ANALYSE_TECHNIQUE_DETAILLEE.md
- [ ] Review ARCHITECTURE_DIAGRAMS.md
- [ ] Explore codebase structure

### Day 2: Backend Setup
- [ ] Clone repo
- [ ] Configure API/config.local.php
- [ ] Test endpoints with curl
- [ ] Run a simple POST request

### Day 3: Frontend Setup
- [ ] npm install & npm run dev
- [ ] Add a simple component
- [ ] Make an API call
- [ ] Debug with browser DevTools

### Day 4: Database
- [ ] Import schema
- [ ] Query sample data
- [ ] Understand relationships

### Day 5: Deploy to Staging
- [ ] Test full flow: Register → Add Transaction → View Stats

---

## 🐛 Common Issues & Solutions

### Issue: CORS error in browser console
```
Access to XMLHttpRequest at 'X' from origin 'Y' has been blocked by CORS policy
```

**Solution:**
```php
// Verify CORS_ALLOWED_ORIGINS in config.php
// Check that origin matches exactly (including protocol & port)
// Restart web server if config changed
```

### Issue: CSRF token invalid (403)
```
"success": false, "error": "CSRF token invalid or missing"
```

**Solution:**
```typescript
// 1) Verify token is fetched
const token = await getCsrfToken();

// 2) Verify token is added to body
const body = await addCsrfToBody(payload);

// 3) Check session not expired
// 4) Try fresh token: clear cachedToken
```

### Issue: Session expires after 30 minutes
```
response: HTTP 401 "Session invalide ou expirée"
```

**Solution:**
```php
// In config.php
// PHP Session timeout
ini_set('session.gc_maxlifetime', 86400);  // 24 hours
ini_set('session.cookie_lifetime', 86400);
```

### Issue: Uploads failing (large files)
```
POST /upload_invoice.php -> 413 Request Entity Too Large
```

**Solution:**
```php
// In config.php or .htaccess
php_value post_max_size 50M
php_value upload_max_filesize 50M
```

---

## 🚂 Roadmap Example

```
Q1 2026:
├─ [ ] Implement automated tests (unit + integration)
├─ [ ] Add WebSocket for real-time updates
├─ [ ] PDF export of transactions
└─ [ ] Performance optimization (database indexing)

Q2 2026:
├─ [ ] Bank API integration (Plaid)
├─ [ ] Advanced reporting & analytics
├─ [ ] Mobile app (React Native MVP)
└─ [ ] AI-powered categorization

Q3 2026:
├─ [ ] Investment portfolio tracking
├─ [ ] Collaborative features (sharing budgets)
├─ [ ] API public (OAuth)
└─ [ ] Marketplace (plugins/integrations)

Q4 2026:
├─ [ ] Mobile app (iOS/Android release)
├─ [ ] Multilingual support (i18n)
├─ [ ] Desktop app (Electron)
└─ [ ] 1.0 stable release
```

---

**Dernière mise à jour:** 27 janvier 2026  
**Statut:** Production Ready ✅
