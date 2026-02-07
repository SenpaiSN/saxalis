# 🔧 Correction : Retrait d'Objectifs & Impact sur Épargne/Solde

## Problème

Quand un retrait de fonds était effectué sur un objectif, il était enregistré comme une **dépense** (id_type=1), ce qui :
- ❌ Réduisait le **solde total** (incorrect)
- ❌ N'affectait PAS l'**épargne affichée** (incorrect)

## Solution

Les retraits d'objectifs sont maintenant enregistrés comme des **épargnes négatives** (id_type=3, montant négatif), ce qui :
- ✅ Réduit l'**épargne affichée** (puisque c'est une déduction d'épargne)
- ✅ **N'affecte PAS le solde total** (l'épargne était déjà déduite au moment du dépôt)

## Nouvelle Logique

### Avant
```
Dépôt d'épargne : +500€ → Épargne = 500€, Solde = -500€ (réduit)
Retrait d'épargne : 300€ → Enregistré comme dépense
                      → Épargne = 500€ (inchangée ❌)
                      → Solde = -800€ (réduit ❌)
```

### Après
```
Dépôt d'épargne : +500€ → Épargne = 500€, Solde = -500€
Retrait d'épargne : 300€ → Enregistré comme épargne négative (-300€)
                      → Épargne = 500 + (-300) = 200€ ✅
                      → Solde = -200€ (ne change pas ✅)
```

---

## Fichiers Modifiés

### 1. **Backend : API/add_goal_withdrawal.php**

#### Validation des fonds disponibles
```php
// ANCIEN CODE
$totalDeposits = SUM(id_type=3)
$totalWithdrawn = SUM(id_type=1 AND goal_id=...)
$available = $totalDeposits - $totalWithdrawn

// NOUVEAU CODE
$availableNet = SUM(id_type=3)  // Inclut montants positifs ET négatifs
$available = $availableNet
```

Les montants négatifs (retraits) se soustraient automatiquement.

#### Création de la transaction
```php
// ANCIEN CODE
INSERT INTO transactions 
(id_utilisateur, id_type, Type, Montant, goal_id, ...)
VALUES (:uid, 1, 'expense', :montant_positif, :goal_id, ...)

// NOUVEAU CODE
INSERT INTO transactions 
(id_utilisateur, id_type, Type, Montant, ...)
VALUES (:uid, 3, 'epargne', :montant_negatif, ...)
```

**Changements clés :**
- `id_type` : 1 → 3 (dépense → épargne)
- `Type` : 'expense' → 'epargne'
- `Montant` : +500 → -500 (négatif)
- `goal_id` : supprimé (pas utilisé)
- `category_id`, `subcategory_id` : supprimés (pas utilisés)
- `subcategory_id` : conservé = sous-catégorie de l'objectif

### 2. **Frontend : WithdrawFromGoalModal.tsx**

#### Simplification de l'interface
```tsx
// ANCIEN CODE
- Type (dépense, revenu, etc.)
- Catégorie
- Sous-catégorie
- Notes

// NOUVEAU CODE
- Montant *
- Notes (optionnel)
```

Les autres champs ne sont plus nécessaires puisque le retrait utilise les paramètres de l'objectif.

#### Payload envoyé
```typescript
// ANCIEN CODE
{
  goal_id: 1,
  montant: 300,
  id_type: 1,
  category_id: 2,
  subcategory_id: 15,
  notes: "..."
}

// NOUVEAU CODE
{
  goal_id: 1,
  montant: 300,
  notes: "..." // optionnel
}
```

