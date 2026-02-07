# 📊 Analyse Globale de SaXalis

## 🎯 Vue d'ensemble
**SaXalis** est une application web complète de **gestion financière personnelle** basée sur une architecture **fullstack moderne**. Elle permettent aux utilisateurs de tracker leurs transactions, gérer leurs budgets, définir des objespectives d'épargne, et analyser leur santé financière.

**Domaine:** https://saxalis.free.nf  
**Type:** Application SPA (Single Page Application) + REST API  
**Public cible:** Gestion personnelle des finances

---

## 🏗️ Architecture Technique

### Stack Frontend
```
┌─────────────────────────────────────────────┐
│ React 18.3.1 + TypeScript                   │
│ Vite (Build tool) + HMR                     │
│ TailwindCSS 4 + Radix UI Components         │
│ Material-UI (MUI) 7.3.5                     │
│ Recharts (Data visualization)               │
└─────────────────────────────────────────────┘
  ├─ Fichiers: src/app/App.tsx (1022 lignes - composant principal)
  ├─ Services: src/services/api.ts (443 lignes - client HTTP)
  └─ Contextes: PreferencesContext (gestion des préférences)
```

**Dépendances principales:**
- **lucide-react**: Icônes
- **tesseract.js + mindee**: OCR pour scanner les factures
- **pdfjs-dist**: Conversion PDF → Image
- **react-hook-form**: Gestion des formulaires
- **react-dnd**: Drag & drop
- **sonner**: Notifications toast
- **date-fns**: Util. dates

### Stack Backend
```
┌──────────────────────────────────────┐
│ PHP 7.4+ (MAMP)                      │
│ MySQL/MariaDB (PDO)                  │
│ REST API (endpoints PHP)             │
└──────────────────────────────────────┘
  ├─ Dossier: /API/ (~80 endpoints)
  ├─ Authentification: Session PHP
  └─ Sécurité: CSRF tokens, validation
```

**Configuration:**
- [API/config.php](API/config.php): Gestion CORS, connexion DB, conversion de devises
- Timezone: **UTC** (conversions en temps réel)
- Devises supportées: **EUR** et **XOF** (Franc CFA)
- CORS: Autorise localhost/127.0.0.1 et saxalis.free.nf en prod

---

## 🗄️ Modèle de Données (MySQL)

### Tables principales

#### **users**
```sql
- id (PK)
- username
- password (hashed)
- email
- currency (EUR / XOF) -- devise préférée de l'utilisateur
- avatar_path
```

#### **transactions**
```sql
- id_transaction (PK)
- id_utilisateur (FK users)
- Date (YYYY-MM-DD)
- Montant (valeur canonique, généralement en XOF)
- currency (EUR / XOF)
- Montant_eur (équivalent en EUR pour conversion)
- id_type (FK transaction_types) -- dépense, revenu, épargne
- category_id (FK categories)
- subcategory_id (FK subcategories) -- nullable
- Notes
- goal_id (FK objectif_crees) -- nullable, pour lier à un objectif
```

#### **transaction_types**
```sql
- id_type (PK)
- code: 'expense' | 'income' | 'saving'
- label (ex: "Dépenses", "Revenus", "Épargne")
```

#### **categories** & **subcategories**
```sql
-- categories
- id_category (PK)
- id_type (FK) -- type que cette catégorie appartient
- name (ex: "Alimentation", "Transport")

-- subcategories
- id_subcategory (PK)
- category_id (FK)
- name (ex: "Épicerie", "Restaurant")
- icon (emoji)
- is_fixed (boolean) -- classifie comme "dépense fixe"
```

#### **objectif_crees** (Objectifs d'épargne)
```sql
- id_objectif (PK)
- user_id (FK)
- id_subcategory (FK) -- la sous-catégorie dédiée
- montant (objectif d'épargne)
- montant_eur (équivalent EUR)
- date_depot (date de création)
```

