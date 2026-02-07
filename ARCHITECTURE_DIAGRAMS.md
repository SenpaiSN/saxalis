# 🔌 Diagrammes d'Architecture - SaXalis

## Flux de données global

```
┌─────────────────────────────────────────────────────────────────────┐
│                         UTILISATEUR                                 │
└─────────────────┬──────────────────────────────────────────────────┘
                  │
        ┌─────────▼────────┐
        │   React App      │
        │ (src/app/)       │
        └─────────┬────────┘
                  │
    ┌─────────────┴────────────────┐
    │                              │
┌───▼─────────┐         ┌──────────▼─────────┐
│  Services   │         │  Components        │
│  (api.ts)   │         │ (Dashboard,etc.)   │
│             │         │                    │
│ - fetch()   │         └──────────┬─────────┘
│ - CORS      │                    │
│ - CSRF      │                    │
└───┬─────────┘                    │
    │                              │
    └──────────────┬───────────────┘
                   │
        ┌──────────▼──────────────┐
        │   REST API Calls       │
        │ (POST/GET JSON)       │
        │ Credentials: include  │
        │ Headers: CSRF token   │
        └──────────┬─────────────┘
                   │
        ┌──────────▼───────────────────┐
        │  Backend API (PHP)            │
        │  /API/*.php endpoints         │
        │  ├─ require_auth()            │
        │  ├─ verify_csrf_token()       │
        │  ├─ PDO queries               │
        │  └─ JSON responses            │
        └──────────┬────────────────────┘
                   │
                   │
        ┌──────────▼──────────────┐
        │   MySQL/MariaDB         │
        │   (transactions,        │
        │    categories,          │
        │    users, etc.)         │
        └─────────────────────────┘
```

---

## Flux d'authentification

```
┌──────────────┐
│  LoginModal  │
│  (React)     │
└──────┬───────┘
       │ username + password
       │
       ▼
┌─────────────────────┐
│ POST /API/login.php │
└─────────┬───────────┘
          │ Validation input
          │
          ▼
┌───────────────────────────────────────┐
│ SELECT * FROM users WHERE username=? │
└─────────┬───────────────────────────┘
          │
          ├─ Found + password_verify()
          │
          ▼
    ┌─────────────┐
    │ START       │
    │ SESSION     │
    │ $_SESSION   │
    │ ['user']    │
    └──────┬──────┘
           │
    JSON: ├─ user_id
    {     ├─ username
    ok:true├─ email
          │
          ▼
    ┌──────────────────┐
    │  React stores    │
    │  isAuthenticated │
    │  = true          │
    │  currentUser     │
    └──────┬───────────┘
           │
    ✅ AUTORISÉ pour tous endpoints
    
    Sinon ❌ → HTTP 401 → React clearing data
```

---

## Flux d'ajout de transaction (cas OCR)

```
┌─────────────────────────────────┐
│  ReceiptScannerModal.tsx        │
│  ├─ File input (image/PDF)      │
│  └─ Camera capture               │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ Vérifier type: isPdf() ?            │
├─ OUI → convertPdfFirstPageToImage() │
│        (pdfjs-dist library)         │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ Canvas image via DataURL            │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ OCR Step: analyzeReceipt()          │
│ ├─ Option 1: Tesseract.js (local)   │
│ └─ Option 2: Mindee API (remote)    │
│     └─ Returns: { merchant,        │
│              amount,                 │
│              date/time,              │
│              candidates }            │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ User voit extraction:               │
│ ├─ Merchant name                    │
│ ├─ Suggested amount + confidence    │
│ ├─ Date/Time                        │
│ └─ Category (auto-guessed)          │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ User peut:                          │
│ ├─ Corriger montant                 │
│ ├─ Changer catégorie                │
│ └─ Valider                          │
└────────────┬────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│ handleConfirm():                         │
│ ├─ POST /API/add_transaction.php         │
│ │   + file (image)                      │
│ │   + extracted data                     │
│ │                                        │
│ └─ POST /API/ocr_feedback.php       │
│     (pour ML training)                   │
│     └─ { action: 'accepted'/'overridden'
│          suggested vs applied amounts    │
│          candidates with scores }        │
└────────────┬─────────────────────────────┘
             │
             ▼
   ✅ Transaction ajoutée
   📊 Data sauvegardée pour training
```

