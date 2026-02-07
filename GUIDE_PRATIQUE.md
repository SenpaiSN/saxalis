# 🚀 Guide Pratique - SaXalis

## Démarrage du développement

### Prérequis
- **Node.js** 16+ + npm/pnpm
- **PHP** 7.4+ (via MAMP ou similaire)
- **MySQL/MariaDB** 5.7+
- **Navigateur** moderne (Chrome, Firefox, Safari)

### Installation locale

```bash
# 1. Cloner le projet (supposé déjà fait)
cd /c/MAMP/htdocs/SaXalis

# 2. Installer dépendances frontend
npm install
# ou
pnpm install

# 3. Copier config locale
cp API/config.local.example.php API/config.local.php
# Éditer avec crédentials DB:
#   $host = 'localhost';
#   $db = 'saxalis';
#   $user = 'root';
#   $pass = '';  (ou votre password MAMP)

# 4. Créer la base de données MySQL
mysql -u root < path/to/saxalis.sql
# (ou importer via phpMyAdmin)

# 5. Démarrer Vite dev server
npm run dev
# → App disponible sur http://localhost:5173

# 6. Démarrer PHP (si utilisant MAMP)
# MAMP → Start Servers
# Apache: http://localhost:8888
# API: http://localhost:8888/SaXalis/API/
```

### Fichiers de configuration

**Frontend:** `.env.local`
```env
VITE_API_BASE_URL=http://localhost:8888/SaXalis
```

**Backend:** `API/config.local.php`
```php
<?php
$host = 'localhost';
$port = '3306';
$db = 'saxalis';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';
```

---

## Commandes courantes

### Développement
```bash
npm run dev             # Vite dev server avec HMR
npm run build           # Build production (dist/)
npm run test            # Vitest runner
npm run test:watch      # Mode watch tests
```

### PHP/API troubleshooting
```bash
# Vérifier config PHP
php -i | grep -E "(PDO|MySQL|session)"

# Test connexion DB depuis CLI
php -r "
  require 'API/config.php';
  echo 'DB connection OK\n';
"

# Debug schema
php API/debug_schema.php

# Export OCR feedback
php API/export_ocr_feedback.php > feedback.json
```

### Migrations database
```bash
# Convertir devise EUR → XOF (DRY RUN)
php API/migrations/migrate_to_xof.php

# VRAIMENT appliquer les changements
php API/migrations/migrate_to_xof.php --confirm

# Backup avant migration
mysqldump -u root saxalis > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## Points clés de développement

### Ajouter une nouvelle transaction type

**1. Backend (API):**

```php
// API/add_transaction.php → déjà générique
// Juste s'assurer que validate_int() accepte le nouvel id_type
```

**2. Frontend (React):**

```tsx
// src/app/App.tsx → déjà charge types dynamiquement
// Inutile de modifier, juste ajouter en DB

// Via API: POST /API/add_type.php
const res = await api.addType({
  code: 'custom',
  label: 'Type Personnalisé'
});
```

---

### Ajouter une nouvelle catégorie

**Backend:**
```bash
# Via API
curl -X POST http://localhost:8888/SaXalis/API/add_category.php \
  -H "Content-Type: application/json" \
  -d '{
    "csrf_token": "<token>",
    "id_type": 1,
    "name": "Nouvelle catégorie"
  }' \
  -b "PHPSESSID=<session>"
