# INDICATORS — Calculs, Sources de données & Mapping de code

But : documenter exhaustivement tous les indicateurs affichés dans l'application, leurs formules mathématiques exactes, la source de données (table/colonne / endpoint) et pointer vers le(s) fichier(s) effectuant le calcul (backend PHP/SQL ou frontend React/TS). Le document inclut des exemples SQL, des notes d'arrondi et des recommandations de tests.

---

## Table des matières
1. Principes et conventions
2. Structure monétaire & conversion
3. Indicateurs globaux (transversaux)
4. Détail par onglet / composant
5. SQL & extraits de code (exemples précis)
6. Checklist de migration & tests recommandés
7. Annexes : fichiers clés & commandes utiles

---

## 1) Principes et conventions
- Langue : français.
- Devise canonique (après migration) : **XOF**. Avant migration, des lignes peuvent rester en EUR.
- Affichage : utiliser `src/lib/formatCurrency.ts` (centralisé). Tous les composants d'affichage utilisent `formatCurrency(...)`.
- Préférence utilisateur : gérée par `src/app/contexts/PreferencesContext.tsx` (clé `currency` dans `localStorage`) et persistée/récupérée via endpoints (`check_session`, `update_user_pref`).
- Arrondis : toutes conversions côté serveur utilisent `round(..., 2)` ; XOF peut être affichée sans décimales selon `formatCurrency` (policy configurable).
- Sécurité : toute conversion destructive (base) doit être précédée d'un backup complet. Les scripts fournis (`API/convert_currency.php` et `API/migrations/migrate_to_xof.php`) gèrent backup et batch processing.

---

## 2) Structure monétaire & conversion
- Taux statique par défaut : défini dans `API/config.php` via `get_conversion_rate('EUR','XOF') => 655.957`.
- Stockage historique : colonnes de secours créées au besoin lors des conversions : `Montant_eur` (transactions), `montant_eur` (objectif_crees), `montant_objectif_eur` & `total_collected_eur` (objectif_atteints).
- Politique d’écriture : endpoints (`add_goal.php`, `add_transaction.php`, `update_objectif.php`) convertissent les montants reçus vers la devise canonique (XOF) avant insertion/UPDATE.

---

## 3) Indicateurs globaux (transversaux)
Chaque indicateur : nom, formule, source, fichier(s) où calculé.

- Solde (Balance)
  - Formule : SUM(Montant * sign) selon type (revenu positif / dépense négative) ou SUM(Montant) filtré par `id_type`
  - Source : table `transactions` (colonne `Montant`, `id_type`) ou agrégats pré-computés par endpoint
  - Files : `API/get_transactions.php` (selon nécessité), affichage dans `src/app/components/Dashboard.tsx` / `Accueil.tsx`

- Total Revenus (période)
  - Formule : `SELECT SUM(Montant) FROM transactions WHERE id_type = <revenu> AND date BETWEEN ...`
  - Fichiers : backend endpoint(s) qui retournent agrégats (consult: `get_monthly_savings.php`, `get_transactions.php`)

- Total Dépenses (période)
  - Similaire aux revenus mais `id_type` correspondant aux dépenses

- Prévision fin de mois
  - Formule appliquée côté client : `solde_courant + forecast_revenus - forecast_depenses` (implémentée dans `Dashboard.tsx`)

- Total Épargne (réel & prévisionnel)
  - Déf: somme des dépôts associés à objectifs (transactions `id_type = 3`) ou agrégats par `get_monthly_savings.php`
  - Frontend: `Dashboard.tsx`, `StatsRebuilt.tsx`

- Taux d'épargne (monthlySavingsPct)
  - Formule : `monthlySaved / monthlyIncome * 100` (gestion division par zéro requise)

---

## 4) Détail par onglet / composant
Je liste ici **chaque** écran/onglet principal, les indicateurs affichés et où ils sont calculés.