---

## Flux d'analyse financière (Stats)

```
┌──────────────────────────────────────┐
│ StatsRebuilt.tsx                     │
│ Utilisateur clique "Stats"           │
└─────────────┬──────────────────────┘
              │
              ├─────────────────────────────┐
              │                             │
              ▼                             ▼
    ┌─────────────────────┐    ┌──────────────────┐
    │ Compute monthlies:  │    │ Financial Health │
    │ ├─ Total revenus    │    │ ├─ Revenus       │
    │ ├─ Total dépenses   │    │ ├─ Dépenses      │
    │ └─ Net (épargne)    │    │ └─ Net épargne   │
    │                     │    │                  │
    │ RechartBar.js       │    │ RechartArea.js   │
    └─────────────────────┘    └──────────────────┘
              │                             │
              │     ┌───────────────────────┤
              │     │                       │
              ▼     ▼                       ▼
    ┌───────────────────────┐   ┌────────────────────┐
    │ Budget Remaining:     │   │ Fixed vs Variable: │
    │ ├─ Per category       │   │ ├─ Dépenses fixes  │
    │ ├─ Spent vs limit    │   │ ├─ Dépenses var.   │
    │ └─ Color coded: OK/⚠  │   │ └─ Ratio           │
    │                       │   │                    │
    │ BudgetRemaining.tsx   │   │ FixedVsVar.tsx    │
    └───────────────────────┘   └────────────────────┘
              │                             │
              └──────────────┬──────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │  User sees:          │
                  │  ├─ Dépenses par cat.│
                  │  ├─ Tendances temps  │
                  │  ├─ Budget health    │
                  │  ├─ Forecast         │
                  │  └─ Actions          │
                  └──────────────────────┘
```

---

## Flux de gestion d'objectifs (Goals)

```
┌──────────────────────────────┐
│  Objectifs.tsx               │
│  Liste + actions             │
└──────────┬───────────────────┘
           │
    ┌──────┴──────┬──────────┬──────────┐
    │             │          │          │
  CRÉER        ÉDITER      RETRAIT    DÉPÔT
    │             │          │          │
    ▼             │          │          ▼
┌──────────┐     │          │     ┌────────┐
│AddGoal   │     │          │     │Deposit │
│Modal.tsx │     │          │     │Modal   │
└──┬───────┘     │          │     └─┬──────┘
   │             │          │       │
   │ nom + amt   │          │       │ montant
   │             │          │       │
   ▼             ▼          ▼       ▼
POST /API/     POST /API/  POST/POST/
add_goal.php   update_     add_goal_  add_goal_
             objectif.php  withdrawal transaction.php
               .php        .php


Flow détaillé CRÉER:
━━━━━━━━━━━━━━━━━━
add_goal.php:
├─ Validation input (montant, nom)
├─ CREATE TABLE subcategory (goal_name)
├─ INSERT INTO objectif_crees
│   ├─ user_id
│   ├─ subcategory_id (nouvelle)
│   ├─ montant
│   └─ date_depot
└─ JSON: { success, goal_id }


Flow détaillé DÉPÔT:
━━━━━━━━━━━━━━━━━━
Utilisateur:
├─ Sélecte goal
├─ Entre montant dépôt
└─ Confirme

add_goal_transaction.php:
├─ Validation
├─ INSERT INTO transactions
│   ├─ id_utilisateur
│   ├─ Date
│   ├─ Montant
│   ├─ id_type = 3 (savings)
│   ├─ subcategory_id (du goal)
│   └─ goal_id (copié)
└─ JSON: { success }

Frontend recalcule:
└─ total_deposits = SUM(transactions.Montant)
   WHERE goal_id = ? AND id_type = 3
└─ reste = montant_objectif - total_deposits
└─ % avancement


Flow détaillé ATTEINDRE OBJECTIF:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Quand total_deposits >= montant_objectif:
├─ Frontend détecte
├─ Affiche "Objectif atteint!"
├─ User clique confirmation
│
└─ Backend:
   ├─ INSERT INTO objectif_atteints
   │   ├─ user_id
   │   ├─ montant_objectif (copié)
   │   ├─ total_collected (SUM deposits)
   │   ├─ progress_pct (100%)
   │   └─ date_completion
   │
   └─ DELETE FROM objectif_crees
```

