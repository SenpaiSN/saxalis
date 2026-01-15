# Spécification — Onglet Statistiques (Audit 2025-12-25)

## Objectif
Fournir une vue claire, interactive et résiliente des données financières de l'utilisateur : synthèses, tendances et projections. L'implémentation doit être progressive, testable et tolérante aux erreurs (offline/local data).

## Fonctionnalités existantes (inventaire)
- Filtres (component `Filters`)
  - Recherche textuelle (catégorie)
  - Année / Mois
  - Type (tous / expense / income)
  - Catégorie / Sous‑catégorie (dépend de l'API)
  - Reset
- Cartes de synthèse
  - Revenus totaux
  - Dépenses totales
  - Épargne totale (détectée par labels/codes)
  - Reste à dépenser
- Widgets Objectifs
  - Chargement via `api.getGoals()`
  - Liste d'objectifs, montant engagé, % atteint, estimation mois restants
- Graphiques (library: Recharts)
  - Evolution mensuelle — AreaChart (revenus vs dépenses)
  - Répartition des dépenses — BarChart
  - Évolution des économies cumulées — Line/Area + projections (3 mois)
  - Détails par catégorie — petites cartes et progress bars
- Logique côté client
  - Calculs cumulés, projections linéaires simples, traitement des dates
  - Détection transactions "épargne" à partir de types/labels
- Robustesse (ajouts récents)
  - ErrorBoundary autour du module
  - Guards et délais pour éviter que Recharts lise des axes non initialisés
  - Forced window.resize pour recalcul de taille

## Problèmes identifiés
- Races conditions entre calculs et effets -> erreurs TDZ et erreurs Recharts (xAxis undefined)
- Beaucoup de logique hybride (UI + business), ce qui complexifie tests
- Charts sensibles au timing du layout; parfois vides ou provoquent exceptions

## Proposition de reconstruction (itérative — recommandée)
1. Remplacement temporaire de l'onglet par un écran "En maintenance" (fait).
2. Définir API contracts (quel payload pour chaque graphique) :
   - Monthly series: [{month: "2025-12", revenus: number, depenses: number}]
   - Category breakdown: [{categorie, montant, emoji?}]
   - Savings cumulative: [{label, date, real, proj?}]
   - Goals: [{id, nom, montant_objectif, montant_depose, reste, date_creation}]

   - API contract: Monthly savings
     - Endpoint: `GET /API/get_monthly_savings.php?month=YYYY-MM`
     - Description: renvoie les **revenus réels** et **dépenses réelles** pour le mois demandé, ainsi que l'`économie` (revenus - dépenses) et le pourcentage d'épargne (`savings_pct`).
     - Implementation notes: filtre sur `id_utilisateur`, `DATE_FORMAT(`"Date"', '%Y-%m') = :month` et `Type` (`'income'` / `'expense'`). Utiliser `Montant_eur` lorsque disponible, sinon `Montant`.
     - Réponse (exemple):
       ```json
       {
         "success": true,
         "month": "2025-03",
         "revenues": 2800.00,
         "expenses": 1500.00,
         "savings": 1300.00,
         "savings_pct": 46.43
       }
       ```

- UI change: Statistiques — la carte principale de l'onglet **Statistiques** affiche désormais **"Économies réalisées"** (solde réel = revenus réels − dépenses réelles). Le Dashboard et les autres vues conservent le libellé **"Solde total"**. Cette carte prend la valeur calculée côté client à partir des transactions filtrées et affiche également un label de changement par rapport à la période précédente.3. Refactor Frontend:
   - Components: `Filters`, `SummaryCards`, `EvolutionChart`, `CategoryChart`, `SavingsChart`, `GoalsPanel`.
   - Each chart receives **already aggregated** data to avoid duplication logic in many places.
4. Tests & validation:
   - Unit tests for aggregation functions (pure functions)
   - Visual smoke tests (desktop/mobile)
5. Monitoring & fallback:
   - Graceful fallback using offline/local data, show clear UI state (chargement / erreurs)

## Priorités
1. Stabiliser (no crashes) — Guards, ErrorBoundary, placeholder (done)
2. Extract business logic to pure functions + tests
3. Rebuild charts consuming aggregated payloads
4. UX polish & performance

---

Notes additionnelles: je peux dérouler l'implémentation étape par étape et te proposer PRs intermédiaires pour revue.
