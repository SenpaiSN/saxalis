Theme & Design Tokens

The project centralizes color and shadow tokens in `src/styles/theme.css`.

Key tokens:

- `--color-revenu`, `--card-bg-revenu`, `--card-border-revenu` (revenus / green)
- `--color-depense`, `--card-bg-depense`, `--card-border-depense` (dépenses / red)
- `--color-epargne`, `--card-bg-epargne`, `--card-border-epargne` (épargne / indigo)
- `--card-shadow`, `--card-border-radius` (shadows & radii)

Usage:
- Prefer `var(--color-revenu)` for revenue text/icons and `var(--card-bg-revenu)` for related small backgrounds.
- Use `var(--card)` and `var(--card-shadow)` for neutral cards.
- For dynamic styling (e.g., per-transaction badges), prefer inline `style={{ backgroundColor: 'var(--card-bg-revenu)' }}` or conditional styles based on data.

Dark mode:
- Dark variants are provided in the stylesheet under the `.dark` selector.
- The app toggles `.dark` on `<html>` when the user changes the theme and persists the choice in `localStorage` (`theme` = `light` | `dark`).

Extending:
- Add new variables to `src/styles/theme.css` and reference them with `var(...)` in components.
- Keep color usage centralized and avoid ad-hoc utility colors (e.g., `text-green-600`) for themeable tokens.