### Accueil (`src/app/components/Accueil.tsx`)
- Solde (affiché avec `formatCurrency(solde)`) — source : agrégat comptes/transactions passé en props ou fetch.
- Totaux récents (revenus/dépenses) — calcul local à partir des transactions récupérées.
- Files à inspecter : `Accueil.tsx`, `src/lib/formatCurrency.ts`.

### Dashboard (`src/app/components/Dashboard.tsx`)
- `soldeReal` — agrégat balance
- `previsionFinDeMois` — calcul JS (utilise données de transactions récurrentes/planifiées)
- `totals.revenus.real`, `totalEpargneReal` — agrégats
- Fichiers : `Dashboard.tsx`, endpoints via `src/app/App.tsx` (refresh on currency/locale)

### Statistiques (`src/app/components/StatsRebuilt.tsx` et charts)
- Evolution mois par mois (`evolutionData`) — source : endpoint d’historique ou agrégation JS
- Catégories : somme par catégorie/subcategory
- Taux & moyennes: `AVG`, `SUM` SQL selon période
- Fichiers : `StatsRebuilt.tsx`, `EvolutionChart.tsx`, `CategoryChart.tsx`, `SavingsChart.tsx`

### Objectifs (Goals)
Endpoints impliqués (backend) :
- `API/get_objectifs_crees.php` — **calcul principal** pour objectifs créés
  - Sélection SQL (extrait important) :

```sql
SELECT
  o.id_objectif,
  o.id_subcategory,
  s.name,
  o.montant AS montant_objectif,
  DATE(o.date_depot) AS date_creation,
  COALESCE(d.total_deposits, 0) AS total_deposits,
  COALESCE(w.total_withdrawn, 0) AS total_withdrawn,
  (COALESCE(d.total_deposits, 0) - COALESCE(w.total_withdrawn, 0)) AS total_collected,
  COALESCE(ROUND(LEAST(100, (COALESCE(d.total_deposits, 0) - COALESCE(w.total_withdrawn, 0)) / NULLIF(o.montant, 0) * 100), 2), 0) AS progress_pct,
  COALESCE(d.nb_deposits, 0) AS nb_versements
FROM objectif_crees o
LEFT JOIN subcategories s ON s.id_subcategory = o.id_subcategory
LEFT JOIN (
  SELECT subcategory_id, id_utilisateur, SUM(Montant) AS total_deposits, COUNT(id_transaction) AS nb_deposits
  FROM transactions
  WHERE id_type = 3
  GROUP BY subcategory_id, id_utilisateur
) d ON d.subcategory_id = o.id_subcategory AND d.id_utilisateur = o.user_id
LEFT JOIN ( ... ) w ON w.goal_id = o.id_objectif AND w.id_utilisateur = o.user_id
WHERE o.user_id = :uid
ORDER BY o.date_depot DESC
```

- `API/get_objectifs_atteints.php` — renvoie `objectif_atteints` (colonnes: `montant_objectif`, `total_collected`, `progress_pct`, `nb_versements`)
- Frontend qui affiche : `src/app/components/CreatedGoalCard.tsx`, `ObjectifsAtteints.tsx`, `GoalCard.tsx` — utilisez `formatCurrency(parseFloat(...))` pour l’affichage.

### Transactions (`API/add_transaction.php`, `TransactionsModern.tsx`)
- Logique : dépôts (id_type=3) => peuvent déclencher création d’`objectif_atteints` et suppression de `objectif_crees` si objectif atteint (code: `add_transaction.php` / `update_transaction.php`).
- Validation & conversion : `security.php` provides `validate_currency` ; `add_transaction.php` peut appliquer `get_conversion_rate($currency, 'EUR')` selon ancien design.

### Profil (`src/app/components/ProfilModern.tsx`)
- Permet la conversion DB utilisateur via `API/convert_currency.php` (POST `{ target: 'XOF' | 'EUR', confirm: true }`).
- Comportement : effectue backups (ou essaie), convertit lignes `transactions`, `objectif_crees`, `objectif_atteints` en batch, met à jour `users.currency = 'XOF'` pour le user.
- Fichier important : `API/convert_currency.php` et `API/migrations/migrate_to_xof.php` (CLI)