```

**Frontend:**
```tsx
// Dans AjouterTransactionModern.tsx
const res = await api.addCategory({
  id_type: typeId,
  name: "Nouvelle"
});
```

---

### Supporter une nouvelle devise

**Étapes:**

1. **Ajouter taux dans [API/config.php](API/config.php):**

```php
function get_conversion_rate($from, $to) {
  $rates = [
    'EUR' => ['XOF' => 655.957, 'USD' => 0.92],
    'XOF' => ['EUR' => 1/655.957, 'USD' => 0.0014],
    'USD' => ['EUR' => 1.09, 'XOF' => 720]
  ];
  if ($from === $to) return 1.0;
  return $rates[$from][$to] ?? null;
}
```

2. **Mettre à jour validation [API/security.php](API/security.php):**

```php
function validate_currency($val, $allowed = ['EUR', 'XOF', 'USD']) {
  // ...
}
```

3. **Appeler validate_currency avec nouvelle devise:**

```php
$currency = validate_currency($data['currency'] ?? 'EUR', ['EUR', 'XOF', 'USD']);
```

4. **Migrer data:**

```bash
php API/migrations/migrate_to_xof.php --confirm
# Ajuster si devise canonique change
```

---

### Implémenter OCR personnalisé

**Client-side (Tesseract.js):**

```tsx
// lib/receiptOcr.ts
export async function analyzeReceipt(imagePath, options = {}) {
  const { Tesseract } = await import('tesseract.js');
  const worker = await Tesseract.createWorker();
  
  const result = await worker.recognize(imagePath);
  const text = result.data.text;
  
  // Parser le texte pour extraire montant, commerçant, etc.
  return parseReceiptText(text);
}
```

**Server-side (Mindee API):**

```php
// API/lib/mindee.php (à créer)
function analyze_with_mindee($file_path, $api_key) {
  $ch = curl_init('https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict');
  
  // multipart form upload
  $post_fields = [
    'document' => new CURLFile($file_path),
    'include_words' => 'true'
  ];
  
  curl_setopt($ch, CURLOPT_POSTFIELDS, $post_fields);
  // ... auth headers, etc
  
  $response = curl_exec($ch);
  return json_decode($response);
}
```

---

### Ajouter nouvelle page/onglet

**Exemple: Ajouter onglet "Récurrences"**

**1. Créer composant:**

```tsx
// src/app/components/RecurringManagement.tsx
export default function RecurringManagement({ 
  transactions,
  onAdd, onEdit, onDelete 
}: Props) {
  // UI pour gérer transactions récurrentes
  return (
    <div>
      {/* ... */}
    </div>
  );
}
```

**2. Ajouter au Tab router dans [src/app/App.tsx](src/app/App.tsx):**

```tsx
const [activeTab, setActiveTab] = useState<
  'dashboard' | 'ajouter' | 'transactions' | 'stats' 
  | 'profil' | 'objectifs' | 'recurring'  // ← NEW
>('dashboard');

// Dans le componetent:
activeTab === 'recurring' && <RecurringManagement {...props} />
```

**3. Ajouter bouton menu:**

```tsx
<button 
  onClick={() => setActiveTab('recurring')}
  className="..."
>
  <Repeat className="w-5 h-5" />
  Récurrences
</button>
```

---

### Déboguer connexion API

**Checklist:**

1. **CORS headers environ:** C'est l'erreur #1 en dev
   - [API/config.php](API/config.php) check CORS headers
   - Frontend request headers include `Origin`
   
   ```tsx
   // src/services/api.ts
   fetch(url, {
     credentials: 'include',  // ← Important pour cookies session
     headers: { 'Accept': 'application/json' }
   })
   ```

2. **Session PHP:**
   - Cookie PHPSESSID reçu/renvoyé ?
   - Session data accessible: `$_SESSION['user']`
   
   ```php
   // API/auth.php
   function require_auth() {
     if (empty($_SESSION['user']['id_utilisateur'])) {
       http_response_code(401);
       // ...
     }
   }
   ```

3. **CSRF token:**
   - Token valide ? Signature correcte ?
   - Endpoint retourne 403 ?
   
   ```tsx
   // src/services/csrf.ts → check token format
   const token = await getCsrfToken();
   // doit être string valide
   ```

4. **Response format:**
   - API retourne JSON valide ?
   - Contient `{ success: bool, data: ? }` ?
   
   ```tsx
   // src/services/api.ts
   const json = JSON.parse(text);
   if (!json.success) throw new Error(json.error);
   ```

**Debug checklist:**

```bash
# 1. Vérifier API accessible
curl http://localhost:8888/SaXalis/API/get_csrf_token.php
# → Doit retourner JSON valide

# 2. Vérifier session PHP
php -r "session_start(); var_dump(\$_SESSION);"

# 3. Logs PHP
tail -f /Applications/MAMP/logs/php_error.log

# 4. Logs Browser
F12 → Console → Network → filter "add_transaction.php"
→ Request headers: CORS, auth header, CSRF token
→ Response headers: CORS allow headers
```

---

### Structure de réponse API standard

**Succès:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "montant": 50.00,
    "categorie": "Alimentation"
  }
}
```

**Erreur:**
```json
{
  "success": false,
  "error": "Description erreur lisible"
}
```

**HTTP codes:**
- `200 OK` - Succès
- `400 Bad Request` - Input invalide
- `401 Unauthorized` - Non authentifié
- `403 Forbidden` - CSRF invalide ou permission denied
- `500 Internal Server Error` - Erreur serveur

---

## Optimisations frontend

### Lazy load components

```tsx
// src/app/App.tsx
const Dashboard = lazy(() => import('./components/Dashboard'));
const StatsModern = lazy(() => import('./components/StatsModern'));

// Fallback
<Suspense fallback={<Spinner />}>
  {activeTab === 'dashboard' && <Dashboard {...} />}
</Suspense>
```