#### **transaction_files**
```sql
- file_id (PK)
- transaction_id (FK transactions)
- file_path -- chemin relatif de la facture scannée
```

#### **budgets**
```sql
- budget_id (PK)
- user_id (FK)
- category_id (FK) -- si budget par catégorie
- montant (limite budgétaire)
- mois/année (pour budget mensuel)
```

#### **recurring_plans**
```sql
- plan_id (PK)
- user_id (FK)
- frequency (monthly, weekly, etc.)
- next_occurrence_date
- (autres champs pour les transactions récurrentes)
```

---

## 🎨 Architecture Frontend

### Pages/Onglets principaux (dans App.tsx)

```
┌─────────────────────────────────────────────────────────┐
│ App.tsx (State Management + Tab Router)                 │
├─ activeTab: 'dashboard' | 'ajouter' | 'transactions' │ 'stats'
│                        | 'profil' | 'objectifs'         │
└─────────────────────────────────────────────────────────┘
  │
  ├─ [dashboard]          → Dashboard.tsx
  │    ├─ Résumé du mois (revenus/dépenses)
  │    ├─ Graphiques d'analyse (Recharts)
  │    ├─ Cartes de santé financière
  │    └─ Transactions récentes
  │
  ├─ [ajouter]            → AjouterTransactionModern.tsx
  │    ├─ Formulaire pour ajouter transaction
  │    ├─ ReceiptScannerModal (OCR + Mindee)
  │    └─ Sélection catégorie/sous-catégorie
  │
  ├─ [transactions]       → TransactionsModern.tsx
  │    ├─ Tableau de toutes les transactions
  │    ├─ Filtres: année, mois, catégorie, texte
  │    ├─ Édition/suppression inline
  │    └─ Tri et pagination
  │
  ├─ [stats]             → StatsRebuilt.tsx / StatsModern.tsx
  │    ├─ Analyse mensuelle de dépenses
  │    ├─ Santé financière (revenus vs dépenses)
  │    ├─ Comparaison dépenses fixes vs variables
  │    ├─ Projection budgétaire
  │    └─ Performance de budgets
  │
  ├─ [objectifs]         → Objectifs.tsx
  │    ├─ Liste des objectifs d'épargne créés
  │    ├─ Cartes de progression (GoalCard.tsx)
  │    ├─ Modal pour créer/éditer/supprimer
  │    └─ Visualisation de l'avancement
  │
  └─ [profil]            → ProfilModern.tsx
       ├─ Données utilisateur (nom, email, avatar)
       ├─ Upload avatar
       ├─ Préférences (devise)
       ├─ Paramètres (Parametres.tsx)
       └─ Changement de mot de passe
```

### Composants clés

| Composant | Rôle |
|-----------|------|
| **ReceiptScannerModal** | Scanner de factures avec OCR (Tesseract.js + Mindee API) |
| **EditTransactionModal** | Édition d'une transaction existante |
| **TransactionModalContainer** | Wrapper pour ajouter/éditer transactions |
| **BudgetRemainingCard** | Affiche budget restant de la période |
| **FinancialHealthCard** | Calcul et graphique de santé financière |
| **FixedVsVariableExpensesCard** | Analyse dépenses fixes vs variables |
| **StatsMaintenance** | Vue d'analyse des dépenses |
| **StatsSafe** | Gestion des "coffres-forts" (sauvegarde spéciale) |
| **Filters** | Barre de filtres partagée (année, mois, catégorie, texte) |
| **ErrorBoundary** | Capture erreurs React pour éviter crash complet |

---

## 🔌 API REST (Backend PHP)

### 80 endpoints répartis en catégories:

#### **Authentification**
- `POST /API/login.php` - Connexion utilisateur
- `POST /API/register.php` - Inscription
- `POST /API/logout.php` - Déconnexion
- `GET /API/check_session.php` - Vérif session active
- `GET /API/get_user.php` - Récupère user courant

