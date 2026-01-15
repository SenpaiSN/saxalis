# Gestion des fuseaux horaires (Date/Heure des transactions)

## Contexte
Les utilisateurs saisissent souvent des dates/horaires en heure locale (ex. France : CET/CEST). Le serveur MySQL est configuré pour stocker en UTC (session PDO `time_zone = '+00:00'`). Pour éviter un décalage visible (+1h en hiver par exemple), nous interprétons désormais les dates fournies par le client **sans information de fuseau** comme étant en **Europe/Paris**, puis nous les convertissons en **UTC** avant insertion.

## Comportement appliqué
- Entrée naive (ex: `2026-01-11 12:34`) est interprétée comme `2026-01-11 12:34 Europe/Paris` -> convertie en UTC (`2026-01-11 11:34 UTC` en CET).
- Les endpoints concernés (exemples) :
  - `API/add_transaction.php`
  - `API/update_transaction.php`
  - `API/add_transaction_with_invoice.php`
  - `API/add_goal_transaction.php`
  - `API/add_goal_withdrawal.php`
  - `API/transfer_goal.php`
  - `API/add_recurring_transaction.php`
- `config.php` : `ini_set('date.timezone', 'UTC');` (défaut PHP en UTC)

## Pourquoi ce choix ?
- Prise en charge transparente du DST (CET/CEST) via `DateTimeZone('Europe/Paris')`.
- Stockage cohérent en UTC simplifie l'agrégation, l'affichage multi-fuseaux et la recherche.

## Tests recommandés
- Exemples à tester (script fourni `scripts/test_date_normalization.php`):
  - Input: `2026-01-11 12:34` → stored UTC: `2026-01-11 11:34`
  - Input: `2026-07-11 12:34` → stored UTC: `2026-07-11 10:34`
  - Input: `2026-01-11` → interpreted as `2026-01-11 00:00 Europe/Paris` → UTC `2026-01-10 23:00`
- Pour exécuter localement : `php scripts/test_date_normalization.php` (nécessite PHP dans le PATH)

## Notes pour développeurs
- N'utilisez pas `strtotime()` sans fixer explicitement un fuseau ; préférez `DateTime` avec `new DateTimeZone('Europe/Paris')` suivi de `setTimezone(new DateTimeZone('UTC'))`.
- Lors de modifications futures, ajoutez des tests unitaires/integration qui postent une date et vérifient la valeur stockée en UTC.

---

Si vous préférez un comportement différent (par exemple : déduire le fuseau du profil utilisateur ou accepter explicitement ISO strings `2026-01-11T12:34+01:00`), dites-le et je l'implémente.