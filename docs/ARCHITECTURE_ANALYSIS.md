# 📊 Analyse Complète de l'Architecture de SaXalis

## 🎯 Vue d'Ensemble du Projet

**SaXalis** est une application web de **suivi des finances personnelles** (budget, dépenses, revenus, objectifs d'épargne). C'est une application full-stack avec un backend PHP et un frontend React moderne.

- **Domaine**: saxalis.free.nf
- **Stack Frontend**: React 18.3.1 + TypeScript + Vite + TailwindCSS + Material UI (MUI)
- **Stack Backend**: PHP 7.2+ avec PDO + MySQL/MariaDB
- **Base de données**: `if0_40680976_suivi_depenses` (hébergée sur InfinityFree)

---

## 🏗️ Architecture Générale

```
┌─────────────────────────────────────┐
│        Frontend (React/TypeScript)    │
│  ├─ Dashboard                         │
│  ├─ Transactions                      │
│  ├─ Statistiques                      │
│  ├─ Objectifs/Épargne                │
│  └─ Profil Utilisateur                │
└──────────────┬──────────────────────┘
               │ Fetch/API Calls
               ↓
┌──────────────────────────────────────┐
│   Backend API (PHP + CORS)            │
│  ├─ Authentification                  │
│  ├─ Gestion des Transactions          │
│  ├─ Catégories & Sous-catégories     │
│  ├─ Budgets                           │
│  ├─ Objectifs & Épargne              │
│  └─ Transactions Récurrentes          │
└──────────────┬──────────────────────┘
               │ PDO
               ↓
┌──────────────────────────────────────┐
│    MySQL/MariaDB Database             │
│  ├─ utilisateurs                      │
│  ├─ transaction_types                 │
│  ├─ categories                        │
│  ├─ subcategories                     │
│  ├─ transactions                      │
│  ├─ category_budgets                  │
│  ├─ objectif_crees                    │
│  ├─ objectif_atteints                 │
│  ├─ recurring_transactions             │
│  └─ transaction_files                 │
└──────────────────────────────────────┘
```

---

## 📁 Structure des Dossiers

### Frontend (`/src`)
```
src/
├── main.tsx              # Point d'entrée React
├── app/
│   ├── App.tsx           # Composant principal (gestion routes, auth, state)
│   ├── components/       # Composants métier
│   │   ├── Dashboard
│   │   ├── Transactions/AjouterTransactionModern
│   │   ├── StatsModern/StatsRebuilt
│   │   ├── Objectifs
│   │   ├── ProfilModern
│   │   └── LoginModal
│   ├── contexts/         # React Context (PreferencesContext)
│   └── hooks/            # Custom hooks
├── components/           # Composants UI réutilisables
│   └── Spinner.tsx
├── services/
│   └── api.ts           # Client HTTP (fetch wrapper + endpoints)
└── styles/
    └── index.css        # TailwindCSS + Styles globaux
```

### Backend (`/API`)
```
API/
├── config.php                          # Configuration DB + CORS
├── auth.php                            # Authentification (session)
├── check_session.php                   # Vérification session
│
├── Authentification
│   ├── login.php                       # Connexion
│   ├── register.php                    # Inscription
│   ├── logout.php                      # Déconnexion
│   └── update_password.php             # Changement de mot de passe
│
├── Transactions
│   ├── get_transactions.php            # Liste les transactions
│   ├── add_transaction.php             # Crée une transaction
│   ├── update_transaction.php          # Met à jour une transaction
│   ├── delete_transaction.php          # Supprime une transaction
│   ├── get_transactions_recurring.php  # Transactions récurrentes
│   └── delete_all_transactions.php     # Supprime toutes les transactions
│
├── Catégories & Types
│   ├── get_transaction_types.php       # Liste des types (dépense, revenu, épargne)
│   ├── get_categories.php              # Liste des catégories
│   ├── add_category.php                # Ajouter une catégorie
│   ├── update_category.php             # Modifier une catégorie
│   ├── delete_category.php             # Supprimer une catégorie
│   ├── get_subcategories.php           # Liste des sous-catégories
│   ├── add_subcategory.php             # Ajouter une sous-catégorie
│   ├── update_subcategory.php          # Modifier une sous-catégorie
│   └── delete_subcategory.php          # Supprimer une sous-catégorie
│
├── Budgets
│   ├── get_budgets.php                 # Liste des budgets par catégorie/mois
│   ├── get_category_budget.php         # Budget d'une catégorie
│   ├── add_category_budget.php         # Créer un budget
│   └── migrate_add_manual_budget.php    # Migration des budgets manuels
│
├── Objectifs d'Épargne
│   ├── get_goals.php                   # Liste les objectifs créés
│   ├── get_objectifs_crees.php         # Détails avec progression
│   ├── add_goal.php                    # Créer un objectif
│   ├── update_objectif.php             # Mettre à jour un objectif
│   ├── delete_goal.php                 # Supprimer un objectif
│   ├── transfer_goal.php               # Transférer un objectif
│   ├── get_objectifs_atteints.php      # Objectifs atteints
│   ├── run_goal_plans.php              # Exécuter les plans d'objectif
│   └── (ancien système: coffre_*)      # Tables legacy (en cours de suppression)
│
├── Transactions Récurrentes
│   ├── add_recurring_transaction.php
│   ├── get_recurring_transactions.php
│   ├── update_goal_plan.php
│   ├── run_recurring_transactions.php
│   └── migrate_recurring_plans_init_occurrences.php
│
├── Statistiques
│   ├── get_monthly_savings.php         # Épargne mensuelle
│   ├── goals_monthly.php               # Objectifs par mois
│   └── get_mindmap_data.php            # Données pour visualisation
│
├── Profil Utilisateur
│   ├── get_user.php                    # Récupère l'utilisateur courant
│   ├── update_user_profile.php         # Met à jour le profil (avatar, nom, etc.)
│   ├── upload_avatar.php               # Télécharge l'avatar
│   └── upload_helper.php               # Utilitaires upload
│
├── Fichiers & Documents
│   ├── upload_invoice.php              # Upload facture transaction
│   ├── delete_transaction.php          # Supprime transaction + factures
│   ├── upload_depot_invoice.php        # Upload facture dépôt (legacy)
│   └── transaction_files table         # Lien fichiers <-> transactions
│
└── Utilitaires
    ├── convert_currency.php            # Conversion EUR <-> XOF
    ├── test_db.php                     # Test de connexion DB
    ├── test_post.php                   # Test des POST
    ├── debug_*.php                     # Fichiers de debug
    └── (Migrations en deploy/)
```

---

## 🗄️ Schéma de Base de Données

### Tables Principales

#### `utilisateurs` (Comptes utilisateurs)
```sql
id_utilisateur (PK)
username (UNIQUE)
password (bcrypt)
email
nom_complet
avatar_photo (nullable)
created_at
```

#### `transaction_types` (Types de transactions)
```sql
id_type (PK)
code (UNIQUE) - 'EXPENSE', 'INCOME', 'SAVINGS'
label - 'Dépense', 'Revenu', 'Épargne'
```

#### `categories` (Catégories de transactions)
```sql
id_category (PK)
id_type (FK → transaction_types)
name
description
manual_budget (nullable)
created_at
```

Exemples: "Charge fixe", "Nourritures", "Revenus", "Imprévus", "Ma femme"

#### `subcategories` (Sous-catégories)
```sql
id_subcategory (PK)
category_id (FK → categories)
name
icon (emoji)
created_at
```

Exemples: "Loyer", "Nourriture épicerie", "Salaire", etc.

#### `transactions` (Transactions financières - Core Table)
```sql
id_transaction (PK)
id_utilisateur (FK → utilisateurs)
id_type (FK → transaction_types)
category_id (FK → categories)
subcategory_id (FK → subcategories, nullable)
montant (DECIMAL)
date_transaction
description
goal_id (FK → objectif_crees, nullable) - Lie à un objectif
created_at
updated_at
```

#### `category_budgets` (Budgets par catégorie/mois)
```sql
id (PK)
user_id (FK → utilisateurs)
category_id (FK → categories)
subcategory_id (FK → subcategories, nullable)
year
month
amount
created_at, updated_at
```

#### `objectif_crees` (Objectifs d'épargne créés)
```sql
id_objectif (PK)
user_id (FK → utilisateurs)
id_subcategory (FK → subcategories)
montant (montant cible)
date_depot (date de création)
```

Une ligne = Un objectif. Les transactions avec `id_type=3` (SAVINGS) qui pointent vers cet objectif contribuent à sa progression.

#### `objectif_atteints` (Historique des objectifs atteints)
```sql
id_objectif_atteint (PK)
id_objectif (FK → objectif_crees)
user_id (FK → utilisateurs)
id_subcategory (FK → subcategories)
montant_atteint
date_atteint
```

#### `recurring_transactions` (Transactions récurrentes)
```sql
id (PK)
user_id (FK → utilisateurs)
category_id, subcategory_id
montant
description
frequency (MONTHLY, YEARLY, etc.)
next_occurrence (DATE)
created_at
```

#### `transaction_files` (Factures/Invoices associées aux transactions)
```sql
id (PK)
transaction_id (FK → transactions)
file_path
uploaded_at
```

---

## 🔄 Flux de Données Principaux

### 1️⃣ Authentification
```
Login (username/password)
     ↓
API: login.php
     ↓
Vérifie dans DB (utilisateurs)
     ↓
Crée SESSION PHP
     ↓
Frontend reçoit: { success: true, user: {...} }
```

### 2️⃣ Ajout d'une Transaction
```
Frontend: Form (montant, catégorie, date, description)
     ↓
API: add_transaction.php (POST)
     ↓
Valide et insère dans `transactions`
     ↓
Si upload facture → insert dans `transaction_files`
     ↓
Response: { success: true, id_transaction: ... }
     ↓
Frontend recharge la liste via get_transactions.php
```

### 3️⃣ Création d'un Objectif d'Épargne
```
Frontend: Créer objectif "Téléphone" pour 500€
     ↓
API: add_goal.php
     ↓
Insère dans `objectif_crees` avec montant=500, subcategory_id
     ↓
Frontend affiche "Objectif créé"
     ↓
Utilisateur effectue des transactions SAVINGS (id_type=3)
     ↓
Ces transactions pointent vers l'objectif via `goal_id`
     ↓
get_objectifs_crees.php agrège:
   - total_deposits (SUM des SAVINGS)
   - progress_pct = (total_deposits / montant) * 100
     ↓
Quand progress=100%, utilisateur peut marquer comme "Atteint"
```

### 4️⃣ Affichage du Tableau de Bord
```
Frontend charge au mount:
1. getTransactions() → liste des transactions récentes
2. getCategories() → charge les catégories
3. getTransactionTypes() → charge les types
4. getMonthlySavings() → épargne du mois courant
5. getBudgets() → budgets par catégorie
6. getGoals() → objectifs en cours

Frontend agrège et affiche:
- Total dépenses, revenus, épargne du mois
- Graphiques (recharts)
- Transactions récentes
- Progression objectifs
```

---

## 🔐 Authentification & Sécurité

### Authentification
- **Système**: Sessions PHP (serveur)
- **Workflow**:
  1. `login.php` vérifie username/password (bcrypt)
  2. Crée une session PHP (cookie)
  3. `auth.php` expose `require_auth()` et `current_user_id()`
  4. Chaque endpoint API commence par `require_auth()`

### CORS
- Production: `https://saxalis.free.nf`
- Développement: localhost, 127.0.0.1 autorisés
- Config: [API/config.php](API/config.php#L7)

### Base de Données
- Connexion: PDO avec prepared statements (sécurisé contre SQL injection)
- Charset: utf8mb4
- Timezone: UTC

---

## 🎨 Frontend - Architecture React

### State Management
- **LocalStorage**: Transactions (cache local)
- **React State**: Lifted à `App.tsx` pour partage entre pages
- **Context API**: `PreferencesContext` (thème dark/light, préférences)

### Onglets Principaux
```tsx
const [activeTab, setActiveTab] = useState<
  'dashboard' | 'ajouter' | 'transactions' | 'stats' | 'profil' | 'objectifs'
>('dashboard');
```

### Composants Majeurs
- **Dashboard** → Aperçu des finances
- **AjouterTransactionModern** → Form pour ajouter transaction
- **TransactionsModern** → Liste filtrable des transactions
- **StatsModern/StatsRebuilt/StatsSafe** → Graphiques (recharts)
- **Objectifs** → Gestion des objectifs d'épargne
- **ProfilModern** → Édition du profil, changement mot de passe
- **LoginModal** → Authentification

### Thème
- Light/Dark mode persisté en localStorage
- TailwindCSS + `dark:` classes

---

## 📱 Features Principales

### 1. Suivi des Transactions
- Ajouter/Modifier/Supprimer transactions
- Catégories et sous-catégories
- Factures attachées (upload)
- Filtrage par date, catégorie, montant

### 2. Budgets
- Budget par catégorie/subcatégorie
- Budget par mois
- Comparaison budget vs dépenses réelles

### 3. Objectifs d'Épargne
- Créer objectif (ex: "Acheter téléphone" pour 500€)
- Effectuer dépôts (transactions SAVINGS)
- Tracker progression
- Marquer comme "Atteint" (déplace à `objectif_atteints`)

### 4. Transactions Récurrentes
- Configurer transactions qui se répètent (mensuel, annuel)
- Automatisation via `recurring_worker.php`
- Plan de paiement pour objectifs

### 5. Statistiques
- Épargne mensuelle
- Distribution par catégorie
- Tendances
- Mind-map des données

### 6. Profil Utilisateur
- Avatar
- Nom, email
- Changement mot de passe

### 7. Conversion Devise
- EUR ↔ XOF (1 EUR = 655.957 XOF)
- Taux statique dans `config.php`

---

## 🔄 Workflows Importants

### Workflow: Création d'Objectif d'Épargne
```
1. Utilisateur accède à "Objectifs" tab
2. Clique "Créer objectif"
3. Choisit une sous-catégorie (ex: "Téléphone")
4. Entre montant cible (500€)
5. Clique "Créer"
   ↓
6. API: add_goal.php
   - INSERT INTO objectif_crees (user_id, id_subcategory, montant)
7. Frontend affiche objectif dans la liste
8. Utilisateur ajoute des transactions "SAVINGS" (type 3)
   ↓
9. get_objectifs_crees.php calcule:
   - Montant réuni = SUM(transactions WHERE id_type=3 AND goal_id=this_objectif)
   - Progrès = (réuni / montant_cible) * 100
10. Si progrès >= 100%, bouton "Marquer comme atteint"
11. Click → update_objectif.php ou move to objectif_atteints
```

### Workflow: Transactions Récurrentes
```
1. Utilisateur ajoute "Transaction Récurrente"
   - Loyer: 600€, chaque mois, prochain: 2026-02-01
2. INSERT INTO recurring_transactions
3. La nuit: `recurring_worker.php` (CRON job)
   - SELECT * FROM recurring_transactions WHERE next_occurrence <= TODAY
   - INSERT INTO transactions (auto-créé)
   - UPDATE recurring_transactions SET next_occurrence += 1 month
4. Frontend voit la transaction créée automatiquement
```

---

## 🛠️ Configuration & Déploiement

### Configuration
- **Config locale**: `API/config.local.php` (gitignored)
- **Env vars**: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS
- **Défauts**: InfinityFree (sql107.infinityfree.com)

### Frontend Build
```bash
npm run dev      # Développement (Vite)
npm run build    # Production
```

### Backend
- Aucune build nécessaire (PHP interprété)
- CORS et authentification configurées automatiquement

### Base de Données
- Dump initial: `BASE DE DONNEES/if0_40680976_suivi_depenses.sql`
- Migrations: `deploy/migrations/` (ex: suppression tables legacy `coffre_*`)

---

## 📊 Types de Données Clés

### Type de Transaction (`transaction_types`)
- **1** = Dépense (EXPENSE)
- **2** = Revenu (INCOME)
- **3** = Épargne (SAVINGS)

### État Transaction
- `id_type` = 1 → Dépense
- `id_type` = 2 → Revenu
- `id_type` = 3 → Épargne (si associé à `goal_id`)

---

## 🎯 Points Clés à Retenir

1. **Architecture**: Fetch-based (pas de Redux, Context API léger)
2. **Authentification**: Sessions PHP côté serveur
3. **DB**: Bien normalisée, contraintes FK en place
4. **Transactions Récurrentes**: Automatisées par cron
5. **Objectifs**: Agrégation au niveau DB avec LEFT JOIN
6. **Fichiers**: Uploads stockés en `/uploads/`, refs en DB
7. **Migrations**: Support du legacy (coffre_* en dépréciage)
8. **Devise**: EUR/XOF centralisé dans `config.php`

---

## 📚 Fichiers de Référence Rapide

| Concept | Fichiers |
|---------|----------|
| **Auth** | auth.php, login.php, register.php |
| **Transactions** | add/get/update/delete_transaction.php |
| **Objectifs** | add_goal.php, get_objectifs_crees.php, update_objectif.php |
| **Categories** | get_categories.php, add_category.php, get_subcategories.php |
| **Frontend Main** | src/app/App.tsx |
| **API Client** | src/services/api.ts |
| **DB Schema** | BASE DE DONNEES/if0_40680976_suivi_depenses.sql |
| **Config** | API/config.php |

---

## 🚀 Prochaines Étapes / Améliorations Possibles

- [ ] Migration complète: supprimer tables legacy `coffre_*`
- [ ] Tests automatisés (frontend + backend)
- [ ] Rate limiting API
- [ ] Cache HTTP (ETag, Last-Modified)
- [ ] Pagination pour listes longues
- [ ] Web Workers pour calculs lourds
- [ ] Internationalization (i18n)

