# 🎯 Règle Métier : Retrait de Fonds d'Objectifs

## Vue d'ensemble

Lorsque vous utilisez la fonctionnalité **"Retirer des fonds"** sur un objectif en cours, le système applique une règle métier spécifique pour gérer l'épargne et les transactions.

---

## 📊 Flux du Retrait

```
Objectif "Achat voiture" (5000€ cible)
├─ Dépôts : 1500€ (id_type=3)
├─ Retraits antérieurs : 200€ (id_type=1)
└─ Disponible : 1500 - 200 = 1300€

► Retrait de 300€
   ├─ Validation : 300€ ≤ 1300€ ✅ Accepté
   └─ Création transaction : type="Dépense" (id_type=1, goal_id=1)
      └─ Nouvel solde : 1300 - 300 = 1000€
```

---

## 🔧 Règles Détaillées

### 1. **Calcul des fonds disponibles**

```sql
Fonds disponibles = Somme(dépôts) - Somme(retraits)
```

**Dépôts :** toutes les transactions avec `id_type = 3` dans la sous-catégorie liée à l'objectif  
**Retraits :** toutes les transactions avec `id_type = 1` **et** `goal_id = id_objectif`

### Exemple (database)
```sql
-- Dépôts
SELECT COALESCE(SUM(Montant), 0) FROM transactions 
WHERE subcategory_id = 50 AND id_type = 3 AND id_utilisateur = 7;
-- Résultat : 1500€

-- Retraits antérieurs
SELECT COALESCE(SUM(Montant), 0) FROM transactions 
WHERE goal_id = 1 AND id_type = 1 AND id_utilisateur = 7;
-- Résultat : 200€

-- Disponible : 1500 - 200 = 1300€
```

### 2. **Validation du montant**

```
Si montant_retrait > montant_disponible
   → HTTP 400 Bad Request
   → Message : "Fonds insuffisants sur cet objectif"
   → Inclut : available (montant réellement disponible)
```

**Côté frontend :** Le modal affiche un message d'erreur, pas de transaction créée.

### 3. **Création de la transaction de retrait**

Quand le retrait est approuvé :