---

## Arborescence filtres

```
┌─────────────────┐
│ App State       │
│ (Lifted State)  │
└────────┬────────┘
         │
    ┌────┴────┬───────┬────────┬────────┬──────────┐
    │          │       │        │        │          │
    ▼          ▼       ▼        ▼        ▼          ▼
recherche filtreType annee   mois  categorie  sous
 (text)  (tous|expense (2024) (01)  (Auto)    (car
          |income)                             pool)
    │          │       │        │        │          │
    └──────────┴───────┴────────┴────────┴──────┬───┘
                                                │
                        Partagé entre:
                    ┌───┬───┬────────┬──────┐
                    │   │   │        │      │
                    ▼   ▼   ▼        ▼      ▼
                Dashboard Transactions Stats
                       &
                   Filters.tsx
                   (UI de filtres)
                   
                   
Logique de filtre par composant:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const transactionsFiltrees = transactions.filter(t => {
  const matchRecherche = matchesSearch(t, recherche);
  const matchType = filtreType === 'tous' || t.type === filtreType;
  const matchAnnee = annee === 'Tous' || String(t.date.split('-')[0]) === annee;
  const matchMois = mois === 'Tous' || t.date.split('-')[1] === mois;
  const matchCategorie = categorie === 'Toutes' || t.categorie === categorie;
  const matchSous = ...;
  return matchRecherche && matchType && matchAnnee && matchMois && ... ;
});
```

---

## Components Tree

```
App.tsx (root, state management)
├─ PreferencesProvider (context)
│  ├─ themne (light|dark)
│  └─ currency (EUR|XOF)
│
├─ LoginModal
│  └─ POST /API/login.php
│
├─ [TAB]: Dashboard
│  ├─ Filters
│  ├─ StatsCardsDesign (KPIs)
│  ├─ SummaryCards (revenus/dépenses)
│  ├─ BudgetRemainingCard
│  ├─ FinancialHealthCard
│  ├─ FixedVsVariableExpensesCard
│  ├─ Charts (RechartBar, Area, Pie)
│  └─ Recent transactions list
│
├─ [TAB]: AjouterTransactionModern
│  ├─ TransactionModalContainer
│  │  └─ AjouterForm + ReceiptScannerModal
│  │
│  └─ ReceiptScannerModal
│     ├─ Camera input
│     ├─ File input (image/PDF)
│     ├─ OCR (Tesseract.js / Mindee)
│     └─ Amount selection modal
│
├─ [TAB]: TransactionsModern
│  ├─ Filters (filtrage + recherche)
│  ├─ Table de transactions
│  │  ├─ Edit button → EditTransactionModal
│  │  └─ Delete button → confirmation
│  └─ Invoice preview modal
│
├─ [TAB]: StatsRebuilt
│  ├─ Filters
│  ├─ MonthlyPerformanceCard (histogramme)
│  ├─ FinancialHealthCard (area chart)
│  ├─ BudgetRemainingCard (progress bars)
│  ├─ FixedVsVariableExpensesCard (pie)
│  └─ StatsSafe (safe-specific)
│
├─ [TAB]: Objectifs
│  ├─ Liste GoalCard
│  │  └─ Progress bar + actions
│  ├─ AddGoalModal
│  ├─ EditGoalModal
│  ├─ DepositModal
│  ├─ WithdrawModal
│  └─ TransferGoalModal
│
└─ [TAB]: ProfilModern
   ├─ User info (avatar, email, name)
   ├─ Avatar upload
   ├─ Preferences (devise)
   ├─ Password change
   ├─ Parametres.tsx (advanced settings)
   └─ Logout button
```

