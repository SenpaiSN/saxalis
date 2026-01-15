Budgeting feature (SaXalis)

Design & business rules:

- Provide automatic budgets computed from historical expenses and an optional manual override per category or per subcategory.
- Automatic budget (budget_auto) = average of the user's expenses for the last 3 complete months (exclude current month). If fewer than 3 months of historical data exist, average over available months.
- User may provide `manual_budget` (nullable decimal) on categories or subcategories. If `manual_budget` is set, it overrides `budget_auto`.
- Remaining (reste) = `budget_utilisé - dépenses_du_mois`, where `budget_utilisé` is `manual_budget ?? budget_auto`.

Implementation notes:

- DB schema: add `manual_budget DECIMAL(10,2) NULL` to `categories` and `subcategories` tables.
- API endpoints:
  - `GET /API/get_budgets.php` returns per-category and per-subcategory budgets: `manual_budget`, `budget_auto`, `budget_used`, `spent_this_month`, `remaining`, and `budget_source` ('manual'|'auto').
  - `add_category.php`, `update_category.php`, `add_subcategory.php`, `update_subcategory.php` accept and store `manual_budget`.
- Frontend: add a Dashboard card `BudgetRemainingCard` to show remaining by subcategory, highlighting negative remainders.

Testing:

- Run migration script (one-time): `php API/migrate_add_manual_budget.php`.
- Create test categories/subcategories with/without manual budgets, add expenses across months and verify `budget_auto` and `remaining` values returned by the API and shown in the UI.
