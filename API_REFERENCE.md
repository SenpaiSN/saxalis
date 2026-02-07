# 📡 Référence API Complète - SaXalis

## Overview
- **Base URL:** `/API/`
- **Content-Type:** `application/json`
- **Credentials:** `include` (cookies)
- **Response:** `{ success: boolean, data?: any, error?: string }`

---

## Authentification

### POST /API/login.php
**Connexion utilisateur**
```json
// Request
{
  "username": "user@example.com",
  "password": "password123"
}

// Response (200)
{
  "success": true,
  "data": {
    "id_utilisateur": 1,
    "username": "user@example.com",
    "email": "user@example.com",
    "avatar": "path/to/avatar.jpg"
  }
}

// Response (401)
{
  "success": false,
  "error": "Invalid credentials"
}
```

### POST /API/register.php
**Inscription nouvel utilisateur**
```json
// Request
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "password123",
  "currency": "EUR"
}

// Response (201)
{
  "success": true,
  "data": { "id_utilisateur": 2 }
}
```

### POST /API/logout.php
**Déconnexion**
```
GET /API/logout.php → Destroy session
Response: { "success": true }
```

### GET /API/check_session.php
**Vérifier session active**
```json
// Response
{
  "success": true,
  "authenticated": true,
  "user_id": 1
}
```

### GET /API/get_user.php
**Récupérer données user courant**
```json
{
  "success": true,
  "data": {
    "id_utilisateur": 1,
    "username": "user@example.com",
    "email": "user@example.com",
    "avatar": "uploads/avatars/1.jpg",
    "currency": "EUR",
    "created_at": "2024-01-15"
  }
}
```

---

## CSRF

### GET /API/get_csrf_token.php
**Obtenir token CSRF pour POSTs**
```json
{
  "success": true,
  "data": {
    "csrf_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "expires_in": 86400
  }
}
```

---

## Transactions

### GET /API/get_transactions.php
**Récupérer toutes transactions de l'user**
```json
{
  "success": true,
  "transactions": [
    {
      "id_transaction": 1,
      "date": "2024-01-15",
      "amount": 50.00,
      "currency": "EUR",
      "amount_eur": 50.00,
      "id_type": 1,
      "type": "expense",
      "id_category": 5,
      "category": "Alimentation",
      "id_subcategory": 12,
      "subCategory": "Épicerie",
      "subcategory_icon": "🛒",
      "is_fixed": false,
      "notes": "Carrefour",
      "invoices": "uploads/invoices/1.jpg"
    }
  ]
}
```

### POST /API/add_transaction.php
**Créer nouvelle transaction**
```json
// Request
{
  "csrf_token": "<token>",
  "Date": "2024-01-15",
  "Type": "expense",
  "id_type": 1,
  "Montant": 50.00,
  "currency": "EUR",
  "category_id": 5,
  "subcategory_id": 12,
  "Notes": "Courses supermarché",
  "goal_id": null
}

// Response (201)
{
  "success": true,
  "data": {
    "id_transaction": 101,
    "date": "2024-01-15",
    "amount": 50.00
  }
}
```

### POST /API/add_transaction_with_invoice.php
**Créer transaction avec facture scannée**
```json
// Request (multipart/form-data)
{
  "csrf_token": "<token>",
  "Date": "2024-01-15",
  "Type": "expense",
  "id_type": 1,
  "Montant": 50.00,
  "currency": "EUR",
  "category_id": 5,
  "subcategory_id": 12,
  "Notes": "Facture Carrefour",
  "invoice": <File>  // multipart binary
}

// Response
{
  "success": true,
  "data": {
    "id_transaction": 102,
    "invoice_path": "uploads/invoices/2024/01/receipt_12345.jpg"
  }
}
```

