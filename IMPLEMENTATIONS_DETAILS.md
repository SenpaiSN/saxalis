# 💻 Implémentations Détaillées & Code Patterns - SaXalis

**Date:** 27 janvier 2026  
**Focus:** Exemples concrets de code et patterns réutilisables

---

## Table des matières

1. [Pattern: Ajout de transaction](#pattern-ajout-de-transaction)
2. [Pattern: Gestion des objectifs](#pattern-gestion-des-objectifs)
3. [Pattern: Appels API frontend](#pattern-appels-api-frontend)
4. [Pattern: OCR & Factures](#pattern-ocr--factures)
5. [Pattern: Multi-devise](#pattern-multi-devise)
6. [Pattern: Filtrage & Recherche](#pattern-filtrage--recherche)
7. [Error Handling](#error-handling)
8. [Performance Tips](#performance-tips)

---

## Pattern: Ajout de transaction

### Backend (API/add_transaction.php)

**Étapes d'implémentation:**

```php
<?php
// 1) CORS headers (toujours au début)
require 'config.php';
require 'auth.php';
require 'security.php';

// 2) Authentification obligatoire
require_auth();  // EXIT si not auth

// 3) CSRF verification
verify_csrf_token();  // EXIT si invalid

// 4) Récupérer JSON payload
$data = json_decode(file_get_contents('php://input'), true);

// 5) Validation stricte
try {
  $date = validate_date($data['Date']);
  $montant = validate_float($data['Montant']);
  $id_type = validate_int($data['id_type']);
  $category_id = validate_int($data['category_id']);
  $subcategory_id = isset($data['subcategory_id']) 
    ? validate_int($data['subcategory_id'], null, true) 
    : null;
  $notes = validate_string($data['Notes'] ?? '', 'Notes', 0, 1000, true);
  $currency = validate_currency($data['currency'] ?? 'EUR', ['EUR', 'XOF']);
} catch (ValidationException $e) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
  exit;
}

// 6) Conversion de devise
$amount_in_xof = $montant;
$amount_eur = null;

if ($currency === 'EUR') {
  $amount_eur = $montant;
  // Convertir à XOF (devise stockage canonique)
  $rate = get_conversion_rate('EUR', 'XOF');
  $amount_in_xof = round($montant * $rate, 2);
} else if ($currency === 'XOF') {
  $amount_eur = $montant / get_conversion_rate('EUR', 'XOF');
  $amount_in_xof = $montant;
}

// 7) INSERT INTO transactions
try {
  $stmt = $pdo->prepare(
    "INSERT INTO transactions 
     (id_utilisateur, Date, Montant, Montant_eur, currency, id_type, category_id, subcategory_id, Notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  
  $stmt->execute([
    current_user_id(),
    $date,
    $amount_in_xof,
    round($amount_eur, 2),
    $currency,
    $id_type,
    $category_id,
    $subcategory_id,
    $notes
  ]);
  
  $transaction_id = $pdo->lastInsertId();
  
  // 8) Response
  http_response_code(201);
  echo json_encode([
    'success' => true,
    'data' => [
      'id_transaction' => $transaction_id,
      'montant' => $montant,
      'currency' => $currency
    ]
  ]);
} catch (PDOException $e) {
  error_log('add_transaction.php: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Database error']);
}
?>
```

### Frontend (src/app/components/AjouterTransactionModern.tsx)

**Étapes d'implémentation:**

```typescript
// 1) Récupérer catégories & sous-catégories
useEffect(() => {
  const loadCategories = async () => {
    const res = await api.getCategories({ id_type: selectedType });
    setCategories(res.data.categories);
  };
  loadCategories();
}, [selectedType]);

// 2) State du formulaire
const [formData, setFormData] = useState({
  Montant: 0,
  currency: 'EUR',
  Date: new Date().toISOString().split('T')[0],
  Type: 'expense',
  id_type: 1,
  category_id: null,
  subcategory_id: null,
  Notes: ''
});

// 3) Handler soumission
async function handleSubmit() {
  try {
    // Validation client-side
    if (!formData.Montant || !formData.category_id) {
      showToast('Veuillez remplir tous les champs');
      return;
    }

    // Appel API
    const res = await api.addTransaction({
      ...formData,
      Montant: parseFloat(formData.Montant),
      id_type: parseInt(formData.id_type)
    });

    if (res.success) {
      showToast('✅ Transaction ajoutée');
      // Recharger transactions
      await reloadTransactions();
      // Fermer modal
      onClose();
    } else {
      showToast(`❌ ${res.error}`, 'error');
    }
  } catch (error) {
    showToast('Erreur réseau', 'error');
  }
}

// 4) Render
return (
  <form onSubmit={handleSubmit}>
    <input 
      type="number" 
      step="0.01"
      value={formData.Montant}
      onChange={(e) => setFormData({...formData, Montant: e.target.value})}
      placeholder="Montant"
    />
    <select value={formData.currency} onChange={...}>
      <option value="EUR">EUR</option>
      <option value="XOF">XOF</option>
    </select>
    <select value={formData.category_id} onChange={...}>
      {categories.map(c => <option key={c.id_category} value={c.id_category}>{c.name}</option>)}
    </select>
    <button type="submit">Ajouter</button>
  </form>
);
```

**Flow résumé:**
```
Frontend submit 
  ↓
validate client-side 
  ↓
POST /API/add_transaction.php + csrf_token
  ↓
Backend validate server-side
  ↓
convert currency EUR → XOF
  ↓
INSERT transaction (canonical XOF + Montant_eur)
  ↓
return transaction_id
  ↓
Frontend: toast + reload list
```

---

## Pattern: Gestion des objectifs

### Créer un goal

**Backend (API/add_goal.php):**

```php
<?php
require_auth();
$data = json_decode(file_get_contents('php://input'), true);

$nom = trim($data['nom'] ?? '');
$montant_objectif = floatval($data['montant_objectif'] ?? 0);
$currency = $data['currency'] ?? 'EUR';

// 1) Ensure "Objectif" category exists
$stmt = $pdo->prepare("SELECT id_category FROM categories WHERE LOWER(name) = 'objectif'");
$stmt->execute();
$category_id = $stmt->fetchColumn();

if (!$category_id) {
  // Create it if doesn't exist
  $stmt = $pdo->prepare("INSERT INTO categories (id_type, name) VALUES (3, 'Objectif')");
  $stmt->execute();
  $category_id = $pdo->lastInsertId();
}

// 2) Create NEW subcategory for this goal
$stmt = $pdo->prepare(
  "INSERT INTO subcategories (category_id, name, icon, is_fixed)
   VALUES (?, ?, '✈️', 0)"
);
$stmt->execute([$category_id, $nom]);
$subcategory_id = $pdo->lastInsertId();

// 3) Convert montant to XOF if needed
$amount_xof = $montant_objectif;
if ($currency === 'EUR') {
  $rate = get_conversion_rate('EUR', 'XOF');
  $amount_xof = round($montant_objectif * $rate, 2);
}

// 4) Insert into objectif_crees
$stmt = $pdo->prepare(
  "INSERT INTO objectif_crees (user_id, id_subcategory, montant, date_depot)
   VALUES (?, ?, ?, NOW())"
);
$stmt->execute([current_user_id(), $subcategory_id, $amount_xof]);

$goal_id = $pdo->lastInsertId();

echo json_encode([
  'success' => true,
  'data' => [
    'id_objectif' => $goal_id,
    'id_subcategory' => $subcategory_id
  ]
]);
?>
```

### Faire un dépôt dans un goal

**Frontend (depositGoal):**

```typescript
async function handleDeposit(goalId: number, amount: number, currency: string) {
  const res = await api.addGoalTransaction({
    goal_id: goalId,
    montant: amount,
    currency: currency,
    date: new Date().toISOString().split('T')[0]
  });

  if (res.success) {
    // Recharger goals
    const goalsRes = await api.getGoals();
    setGoals(goalsRes.data.goals);
    
    // Detecter si objectif atteint
    const goal = goalsRes.data.goals.find(g => g.id === goalId);
    if (goal.progress_pct >= 100) {
      showToast('🎉 Objectif atteint!');
      // Afficher modal confirmation
      showCompleteGoalConfirmation(goal);
    }
  }
}
```

**Backend (API/add_goal_transaction.php):**

```php
<?php
require_auth();
$data = json_decode(file_get_contents('php://input'), true);

$goal_id = (int)$data['goal_id'];
$montant = (float)$data['montant'];
$currency = $data['currency'] ?? 'EUR';

// Find the subcategory linked to this goal
$stmt = $pdo->prepare("SELECT id_subcategory FROM objectif_crees WHERE id_objectif = ? AND user_id = ?");
$stmt->execute([$goal_id, current_user_id()]);
$subcategory_id = $stmt->fetchColumn();

if (!$subcategory_id) {
  http_response_code(404);
  echo json_encode(['success' => false, 'error' => 'Goal not found']);
  exit;
}

// Convert to XOF
$amount_xof = $montant;
if ($currency === 'EUR') {
  $rate = get_conversion_rate('EUR', 'XOF');
  $amount_xof = round($montant * $rate, 2);
}

// Create transaction (type = savings, id_type = 3)
$stmt = $pdo->prepare(
  "INSERT INTO transactions (id_utilisateur, Date, Montant, currency, id_type, category_id, subcategory_id, goal_id, Notes)
   VALUES (?, ?, ?, ?, 3, 13, ?, ?, ?)"
);
$stmt->execute([
  current_user_id(),
  date('Y-m-d'),
  $amount_xof,
  $currency,
  $subcategory_id,
  $goal_id,
  'Dépôt vers objectif'
]);

echo json_encode(['success' => true, 'id_transaction' => $pdo->lastInsertId()]);
?>
```

### Marquer un goal comme atteint

**Frontend (CompleteGoalModal):**

```typescript
async function handleCompleteGoal(goalId: number) {
  // Call backend endpoint
  const res = await api.request('complete_goal.php', {
    method: 'POST',
    body: JSON.stringify({
      csrf_token: await getCsrfToken(),
      goal_id: goalId
    })
  });

  if (res.success) {
    showToast('🎉 Objectif marqué comme complété!');
    // Reload goals
    const goalsRes = await api.getGoals();
    setGoals(goalsRes.data.goals);
  }
}
```

**Backend (assumed endpoint):**

```php
<?php
require_auth();
verify_csrf_token();
$data = json_decode(file_get_contents('php://input'), true);

$goal_id = (int)$data['goal_id'];
$uid = current_user_id();

// Get goal details
$stmt = $pdo->prepare("SELECT * FROM objectif_crees WHERE id_objectif = ? AND user_id = ?");
$stmt->execute([$goal_id, $uid]);
$goal = $stmt->fetch();

if (!$goal) {
  http_response_code(404);
  exit;
}

// Get total collected
$stmt = $pdo->prepare("
  SELECT COALESCE(SUM(Montant), 0) as total
  FROM transactions
  WHERE id_utilisateur = ? AND subcategory_id = ? AND id_type = 3
");
$stmt->execute([$uid, $goal['id_subcategory']]);
$total_collected = $stmt->fetchColumn();

try {
  $pdo->beginTransaction();

  // 1) Insert into objectif_atteints
  $stmt = $pdo->prepare(
    "INSERT INTO objectif_atteints (user_id, montant_objectif, total_collected, progress_pct, date_completion)
     VALUES (?, ?, ?, 100, NOW())"
  );
  $stmt->execute([$uid, $goal['montant'], $total_collected]);

  // 2) Delete from objectif_crees
  $stmt = $pdo->prepare("DELETE FROM objectif_crees WHERE id_objectif = ? AND user_id = ?");
  $stmt->execute([$goal_id, $uid]);

  $pdo->commit();

  echo json_encode(['success' => true]);
} catch (Exception $e) {
  $pdo->rollBack();
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
```

---

## Pattern: Appels API frontend

### Service wrapper (src/services/api.ts)

```typescript
// Base HTTP client
async function request(path: string, options: RequestInit = {}) {
  const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
  
  try {
    const res = await fetch(`${API_BASE}/API/${path}`, {
      credentials: 'include',  // Include cookies for session
      headers: {
        'Accept': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    // Read response as text
    const text = await res.text();

    // Check for errors
    if (res.status === 401) {
      return { ok: false, status: 401, error: 'Session expired' };
    }

    if (text.startsWith('<?php') || text.startsWith('<!')) {
      return { ok: false, status: res.status, error: 'Server returned HTML (not JSON)' };
    }

    // Parse JSON
    try {
      const json = text ? JSON.parse(text) : {};
      return { ok: res.ok, status: res.status, data: json };
    } catch (e) {
      return { ok: false, status: res.status, error: 'Invalid JSON response' };
    }
  } catch (networkError: any) {
    return { ok: false, error: networkError?.message };
  }
}

// Specific API functions
export async function addTransaction(payload: any) {
  const body = await addCsrfToBody(payload);
  return request('add_transaction.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function getGoals() {
  return request('get_goals.php', { method: 'GET' });
}

export async function addGoalTransaction(payload: any) {
  const body = await addCsrfToBody(payload);
  return request('add_goal_transaction.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}
```

### CSRF token management (src/services/csrf.ts)

```typescript
let cachedToken: string | null = null;
let tokenPromise: Promise<string> | null = null;

export async function getCsrfToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  if (tokenPromise) return tokenPromise;

  tokenPromise = request('get_csrf_token.php', { method: 'GET' }).then(res => {
    if (res.ok && res.data?.data?.csrf_token) {
      cachedToken = res.data.data.csrf_token;
      return cachedToken;
    }
    throw new Error('Failed to get CSRF token');
  });

  return tokenPromise;
}

export async function addCsrfToBody(payload: any): Promise<any> {
  const token = await getCsrfToken();
  return { ...payload, csrf_token: token };
}
```

### Usage in components

```typescript
// In component
import * as api from '../services/api';

async function handleAddTransaction() {
  const res = await api.addTransaction({
    Date: new Date().toISOString().split('T')[0],
    Montant: 50.00,
    currency: 'EUR',
    id_type: 1,
    category_id: 3
  });

  if (res.ok) {
    showToast('✅ Transaction added');
    reloadTransactions();
  } else {
    showToast(`❌ Error: ${res.error}`, 'error');
  }
}
```

---

## Pattern: OCR & Factures

### OCR Processing (ReceiptScannerModal.tsx)

```typescript
import Tesseract from 'tesseract.js';

async function analyzeReceiptOCR(imageDataUrl: string) {
  setIsProcessing(true);
  setOcrProgress({ step: 'Initializing OCR...', percent: 10 });

  try {
    // Use Tesseract.js (local OCR)
    const result = await Tesseract.recognize(
      imageDataUrl,
      'fra',  // French language
      {
        logger: (m) => {
          setOcrProgress({
            step: m.status,
            percent: Math.round(m.progress * 100)
          });
        }
      }
    );

    const fullText = result.data.text;

    // Extract amounts with regex
    const amountRegex = /(\d+[.,]\d{2})/g;
    const matches = fullText.match(amountRegex) || [];
    const candidates = matches.map(m => ({
      raw: m,
      value: parseFloat(m.replace(',', '.')),
      score100: 85 // confidence score
    }));

    // Extract merchant (usually first non-numeric line)
    const lines = fullText.split('\n');
    const merchant = lines.find(l => l.length > 3 && !l.match(/^\d/)) || 'Unknown';

    // Extract date
    const dateRegex = /(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/;
    const dateMatch = fullText.match(dateRegex);
    const date = dateMatch 
      ? new Date(dateMatch[1]).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    setExtracted({
      merchant,
      amount: candidates[0]?.value || 0,
      date,
      category: 'Alimentation' // default guess
    });

    setCandidates(candidates);
  } catch (error) {
    setOcrError('OCR processing failed');
  } finally {
    setIsProcessing(false);
  }
}

async function handleConfirmExtraction() {
  // Send OCR feedback for ML training
  await api.ocrFeedback({
    action: 'accepted',
    merchant: extracted.merchant,
    suggested_amount: candidates[0]?.value,
    applied_amount: extracted.amount,
    suggested_category: 'Alimentation',
    applied_category: extracted.category,
    candidates: candidates
  });

  // Add transaction with extracted data
  onComplete(extracted, fileToUpload);
}
```

### PDF to Image conversion (src/lib/pdfToImage.ts)

```typescript
import * as pdfjsLib from 'pdfjs-dist';

export async function convertPdfFirstPageToImage(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  
  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer
  }).promise;

  const page = await pdf.getPage(1);  // First page only

  const scale = 2.0;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const context = canvas.getContext('2d');
  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;

  return canvas.toDataURL('image/jpeg', 0.9);
}

export function isPdf(filename: string): boolean {
  return filename.toLowerCase().endsWith('.pdf');
}
```

---

## Pattern: Multi-devise

### Configuration (API/config.php)

```php
function get_conversion_rate($from, $to) {
  $rates = [
    'EUR' => ['XOF' => 655.957, 'USD' => 1.10],
    'XOF' => ['EUR' => 1/655.957, 'USD' => 0.00168],
    'USD' => ['EUR' => 0.909, 'XOF' => 595.00]
  ];

  if ($from === $to) return 1.0;
  if (!isset($rates[$from][$to])) return null;

  return $rates[$from][$to];
}
```

### Transaction creation with currency conversion

```php
// In add_transaction.php

$currency = $data['currency'] ?? 'EUR';
$original_amount = (float)$data['Montant'];

// Canonical storage: XOF
$amount_xof = $original_amount;
$amount_eur = null;

if ($currency === 'EUR') {
  $amount_eur = $original_amount;
  $rate = get_conversion_rate('EUR', 'XOF');
  if ($rate) $amount_xof = round($original_amount * $rate, 2);
} 
else if ($currency === 'XOF') {
  $amount_xof = $original_amount;
  $rate = get_conversion_rate('XOF', 'EUR');
  if ($rate) $amount_eur = round($amount_xof * $rate, 2);
}

// INSERT with both amounts
$stmt = $pdo->prepare(
  "INSERT INTO transactions (id_utilisateur, Date, Montant, Montant_eur, currency, ...)
   VALUES (?, ?, ?, ?, ?, ...)"
);
$stmt->execute([
  $user_id,
  $date,
  $amount_xof,      // Canonical storage
  $amount_eur,      // For history
  $currency,        // Original currency
  ...more_fields
]);
```

### Display conversion (Frontend)

```typescript
function displayAmount(transaction: Transaction, userCurrency: string) {
  if (userCurrency === 'EUR' && transaction.Montant_eur) {
    return `${transaction.Montant_eur.toFixed(2)} EUR`;
  }
  return `${transaction.Montant.toFixed(2)} XOF`;
}

// In component
const userCurrency = currentUser.currency; // 'EUR' or 'XOF'
const displayValue = displayAmount(transaction, userCurrency);
```

---

## Pattern: Filtrage & Recherche

### State management (App.tsx)

```typescript
// Lifted state
const [recherche, setRecherche] = useState('');
const [filtreType, setFiltreType] = useState<'tous' | 'expense' | 'income'>('tous');
const [annee, setAnnee] = useState<'Tous' | string>('Tous');
const [mois, setMois] = useState<'Tous' | string>('Tous');
const [categorie, setCategorie] = useState<'Toutes' | string>('Toutes');

// Shared with multiple components
<Dashboard 
  transactions={transactions}
  recherche={recherche}
  filtreType={filtreType}
  // ...
/>
```

### Filter logic (searchUtils.ts)

```typescript
import { Transaction } from '../App';

export function filterTransactions(
  transactions: Transaction[],
  {
    recherche,
    filtreType,
    annee,
    mois,
    categorie,
    sousCategorie
  }
): Transaction[] {
  return transactions.filter(t => {
    // Full-text search
    const searchLower = recherche.toLowerCase();
    const matchSearche =
      t.montant.toString().includes(searchLower) ||
      t.categorie.toLowerCase().includes(searchLower) ||
      (t.note?.toLowerCase() || '').includes(searchLower) ||
      t.date.includes(searchLower);

    if (recherche && !matchSearche) return false;

    // Type filter
    if (filtreType !== 'tous' && t.type !== filtreType) return false;

    // Year filter
    const year = new Date(t.date).getFullYear().toString();
    if (annee !== 'Tous' && year !== annee) return false;

    // Month filter
    const month = String(new Date(t.date).getMonth() + 1).padStart(2, '0');
    if (mois !== 'Tous' && month !== mois) return false;

    // Category filter
    if (categorie !== 'Toutes' && t.categorie !== categorie) return false;

    // Subcategory filter
    if (sousCategorie !== 'Toutes' && t.subcategory !== sousCategorie) return false;

    return true;
  });
}
```

### Usage in component

```typescript
import { filterTransactions } from './searchUtils';

export default function TransactionsModern({ 
  transactions,
  recherche,
  filtreType,
  annee,
  mois,
  categorie
}) {
  const filtered = useMemo(() => {
    return filterTransactions(transactions, {
      recherche,
      filtreType,
      annee,
      mois,
      categorie
    });
  }, [transactions, recherche, filtreType, annee, mois, categorie]);

  return (
    <table>
      <tbody>
        {filtered.map(t => (
          <tr key={t.id}>
            <td>{t.date}</td>
            <td>{t.montant}</td>
            <td>{t.categorie}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## Error Handling

### Frontend Error Handling

```typescript
// In api.ts
async function request(path: string, options: RequestInit = {}) {
  try {
    const res = await fetch(`${API_BASE}/API/${path}`, { ...options });
    
    // Check response status
    if (res.status === 401) {
      // Unauthorized - clear session
      clearSessionData();
      return { ok: false, error: 'Session expired' };
    }

    if (res.status === 403) {
      // Forbidden - CSRF likely
      return { ok: false, error: 'CSRF token invalid' };
    }

    if (res.status === 400) {
      // Bad request - validation error
      const json = await res.json();
      return { ok: false, error: json.error || 'Invalid request' };
    }

    // Parse response
    const json = await res.json();
    return { ok: res.ok, status: res.status, data: json };
  } catch (networkError) {
    return { 
      ok: false, 
      error: 'Network error: ' + networkError.message 
    };
  }
}

// In component
async function handleAction() {
  const res = await api.addTransaction({...});
  
  if (res.ok) {
    showToast('Success', 'success');
  } else if (res.error === 'Session expired') {
    setIsAuthenticated(false);
    setShowLoginModal(true);
  } else if (res.error === 'CSRF token invalid') {
    // Retry with fresh token
    const newToken = await getCsrfToken();
    handleAction(); // retry
  } else {
    showToast(res.error, 'error');
  }
}
```

### Backend Error Handling

```php
// In endpoint
try {
  require_auth();
  verify_csrf_token();

  $data = json_decode(file_get_contents('php://input'), true);

  // Validate
  $montant = validate_float($data['Montant']);
  $date = validate_date($data['Date']);

  // Execute
  $stmt = $pdo->prepare("INSERT INTO transactions (...) VALUES (...)");
  $stmt->execute([...]);

  http_response_code(201);
  echo json_encode(['success' => true, 'data' => [...]]);

} catch (ValidationException $e) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);

} catch (PDOException $e) {
  error_log('Transaction insert failed: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Database error']);

} catch (Exception $e) {
  error_log('Unexpected error: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Internal server error']);
}
?>
```

---

## Performance Tips

### 1. Database Queries

**❌ N+1 Problem:**
```php
// Bad: Multiple queries in loop
$users = $pdo->query("SELECT * FROM users")->fetchAll();
foreach ($users as $user) {
  $stmt = $pdo->prepare("SELECT * FROM transactions WHERE user_id = ?");
  $stmt->execute([$user['id']]);
  // ... many queries!
}
```

**✅ Solution: JOIN**
```php
// Good: Single query with JOIN
$stmt = $pdo->prepare("
  SELECT u.*, t.* 
  FROM users u
  LEFT JOIN transactions t ON u.id = t.user_id
");
$results = $stmt->fetchAll();
```

### 2. Caching

**Frontend - memoization:**
```typescript
const filtered = useMemo(() => {
  return filterTransactions(transactions, filters);
}, [transactions, filters]);

const totals = useMemo(() => {
  return calculateTotals(filtered);
}, [filtered]);
```

**Backend - session caching:**
```php
// Cache user preferences
$_SESSION['user_prefs'] = [
  'currency' => 'EUR',
  'theme' => 'dark'
];

// Avoid repeated DB queries
if (!isset($_SESSION['categories'])) {
  $stmt = $pdo->prepare("SELECT * FROM categories WHERE user_id = ?");
  $stmt->execute([$uid]);
  $_SESSION['categories'] = $stmt->fetchAll();
}
```

### 3. Pagination

**Backend:**
```php
$limit = 20;
$offset = ($page - 1) * $limit;

$stmt = $pdo->prepare("
  SELECT * FROM transactions 
  WHERE user_id = ? 
  ORDER BY Date DESC 
  LIMIT ? OFFSET ?
");
$stmt->execute([$uid, $limit, $offset]);
```

**Frontend:**
```typescript
const [page, setPage] = useState(1);
const itemsPerPage = 20;

async function loadPage(p: number) {
  const res = await api.getTransactions({ page: p, limit: itemsPerPage });
  setTransactions(res.data.transactions);
  setCurrentPage(p);
}
```

### 4. Async/await patterns

**Parallel requests:**
```typescript
// ✅ Good: Run in parallel
const [trans, cats, budgets] = await Promise.all([
  api.getTransactions(),
  api.getCategories(),
  api.getBudgets()
]);
```

**Sequential with dependencies:**
```typescript
// ✅ Good: Sequential (intentional)
const types = await api.getTransactionTypes();
const cats = await api.getCategories({ id_type: types[0].id });
```

---

## Checklist pour ajouter une nouvelle feature

### 1. Créer le backend endpoint

- [ ] Créer `API/new_feature.php`
- [ ] Inclure: `config.php`, `auth.php`, `security.php`
- [ ] Appeler `require_auth()` + `verify_csrf_token()`
- [ ] Valider input avec `validate_*()` functions
- [ ] Préparer SQL statements (PDO prepared)
- [ ] Tester avec curl en local
- [ ] Documenter dans [API_REFERENCE.md](API_REFERENCE.md)

### 2. Créer le frontend service

- [ ] Ajouter fonction dans `src/services/api.ts`
- [ ] Utiliser pattern `addCsrfToBody()`
- [ ] Gérer 401/403/400 errors
- [ ] Doc les paramètres avec JSDoc

### 3. Créer le component React

- [ ] Créer composant dans `src/app/components/`
- [ ] Utiliser Radix UI pour accessibilité
- [ ] Ajouter form validation client-side
- [ ] Afficher toasts d'erreur/succès
- [ ] Gérer loading state

### 4. Tests

- [ ] Test manuel en dev (browser devtools)
- [ ] Test avec curl: `curl -X POST http://localhost:8888/SaXalis/API/new_feature.php ...`
- [ ] Test erreurs: missing CSRF, invalid input, 401 unauth
- [ ] Test edge cases

---

**Dernière mise à jour:** 27 janvier 2026
