# 📘 Analyse Technique Détaillée - SaXalis

**Date:** 27 janvier 2026  
**Version:** 1.0  
**Auteur:** Analyse Complète  

---

## Table des matières

1. [Vue d'ensemble du projet](#vue-densemble-du-projet)
2. [Architecture générale](#architecture-générale)
3. [Stack technologique](#stack-technologique)
4. [Base de données](#base-de-données)
5. [API REST (80+ endpoints)](#api-rest)
6. [Flux métier détaillés](#flux-métier-détaillés)
7. [Frontend (React + TypeScript)](#frontend-react--typescript)
8. [Sécurité](#sécurité)
9. [Points clés à retenir](#points-clés-à-retenir)

---

## Vue d'ensemble du projet

### Qu'est-ce que **SaXalis** ?

**SaXalis** est une **application de gestion financière personnelle** (Personal Finance Manager) qui permet aux utilisateurs de :

✅ Tracker toutes leurs transactions (dépenses & revenus)  
✅ Organiser les transactions par catégories hiérarchiques (catégorie → sous-catégorie)  
✅ Scanner les factures avec OCR (Tesseract.js + Mindee API)  
✅ Analyser leur santé financière (revenus vs dépenses)  
✅ Gérer des budgets par catégorie  
✅ Créer et suivre des objectifs d'épargne  
✅ Gérer des transactions récurrentes (loyer mensuel, abonnements, etc.)  
✅ Supporter plusieurs devises (EUR, XOF)  

### Type d'application

- **Architecture:** SPA (Single Page Application) + REST API fullstack
- **Frontend:** React 18.3.1 + TypeScript + Vite
- **Backend:** PHP 7.4+ (MAMP) + MySQL/MariaDB
- **Domaine:** https://saxalis.free.nf
- **Utilisateurs:** Personne physique (gestion personnelle des finances)

---

## Architecture générale

```
┌─────────────────────────────────────────────────────────────────────┐
│                         UTILISATEUR                                 │
│                       (Browser Web)                                 │
└─────────────────────────┬──────────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────┐
        │  REACT APP (src/app/)            │
        │  ├─ Components (Dashboard, etc.) │
        │  ├─ Services API (api.ts)        │
        │  ├─ CSRF Management (csrf.ts)    │
        │  └─ State Management (App.tsx)   │
        │     (1022 lignes - état centralisé)
        └──────────────┬────────────────────┘
                       │
         ┌─────────────┴──────────────┐
         │ HTTP(S) avec credentials   │
         │ Headers: CSRF token        │
         │                            │
         ▼                            ▼
    ┌──────────────────┐    ┌────────────────────┐
    │   GET REQUEST    │    │   POST REQUEST     │
    │ (transactions,   │    │ (ajouter, éditer,  │
    │  catégories,     │    │  supprimer)        │
    │  budgets, etc)   │    │ + CSRF token       │
    └──────────────────┘    └────────────────────┘
         │                            │
         └─────────────┬──────────────┘
                       │
         ┌─────────────▼──────────────┐
         │   API REST PHP             │
         │   /API/*.php (80 endpoints) │
         │                            │
         │   Chaque endpoint:         │
         │   ├─ Authentification      │
         │   ├─ CSRF Verification     │
         │   ├─ Input Validation      │
         │   ├─ PDO Database Queries  │
         │   └─ JSON Response         │
         └──────────────┬─────────────┘
                        │
         ┌──────────────▼────────────────┐
         │  MySQL/MariaDB               │
         │  ├─ users                    │
         │  ├─ transactions             │
         │  ├─ categories               │
         │  ├─ subcategories            │
         │  ├─ budgets                  │
         │  ├─ objectif_crees (goals)   │
         │  ├─ objectif_atteints        │
         │  ├─ recurring_plans          │
         │  ├─ transaction_files        │
         │  └─ category_budgets         │
         └──────────────────────────────┘
```

---

## Stack technologique

### Frontend

| Technologie | Version | Usage |
|---|---|---|
| **React** | 18.3.1 | Framework UI |
| **TypeScript** | Latest | Type safety |
| **Vite** | 6.4.1 | Build tool + HMR |
| **TailwindCSS** | 4.1.12 | Styling |
| **Radix UI** | Latest | Composants accessibles |
| **Material-UI (MUI)** | 7.3.5 | Composants avancés |
| **Recharts** | 2.15.2 | Graphiques/data visualization |
| **Lucide React** | 0.487.0 | Icônes |
| **Tesseract.js** | 4.0.2 | OCR local (browser) |
| **PDF.js** | Latest | Conversion PDF → Image |
| **React Hook Form** | 7.55.0 | Gestion des formulaires |
| **Sonner** | 2.0.3 | Notifications toast |
| **Date-fns** | 3.6.0 | Utilitaires dates |

### Backend

| Technologie | Version | Usage |
|---|---|---|
| **PHP** | 7.4+ | Langage serveur |
| **MySQL/MariaDB** | 11.4.9 | Base de données |
| **PDO** | Built-in | ORM/Database abstraction |

### Infrastructure

- **Serveur:** MAMP (local) / Infinity Free (production)
- **Timezone:** UTC (configurée dans PHP et MySQL)
- **Charset:** utf8mb4

---

## Base de données

### Schéma relationnel

#### **users**
```sql
- id_utilisateur (PK)
- username UNIQUE
- password (hashed avec password_hash)
- email
- currency (EUR ou XOF) -- devise préférée
- avatar_path (nullable)
- created_at TIMESTAMP
```

#### **transaction_types**
```sql
- id_type (PK) [1: expense, 2: income, 3: saving]
- code ('expense' | 'income' | 'saving')
- label ('Dépenses', 'Revenus', 'Épargne')
```

#### **categories**
```sql
- id_category (PK)
- id_type (FK transaction_types)
- name (ex: "Alimentation", "Loyer", "Salaire")
- description (nullable)
- manual_budget (nullable)
- created_at TIMESTAMP DEFAULT NOW()
```

#### **subcategories**
```sql
- id_subcategory (PK)
- category_id (FK categories)
- name (ex: "Épicerie", "Restaurant")
- icon (emoji, ex: "🛒")
- is_fixed (BOOLEAN) -- classifie comme dépense fixe
- user_id (FK users, nullable) -- si subcategory privée
```

#### **transactions** (table principale)
```sql
- id_transaction (PK)
- id_utilisateur (FK users)
- Date (YYYY-MM-DD)
- Montant (DECIMAL - valeur canonical en XOF)
- currency (EUR ou XOF) -- devise originelle
- Montant_eur (DECIMAL - équivalent en EUR, sauvegardé pour historique)
- id_type (FK transaction_types)
- category_id (FK categories)
- subcategory_id (FK subcategories, nullable)
- Notes (TEXT, nullable)
- goal_id (FK objectif_crees, nullable) -- lien optionnel vers objectif
- receipt_path (nullable) -- chemin facture scannée
- created_at TIMESTAMP DEFAULT NOW()
```

**Clés importantes:**
- Tous les montants sont stockés en **XOF** (devise canonique)
- **Montant_eur** conserve historique de conversion EUR
- **currency** indique la devise originelle saisie
- Taux hardcodé: **EUR → XOF = 655.957**

#### **category_budgets**
```sql
- id (PK)
- user_id (FK users)
- category_id (FK categories)
- subcategory_id (FK subcategories, nullable)
- year (SMALLINT)
- month (SMALLINT 1-12)
- amount (DECIMAL - limite budgétaire)
- created_at & updated_at TIMESTAMPS
```

#### **objectif_crees** (Objectifs d'épargne en cours)
```sql
- id_objectif (PK)
- user_id (FK users)
- id_subcategory (FK subcategories) -- subcategory dédiée au goal
- montant (DECIMAL - objectif d'épargne)
- montant_eur (DECIMAL - équivalent EUR)
- date_depot (DATE - date création)
- created_at TIMESTAMP
```

**Logique:**
1. Quand user crée goal, une **nouvelle subcategory** est créée
2. Les dépôts vers le goal sont des `transactions` avec `type_id=3 (saving)` et `subcategory_id` = subcategory du goal
3. Frontend calcule: `total_collected = SUM(transactions.Montant WHERE goal_id = ? AND type = 'saving')`

#### **objectif_atteints** (Objectifs complétés)
```sql
- id_objectif_atteint (PK)
- user_id (FK users)
- montant_objectif (DECIMAL)
- total_collected (DECIMAL)
- progress_pct (INT 0-100)
- date_completion (DATE)
```

**Flux:** Quand `total_collected >= montant_objectif`:
1. Créer entrée dans `objectif_atteints`
2. Supprimer entrée de `objectif_crees`

#### **recurring_plans**
```sql
- plan_id (PK)
- user_id (FK users)
- category_id (FK categories)
- montant (DECIMAL)
- frequency ('monthly', 'weekly', etc.)
- description (VARCHAR)
- next_occurrence_date (DATE)
- active (BOOLEAN)
```

**Worker:** `/API/recurring_worker.php` ou `/API/run_recurring_transactions.php` exécute cron-like

#### **transaction_files**
```sql
- file_id (PK)
- transaction_id (FK transactions)
- file_path (VARCHAR - chemin relatif upload)
- uploaded_at TIMESTAMP
```

#### **ocr_feedback** (pour ML training - optionnel)
```sql
- id (PK)
- user_id (FK users)
- transaction_id (FK transactions, nullable)
- action ('accepted' | 'overridden')
- merchant (VARCHAR)
- full_text (TEXT)
- invoice_hash (VARCHAR)
- suggested_amount (DECIMAL)
- applied_amount (DECIMAL)
- suggested_category (VARCHAR)
- applied_category (VARCHAR)
- candidates (JSON) -- scores de candidats OCR
- meta (JSON) -- métadonnées source
- created_at TIMESTAMP
```

---

## API REST

### Summary: 80+ Endpoints

#### **Authentication (5 endpoints)**

| Méthode | Endpoint | Authentifié | Usage |
|---|---|---|---|
| POST | `/login.php` | ❌ | Connexion |
| POST | `/register.php` | ❌ | Inscription |
| POST | `/logout.php` | ✅ | Déconnexion |
| GET | `/check_session.php` | ✅ | Vérifier session |
| GET | `/get_user.php` | ✅ | Récupérer user courant |

**Exemple - Login:**
```bash
POST /API/login.php
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "secret123"
}

Response (200):
{
  "success": true,
  "data": {
    "id_utilisateur": 1,
    "username": "user@example.com",
    "email": "user@example.com",
    "avatar": "uploads/avatars/1.jpg"
  }
}
```

#### **CSRF Tokens (1 endpoint)**

| Méthode | Endpoint | Authentifié | Usage |
|---|---|---|---|
| GET | `/get_csrf_token.php` | ✅ | Obtenir token pour POSTs |

**Response:**
```json
{
  "success": true,
  "data": {
    "csrf_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "expires_in": 86400
  }
}
```

#### **Transactions (8 endpoints)**

| Méthode | Endpoint | Authentifié | Usage |
|---|---|---|---|
| GET | `/get_transactions.php` | ✅ | Récupérer toutes transactions user |
| POST | `/add_transaction.php` | ✅ | Créer transaction |
| POST | `/update_transaction.php` | ✅ | Modifier transaction |
| POST | `/delete_transaction.php` | ✅ | Supprimer transaction |
| POST | `/add_transaction_with_invoice.php` | ✅ | Créer + upload facture |
| POST | `/delete_all_transactions.php` | ✅ | Debug: Delete all |
| GET | `/get_transactions_recurring.php` | ✅ | Récurrences actives |
| GET | `/get_monthly_savings.php` | ✅ | Épargne mensuelle (revenus - dépenses) |

**Exemple - Add transaction:**
```bash
POST /API/add_transaction.php
Content-Type: application/json

{
  "csrf_token": "...",
  "Date": "2024-01-15",
  "Type": "expense",
  "id_type": 1,
  "Montant": 50.00,
  "currency": "EUR",
  "category_id": 3,
  "subcategory_id": 7,
  "Notes": "Courses Carrefour"
}

Response (201):
{
  "success": true,
  "data": {
    "id_transaction": 301,
    "date": "2024-01-15",
    "amount": 50.00
  }
}
```

#### **Transaction Types (4 endpoints)**

| Méthode | Endpoint | Authentifié | Usage |
|---|---|---|---|
| GET | `/get_transaction_types.php` | ✅ | Récupérer types |
| POST | `/add_type.php` | ✅ | Créer type |
| POST | `/update_type.php` | ✅ | Modifier type |
| POST | `/delete_type.php` | ✅ | Supprimer type |

**Response - Types:**
```json
{
  "success": true,
  "types": [
    { "id_type": 1, "code": "expense", "label": "Dépenses" },
    { "id_type": 2, "code": "income", "label": "Revenus" },
    { "id_type": 3, "code": "saving", "label": "Épargne" }
  ]
}
```

#### **Categories (6 endpoints)**

| Méthode | Endpoint | Authentifié | Usage |
|---|---|---|---|
| POST | `/get_categories.php` | ✅ | Récupérer categories |
| POST | `/add_category.php` | ✅ | Créer catégorie |
| POST | `/update_category.php` | ✅ | Modifier catégorie |
| POST | `/delete_category.php` | ✅ | Supprimer catégorie |
| GET | `/search_categories.php` | ✅ | Rechercher catégories |
| GET | `/get_subcategories.php` | ✅ | Récupérer sous-catégories |

**Request - Catégories filtrées par type:**
```bash
POST /API/get_categories.php
Content-Type: application/json

{ "id_type": 1 }

Response:
{
  "success": true,
  "categories": [
    { "id_category": 1, "name": "Alimentation" },
    { "id_category": 2, "name": "Transport" }
  ]
}
```

#### **Sous-catégories (3 endpoints)**

| Méthode | Endpoint | Authentifié | Usage |
|---|---|---|---|
| GET | `/get_subcategories.php` | ✅ | Récupérer sous-catégories |
| POST | `/add_subcategory.php` | ✅ | Créer sous-catégorie |
| POST | `/update_subcategory.php` | ✅ | Modifier sous-catégorie |

**Response:**
```json
{
  "success": true,
  "subcategories": [
    { "id_subcategory": 7, "name": "Épicerie", "icon": "🛒", "is_fixed": false },
    { "id_subcategory": 8, "name": "Restaurant", "icon": "🍽️", "is_fixed": false }
  ]
}
```

#### **Budgets (4 endpoints)**

| Méthode | Endpoint | Authentifié | Usage |
|---|---|---|---|
| POST | `/get_budgets.php` | ✅ | Récupérer budgets |
| POST | `/add_category_budget.php` | ✅ | Créer budget |
| POST | `/get_category_budget.php` | ✅ | Détail budget |
| POST | `/update_category.php` | ✅ | Modifier budget |

**Request:**
```json
{
  "category_id": 3,
  "montant": 500.00,
  "month": "2024-01"
}
```

#### **Objectifs d'épargne (12 endpoints)**

| Méthode | Endpoint | Authentifié | Usage |
|---|---|---|---|
| GET | `/get_goals.php` | ✅ | Lister tous les goals |
| GET | `/get_objectifs_crees.php` | ✅ | Idem (ancien endpoint) |
| POST | `/add_goal.php` | ✅ | Créer goal |
| POST | `/update_objectif.php` | ✅ | Modifier goal |
| POST | `/delete_goal.php` | ✅ | Supprimer goal |
| POST | `/add_goal_transaction.php` | ✅ | Ajouter dépôt |
| POST | `/add_goal_withdrawal.php` | ✅ | Retirer montant |
| POST | `/transfer_goal.php` | ✅ | Transférer entre goals |
| GET | `/current_goal.php` | ✅ | Goal principal |
| POST | `/add_goal_plan.php` | ✅ | Créer plan automatique |
| GET | `/get_goal_plans.php` | ✅ | Récupérer plans |
| POST | `/run_goal_plans.php` | ✅ | Exécuter plans (cron) |

**Example - Create goal:**
```bash
POST /API/add_goal.php
{
  "csrf_token": "...",
  "nom": "Vacances Maroc",
  "montant": 5000.00,
  "currency": "EUR"
}

Response:
{
  "success": true,
  "data": {
    "id_objectif": 2,
    "id_subcategory": 50
  }
}
```

#### **Transactions Récurrentes (3 endpoints)**

| Méthode | Endpoint | Authentifié | Usage |
|---|---|---|---|
| GET | `/get_recurring_transactions.php` | ✅ | Lister récurrences |
| POST | `/add_recurring_transaction.php` | ✅ | Créer récurrence |
| POST | `/run_recurring_transactions.php` | ✅ | Exécuter (worker) |

#### **Safes/Coffres (6 endpoints)**

| Méthode | Endpoint | Authentifié | Usage |
|---|---|---|---|
| GET | `/get_coffre_depots.php` | ✅ | Lister dépôts |
| GET | `/get_coffre_projets.php` | ✅ | Lister projets |
| POST | `/add_depot_coffre.php` | ✅ | Créer dépôt |
| POST | `/add_projet_coffre.php` | ✅ | Créer projet |
| POST | `/update_depot_coffre.php` | ✅ | Modifier dépôt |
| POST | `/update_projet_coffre.php` | ✅ | Modifier projet |

#### **Analysis & Reports (4 endpoints)**

| Méthode | Endpoint | Authentifié | Usage |
|---|---|---|---|
| GET | `/get_monthly_savings.php` | ✅ | Épargne par mois |
| POST | `/goals_monthly.php` | ✅ | Bilan goals mensuel |
| POST | `/get_mindmap_data.php` | ✅ | Données hiérarchiques dépenses |
| GET | `/get_objectifs_atteints.php` | ✅ | Goals complétés |

#### **OCR & Invoices (4 endpoints)**

| Méthode | Endpoint | Authentifié | Usage |
|---|---|---|---|
| POST | `/ocr_feedback.php` | ✅ | Enregistrer feedback OCR |
| GET | `/export_ocr_feedback.php` | ✅ | Exporter data training (CSV) |
| POST | `/upload_invoice.php` | ✅ | Upload facture |
| POST | `/upload_depot_invoice.php` | ✅ | Upload pour dépôt |

#### **User & Profile (4 endpoints)**

| Méthode | Endpoint | Authentifié | Usage |
|---|---|---|---|
| POST | `/update_user_profile.php` | ✅ | Modifier profil |
| POST | `/update_password.php` | ✅ | Changer mot de passe |
| POST | `/update_user_pref.php` | ✅ | Préférences (devise) |
| POST | `/upload_avatar.php` | ✅ | Upload avatar |

#### **Conversions & Utilities (2 endpoints)**

| Méthode | Endpoint | Authentifié | Usage |
|---|---|---|---|
| POST | `/convert_currency.php` | ⚠️ | Convertir montants |
| POST | `/get_csrf_token.php` | ✅ | Token CSRF |

#### **Debug (4 endpoints - dev only)**

| Méthode | Endpoint | Usage |
|---|---|---|
| POST | `/debug_check_avatar.php` | Check avatar |
| POST | `/debug_get_transactions.php` | Debug transactions |
| POST | `/debug_monthly_savings.php` | Debug épargne |
| POST | `/debug_schema.php` | Dump schéma DB |

---

## Flux métier détaillés

### Flux 1: Authentification & Session

```
1. User accède à https://saxalis.free.nf
   ↓
2. React app charge
   ├─ Vérifier session existante
   └─ GET /API/check_session.php
   ↓
3. Si session valide
   ├─ Récupérer user: GET /API/get_user.php
   ├─ Récupérer CSRF token: GET /API/get_csrf_token.php
   ├─ Charger transactions: GET /API/get_transactions.php
   ├─ Charger types: GET /API/get_transaction_types.php
   ├─ Charger catégories: POST /API/get_categories.php
   └─ Afficher Dashboard
   
4. Si session invalide
   ├─ Afficher LoginModal
   ├─ User entre credentials
   ├─ POST /API/login.php avec username + password
   ├─ Backend: SELECT * FROM users WHERE username = ?
   ├─ password_verify() contre hash stocké
   ├─ Si OK: $_SESSION['user'] = user data
   ├─ Si NOK: HTTP 401
   └─ Si OK, recharger App
```

**Backend login.php logic:**
```php
// Vérifier credentials
$stmt = $pdo->prepare('SELECT * FROM users WHERE username = ?');
$stmt->execute([$_POST['username']]);
$user = $stmt->fetch();

if ($user && password_verify($_POST['password'], $user['password'])) {
  $_SESSION['user'] = [
    'id_utilisateur' => $user['id_utilisateur'],
    'username' => $user['username'],
    'email' => $user['email'],
    'avatar' => $user['avatar_path']
  ];
  echo json_encode(['success' => true, 'data' => $_SESSION['user']]);
} else {
  http_response_code(401);
  echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
}
```

---

### Flux 2: Ajouter transaction (cas manuel)

```
1. User clique "Ajouter transaction"
   ├─ Affiche AjouterTransactionModern.tsx
   └─ Modal avec formulaire
   
2. User remplit formulaire
   ├─ Montant (50.00)
   ├─ Devise (EUR)
   ├─ Date (2024-01-15)
   ├─ Type (expense)
   ├─ Catégorie (Alimentation)
   ├─ Sous-catégorie (Épicerie)
   └─ Notes (optionnel)

3. User clique "Ajouter"
   ├─ Frontend calcule Montant en XOF
   │  └─ Si currency=EUR: montant *= 655.957
   │
   ├─ POST /API/add_transaction.php
   │  ├─ Headers: CSRF token (from memory)
   │  ├─ Body: JSON avec montant, devise, date, catégorie, etc.
   │
   └─ Backend:
      ├─ require_auth() → HTTP 401 si pas log
      ├─ verify_csrf_token() → HTTP 403 si token invalid
      ├─ validate_float(Montant)
      ├─ validate_int(id_type, category_id)
      ├─ INSERT INTO transactions
      │  ├─ id_utilisateur = $_SESSION['user']['id_utilisateur']
      │  ├─ Date = YYYY-MM-DD
      │  ├─ Montant = 50 * 655.957 = 32797.85 XOF
      │  ├─ Montant_eur = 50.00
      │  ├─ currency = 'EUR'
      │  ├─ id_type = 1
      │  ├─ category_id = 3
      │  ├─ subcategory_id = 7
      │  └─ Notes = "Courses"
      │
      ├─ COMMIT
      └─ JSON response: { success: true, id_transaction: 301 }

4. Frontend
   ├─ Affiche toast "✅ Transaction ajoutée"
   ├─ Ferme modal
   ├─ Recharge transactions
   └─ Rafraîchit Dashboard
```

---

### Flux 3: Ajouter transaction avec OCR (Receipt Scanner)

```
1. User clique "Scanner facture"
   ├─ Affiche ReceiptScannerModal.tsx
   ├─ Options:
   │  ├─ Camera (webcam)
   │  ├─ Upload image
   │  └─ Upload PDF
   
2. User capture/sélectionne image
   ├─ Si PDF: convertPdfFirstPageToImage()
   │  └─ pdfjs-dist convert page 1 → Canvas → DataURL
   │
   ├─ Envoi image à OCR:
   │  ├─ OPTION A: Tesseract.js (local, libre)
   │  │  ├─ Full JS OCR in browser
   │  │  ├─ Pas de réseau
   │  │  └─ Résultat: { merchant, amount, date, ... }
   │  │
   │  └─ OPTION B: Mindee API (API distante, payant)
   │     ├─ POST image à Mindee
   │     ├─ Résultat enrichi
   │     └─ { merchant, amount, date, items, total, ... }
   
3. Frontend affiche extraction suggérée
   ├─ Merchant: "Carrefour" (confiance: 95%)
   ├─ Amount: 50.00 EUR (confiance: 99%)
   ├─ Date: 2024-01-15 (confiance: 87%)
   ├─ Catégorie devinée: "Alimentation"
   └─ User peut corriger chaque champ

4. User clique "Confirmer"
   ├─ POST /API/add_transaction_with_invoice.php
   │  ├─ multipart/form-data
   │  ├─ Image file
   │  ├─ Données corrigées (Montant, Catégorie, etc.)
   │  └─ CSRF token
   │
   └─ Backend:
      ├─ require_auth() + verify_csrf_token()
      ├─ Validation input
      ├─ Sauvegarder image
      │  └─ mkdir -p uploads/invoices/YYYY/MM/
      │  └─ move_uploaded_file()
      │  └─ Renommer: receipt_<timestamp>.<ext>
      │
      ├─ INSERT INTO transactions
      │  ├─ Tous les champs standard
      │  └─ receipt_path = 'uploads/invoices/2024/01/receipt_12345.jpg'
      │
      └─ JSON response: { success: true, invoice_path: "..." }

5. Frontend enregistre feedback OCR
   ├─ POST /API/ocr_feedback.php
   │  ├─ action: 'accepted' ou 'overridden'
   │  ├─ suggested_amount: 50.00
   │  ├─ applied_amount: 50.00
   │  ├─ suggested_category: "Alimentation"
   │  ├─ applied_category: "Alimentation"
   │  ├─ candidates: [ {raw: "50.00", value: 50.00, score: 99} ]
   │  └─ merchant, full_text, invoice_hash, etc.
   │
   └─ Backend: Sauvegarde dans ocr_feedback table
      (Data pour ML training)
```

---

### Flux 4: Gestion budgets

```
1. User définit budget pour catégorie
   ├─ Dashboard → "Budgets"
   ├─ Sélectionne catégorie (ex: Alimentation)
   ├─ Saisit montant (500 EUR)
   ├─ Période (mensuel)
   
2. POST /API/add_category_budget.php
   ├─ INSERT INTO category_budgets
   │  ├─ user_id
   │  ├─ category_id
   │  ├─ year = 2024
   │  ├─ month = 1
   │  └─ amount = 500.00
   │
   └─ Response: { success: true, budget_id: 1 }

3. Frontend affiche budget utilisation
   ├─ GET /API/get_budgets.php
   ├─ Calcule spent = SUM(t.Montant)
   │  WHERE category_id = 3 AND YEAR(Date) = 2024 AND MONTH(Date) = 1
   │
   ├─ Affiche: "Dépensé: 320 EUR / Budget: 500 EUR"
   ├─ Barre de progression: 64%
   │
   └─ Couleur coding:
      ├─ Verde (< 75%): OK
      ├─ Orange (75-90%): ⚠️ Attention
      └─ Rouge (> 90%): 🚨 Dépassé

4. Si user dépasse budget
   ├─ Frontend affiche alerte
   ├─ Stats page montre "Budget dépassé"
   └─ Recommandation: Réduire dépenses ou augmenter budget
```

---

### Flux 5: Objectifs d'épargne

```
┌─ CRÉER OBJECTIF ─────────────────────────────────┐
│                                                   │
│  1. User clique "Nouvel Objectif"                │
│     ├─ Modal: Nom + Montant objectif             │
│     └─ Ex: "Vacances Maroc" / 5000 EUR          │
│                                                   │
│  2. POST /API/add_goal.php                        │
│     ├─ Backend crée NOUVELLE subcategory        │
│     │  ├─ INSERT INTO subcategories              │
│     │  │  ├─ category_id = 3 (Objectif)         │
│     │  │  ├─ name = "Vacances Maroc"            │
│     │  │  ├─ icon = "✈️"                         │
│     │  │  └─ is_fixed = 0                        │
│     │  └─ New subcategory ID: 50                 │
│     │                                             │
│     ├─ INSERT INTO objectif_crees                │
│     │  ├─ user_id                                │
│     │  ├─ id_subcategory = 50                    │
│     │  ├─ montant = 5000                         │
│     │  └─ date_depot = NOW()                     │
│     │                                             │
│     └─ Response: { id_objectif: 2, id_sub: 50 }│
│                                                   │
│  3. Frontend affiche GoalCard                    │
│     ├─ Nom: "Vacances Maroc"                     │
│     ├─ Objectif: 5000 EUR                        │
│     ├─ Dépôt actuel: 0 EUR                       │
│     ├─ Reste: 5000 EUR                           │
│     ├─ Progress bar: 0%                          │
│     └─ Actions: [Dépôt] [Retrait] [Supprimer]   │
│                                                   │
└───────────────────────────────────────────────────┘

┌─ MAKE DEPOSIT ───────────────────────────────────┐
│                                                   │
│  1. User clique "➕ Dépôt" sur GoalCard          │
│     ├─ Modal: Montant                            │
│     └─ Ex: 500 EUR                              │
│                                                   │
│  2. POST /API/add_goal_transaction.php            │
│     ├─ Backend crée TRANSACTION                 │
│     │  ├─ INSERT INTO transactions              │
│     │  │  ├─ id_utilisateur                      │
│     │  │  ├─ Date = NOW()                        │
│     │  │  ├─ Montant = 500 * 655.957 XOF        │
│     │  │  ├─ currency = 'EUR'                    │
│     │  │  ├─ id_type = 3 (saving)               │
│     │  │  ├─ category_id = 13 (Objectif)        │
│     │  │  ├─ subcategory_id = 50 (goal subcat)  │
│     │  │  ├─ goal_id = 2                         │
│     │  │  └─ Notes = "Dépôt vers Vacances Maroc"│
│     │  │                                         │
│     │  └─ COMMIT                                 │
│     │                                             │
│     └─ Response: { id_transaction: 301 }        │
│                                                   │
│  3. Frontend recalcule:                          │
│     ├─ total_collected = SUM(transactions.Montant│
│     │     WHERE goal_id = 2 AND id_type = 3)    │
│     │ → 330797.85 XOF = 500 EUR                 │
│     │                                             │
│     ├─ reste = 5000 - 500 = 4500 EUR            │
│     ├─ progress_pct = (500 / 5000) * 100 = 10%  │
│     └─ Update GoalCard UI                        │
│                                                   │
│  4. Si dépôt >= objectif                        │
│     ├─ Frontend détecte                          │
│     ├─ Affiche "🎉 Objectif atteint!"           │
│     ├─ User confirme                             │
│     │                                             │
│     └─ Backend:                                  │
│        ├─ INSERT INTO objectif_atteints         │
│        │  ├─ user_id                             │
│        │  ├─ montant_objectif = 5000             │
│        │  ├─ total_collected = 5000              │
│        │  ├─ progress_pct = 100                  │
│        │  └─ date_completion = NOW()             │
│        │                                         │
│        └─ DELETE FROM objectif_crees             │
│           WHERE id_objectif = 2                  │
│                                                   │
└───────────────────────────────────────────────────┘

┌─ TRANSFER BETWEEN GOALS ──────────────────────────┐
│                                                   │
│  POST /API/transfer_goal.php                      │
│  ├─ from_goal_id: 1                             │
│  ├─ to_goal_id: 2                               │
│  └─ montant: 200 EUR                            │
│                                                   │
│  Backend:                                        │
│  ├─ BEGIN TRANSACTION                            │
│  │                                               │
│  ├─ CREATE transaction (from goal → category)   │
│  │  ├─ id_type = 3 (saving)                     │
│  │  ├─ goal_id = 1                              │
│  │  ├─ type = "withdrawal"                       │
│  │  └─ Montant = -200                            │
│  │                                               │
│  ├─ CREATE transaction (to goal ← category)     │
│  │  ├─ id_type = 3 (saving)                     │
│  │  ├─ goal_id = 2                              │
│  │  ├─ type = "deposit"                          │
│  │  └─ Montant = +200                            │
│  │                                               │
│  └─ COMMIT                                       │
│                                                   │
└───────────────────────────────────────────────────┘
```

---

### Flux 6: Analyse financière (Stats)

```
1. User clique "Stats"
   ├─ Affiche StatsRebuilt.tsx
   └─ Charge données

2. Frontend calcule agrégations (voir statsUtils.ts)
   ├─ Mensuels par année:
   │  └─ Pour chaque mois: sum(revenus), sum(dépenses)
   │
   ├─ Par catégorie:
   │  └─ sum(Montant) GROUP BY category_id
   │
   ├─ Dépenses fixes vs variables:
   │  └─ sum(Montant WHERE is_fixed=true) vs sum(...false)
   │
   └─ Budget restant:
      └─ for each category: limit - spent

3. Affiche cartes:
   ├─ MonthlyPerformanceCard
   │  ├─ Histogramme: Revenus (vert) vs Dépenses (rouge) par mois
   │  └─ Recharts BarChart
   │
   ├─ FinancialHealthCard
   │  ├─ Area chart: Revenus, dépenses, épargne cumulatifs
   │  └─ Recharts AreaChart
   │
   ├─ BudgetRemainingCard
   │  ├─ Pour chaque catégorie: barre de progression
   │  ├─ Couleur: verde/orange/rouge
   │  └─ Affiche: "250 / 500 EUR"
   │
   ├─ FixedVsVariableExpensesCard
   │  ├─ Pie chart: % dépenses fixes vs variables
   │  └─ Recharts PieChart
   │
   └─ Autres insights:
      ├─ Taux épargne (saving_rate)
      ├─ Moyenne mensuelle dépenses
      └─ Tendances sur 6 derniers mois
```

---

## Frontend (React + TypeScript)

### Structure fichiers

```
src/app/
├── App.tsx (1022 lignes)
│   ├─ State management (lifted to App)
│   │  ├─ transactions[]
│   │  ├─ categories[]
│   │  ├─ subcategories[]
│   │  ├─ filtreType, recherche, annee, mois
│   │  ├─ isAuthenticated, currentUser
│   │  └─ theme (light/dark)
│   │
│   ├─ useEffect hooks
│   │  ├─ Load types & categories on mount
│   │  ├─ Load transactions on auth
│   │  └─ Reload categories when type changes
│   │
│   └─ Tab routing (activeTab state)
│
├── components/
│   ├── Dashboard.tsx - Page d'accueil (KPIs + récentes)
│   ├── AjouterTransactionModern.tsx - Formulaire + modal
│   ├── ReceiptScannerModal.tsx - OCR & factures
│   ├── TransactionsModern.tsx - Tableau transactions
│   ├── EditTransactionModal.tsx - Edit form
│   ├── StatsRebuilt.tsx - Graphiques d'analyse
│   ├── StatsModern.tsx - Alternative stats view
│   ├── Objectifs.tsx - Goals management
│   ├── ProfilModern.tsx - User profile & settings
│   ├── LoginModal.tsx - Login form
│   ├── RegisterModal.tsx - Signup form
│   │
│   ├── UI Components (Recharts, Cards, etc.)
│   │   ├── BudgetRemainingCard.tsx
│   │   ├── FinancialHealthCard.tsx
│   │   ├── FixedVsVariableExpensesCard.tsx
│   │   ├── StatsCardsDesign.tsx (KPI cards)
│   │   ├── MonthlyPerformanceCard.tsx
│   │   └── charts/
│   │
│   └── Modals
│       ├── AddGoalModal.tsx
│       ├── EditGoalModal.tsx
│       ├── DepositModal.tsx
│       ├── WithdrawFromGoalModal.tsx
│       ├── TransferGoalModal.tsx
│       ├── InvoicePreviewModal.tsx
│       └── PlanModal.tsx
│
├── contexts/
│   └── PreferencesContext.tsx
│       ├─ theme (light/dark)
│       └─ currency preference (EUR/XOF)
│
├── hooks/
│   └─ Custom hooks (si présents)
│
└── lib/
    ├── receiptOcr.ts - Tesseract + Mindee intégration
    ├── pdfToImage.ts - PDF to canvas
    ├── formatCurrency.ts - Devise formatting
    └── searchUtils.ts - Full-text search logic

src/services/
├── api.ts (443 lignes)
│   ├─ request() - Base HTTP client
│   ├─ Export async functions
│   │   ├─ getTransactions()
│   │   ├─ addTransaction()
│   │   ├─ updateTransaction()
│   │   ├─ deleteTransaction()
│   │   ├─ getCategories()
│   │   ├─ getSubcategories()
│   │   ├─ getGoals()
│   │   ├─ addGoal()
│   │   ├─ addGoalTransaction()
│   │   ├─ getBudgets()
│   │   └─ ... (50+ autres)
│   │
│   └─ Patterns:
│      ├─ Credentials: 'include'
│      ├─ Headers: Accept, Content-Type
│      └─ Error handling: Network + JSON parse
│
├── csrf.ts
│   ├─ getCsrfToken() - Fetch & cache
│   ├─ addCsrfToBody() - Inject into POST payload
│   └─ Token stored in memory (not localStorage)
│
└── api-csrf-integration.ts (?)
```

### Key Components Deep-Dive

#### **App.tsx**
- **1022 lines** - Composant principal (state management)
- **State:**
  ```typescript
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [filtreType, setFiltreType] = useState('tous');
  const [recherche, setRecherche] = useState('');
  const [annee, setAnnee] = useState('Tous');
  const [mois, setMois] = useState('Tous');
  const [categorie, setCategorie] = useState('Toutes');
  ```

- **Lifecycle:**
  - useEffect: Load types & categories
  - useEffect: Reload categories when filtreType changes
  - useEffect: Theme toggle (localStorage + classList)

- **Routing:**
  - renderContent() switch(activeTab) → render relevant component
  - Tab navbar avec buttons pour changer activeTab

#### **Dashboard.tsx**
- Affiche KPIs du mois courant
- Récents transactions (last 5)
- Graphiques Recharts
- Budget summary

#### **TransactionsModern.tsx**
- Table avec pagination
- Colones: Date, Montant, Catégorie, Notes
- Actions: Edit, Delete, Preview invoice
- Filtrage via App state (recherche, categorie, annee, mois)

#### **StatsRebuilt.tsx**
- Agrégation statistique
- Multiple cartes:
  - MonthlyPerformanceCard: Histogramme revenus/dépenses
  - FinancialHealthCard: Area chart
  - BudgetRemainingCard: Progress bars
  - FixedVsVariableExpensesCard: Pie chart
- Utilise statsUtils.ts pour calculs

#### **ReceiptScannerModal.tsx**
- 3 modes d'input: Camera, Image upload, PDF upload
- OCR engine selection (Tesseract vs Mindee)
- Shows extracted data: merchant, amount, date
- User can correct before submitting
- Calls `addTransactionWithInvoice()` + `ocr_feedback()`

#### **Objectifs.tsx**
- Liste GoalCards
- Actions: [Ajouter] [Dépôt] [Retrait] [Supprimer]
- Modals pour chaque action (AddGoalModal, DepositModal, etc.)
- Affiche progress bar avec %, montant dépôt, reste

### Styling & UI

- **TailwindCSS 4** - Utility classes (mt-4, text-lg, etc.)
- **Radix UI** - Accessible components (Dialog, Select, Popover, etc.)
- **Material-UI (MUI)** - Advanced components (DataGrid, etc.)
- **Lucide React** - Icons (Home, Plus, Settings, etc.)
- **Dark mode:** `document.documentElement.classList.add('dark')`

---

## Sécurité

### 1. Authentification

**Mechanism:** PHP Sessions + Cookies

```php
// Backend (login.php)
session_start();
$_SESSION['user'] = [
  'id_utilisateur' => 1,
  'username' => 'user@example.com',
  // ...
];

// Frontend: credentials: 'include' in fetch
// → Cookie sent automatically
```

**Verification sur every endpoint:**
```php
require_auth();  // From auth.php
// ↓
function require_auth() {
  if (empty($_SESSION['user']['id_utilisateur'])) {
    http_response_code(401);
    exit;
  }
}
```

### 2. CSRF Protection

**Flow:**

```
Frontend (startup):
├─ GET /API/get_csrf_token.php
├─ Reçoit JWT token
└─ Stocke en memory (PAS localStorage)

User soumet form (POST):
├─ Frontend ajoute token au body
│  └─ body.csrf_token = token
│
└─ POST /API/add_transaction.php
   ├─ Body: { Montant: 50, csrf_token: "..." }
   
Backend:
├─ verify_csrf_token()
├─ Compare token from body
│  vs $_SESSION['csrf_token']
├─ hash_equals() pour éviter timing attacks
└─ HTTP 403 si invalid
```

**Token generation:** 
```php
function generate_csrf_token() {
  if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
  }
  return $_SESSION['csrf_token'];
}
```

### 3. Input Validation

**Pattern used:** `validate_float()`, `validate_int()`, `validate_string()`

```php
try {
  $montant = validate_float($_POST['Montant'], 'amount');
  $category_id = validate_int($_POST['category_id']);
  $notes = validate_string($_POST['Notes'], 'notes', 0, 500, true);
  
  // Proceed with DB insert
} catch (ValidationException $e) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
```

**Validation types:**
- `validate_float($val, $fieldname, $allow_null)` - Montants
- `validate_int($val, $fieldname, $allow_null)` - IDs
- `validate_string($val, $fieldname, $min, $max, $allow_null)` - Notes, names
- `validate_date($val)` - Dates (YYYY-MM-DD)
- `validate_currency($val)` - EUR or XOF only

### 4. SQL Injection Prevention

**All queries use PDO prepared statements:**

```php
// ✅ SAFE
$stmt = $pdo->prepare('SELECT * FROM transactions WHERE id_utilisateur = ? AND id_transaction = ?');
$stmt->execute([$user_id, $transaction_id]);

// ❌ UNSAFE (if it exists)
$result = $pdo->query("SELECT * FROM transactions WHERE id = $id");
```

### 5. Password Security

**Hashing:** `password_hash()` (PHP built-in)

```php
// Register
$hash = password_hash($_POST['password'], PASSWORD_DEFAULT);
$stmt = $pdo->prepare('INSERT INTO users (username, password) VALUES (?, ?)');
$stmt->execute([$_POST['username'], $hash]);

// Login
$stmt = $pdo->prepare('SELECT * FROM users WHERE username = ?');
$stmt->execute([$_POST['username']]);
$user = $stmt->fetch();
if ($user && password_verify($_POST['password'], $user['password'])) {
  // ✅ Match
}
```

### 6. CORS Configuration

**Whitelist approach:**

```php
// config.php
if (isset($_SERVER['HTTP_ORIGIN'])) {
  $origin = $_SERVER['HTTP_ORIGIN'];
  $parsed = parse_url($origin);
  $host = $parsed['host'] ?? '';
  
  // Dev: localhost on any port
  if (preg_match('/^(localhost|127\.0\.0\.1|::1)$/', $host)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
  }
  
  // Prod: only saxalis.free.nf
  elseif ($host === 'saxalis.free.nf') {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
  }
}
```

**Allows:** `credentials: 'include'` in fetch (for session cookies)

### 7. File Upload Security

**For invoices:**
```php
// add_transaction_with_invoice.php
if ($_FILES['invoice']['error'] !== UPLOAD_ERR_OK) {
  throw new Exception('Upload error');
}

$mime = mime_content_type($_FILES['invoice']['tmp_name']);
if (!in_array($mime, ['image/jpeg', 'image/png', 'application/pdf'])) {
  throw new Exception('Invalid file type');
}

// Move to safe location
$dir = "uploads/invoices/" . date('Y/m');
mkdir($dir, 0750, true);
$filename = 'receipt_' . time() . '_' . random_int(1000, 9999) . '.jpg';
move_uploaded_file($_FILES['invoice']['tmp_name'], "$dir/$filename");
```

---

## Points clés à retenir

### Architectural Decisions

1. **State Management:** Lifted to App.tsx (no Redux)
2. **API Calls:** Service pattern (api.ts wraps fetch)
3. **Transactions Storage:** Canonical currency = XOF, EUR conversion on display
4. **Goals Implementation:** Auto-create subcategory per goal
5. **OCR:** Hybrid (Tesseract.js local, Mindee API optional)
6. **Security:** CSRF tokens, session auth, strict input validation

### Common Patterns

| Pattern | Location | Purpose |
|---|---|---|
| **Request wrapper** | `src/services/api.ts` | Centralize HTTP + error handling |
| **CSRF injection** | `src/services/csrf.ts` | Automatic token addition to POSTs |
| **Lifted state** | `src/app/App.tsx` | Shared filter state across pages |
| **Components tree** | Modular hierarchy | Each page is a separate component |
| **Recharts integration** | Multiple cards | Data viz for stats |
| **Modal pattern** | TransactionModalContainer | Reusable form wrapper |

### Database Queries (Common)

```php
// Get all transactions for user
SELECT * FROM transactions WHERE id_utilisateur = ? ORDER BY Date DESC;

// Get total expenses by category for month
SELECT category_id, SUM(Montant) as total
FROM transactions
WHERE id_utilisateur = ? AND id_type = 1 AND YEAR(Date) = ? AND MONTH(Date) = ?
GROUP BY category_id;

// Get budget vs spent
SELECT 
  cb.amount as budget,
  COALESCE(SUM(t.Montant), 0) as spent
FROM category_budgets cb
LEFT JOIN transactions t ON 
  t.category_id = cb.category_id 
  AND t.id_utilisateur = cb.user_id
  AND YEAR(t.Date) = cb.year
  AND MONTH(t.Date) = cb.month
WHERE cb.user_id = ? GROUP BY cb.category_id;
```

### Environment Setup

**Frontend (.env.local):**
```
VITE_API_BASE_URL=http://localhost:8888/SaXalis
```

**Backend (API/config.local.php):**
```php
<?php
$host = 'localhost';
$port = '3306';
$db = 'suivi_depenses';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';
?>
```

### Deployment Checklist

- [ ] Configure MySQL credentials in API/config.local.php
- [ ] Setup VITE_API_BASE_URL env var
- [ ] Run `npm run build` for production bundle
- [ ] Test login/logout flow
- [ ] Test OCR features
- [ ] Verify CSRF token generation
- [ ] Test multi-devise conversion
- [ ] Regular database backups

---

## Conclusion

**SaXalis** est une application **production-ready** de gestion financière avec:

✅ **Architecture robuste** (SPA + REST API)  
✅ **Sécurité implémentée** (Session auth, CSRF, input validation)  
✅ **Features avancées** (OCR, budgets, goals, multi-devise)  
✅ **UI/UX moderna** (Recharts, Radix UI, dark mode)  
✅ **Scalable backend** (PDO, prepared statements, error handling)  

**Prochaines améliorations possibles:**
- [ ] WebSocket pour real-time collaboration
- [ ] Mobile app (React Native)
- [ ] Advanced reporting (PDF exports)
- [ ] AI-powered spending recommendations
- [ ] Bank API integration (Open Banking)
- [ ] Investment portfolio tracking

---

**Dernière mise à jour:** 27 janvier 2026  
**Auteur:** Analysis System