### POST /API/update_transaction.php
**Mettre à jour transaction**
```json
// Request
{
  "csrf_token": "<token>",
  "id_transaction": 101,
  "Date": "2024-01-16",
  "Montant": 55.00,
  "category_id": 6,
  "Notes": "Update notes"
}

// Response
{
  "success": true,
  "data": { "id_transaction": 101 }
}
```

### POST /API/delete_transaction.php
**Supprimer transaction**
```json
// Request
{
  "csrf_token": "<token>",
  "id_transaction": 101
}

// Response
{
  "success": true
}
```

### POST /API/delete_all_transactions.php
**Supprimer toutes les transactions (DEBUG)**
```
POST /API/delete_all_transactions.php?confirm=1
Response: { "success": true, "deleted": 42 }
```

---

## Types de Transactions

### GET /API/get_transaction_types.php
**Récupérer types (expense, income, savings)**
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

### POST /API/add_type.php
**Créer nouveau type (admin)**
```json
// Request
{
  "csrf_token": "<token>",
  "code": "custom",
  "label": "Type personnalisé"
}

// Response
{
  "success": true,
  "data": { "id_type": 4 }
}
```

### POST /API/update_type.php
**Modifier type**
```json
// Request
{
  "csrf_token": "<token>",
  "id_type": 1,
  "label": "Dépenses courantes"
}

// Response
{ "success": true }
```

### POST /API/delete_type.php
**Supprimer type**
```json
// Request
{
  "csrf_token": "<token>",
  "id_type": 4
}

// Response
{ "success": true }
```

---

## Catégories

### POST /API/get_categories.php
**Récupérer catégories (filtrées par type)**
```json
// Request (optionnel)
{
  "id_type": 1  // optionnel, filter par type
}

// Response
{
  "success": true,
  "categories": [
    { "id_category": 5, "name": "Alimentation" },
    { "id_category": 6, "name": "Transport" }
  ]
}
```

### POST /API/add_category.php
**Créer catégorie**
```json
// Request
{
  "csrf_token": "<token>",
  "id_type": 1,
  "name": "Loisirs"
}

// Response
{
  "success": true,
  "data": { "id_category": 7 }
}
```

### POST /API/update_category.php
**Modifier catégorie**
```json
// Request
{
  "csrf_token": "<token>",
  "id_category": 5,
  "name": "Alimentation & boissons"
}

// Response
{ "success": true }
```

### POST /API/delete_category.php
**Supprimer catégorie**
```json
// Request
{
  "csrf_token": "<token>",
  "id_category": 7
}

// Response
{ "success": true }
```

### GET /API/search_categories.php
**Rechercher catégories**
```
GET /API/search_categories.php?q=alim
Response: { "success": true, "categories": [...] }
```

---

## Sous-catégories

### GET /API/get_subcategories.php
**Récupérer sous-catégories**
```
GET /API/get_subcategories.php?category_id=5
Response: {
  "success": true,
  "subcategories": [
    { "id_subcategory": 12, "name": "Épicerie", "icon": "🛒", "is_fixed": false },
    { "id_subcategory": 13, "name": "Restaurant", "icon": "🍽️", "is_fixed": false }
  ]
}
```

### POST /API/add_subcategory.php
**Créer sous-catégorie**
```json
// Request
{
  "csrf_token": "<token>",
  "category_id": 5,
  "name": "Fruits & légumes",
  "icon": "🥕",
  "is_fixed": false
}

// Response
{ "success": true, "data": { "id_subcategory": 14 } }
```

### POST /API/update_subcategory.php
**Modifier sous-catégorie**
```json
// Request
{
  "csrf_token": "<token>",
  "id_subcategory": 12,
  "name": "Épicerie & magasin",
  "icon": "🛒",
  "is_fixed": 0
}

// Response
{ "success": true }
```

### POST /API/delete_subcategory.php
**Supprimer sous-catégorie**
```json
// Request
{
  "csrf_token": "<token>",
  "id_subcategory": 14
}

// Response
{ "success": true }
```

---

## Budgets