Le backend gère tout le reste (type=épargne, montant négatif, sous-catégorie de l'objectif).

---

## Exemple Concret

### Scénario
- Objectif "Vacances" : 2000€ cible
- Dépôt en janvier : +500€
- Dépôt en février : +300€
- **Retrait en mars : 200€**

### Avant correction
```
Jan : Épargne = 500€, Solde = -500€
Fév : Épargne = 800€, Solde = -800€
Mar : Retrait enregistré comme dépense (id_type=1)
      Épargne = 800€ (inchangée ❌)
      Solde = -1000€ (augmente la perte ❌)
```

### Après correction
```
Jan : Épargne = 500€, Solde = -500€
Fév : Épargne = 800€, Solde = -800€
Mar : Retrait enregistré comme épargne négative (-200€)
      Épargne = 800 + (-200) = 600€ ✅
      Solde = -600€ (revient au niveau correct ✅)
```

---

## Impact sur les Calculs

### Épargne Nette
```
Épargne Nette = SUM(transactions WHERE id_type=3)
              = SUM(dépôts positifs) + SUM(retraits négatifs)
              = 500 + 300 + (-200)
              = 600€
```

### Solde Total
```
Solde = Revenus - Dépenses - Épargne Nette
      = Revenus - Dépenses - 600€
```

Un retrait ne change PAS ce calcul car :
- Avant retrait : `Solde = Revenus - Dépenses - 800€`
- Après retrait : `Solde = Revenus - Dépenses - 600€` (l'épargne a réduit de 200€)

---

## Database Schema

### Structure des transactions
```sql
-- Dépôt d'objectif (avant)
INSERT INTO transactions 
(id_utilisateur, id_type, Type, subcategory_id, Montant, Date)
VALUES (7, 3, 'epargne', 50, 500.00, '2026-01-15 00:00:00');

-- Retrait d'objectif (après)
INSERT INTO transactions 
(id_utilisateur, id_type, Type, subcategory_id, Montant, Date)
VALUES (7, 3, 'epargne', 50, -200.00, '2026-03-20 00:00:00');

-- Récupérer les fonds disponibles
SELECT COALESCE(SUM(Montant), 0) FROM transactions 
WHERE subcategory_id = 50 AND id_type = 3;
-- Résultat : 500 + (-200) = 300€
```

---

## Validation & Erreurs

### Fonds insuffisants
```php
$availableNet = SUM(id_type=3 dans la sous-catégorie)
// = 500 + 300 = 800€

if ($montant > $availableNet) {  // 900 > 800
  → HTTP 400
  → "Fonds insuffisants sur cet objectif"
  → available: 800
}
```

### Cas valides
```php
// Retrait de 500€ sur 800€ disponible
if (500 <= 800) {
  → INSERT (-500) dans transactions
  → SUCCESS
  → Nouveau net : 800 + (-500) = 300€
}
```

---

## Backward Compatibility

⚠️ **Important** : Cette correction change la structure des transactions enregistrées.

### Anciennes transactions
Les retraits précédemment enregistrés avec `id_type=1` et `goal_id` ne sont **pas affectés**. Ils restent comme dépenses dans la base.

### Nouvelles transactions
À partir de maintenant, tous les retraits sont enregistrés avec `id_type=3` et montant négatif.

### Migration (optionnelle)
Si vous avez des retraits anciens avec `id_type=1` et `goal_id`, vous pouvez les migrer :

```sql
-- Convertir les anciens retraits en épargnes négatives
UPDATE transactions 
SET id_type = 3, 
    Type = 'epargne', 
    Montant = -Montant,
    Montant_eur = -Montant_eur,
    goal_id = NULL
WHERE goal_id IS NOT NULL 
  AND id_type = 1;
```

---

## Tests

### Test 1 : Retrait simple
```bash
# Créer un objectif
POST /API/add_goal.php
{ "nom": "Test", "montant_objectif": 1000 }
# → goal_id = 5, id_subcategory = 100

# Dépôt de 500€
POST /API/add_goal_transaction.php
{ "goal_id": 5, "montant": 500 }
# → Transaction 101 : id_type=3, Montant=500, subcategory_id=100

# Retrait de 200€
POST /API/add_goal_withdrawal.php
{ "goal_id": 5, "montant": 200 }
# → Transaction 102 : id_type=3, Montant=-200, subcategory_id=100

# Vérifier le net
SELECT SUM(Montant) FROM transactions 
WHERE id_type = 3 AND subcategory_id = 100;
# → 500 + (-200) = 300€ ✅
```

### Test 2 : Fonds insuffisants
```bash
# Essayer de retirer 400€ (plus que 300€ disponible)
POST /API/add_goal_withdrawal.php
{ "goal_id": 5, "montant": 400 }
# → HTTP 400
# → "Fonds insuffisants sur cet objectif"
# → available: 300
```

---

## Résumé des Changements

| Aspect | Ancien | Nouveau |
|--------|--------|---------|
| **id_type** | 1 (dépense) | 3 (épargne) |
| **Montant** | +300 | -300 |
| **Impact épargne** | Aucun | Réduit |
| **Impact solde** | Réduit (❌) | Aucun (✅) |
| **goal_id** | Défini | NULL |
| **Type** | 'expense' | 'epargne' |
| **Champs optionnels** | Type, Catégorie, Subcatégorie | Aucun |
| **Calcul disponible** | dépôts - retraits distincts | SUM(montants) |