#### **Transactions**
- `GET /API/get_transactions.php` - Récupère toutes transactions
- `POST /API/add_transaction.php` - Crée nouvelle transaction
- `POST /API/update_transaction.php` - Met à jour transaction
- `POST /API/delete_transaction.php` - Supprime transaction
- `POST /API/delete_all_transactions.php` - Supprime tout (debug)
- `GET /API/get_transactions_recurring.php` - Récurrence
- `POST /API/add_transaction_with_invoice.php` - Avec facture scannée

#### **Catégories & Types**
- `GET /API/get_transaction_types.php` - Types disponibles
- `POST /API/get_categories.php` - Catégories (filtrées par type_id)
- `GET /API/get_subcategories.php` - Sous-catégories (filtrées)
- `POST /API/add_category.php` - Crée catégorie
- `POST /API/update_category.php` - Modifie catégorie
- `POST /API/delete_category.php` - Supprime catégorie
- `POST /API/add_subcategory.php` - Crée sous-catégorie
- `POST /API/update_subcategory.php` - Modifie sous-catégorie
- `POST /API/delete_subcategory.php` - Supprime sous-catégorie
- `GET /API/search_categories.php` - Recherche catégories

#### **Budgets**
- `POST /API/get_budgets.php` - Récupère budgets
- `POST /API/add_category_budget.php` - Crée budget par catégorie
- `POST /API/get_category_budget.php` - Détail d'un budget
- `POST /API/update_category.php` - Modifie budget

#### **Objectifs d'épargne (Goals)**
- `GET /API/get_goals.php` - Liste objectifs créés
- `GET /API/get_objectifs_crees.php` - Idem (ancien endpoint)
- `POST /API/add_goal.php` - Crée nouvel objectif
- `POST /API/update_objectif.php` - Modifie objectif
- `POST /API/delete_goal.php` - Supprime objectif
- `POST /API/transfer_goal.php` - Transfère entre objectifs
- `POST /API/add_goal_transaction.php` - Ajoute transaction into goal
- `POST /API/add_goal_withdrawal.php` - Retire du goal
- `POST /API/add_goal_plan.php` - Plan d'épargne
- `POST /API/update_goal_plan.php` - Modifie plan
- `POST /API/delete_goal_plan.php` - Supprime plan
- `POST /API/run_goal_plans.php` - Exécute plans (worker)
- `GET /API/current_goal.php` - Goal courant

#### **Coffres-forts (Safes)**
- `GET /API/get_coffre_depots.php` - Coffres "dépôts"
- `GET /API/get_coffre_projets.php` - Coffres "projets"
- `POST /API/add_depot_coffre.php` - Ajoute dépôt
- `POST /API/add_projet_coffre.php` - Ajoute projet
- `POST /API/update_depot_coffre.php` - Modifie dépôt
- `POST /API/update_projet_coffre.php` - Modifie projet
- `POST /API/delete_coffre_depot.php` - Supprime dépôt
- `POST /API/delete_coffre_projet.php` - Supprime projet
- `GET /API/coffre_fort_type_recup.php` - Types de coffres

#### **Analyse & Rapports**
- `GET /API/get_monthly_savings.php` - Épargne mensuelle
- `POST /API/goals_monthly.php` - Bilan mensuel goals
- `POST /API/get_mindmap_data.php` - Données pour mindmap
- `GET /API/get_objectifs_atteints.php` - Objectifs atteints
- `GET /API/get_objectifs_crees.php` - Objectifs créés

#### **Transactions récurrentes**
- `POST /API/add_recurring_transaction.php` - Crée récurrence
- `GET /API/get_recurring_transactions.php` - Liste récurrences
- `POST /API/run_recurring_transactions.php` - Worker qui exécute
- `POST /API/recurring_worker.php` - Cron job déclencheur