### POST /API/get_budgets.php
**Récupérer budgets utilisateur**
```json
// Request (optionnel)
{
  "month": "2024-01",
  "category_id": 5
}

// Response
{
  "success": true,
  "budgets": [
    {
      "budget_id": 1,
      "category_id": 5,
      "category_name": "Alimentation",
      "montant": 500.00,
      "month": "2024-01",
      "spent": 320.00
    }
  ]
}
```

### POST /API/add_category_budget.php
**Créer budget pour catégorie**
```json
// Request
{
  "csrf_token": "<token>",
  "category_id": 5,
  "montant": 500.00,
  "month": "2024-01"
}

// Response
{ "success": true, "data": { "budget_id": 1 } }
```

### POST /API/get_category_budget.php
**Récupérer détail budget**
```json
// Request
{
  "category_id": 5,
  "month": "2024-01"
}

// Response
{
  "success": true,
  "data": {
    "budget_id": 1,
    "montant": 500.00,
    "spent": 320.00,
    "remaining": 180.00,
    "percentage_used": 64
  }
}
```

---

## Objectifs d'épargne (Goals)

### GET /API/get_goals.php
**Récupérer tous les objectifs créés**
```json
{
  "success": true,
  "goals": [
    {
      "id": 1,
      "nom": "Vacances Maroc",
      "montant_objectif": 5000.00,
      "date_creation": "2024-01-01",
      "montant_depose": 2500.00,
      "reste": 2500.00,
      "total_deposits": 2500.00,
      "total_withdrawn": 0.00
    }
  ]
}
```

### POST /API/add_goal.php
**Créer nouvel objectif d'épargne**
```json
// Request
{
  "csrf_token": "<token>",
  "nom": "Achat voiture",
  "montant": 15000.00,
  "currency": "EUR"
}

// Response
{
  "success": true,
  "data": {
    "id_objectif": 2,
    "id_subcategory": 50  // Créée automatiquement
  }
}
```

### POST /API/add_goal_transaction.php
**Ajouter dépôt/épargne vers objectif**
```json
// Request
{
  "csrf_token": "<token>",
  "goal_id": 1,
  "montant": 500.00,
  "currency": "EUR",
  "date": "2024-01-20"
}

// Response
{ "success": true, "data": { "id_transaction": 103 } }
```

### POST /API/add_goal_withdrawal.php
**Retirer montant du objectif**
```json
// Request
{
  "csrf_token": "<token>",
  "goal_id": 1,
  "montant": 100.00,
  "currency": "EUR"
}

// Response
{ "success": true, "data": { "id_transaction": 104 } }
```

### POST /API/delete_goal.php
**Supprimer objectif**
```json
// Request
{
  "csrf_token": "<token>",
  "id_objectif": 2
}

// Response
{ "success": true }
```

### POST /API/transfer_goal.php
**Transférer solde entre objectifs**
```json
// Request
{
  "csrf_token": "<token>",
  "from_goal_id": 1,
  "to_goal_id": 2,
  "montant": 500.00
}

// Response
{ "success": true }
```

### GET /API/current_goal.php
**Récupérer objectif courant (primary)**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nom": "Vacances Maroc",
    "montant_objectif": 5000.00
  }
}
```

### POST /API/add_goal_plan.php
**Créer plan d'épargne automatique**
```json
// Request
{
  "csrf_token": "<token>",
  "goal_id": 1,
  "montant_par_periode": 200.00,
  "frequence": "monthly",
  "date_debut": "2024-02-01"
}

