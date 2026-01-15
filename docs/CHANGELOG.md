# Changelog

## 2025-12-31 — Feat: API Statistiques
- Ajout de l'endpoint `GET /API/get_monthly_savings.php?month=YYYY-MM` (revenus réels, dépenses réelles, économie et pourcentage d'épargne pour un mois donné).
- Ajout de `API/debug_monthly_savings.php` pour faciliter les tests manuels.
- Frontend: intégration dans l'onglet Statistiques — affichage de la **% d'économie du mois** sur la carte `Économie du mois` (charge automatique lors du changement de mois).
- Frontend: La carte principale de l'onglet **Statistiques** est maintenant intitulée **"Économies réalisées"** (uniquement dans l'onglet Statistiques; Dashboard et Transactions conservent "Solde total").
## 2025-12-25 — Fix: Statistiques
- Fix: Ajout d'un `ErrorBoundary` autour de `StatsModern` pour éviter un écran blanc en cas d'erreur runtime.
- Fix: Forcer un `window.resize` au montage et lors des changements de données critiques dans `StatsModern` pour corriger les graphiques vides (Recharts).
- Ajout de logs de debug mineurs pour faciliter le diagnostic.

Test manuel: ouvrir l'onglet Statistiques et vérifier l'affichage des graphiques (évolution, répartition, économies).

## 2026-01-04 — Migration: Retrait du modèle legacy `coffre_projets` / `coffre_depots`
- Migration backend: Toutes les opérations sur objectifs (versement, retrait, transfert) utilisent maintenant `objectif_crees` et la table `transactions` (id_type=3 pour dépôts, id_type=1 pour retraits avec `goal_id` pointant vers `objectif_crees.id_objectif`).
- Endpoints `coffre_*` dépréciés renvoient désormais HTTP 410. Un script de migration SQL est fourni dans `deploy/migrations/2026-01-04_migrate_remove_coffre.sql`.
- Frontend: utilisation de `get_objectifs_crees.php`, `add_goal_transaction.php`, `add_goal_withdrawal.php`, `transfer_goal.php`.
- Tests recommandés: créer un objectif, verser via le plan, réaliser un retrait et effectuer un transfert interne.

## 2026-01-11 — Fix: Timezone handling for transaction dates
- Fix: Normalize incoming naive datetimes from clients as **Europe/Paris** and convert to **UTC** before storing in the `transactions` table. ✅
- Affected endpoints: `API/add_transaction.php`, `API/update_transaction.php`, `API/add_transaction_with_invoice.php`, `API/add_goal_transaction.php`, `API/add_goal_withdrawal.php`, `API/transfer_goal.php`, `API/add_recurring_transaction.php`.
- Tests: Added `scripts/test_date_normalization.php` to validate common cases (CET/CEST offsets). Add instructions in `docs/TIMEZONE.md` describing how to run it locally (requires PHP in PATH).
- Rationale: Prevents a visible +1h shift for users in France when storing local times in the DB.
