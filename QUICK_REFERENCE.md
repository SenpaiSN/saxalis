# 📋 Quick Reference - SaXalis

## Informations essentielles

| Aspect | Détail |
|--------|--------|
| **Domaine** | https://saxalis.free.nf |
| **Type** | SPA financière (React + PHP) |
| **ORM** | PDO (raw SQL) |
| **Authentification** | Session PHP |
| **Port dev** | 5173 (Vite) + 8888 (MAMP) |
| **Devise canonique** | XOF (Franc CFA) |
| **Base de données** | MySQL/MariaDB (UTF8MB4) |
| **Build tool** | Vite 6.4.1 |
| **React version** | 18.3.1 |
| **PHP version** | 7.4+ |

---

## Stack résumé

```
Frontend:  React 18 + TypeScript + Vite
           TailwindCSS + Radix UI + Recharts
Client:    PDF→Image (pdfjs), OCR (Tesseract/Mindee)

Backend:   PHP (80+ endpoints)
           MySQL/MariaDB (PDO)
           CSRF tokens + Session auth

Infrastructure: MAMP (local) ou VPS (prod)
```

---

## 📁 Dossiers à connaître

| Dossier | Contenu |
|---------|---------|
| `/src/app/` | Composants React + contextes |
| `/src/services/` | Client HTTP (`api.ts`) |
| `/src/lib/` | Utilitaires (OCR, PDF, devise) |
| `/API/` | Endpoints PHP (~80) |
| `/uploads/` | Fichiers utilisateurs (factures) |
| `/docs/` | Documentation (optionnel) |

---

## 🔧 Endpoints API (par type)

### Transactions
- `GET /API/get_transactions.php`
- `POST /API/add_transaction.php`
- `POST /API/update_transaction.php`
- `POST /API/delete_transaction.php`

### Catégories & Types
- `GET /API/get_transaction_types.php`
- `POST /API/get_categories.php`
- `GET /API/get_subcategories.php`
- `POST /API/add_category.php`
- `POST /API/add_subcategory.php`

### Objectifs d'épargne
- `GET /API/get_goals.php`
- `POST /API/add_goal.php`
- `POST /API/add_goal_transaction.php`
- `POST /API/delete_goal.php`

### Budgets
- `POST /API/get_budgets.php`
- `POST /API/add_category_budget.php`

### Analyse
- `GET /API/get_monthly_savings.php`
- `POST /API/get_mindmap_data.php`

### Auth & Profil
- `POST /API/login.php`
- `POST /API/register.php`
- `POST /API/logout.php`
- `POST /API/update_user_profile.php`
- `POST /API/update_password.php`

### OCR
- `POST /API/add_transaction_with_invoice.php`
- `POST /API/ocr_feedback.php`

### Sécurité
- `GET /API/get_csrf_token.php`

---

## 🎯 Pages principales (Onglets)

| Onglet | Composant | URL | Rôle |
|--------|-----------|-----|------|
| Dashboard | Dashboard.tsx | / | Résumé financier du mois |
| Ajouter | AjouterTransaction + ReceiptScanner | /add | Créer transaction (manual + OCR) |
| Transactions | TransactionsModern.tsx | /transactions | Liste + filtres + édition |
| Stats | StatsRebuilt.tsx | /stats | Analyse dépenses/revenus/budgets |
| Objectifs | Objectifs.tsx | /goals | Gestion épargne goals |
| Profil | ProfilModern.tsx | /profile | Données user + préférences |

---

## 🔐 Sécurité en résumé

```
Session PHP          →  Authan authentification
CSRF Tokens         →  Protection POST
Input Validation    →  Prevent injection
CORS Whitelist      →  Prevent cross-origin abuse
Password Hashing    →  password_hash() PHP
HTTP 401/403        →  Non-auth / CSRF fail
```

---

## 💱 Multi-devise

```
Stockage:      XOF (canonique)
Affichage:     Selon user.currency (EUR ou XOF)
Conversion:    EUR ↔ XOF (taux: 655.957)
Euro backup:   Montant_eur sauvegardé pour historique
```

---

## 🧩 Composants clés à modifier

| Composant | Pour ajouter |
|-----------|-------------|
| Dashboard | Nouvelles cartes KPI |
| TransactionsModern | Colonnes/filtres supplémentaires |
| StatsRebuilt | Graphiques/analyses |
| ReceiptScannerModal | Intégrations OCR perso |
| Filters | Nouveaux critères de filtrage |
| ProfilModern | Options user supplémentaires |