// Response
{ "success": true, "data": { "plan_id": 3 } }
```

### GET /API/get_goal_plans.php
**Récupérer plans d'épargne**
```json
{
  "success": true,
  "plans": [
    {
      "id": 3,
      "goal_id": 1,
      "montant_par_periode": 200.00,
      "frequence": "monthly",
      "next_occurrence": "2024-02-01"
    }
  ]
}
```

### POST /API/run_goal_plans.php
**Exécuter plans (appel cron)**
```json
// Pas de body, backend génère auto
{
  "success": true,
  "data": {
    "executed": 2,
    "transactions_created": [103, 104]
  }
}
```

---

## Transactions Récurrentes

### GET /API/get_recurring_transactions.php
**Lister transactions récurrentes**
```json
{
  "success": true,
  "recurring": [
    {
      "plan_id": 1,
      "description": "Loyer",
      "montant": 800.00,
      "frequence": "monthly",
      "next_date": "2024-02-01"
    }
  ]
}
```

### POST /API/add_recurring_transaction.php
**Créer transaction récurrente**
```json
// Request
{
  "csrf_token": "<token>",
  "category_id": 8,
  "montant": 800.00,
  "frequency": "monthly",
  "description": "Loyer",
  "start_date": "2024-01-01"
}

// Response
{ "success": true, "data": { "plan_id": 2 } }
```

### POST /API/run_recurring_transactions.php
**Exécuter récurrences (cron)**
```json
{
  "success": true,
  "data": {
    "created": 3,
    "next_run": "2024-02-01"
  }
}
```

---

## Coffres-forts (Safes)

### GET /API/get_coffre_depots.php
**Récupérer coffres "dépôts"**
```json
{
  "success": true,
  "depots": [
    {
      "id": 1,
      "nom": "Caisse d'épargne",
      "montant": 10000.00,
      "date_creation": "2024-01-01"
    }
  ]
}
```

### GET /API/get_coffre_projets.php
**Récupérer coffres "projets"**
```json
{
  "success": true,
  "projets": [
    {
      "id": 1,
      "nom": "Projet rénovation maison",
      "montant": 25000.00,
      "date_creation": "2024-01-01"
    }
  ]
}
```

### POST /API/add_depot_coffre.php
**Créer dépôt**
```json
// Request
{
  "csrf_token": "<token>",
  "nom": "Livret A",
  "montant": 5000.00
}

// Response
{ "success": true, "data": { "id": 2 } }
```

### POST /API/add_projet_coffre.php
**Créer projet**
```json
// Request
{
  "csrf_token": "<token>",
  "nom": "Extension maison",
  "montant": 50000.00
}

// Response
{ "success": true, "data": { "id": 2 } }
```

---

## Analyse & Statistiques

### GET /API/get_monthly_savings.php
**Récupérer épargne mensuelle**
```
GET /API/get_monthly_savings.php?month=2024-01
Response: {
  "success": true,
  "data": {
    "month": "2024-01",
    "income": 3000.00,
    "expenses": 2000.00,
    "savings": 1000.00,
    "savings_rate": 33.33
  }
}
```

### POST /API/goals_monthly.php
**Bilan mensuel objectifs**
```json
// Request
{
  "month": "2024-01"
}

// Response
{
  "success": true,
  "data": {
    "total_planned": 1000.00,
    "total_accumulated": 800.00,
    "goals": [...]
  }
}
```

### POST /API/get_mindmap_data.php
**Données pour mindmap (dépenses hiérarchiques)**
```json
{
  "success": true,
  "data": {
    "total": 2000.00,
    "categories": [
      {
        "name": "Alimentation",
        "amount": 500.00,
        "subcategories": [
          { "name": "Épicerie", "amount": 300.00 }
        ]
      }
    ]
  }
}
```

### GET /API/get_objectifs_atteints.php
**Objectifs complétés**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nom": "Vacances 2023",
      "montant": 5000.00,
      "date_completion": "2023-08-15"
    }
  ]
}
```

---

## Profil & Préférences

### POST /API/update_user_profile.php
**Mettre à jour profil**
```
POST /API/update_user_profile.php (multipart/form-data)
{
  "csrf_token": "<token>",
  "username": "newusername",
  "email": "new@example.com",
  "avatar": <File>  // optionnel
}

Response: { "success": true }
```