### Memoize expensive calcs

```tsx
// src/app/components/StatsRebuilt.tsx
const computedStats = useMemo(() => {
  return aggregateTransactionStats(transactions, filters);
}, [transactions, filters]);
```

### Request batching

```tsx
// src/app/App.tsx
const [catsRes, typesRes] = await Promise.all([
  api.getCategories(),
  api.getTransactionTypes()
]);
```

---

## Testing

### Example Vitest test

```typescript
// src/app/components/__tests__/Dashboard.test.ts
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Dashboard from '../Dashboard';

describe('Dashboard', () => {
  it('renders summary cards', () => {
    const mockTransactions = [
      { montant: 100, type: 'revenu', date: '2024-01-01' }
    ];
    
    render(<Dashboard transactions={mockTransactions} {...mockProps} />);
    expect(screen.getByText(/Revenus/)).toBeInTheDocument();
  });
});
```

---

## Dépannage courant

### "Session invalide ou expirée"

**Cause:** Token CSRF invalide ou session expirée

```tsx
// src/services/api.ts
if (res.status === 401) {
  // Frontend clear authenticated state
  setIsAuthenticated(false);
  setShowLoginModal(true);
}
```

**Solution:**
1. Vérifier VITE_API_BASE_URL correcte
2. Logout puis login
3. Checker expiration token (défaut: 24h)

---

### "Network error on fetch"

**Cause:** CORS bloquée ou API inaccessible

```
Check:
1. API_BASE correct: http://localhost:8888/SaXalis (pas http://localhost/API/)
2. MAMP Apache running
3. No CORS errors: F12 → Console → Network
4. Credentials: 'include' dans fetch()
```

---

### Transactions n'apparaissent pas après ajout

**Checklist:**
1. API response: `{ success: true }`
2. Frontend: `setTransactions([...])` mis à jour ?
3. localStorage synced ?
4. Filtre cache/sélection masquant la transaction ?

```tsx
// Debug: console log
console.log('Added tx:', newTx);
console.log('All transactions:', transactions);
console.log('Filter state:', { annee, mois, categorie });
```

---

### OCR est vide / aucune extraction

**Checklist:**
1. Image suffisamment claire/lisible ?
2. Tesseract.js chargé ? (télécharger worker: 60-80MB premier run)
3. Mindee API key configurée ? Crédits valides ?
4. Console errors (F12 → Console) ?

```tsx
// Debug OCR
import { analyzeReceipt } from '../../lib/receiptOcr';
const result = await analyzeReceipt(dataUrl, { debug: true });
console.log('OCR result:', result);
```

---

## Checklist déploiement production

- [ ] `API/config.local.php` avec crédentials prod
- [ ] `VITE_API_BASE_URL` pointant domaine prod (https://)
- [ ] `npm run build` → vérifier `dist/` généré
- [ ] DB backups configurés (cron)
- [ ] Logs: `/API/login.log` monitored
- [ ] SSL certificate valide (HTTPS)
- [ ] CORS: `Access-Control-Allow-Origin: https://saxalis.free.nf`
- [ ] PHP session.save_path writable
- [ ] Upload dir (`/uploads/`) writable par PHP
- [ ] Mindee API key valide (si OCR serveur utilisée)
- [ ] Rate limiting sur login/API (optionnel)
- [ ] Backups automatiques DB (cron job)

---

## Commandes utiles supplémentaires

```bash
# Monitor logs en temps réel
tail -f API/login.log

# Compter transactions par user
mysql -u root saxalis -e "SELECT COUNT(*) FROM transactions GROUP BY id_utilisateur;"

# Exporter transactions depuis CLI
php API/debug_get_transactions.php > transactions_dump.json

# Tester CSRF
curl -s http://localhost:8888/SaXalis/API/get_csrf_token.php | jq .

# Vérifier charges plugins Vite
npm ls | head -20
```

---

## Ressources & Documentation

- **Frontend Framework:** [React 18 Docs](https://react.dev)
- **Build Tool:** [Vite Docs](https://vitejs.dev)
- **Styling:** [TailwindCSS](https://tailwindcss.com)
- **Components:** [Radix UI](https://radix-ui.com)
- **Charts:** [Recharts](https://recharts.org)
- **OCR:** [Tesseract.js](https://github.com/naptha/tesseract.js)
- **Icons:** [Lucide React](https://lucide.dev)
- **DB:** [MySQL PDO](https://www.php.net/manual/en/class.pdo.php)
- **API Testing:** [curl](https://curl.se) / [Postman](https://postman.com) / [Thunder Client](https://www.thunderclient.com/)

---

**Dernière mise à jour:** 26 janvier 2026