| Champ | Valeur |
|-------|--------|
| **id_type** | 1 (Dépense) ou selon sélection |
| **goal_id** | id_objectif (référence à l'objectif) |
| **category_id** | Optionnel (choisi par l'utilisateur) |
| **subcategory_id** | Optionnel (choisi par l'utilisateur) |
| **Montant** | Montant saisi (positif) |
| **Type** | "expense" ou selon code du type |
| **Notes** | "Retrait objectif #1" ou notes saisies |
| **Date** | Aujourd'hui (UTC) ou date saisie |

### SQL d'insertion
```sql
INSERT INTO transactions 
(id_utilisateur, id_type, Date, Type, category_id, subcategory_id, 
 Montant, Notes, goal_id, currency, Montant_eur) 
VALUES 
(:uid, :idType, :date, :typeCode, :catId, :subcatId, 
 :montant, :notes, :goal_id, 'EUR', :montant_eur)
```

---

## 🎛️ Interface Utilisateur (Frontend)

### Modal "Retirer des fonds"

**Champs obligatoires :**
- **Montant** : montant à retirer (validé > 0)

**Champs optionnels :**
- **Type** : par défaut "Dépense" (id_type=1), liste déroulante
- **Catégorie** : charge optionnelle
- **Sous-catégorie** : charge optionnelle
- **Notes** : commentaire libre (ex: "Réparation voiture")

**Comportement :**
1. Saisir montant
2. Choisir optionnellement type, catégorie, sous-catégorie
3. Cliquer "Retirer"
4. Le serveur valide les fonds disponibles
5. Si ok → transaction créée + fermeture modal + rechargement liste d'objectifs
6. Si erreur → affichage message d'erreur (ex: "Fonds insuffisants")

---

## 📋 Exemple Concret

### Scénario
- **Objectif** : "Vacances Maroc" (2000€)
- **Dépôts effectués** : 1500€ en janvier, 300€ en février = **1800€**
- **Retrait antérieur** : 100€ en novembre = **100€**
- **Disponible** : 1800 - 100 = **1700€**

### Retrait de 500€
```
POST /API/add_goal_withdrawal.php

{
  "csrf_token": "abc123...",
  "goal_id": 1,
  "montant": 500.00,
  "id_type": 1,
  "category_id": 2,          // Optionnel : "Loisirs"
  "subcategory_id": 15,      // Optionnel : "Restaurant"
  "notes": "Annulation partielle"
}

Réponse succès :
{
  "success": true,
  "transaction_id": 150
}

Résultat :
- Nouvelle transaction créée (id_transaction=150)
  - Montant : 500€
  - Type : Dépense (id_type=1)
  - goal_id = 1 (lié à l'objectif)
  - Date : 2026-01-29
- Nouveau solde disponible : 1700 - 500 = 1200€
- Mise à jour du progrès : 1300€ / 2000€ = 65%
```

---

## ⚠️ Cas d'Erreur

### 1. Fonds insuffisants
```
POST /API/add_goal_withdrawal.php
{
  "goal_id": 1,
  "montant": 2000.00  // Plus que disponible (1700€)
}

Réponse :
HTTP 400
{
  "success": false,
  "error": "Fonds insuffisants sur cet objectif",
  "available": 1700.00
}
```

### 2. Objectif inexistant
```
HTTP 404
{
  "success": false,
  "error": "Objectif introuvable"
}
```

### 3. Accès refusé (pas le propriétaire)
```
HTTP 403
{
  "success": false,
  "error": "Accès refusé"
}
```

### 4. Paramètres invalides
```
HTTP 400
{
  "success": false,
  "error": "Paramètres invalides"
}
```

---

## 🔗 Relation avec le Solde Total

### Impact sur le solde global

Un retrait de fonds **déduit de votre solde total** car :

1. **Création transaction** : type="Dépense" (id_type=1)
2. **Formule du solde** : `Revenus - Dépenses - Épargne`
3. **Effet** : le retrait augmente les dépenses → **réduit le solde**

**Exemple :**
- Solde avant : 230€ (revenus 2400€ - dépenses 2169,50€ - épargne 0€)
- Retrait objectif : 100€
- Solde après : 130€ (revenus 2400€ - dépenses 2269,50€ - épargne 0€)

---

## 📂 Fichiers Concernés

### Backend (API)
- [API/add_goal_withdrawal.php](API/add_goal_withdrawal.php) — endpoint retrait
- [API/config.php](API/config.php) — config DB
- [API/auth.php](API/auth.php) — authentification

### Frontend (UI)
- [src/app/components/WithdrawFromGoalModal.tsx](src/app/components/WithdrawFromGoalModal.tsx) — modal retrait
- [src/app/components/Objectifs.tsx](src/app/components/Objectifs.tsx) — page objectifs
- [src/services/api.ts](src/services/api.ts) — fonction `withdrawFromGoal()`

### Database
- **Table** `objectif_crees` — définition objectifs
- **Table** `transactions` — enregistrement retraits
  - `id_type = 1` (Dépense)
  - `goal_id` = id de l'objectif

---

## 🧪 Test Manual

```bash
# 1. Créer un objectif de 1000€
POST /API/add_goal.php
{ "nom": "Test", "montant_objectif": 1000 }
# Réponse : goal_id = 5

# 2. Faire un dépôt de 500€
POST /API/add_goal_transaction.php
{ "goal_id": 5, "montant": 500 }

# 3. Tenter retrait de 600€ (devrait échouer)
POST /API/add_goal_withdrawal.php
{ "goal_id": 5, "montant": 600 }
# Réponse : "Fonds insuffisants, available: 500"

# 4. Retrait de 300€ (succès)
POST /API/add_goal_withdrawal.php
{ "goal_id": 5, "montant": 300 }
# Réponse : success=true, transaction_id=X

# 5. Vérifier : nouveau solde = 500 - 300 = 200€
SELECT SUM(Montant) FROM transactions WHERE goal_id=5 AND id_type=1
# Résultat : 300

# 6. Disponible = 500 (dépôts) - 300 (retraits) = 200€
```

---

## 🔐 Sécurité

- ✅ **Authentification** : `require_auth()` obligatoire
- ✅ **CSRF** : token vérifié
- ✅ **Ownership** : vérification user_id
- ✅ **Validation** : montant > 0, montant ≤ disponible
- ✅ **Prepared statements** : protection SQL injection
- ⚠️ **Note** : pas de transaction DB (pas de rollback) en cas d'erreur

---

## 📌 Résumé

| Aspect | Détail |
|--------|--------|
| **Action** | Créer une transaction de dépense liée à un objectif |
| **Fonds disponibles** | Dépôts - Retraits antérieurs |
| **Validation** | Montant ≤ Disponible |
| **Transaction créée** | type="dépense" (id_type=1), goal_id=id_objectif |
| **Impact solde** | Réduit le solde (augmente dépenses) |
| **Erreurs** | Fonds insuffisants, objectif inexistant, accès refusé |
| **Notes** | Optionnel, type/catégorie/subcatégorie optionnels |
