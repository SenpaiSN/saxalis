# Correction: Mise à jour du compteur de retraits (nb_retraits)

## Problème Identifié
Le compteur de retraits (`nb_retraits`) n'était pas mis à jour après la création d'un retrait d'objectif. Bien que le retrait soit enregistré correctement en tant qu'épargne négative (id_type=3, montant négatif), le compteur affichait toujours "0 retrait".

## Cause Racine
Les requêtes SQL qui calculent les compteurs `nb_versements` et `nb_retraits` cherchaient les retraits à l'aide de critères obsolètes:
- Ancien: Cherchait `id_type = 1` (dépenses) avec `goal_id IS NOT NULL`
- Nouveau système: Les retraits sont enregistrés comme `id_type = 3` (épargne) avec `Montant < 0`

## Corrections Appliquées

### 1. **API/get_objectifs_crees.php** (Ligne 28-33)
Avant:
```sql
LEFT JOIN (
  SELECT goal_id, id_utilisateur, SUM(Montant) AS total_withdrawn, COUNT(id_transaction) AS nb_withdrawals
  FROM transactions
  WHERE id_type = 1 AND goal_id IS NOT NULL
  GROUP BY goal_id, id_utilisateur
) w ON w.goal_id = o.id_objectif AND w.id_utilisateur = o.user_id
```

Après:
```sql
LEFT JOIN (
  SELECT subcategory_id, id_utilisateur, -SUM(Montant) AS total_withdrawn, COUNT(id_transaction) AS nb_withdrawals
  FROM transactions
  WHERE id_type = 3 AND Montant < 0
  GROUP BY subcategory_id, id_utilisateur
) w ON w.subcategory_id = o.id_subcategory AND w.id_utilisateur = o.user_id
```

Changements clés:
- Recherche sur `id_type = 3 AND Montant < 0` au lieu de `id_type = 1`
- Utilise `subcategory_id` au lieu de `goal_id` (car les retraits sont liés à la sous-catégorie de l'objectif)
- Négation du SUM: `-SUM(Montant)` pour convertir les montants négatifs en positifs pour les totaux
- Compte uniquement les transactions négatives pour nb_withdrawals

Aussi ajouté le filtre `Montant > 0` pour les dépôts (ligne 26-30):
```sql
LEFT JOIN (
  SELECT subcategory_id, id_utilisateur, SUM(Montant) AS total_deposits, COUNT(id_transaction) AS nb_deposits
  FROM transactions
  WHERE id_type = 3 AND Montant > 0
  GROUP BY subcategory_id, id_utilisateur
) d ON d.subcategory_id = o.id_subcategory AND d.id_utilisateur = o.user_id
```

### 2. **API/get_goals.php** (Ligne 12-24)
Mise à jour similaire pour compter les retraits par `id_type = 3` avec `Montant < 0`:

Avant:
```php
COALESCE((SELECT SUM(Montant) FROM transactions WHERE goal_id = o.id_objectif AND id_type = 1 AND id_utilisateur = :uid), 0) AS total_withdrawn,
```

Après:
```php
COALESCE(-(SELECT SUM(Montant) FROM transactions WHERE subcategory_id = o.id_subcategory AND id_type = 3 AND Montant < 0 AND id_utilisateur = :uid), 0) AS total_withdrawn,
```

## Impact

### Avant la correction
- Créer un retrait → Transaction enregistrée correctement (id_type=3, montant négatif)
- Mais `nb_retraits` reste à 0 car la requête cherche `id_type = 1`
- Affichage: "65.51% • 2 versements • 0 retrait" ❌

### Après la correction
- Créer un retrait → Transaction enregistrée (id_type=3, montant négatif)
- `nb_retraits` compte correctement les transactions négatives
- Affichage: "65.51% • 2 versements • 1 retrait" ✅

## Comportement

### nb_versements (dépôts)
- **Définition**: Nombre de transactions enregistrées sur l'objectif avec montant positif
- **Critère**: `id_type = 3 AND Montant > 0` sur `subcategory_id` de l'objectif

### nb_retraits (retraits)
- **Définition**: Nombre de retraits enregistrés sur l'objectif avec montant négatif
- **Critère**: `id_type = 3 AND Montant < 0` sur `subcategory_id` de l'objectif

## Remarques Importantes

1. **Aucune migration requise**: Les données sont correctement enregistrées depuis le changement précédent du système de retraits. Seules les requêtes SELECT ont besoin d'être mises à jour.

2. **Frontend**: Les composants frontend (`CreatedGoalCard.tsx`) affichent déjà les champs `nb_versements` et `nb_retraits` correctement. Aucun changement frontend requis.

3. **Calcul du solde**: Le compteur de retraits n'affecte PAS le calcul du solde total. C'est uniquement un indicateur du nombre de fois où on a retiré des fonds.
   - Solde = Revenus - Dépenses - Épargne nette (montants positifs des dépôts moins les retraits)

## Test

Pour vérifier:
1. Créer un objectif d'épargne
2. Faire au moins 1 retrait
3. Vérifier que le compteur `nb_retraits` passe de 0 à 1 (ou plus)
4. Vérifier que le calcul du solde reste correct (épargne réduite, dépenses inchangées)