---

## Sécurité - Flux CSRF

```
┌─────────────────────────────┐
│ Frontend (React)            │
│ ├─ Au startup:              │
│ │  └─ GET /API/get_csrf_    │
│ │     token.php             │
│ │                           │
│ └─ Reçoit token en JSON     │
│    ├─ Stocke en memory      │
│    │  (pas localStorage)    │
│    └─ Valide signature      │
└────────────┬────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ Chaque POST ajoute le token:       │
│                                    │
│ const body = await                │
│  addCsrfToBody(payload)            │
│                                    │
│ → Ajoute: body.csrf_token = token  │
└────────────┬─────────────────────┘
             │
             ▼
┌───────────────────────────────────┐
│ POST /API/add_transaction.php      │
│ + body.csrf_token                 │
└────────────┬──────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ Backend (PHP):                   │
│                                  │
│ verify_csrf_token():             │
│ ├─ Compare $_POST['csrf_token']  │
│ │  vs session stored token       │
│ ├─ Signature valide ?            │
│ └─ Exp non dépassée ?            │
│                                  │
│ ❌ Invalid → HTTP 403            │
│ ✅ Valid → Continue              │
└──────────────────────────────────┘
```

---

## Multi-devise Conversion

```
┌──────────────────────────────────┐
│ User voit: EUR 50                │
│ Input: montant = 50, currency = EUR
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ Backend: add_transaction.php         │
│                                      │
│ if currency === 'EUR':               │
│   amount_eur = 50                    │
│   amount = 50 * 655.957 = 32797.85   │
│   → Stocke en XOF                    │
│                                      │
│ if currency === 'XOF':               │
│   amount_eur = 32797.85 / 655.957    │
│   amount = 32797.85                  │
│   → Stocke en XOF                    │
└────────────┬────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ SQL INSERT transactions:             │
│ ├─ Montant: 32797.85 (XOF)           │
│ ├─ Montant_eur: 50.00 (EUR)          │
│ ├─ currency: 'EUR'                   │
│ └─ ✅ Stockée canoniquement         │
└────────────┬────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ Frontend affichage:                  │
│ ├─ user.currency = 'EUR'             │
│ └─ Display: 50.00 EUR                │
│                                      │
│ (Si user.currency = 'XOF'):          │
│ └─ Display: 32797.85 XOF             │
└──────────────────────────────────────┘


Taux de change:
━━━━━━━━━━━━━━
EUR → XOF:  * 655.957
XOF → EUR:  / 655.957
(Hardcodé dans API/config.php)

Migration de devise:
━━━━━━━━━━━━━━━━━━━
migrate_to_xof.php:
├─ Trouvez users avec currency != XOF
├─ Convertir: Montant *= taux
├─ Setter: Montant_eur = ancien Montant
├─ Backup tables avant conversion
└─ Rouler avec --confirm flag
```

---

## Database Relations Diagram

```
users (1) ──┬────────── (N) transactions
            │
            ├────────── (N) objectif_crees
            │
            ├────────── (N) objectif_atteints
            │
            ├────────── (N) budgets
            │
            └────────── (N) recurring_plans


transactions (1) ──┬──── (1) transaction_types
                   │
                   ├──── (1) categories
                   │
                   ├──── (N) transaction_files
                   │        (factures scannées)
                   │
                   ├──── (0-1) subcategories
                   │
                   └──── (0-1) objectif_crees
                        (goal_id FK)


categories (1) ────── (N) subcategories
            │
            └──────── (1) transaction_types


objectif_crees (1) ──── (1) subcategories
                 │
                 └───── (N) transactions
                        (via subcategory_id)


budgets (1) ────── (1) categories


recurring_plans (1) ────── (N) transactions
                          (auto-generated)
```

---

**Générée:** 26 janvier 2026