#### **Utilisateur & Profil**
- `POST /API/update_user_profile.php` - Modifie profil (avatar, etc.)
- `POST /API/update_password.php` - Change mot de passe
- `POST /API/update_user_pref.php` - Préférences (devise)
- `POST /API/upload_avatar.php` - Upload image profil
- `GET /API/get_csrf_token.php` - Token CSRF pour forms

#### **Factures & OCR**
- `POST /API/upload_invoice.php` - Upload facture
- `POST /API/upload_depot_invoice.php` - Upload pour dépôt
- `POST /API/ocr_feedback.php` - Enregistre feedback utilisateur
- `POST /API/export_ocr_feedback.php` - Exporte données pour ML training

#### **Conversions & Utilities**
- `POST /API/convert_currency.php` - Convertit montants entre devises
- `POST /API/get_csrf_token.php` - CSRF token generator

#### **Debug & Admin** (dev only)
- `POST /API/debug_check_avatar.php` - Débugg avatar
- `POST /API/debug_get_transactions.php` - Débugg transactions
- `POST /API/debug_monthly_savings.php` - Débugg épargne mensuelle
- `POST /API/debug_schema.php` - Dump schéma DB

#### **Sécurité**
- [API/security.php](API/security.php) - Validation inputs, CSRF verification
- [API/config.php](API/config.php) - CORS headers setup

---

## 🔐 Sécurité

### Impléme

ntée:
1. **Authentification sesion PHP:**  
   - Vérification `require_auth()` sur tous les endpoints  
   - HTTP 401 si non authentifié

2. **CSRF Tokens:**  
   - [src/services/csrf.ts](src/services/csrf.ts) - Gestion client
   - [API/security.php](API/security.php) - Vérification serveur
   - Requis pour tous les POSTs

3. **Validation stricte:**  
   - `validate_date()`, `validate_string()`, `validate_int()`, `validate_float()`  
   - Validation des devises (EUR, XOF uniquement)

4. **CORS:**  
   - Whiteliste: localhost en dev, saxalis.free.nf en prod
   - Credentials: allowed

5. **Password hashing:**  
   - PHP's `password_hash()` / `password_verify()`

---

## 💱 Multi-devises

**Système implémenté:**
- Utilisateurs stockent tous montants en **XOF** (devise canonique)
- Colonne `Montant_eur` sauvegarde équivalent en EUR (pour historique)
- Colonne `currency` enregistre devise originelle (EUR/XOF)
- **Taux de change:** EUR → XOF = 655.957 (hardcodé dans [API/config.php](API/config.php))

**Migration (`migrate_to_xof.php`):**
- CLI-only script pour convertir données anciennes
- Crée backups avant conversion
- `php migrate_to_xof.php --confirm`

---

## 📱 Flux Utilisateur Principal

```
1. AUTHENTIFICATION
   ↓
   [LoginModal] → POST /API/login.php → Session PHP
   ↓
2. DASHBOARD (accueil)
   ├─ Charge transactions + catégories + budgets
   ├─ Affiche KPIs: revenus/dépenses du mois
   ├─ Graphiques: dépenses par catégorie, revenu vs dépense
   └─ Transactions récentes
   ↓
3. AJOUTER TRANSACTION
   ├─ Cas 1: Manuellement
   │  └─ Form: montant, catégorie, date, notes
   │     → POST /API/add_transaction.php
   │
   ├─ Cas 2: Scanner facture (ReceiptScannerModal)
   │  ├─ Upload image/PDF (converted to image)
   │  ├─ OCR (Tesseract.js ou Mindee API)
   │  ├─ Extraction: montant, commerçant, date
   │  ├─ User peut corriger
   │  └─ Soumet avec facture scannée
   │     → POST /API/add_transaction_with_invoice.php
   │
   └─ Feedback OCR enregistré
      → POST /API/ocr_feedback.php (pour ML training)
   ↓
4. GESTION TRANSACTIONS
   ├─ Filtrers: année, mois, catégorie, texte
   ├─ Édition inline ou modal
   ├─ Suppression avec confirmation
   └─ Visualisation factures jointes
   ↓
5. ANALYSE FINANCIÈRE (Stats)
   ├─ Dépenses mensuelles (histogramme)
   ├─ Santé financière (dépenses vs revenus)
   ├─ Budget restant par catégorie
   ├─ Dépenses fixes vs variables
   └─ Projection épargne
   ↓
6. OBJECTIFS D'ÉPARGNE
   ├─ Créer objectif → crée subcategory dédiée
   ├─ Faire dépôt → transaction type 'savings' vers subcategory du goal
   ├─ Cumuler avancements → montrer % complété
   ├─ Retirer du goal → transaction type 'withdrawal'
   └─ Atteindre objectif → déplacer vers "objectifs_atteints"
   ↓
7. PROFIL
   ├─ Modifier données perso (avatar, etc.)
   ├─ Changer devise préférence
   ├─ Changer mot de passe
   └─ Voir stats utilisateur
```