---

## 🌐 Flow d'authentification

```
1. User input username/password
2. LoginModal → POST /API/login.php
3. Backend: password_verify()
4. Set $_SESSION['user']
5. Return: user_id + token CSRF
6. React: setIsAuthenticated(true)
7. Tous les 80+ endpoints: require_auth()
```

---

## 🛠️ Commandes démarrage rapide

```bash
npm install                    # Deps
cp API/config.local.example.php API/config.local.php
# Éditer config.local.php avec credentials DB
npm run dev                    # Dev server Vite
# MAMP: Start Servers → API sur http://localhost:8888
npm run build                  # Production build
npm run test                   # Vitest
```

---

## 📊 Flux OCR simplified

```
1. User upload image/PDF
2. Convert PDF → PNG (si needed)
3. Tesseract.js ou Mindee API: extract montant + commerçant
4. User valide/corrigue
5. POST /API/add_transaction_with_invoice.php + fichier
6. POST /API/ocr_feedback.php (marketing/ML training)
```

---

## 🐛 Déboguer rapidement

| Problème | Check |
|----------|-------|
| API non accessible | `VITE_API_BASE_URL` correct ? |
| Session expirée | Refaire login |
| CSRF invalid | Token expiré? Recharger page |
| Transactions manquantes | Filtre masque? localStorage OK? |
| OCR lent | Tesseract download 60-80MB first time |
| Erreur 500 | Logs: `tail -f API/login.log` |

---

## 📈 Escalabilité future

- **Cash**: Ajouter Redis pour sessions
- **Queue**: Sidekiq pour OCR async
- **CDN**: CloudFlare pour assets
- **Monitoring**: Sentry pour errors (prod)
- **Load**: Nginx + PHP-FPM (cluster)

---

## ✅ Checklist dev rapide

- [ ] Node.js 16+ installé
- [ ] MAMP/PHP 7.4+ running
- [ ] MySQL accessible
- [ ] `.env.local` avec VITE_API_BASE_URL
- [ ] `API/config.local.php` avec creds DB
- [ ] `npm install` complété
- [ ] `npm run dev` running
- [ ] http://localhost:5173 accessible
- [ ] Login works
- [ ] Transactions load

---

## 🔗 Fichiers clés à monitor

| Fichier | Raison |
|---------|--------|
| `src/app/App.tsx` | State management principal |
| `src/services/api.ts` | Tous les appels API |
| `API/config.php` | Config CORS, DB, devises |
| `API/auth.php` | Session validation |
| `API/security.php` | Input validation + CSRF |
| `API/migrations/` | Schema changes |

---

## 📞 Support commandes

```bash
# Phoenix redémarrage
npm run build && npm run dev

# Clear cache
rm -rf node_modules/.vite
npm install

# DB check
php -r "require 'API/config.php'; echo 'DB OK\n';"

# Test API
curl http://localhost:8888/SaXalis/API/get_csrf_token.php

# Logs en temps réel
tail -f API/login.log
```

---

## 🎓 Faits importants

- **State management:** App.tsx lift state (sans Redux)
- **Filtres:** Partagés entre Dashboard/Transactions/Stats
- **Devises:** Toutes stockées en XOF en DB
- **Factures:** Stockées dans `/uploads/` + paths sauvegardés
- **Récurrence:** Worker auto-génère transactions
- **Budgets:** Par catégorie, mensuel
- **OCR:** Peut être local (Tesseract) ou cloud (Mindee)

---

## 🎯 Cas d'usage courants

**Ajouter transaction manuelle:**
1. Click "Ajouter"
2. Remplir form
3. Select catégorie/sous-catégorie
4. Button "Valider"
→ POST /API/add_transaction.php

**Scanner facture:**
1. Click "Ajouter"
2. Click "Scanner facture"
3. Upload image/PDF
4. OCR extrait montant/date
5. User corruge si needed
6. Button "Confirmer"
→ POST /API/add_transaction_with_invoice.php

**Analyser dépenses:**
1. Click "Stats"
2. Vérifier filtres (mois/année/catégorie)
3. Voir graphiques + KPIs
4. Cliquer cartes pour détails

**Créer objectif épargne:**
1. Click "Objectifs"
2. Button "Créer objectif"
3. Entrer montant + nom
4. Click "Créer"
→ POST /API/add_goal.php (crée subcategory dédiée)

---

**Document généré:** 26 janvier 2026 | SaXalis v1.0