---

## 5) SQL & extraits de code (exemples précis)
- Calcul `progress_pct` détaillé (sécurité division par zéro) :
```sql
ROUND(LEAST(100,
  (COALESCE(d.total_deposits, 0) - COALESCE(w.total_withdrawn, 0)) / NULLIF(o.montant, 0) * 100
), 2) AS progress_pct
```
- Exemple d’agrégation par mois (évolution) :
```sql
SELECT YEAR(date) as y, MONTH(date) as m, SUM(Montant) as total
FROM transactions
WHERE id_utilisateur = :uid AND date >= :start AND date <= :end
GROUP BY y,m ORDER BY y,m
```
- Conversion lors de création d’objectif (`add_goal.php`):
```php
// convert montant_objectif from user currency to XOF
$curStmt = $pdo->prepare("SELECT currency FROM users WHERE id = :uid LIMIT 1");
$curStmt->execute([':uid' => $uid]);
$userCurrency = strtoupper(trim($curStmt->fetchColumn() ?? 'EUR'));
if ($userCurrency !== 'XOF') {
  $rate = get_conversion_rate($userCurrency, 'XOF');
  if ($rate !== null) $montant_objectif = round($montant_objectif * $rate, 2);
}
```

- Code d’affichage (frontend) :
```tsx
import formatCurrency from '../../lib/formatCurrency';
// example
<div>{formatCurrency(parseFloat(goal.total_collected || 0))}</div>
```

---

## 6) Checklist de migration & tests recommandés
- Backup complet (dump) avant toute migration.
- Dry-run : `php API/migrations/migrate_to_xof.php` (no `--confirm`), vérifier le nombre d’utilisateurs trouvés et voir les impressions.
- Confirm run : `php API/migrations/migrate_to_xof.php --confirm`
- Tests à ajouter :
  - Unit tests PHP pour `get_conversion_rate` et la logique d’update (`convert_currency.php`) — inclure cas `out_of_range` et lignes `skipped`.
  - Tests d’intégration : endpoints `get_objectifs_crees.php` / `get_objectifs_atteints.php` renvoient valeurs cohérentes avant/après conversion (sur DB test).
  - Frontend tests (Vitest/Jest) : `formatCurrency` XOF/EUR behavior, `CreatedGoalCard` displays progress properly.

---

## 7) Annexes : fichiers clés & commandes utiles
- Fichiers backend principaux :
  - `API/get_objectifs_crees.php`
  - `API/get_objectifs_atteints.php`
  - `API/add_goal.php`
  - `API/add_transaction.php`, `API/update_transaction.php`
  - `API/convert_currency.php` (conversion interactive)
  - `API/migrations/migrate_to_xof.php` (CLI)
- Fichiers frontend :
  - `src/lib/formatCurrency.ts`
  - `src/app/contexts/PreferencesContext.tsx`
  - `src/app/components/CreatedGoalCard.tsx`
  - `src/app/components/ObjectifsAtteints.tsx`
  - `src/app/components/Dashboard.tsx`
  - `src/app/components/StatsRebuilt.tsx`
- Commandes utiles :
  - Dry-run migration : `php API/migrations/migrate_to_xof.php`
  - Apply migration : `php API/migrations/migrate_to_xof.php --confirm`
  - Grep quick-finds : `grep -R "total_collected" -n .` ; `grep -R "progress_pct" -n .`

---

## Fin — Action proposée
- Je peux :
  1. ouvrir une PR qui ajoute ce fichier `docs/INDICATORS.md` (déjà créé ici),
  2. ajouter des tests unitaires pour `get_objectifs_crees.php` + `convert_currency.php`,
  3. préparer un script d’audit comparatif (avant/après) et un guide de rollback.

Indiquez votre prochaine action privilégiée (1/2/3 ou combinaison) et je l'implémente.

---

*Document généré automatiquement — mettre à jour si politique de devise/taux change.*