### POST /API/update_password.php
**Changer mot de passe**
```json
// Request
{
  "csrf_token": "<token>",
  "current_password": "oldpass123",
  "new_password": "newpass123"
}

// Response
{ "success": true }
```

### POST /API/update_user_pref.php
**Mettre à jour préférences**
```json
// Request
{
  "csrf_token": "<token>",
  "currency": "XOF"
}

// Response
{ "success": true }
```

### POST /API/upload_avatar.php
**Upload avatar (multipart)**
```
POST /API/upload_avatar.php
{
  "csrf_token": "<token>",
  "avatar": <File>
}

Response: {
  "success": true,
  "data": { "avatar_path": "uploads/avatars/user_1.jpg" }
}
```

---

## OCR & Factures

### POST /API/ocr_feedback.php
**Enregistrer feedback OCR (pour ML)**
```json
// Request
{
  "csrf_token": "<token>",
  "action": "accepted",  // ou "overridden"
  "full_text": "Carrefour\nTotal: 50.00€",
  "merchant": "Carrefour",
  "invoice_hash": "sha256hash...",
  "suggested_amount": 50.00,
  "applied_amount": 50.00,
  "suggested_category": "Alimentation",
  "applied_category": "Alimentation",
  "candidates": [
    { "raw": "50,00", "value": 50.00, "score100": 95 }
  ],
  "meta": { "via": "confirm_button" }
}

// Response
{ "success": true }
```

### GET /API/export_ocr_feedback.php
**Exporter data OCR (training data)**
```
GET /API/export_ocr_feedback.php
Response: CSV stream
```

---

## Utilitaires

### POST /API/convert_currency.php
**Convertir montant entre devises**
```json
// Request
{
  "amount": 50.00,
  "from": "EUR",
  "to": "XOF"
}

// Response
{
  "success": true,
  "data": {
    "original_amount": 50.00,
    "original_currency": "EUR",
    "converted_amount": 32797.85,
    "target_currency": "XOF",
    "rate": 655.957
  }
}
```

---

## Erreurs HTTP Standard

| Code | Signification |
|------|---------------|
| **200** | Succès (GET) |
| **201** | Créé (POST) |
| **204** | No Content (DELETE) |
| **400** | Bad Request (validation) |
| **401** | Unauthorized (auth needed) |
| **403** | Forbidden (CSRF invalid) |
| **404** | Not Found |
| **500** | Server Error |

---

## Exemple complèt: Ajouter transaction avec facture

```bash
#!/bin/bash

# 1. Obtenir token CSRF
CSRF=$(curl -s http://localhost:8888/SaXalis/API/get_csrf_token.php | jq -r '.data.csrf_token')

# 2. Upload avec facture
curl -X POST http://localhost:8888/SaXalis/API/add_transaction_with_invoice.php \
  -H "Accept: application/json" \
  -b "PHPSESSID=..." \
  -F "csrf_token=$CSRF" \
  -F "Date=2024-01-15" \
  -F "Type=expense" \
  -F "id_type=1" \
  -F "Montant=50.00" \
  -F "currency=EUR" \
  -F "category_id=5" \
  -F "subcategory_id=12" \
  -F "Notes=Carrefour" \
  -F "invoice=@/path/to/receipt.jpg"

# 3. Enregistrer feedback OCR
curl -X POST http://localhost:8888/SaXalis/API/ocr_feedback.php \
  -H "Content-Type: application/json" \
  -b "PHPSESSID=..." \
  -d '{
    "csrf_token": "'$CSRF'",
    "action": "accepted",
    "merchant": "Carrefour",
    "invoice_hash": "...",
    "suggested_amount": 50.00,
    "applied_amount": 50.00,
    "suggested_category": "Alimentation",
    "applied_category": "Alimentation",
    "candidates": [{"raw": "50.00", "value": 50.00, "score100": 99}]
  }'
```

---

**Référence API complète** | SaXalis v1.0 | 26 janvier 2026