---

## 📊 Filtres et Recherche

**État de filtres centralisé dans App.tsx:**
- `recherche` - Full-text search (montant, catégorie, notes, date)
- `filtreType` - 'tous' | 'expense' | 'income'
- `annee` / `mois` - Filtrage temporel
- `categorie` / `sousCategorie` - Filtrage hiérarchique
- Partagé entre Dashboard, Transactions, Stats

**Logique:** [searchUtils.ts](src/app/components/searchUtils.ts) et [statsUtils.ts](src/app/components/statsUtils.ts)

---

## 🎨 Thème (Dark/Light)

- Stocké dans `localStorage`
- Défaut: **light**
- Toggle via boutons Sun/Moon dans UI
- Appliqué via classe `dark` sur `<html>`

---

## 🔄 Fonctionnalités avancées

### 1. Transactions Récurrentes
- Créer plan mensuel/hebdo/etc.
- Worker exécute auto (ou via `/API/recurring_worker.php`)
- Génère transactions auto

### 2. Budgets par catégorie
- Limite mensuelle par catégorie
- Comparaison dépenses vs budget
- Visual: **BudgetRemainingCard**

### 3. Plans d'épargne
- **goal_plans**: Montant à épargner par période
- Worker exécute (`run_goal_plans.php`)
- Génère transactions auto vers le goal

### 4. Coffres-forts (Safes)
- Type: "dépôts" ou "projets"
- Stockage séparé de transactions principales
- Uploadées de factures

### 5. OCR & Machine Learning
- **Tesseract.js** - OCR local (browser)
- **Mindee API** - OCR commercial (optionnel)
- **PDF support** - Conversion 1ère page en image
- **Feedback** - User corrige → données envoyées pour training ML
  - Endpoint: `POST /API/ocr_feedback.php`
  - Enum `ocr_feedback.action`: 'accepted' | 'overridden'
  - Stocke: montant suggéré vs appliqué, catégorie, candidats

### 6. Données financielles multi-devise
- Tous montants stockés en XOF (canonique)
- EUR sauvegardé pour historique
- Conversion auto lors display (config client)

---

## 🛠️ Outils de développement

### Scripts npm
```bash
npm run dev      # Vite dev server (HMR)
npm run build    # Build production
npm run test     # Vitest tests
```

### Fichiers config
- [vite.config.ts](vite.config.ts) - Build Vite, alias '@'
- [postcss.config.mjs](postcss.config.mjs) - TailwindCSS config
- [API/config.php](API/config.php) - DB, CORS, conversion devises
- [API/config.local.php](API/config.local.php) - Config locale (git-ignored)

### Env. variables
- **Frontend:** `.env.local` → `VITE_API_BASE_URL`
- **Backend:** `API/config.local.php` ou env vars: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`

### Base de données
- Engine: **MySQL/MariaDB**
- Charset: **utf8mb4**
- Timezone: **UTC** (PHP + DB)
- **Migrations:** `API/migrations/migrate_to_xof.php`

---

## 📁 Structure des fichiers

```
SaXalis/
├── API/                          # Backend PHP REST
│   ├── config.php               # Configuration CORS, DB, devises
│   ├── auth.php                 # Session & authentification
│   ├── security.php             # Validation & CSRF
│   ├── *.php                    # 80+ endoints
│   ├── lib/                     # Fonctions utilitaires
│   └── migrations/              # Scripts migration
│
├── src/
│   ├── main.tsx                 # Point d'entrée React
│   ├── app/
│   │   ├── App.tsx              # Composant principal (1022 l.)
│   │   ├── components/          # Tous les composants React
│   │   │   ├── Dashboard.tsx
│   │   │   ├── TransactionsModern.tsx
│   │   │   ├── StatsRebuilt.tsx
│   │   │   ├── Objectifs.tsx
│   │   │   ├── ReceiptScannerModal.tsx  # OCR
│   │   │   └── ...
│   │   ├── contexts/            # Exemple: PreferencesContext
│   │   └── hooks/               # Hooks personnalisés
│   │
│   ├── services/
│   │   ├── api.ts               # Client HTTP (443 l.)
│   │   ├── csrf.ts              # Gestion CSRF
│   │   └── api-csrf-integration.ts
│   │
│   ├── lib/
│   │   ├── receiptOcr.ts        # Intégration OCR
│   │   ├── pdfToImage.ts        # Conversion PDF
│   │   └── formatCurrency.ts    # Format devise
│   │
│   └── styles/
│       └── index.css            # TailwindCSS imports
│
├── public/                       # Assets statiques
│   └── images/default-avatar.svg
│
├── uploads/                      # Stockage factures scannées
├── deploy/                       # Scripts déploiement
├── docs/                         # Documentation
└── package.json / vite.config.ts # Configuration projet
```

---

## 🔧 Points clés pour extensions futures

1. **Ajouter une devise**: Modifier `get_conversion_rate()` dans [API/config.php](API/config.php)
2. **Nouvel endpoint API**: Créer `API/new_endpoint.php`, inclure `config.php`, `auth.php`, `security.php`
3. **Nouveau composant React**: Dans `src/app/components/`, utiliser Radix UI pour consistency
4. **Migrate données**: Utiliser pattern dans `migrate_to_xof.php`
5. **Changer devise canonique**: Script de migration massive (attention!)

---

## 🎓 Apprentissages clés

| Aspect | Pattern utilisé |
|--------|-----------------|
| **State centralisé** | App.tsx (sans Redux) |
| **API calls** | Service pattern (api.ts) |
| **Sécurité** | CSRF tokens, session auth, validation stricte |
| **Devises** | Single canonical currency + conversions |
| **Pagination/Filter** | État élevé à App, partagé à composants |
| **OCR** | Client-side (Tesseract) + serveur (Mindee) |
| **Icônes** | lucide-react (fallback emoji dans SVG) |

---

## 📞 API Documentation résumée

Voir [src/services/api.ts](src/services/api.ts) pour structure de **tous les appels**, ex.:

```typescript
// Exemple
export async function addTransaction(payload: any) {
  const body = await addCsrfToBody(payload);
  return request('add_transaction.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}
```

Tous les endoints followent ce pattern: **GET/POST** → JSON response → `{ success, data/error }`

---

## ✅ Checklist pour déploiement

- [ ] Configurer `API/config.local.php` avec crédentials DB
- [ ] Vérifier CORS autorise domaine prod
- [ ] Setter `VITE_API_BASE_URL` en prod
- [ ] Migrer data avec `migrate_to_xof.php --confirm`
- [ ] Tester login/logout
- [ ] Tester OCR si Mindee API utilisée
- [ ] Backups DB réguliers
- [ ] Logs: `/API/login.log`, `/API/recurring_login.log`

---

**Dernière mise à jour:** 26 janvier 2026  
**Statut:** ✅ Analysé et documenté
