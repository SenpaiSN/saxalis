import { useState, useEffect } from 'react';
import { isSavingsTx } from './statsUtils';
import Filters from './Filters';
import * as api from '../../services/api';

import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Wallet, MinusCircle, Repeat } from 'lucide-react';
import StatsCardsDesign from './StatsCardsDesign';
import { Transaction } from '../App';
import { usePreferences } from '../contexts/PreferencesContext';
import { aggregateMonthlyEvolution, aggregateCategoryBreakdown, computeMonthlySavingsAndProjections } from './statsAggregation';
import { computeTotals } from './statsUtils';
import formatCurrency from '../../lib/formatCurrency';
import { matchesSearch } from './searchUtils';
import EvolutionChart from './charts/EvolutionChart';
import CategoryChart from './charts/CategoryChart';
import SavingsChart from './charts/SavingsChart';
import ChangeLabel from './ui/ChangeLabel';
import WithdrawFromGoalModal from './WithdrawFromGoalModal';
import TransferGoalModal from './TransferGoalModal';

interface StatsModernProps {
  transactions: Transaction[];
  recherche: string;
  setRecherche: (v: string) => void;
  annee: string;
  setAnnee: (v: string) => void;
  mois: string;
  setMois: (v: string) => void;
  filtreType: 'tous' | 'expense' | 'income';
  setFiltreType: (v: 'tous' | 'expense' | 'income') => void;
  categorie: string;
  setCategorie: (v: string) => void;
  sousCategorie: string;
  setSousCategorie: (v: string) => void;
  types: Array<{ id_type: number; code: string; label: string }>;
  categories: Array<{ id_category: number; name: string }>;
  subcategories: Array<{ id_subcategory: number; name: string }>;
  categoriesLoading: boolean;
  subcategoriesLoading: boolean;
  anneesDisponibles: string[];
  resetFilters: () => void;

}

export default function StatsModern({ transactions, recherche, setRecherche, annee, setAnnee, mois, setMois, filtreType, setFiltreType, categorie, setCategorie, sousCategorie, setSousCategorie, types, categories, subcategories, categoriesLoading, subcategoriesLoading, anneesDisponibles, resetFilters }: StatsModernProps) {
  // --- Variables globales et hooks d'état ---
  const projMonths = 3;
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const { locale, currency } = usePreferences();

  // --- Persistance des filtres et de l'onglet actif ---
  const STORAGE_KEY = 'statsmodern-filters';
  const STORAGE_TAB_KEY = 'statsmodern-periode';
  // Ajout d'un flag pour bloquer le rendu tant que la restauration n'est pas faite
  const [restored, setRestored] = useState(false);
  const [periode, setPeriode] = useState<'semaine' | 'mois' | 'annee'>(() => {
    try {
      const tab = localStorage.getItem(STORAGE_TAB_KEY);
      if (tab === 'semaine' || tab === 'mois' || tab === 'annee') return tab;
    } catch {}
    return 'mois';
  });
  useEffect(() => {
    try { localStorage.setItem(STORAGE_TAB_KEY, periode); } catch {}
  }, [periode]);

  // Initialisation des filtres et de l'onglet depuis localStorage (une seule fois au montage, AVANT tout rendu)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const obj = JSON.parse(saved);
        if (obj.recherche) setRecherche(obj.recherche);
        if (obj.annee) setAnnee(obj.annee);
        if (obj.mois) setMois(obj.mois);
        if (obj.filtreType) setFiltreType(obj.filtreType);
        if (obj.categorie) setCategorie(obj.categorie);
        if (obj.sousCategorie) setSousCategorie(obj.sousCategorie);
      }
      // Restaurer l'onglet actif si présent
      const tab = localStorage.getItem(STORAGE_TAB_KEY);
      if (tab === 'semaine' || tab === 'mois' || tab === 'annee') setPeriode(tab);
    } catch {}
    setRestored(true);
    // eslint-disable-next-line
  }, []);

  // Sauvegarde des filtres à chaque changement
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ recherche, annee, mois, filtreType, categorie, sousCategorie }));
    } catch {}
  }, [recherche, annee, mois, filtreType, categorie, sousCategorie]);

  // Bloquer le rendu tant que la restauration n'est pas faite
  if (!restored) return null;

  // State pour les objectifs
  const [goalsList, setGoalsList] = useState<Array<any>>([]);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [goalsError, setGoalsError] = useState<string | null>(null);
  const [chartsReady, setChartsReady] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [activeGoal, setActiveGoal] = useState<any>(null);

  // Apply filters (same rules as TransactionsModern)
  const transactionsFiltres = transactions.filter(t => {
    const matchRecherche = matchesSearch(t, recherche);
    const txCode = t.type === 'dépense' ? 'expense' : (t.type === 'revenu' ? 'income' : (t.type as any));
    const matchType = filtreType === 'tous' || txCode === filtreType;
    const txDate = new Date(t.date);

    const noFiltersSelected = recherche.trim().length === 0 && filtreType === 'tous' && categorie === 'Toutes' && sousCategorie === 'Toutes' && annee === 'Tous' && mois === 'Tous';
    // Keep 'Tous' when nothing selected
    const effectiveAnnee = annee;
    const effectiveMois = mois;

    const matchAnnee = effectiveAnnee === 'Tous' || String(txDate.getFullYear()) === effectiveAnnee;
    const matchMois = effectiveMois === 'Tous' || (effectiveMois !== 'Tous' && (txDate.getMonth() + 1) === Number(effectiveMois));
    const matchCategorie = categorie === 'Toutes' || t.categorie === categorie;
  const subName = (t as any).subcategoryName ?? (t as any).subCategory ?? '';
  const subId = (t as any).subcategoryId ?? (t as any).subCategoryId ?? (t as any).id_subcategory ?? null;
  const matchSous = sousCategorie === 'Toutes' || subName === sousCategorie || (subId !== null && String(subId) === String(sousCategorie));
    return matchRecherche && matchType && matchAnnee && matchMois && matchCategorie && matchSous;
  });

  // Calculs basés sur les transactions filtrées
  const totals = computeTotals(transactionsFiltres, types);
  const totalRevenusReal = totals.revenus.real;
  const totalRevenusForecast = totals.revenus.forecast;
  const totalDepensesReal = totals.depenses.real;
  const totalDepensesForecast = totals.depenses.forecast;
  const totalEpargneReal = totals.epargne.real;
  const totalEpargneForecast = totals.epargne.forecast;
  const resteADepenser = totals.resteADepenserReal;
  const tauxEpargneGlobal = totals.tauxEpargneReal;

  // --- Previous month comparison (show month label instead of "mois dernier")
  // Determine reference month: if UI filters specify a year/month use them, otherwise use current month
  const refDate = (() => {
    const now = new Date();
    let y = now.getFullYear();
    let m = now.getMonth() + 1; // 1-12
    // Default-to-current-month/year behavior when no filters are selected
    const noFiltersSelected = recherche.trim().length === 0 && filtreType === 'tous' && categorie === 'Toutes' && sousCategorie === 'Toutes' && annee === 'Tous' && mois === 'Tous';
    // Keep 'Tous' when nothing selected
    const effectiveAnnee = annee;
    const effectiveMois = mois;
    if (effectiveAnnee && effectiveAnnee !== 'Tous') y = Number(effectiveAnnee);
    if (effectiveMois && effectiveMois !== 'Tous') m = Number(effectiveMois);
    return new Date(y, m - 1, 1);
  })();
  // Reference: monthly comparison when a month is selected, otherwise annual comparison (year-over-year)
  const { locale: locale2, currency: currency2 } = usePreferences();
  const isAnnual = !mois || mois === 'Tous';
  let prevLabelCapitalized = '';
  let prevRevenus = 0;
  let prevDepenses = 0;
  let prevEpargne = 0;

  // change labels (declared outside so they are available below)
  let revenusChangeLabel = '';
  let depensesChangeLabel = '';
  let epargneChangeLabel = '';
  let soldeChangeLabel = '';

  if (isAnnual) {
    const prevYear = (annee && annee !== 'Tous') ? (Number(annee) - 1) : (new Date().getFullYear() - 1);
    prevLabelCapitalized = String(prevYear);

    prevRevenus = transactions
      .filter(t => {
        const search = recherche.trim().toLowerCase();
        const matchRecherche = search.length === 0 ? true : (t.categorie || '').toLowerCase().includes(search);
        const txCode = t.type === 'dépense' ? 'expense' : (t.type === 'revenu' ? 'income' : (t.type as any));
        const matchType = filtreType === 'tous' || txCode === filtreType;
        const txDate = new Date(t.date);
        const matchYear = String(txDate.getFullYear()) === String(prevYear);
        const matchCategorie = categorie === 'Toutes' || t.categorie === categorie;
        const subName = (t as any).subcategoryName ?? (t as any).subCategory ?? '';
        const subId = (t as any).subcategoryId ?? (t as any).subCategoryId ?? (t as any).id_subcategory ?? null;
        const matchSous = sousCategorie === 'Toutes' || subName === sousCategorie || (subId !== null && String(subId) === String(sousCategorie));
        return matchRecherche && matchType && matchYear && matchCategorie && matchSous;
      })
      .filter(t => t.type === 'revenu')
      .reduce((s, t) => s + (t.montant ?? 0), 0);

    prevDepenses = transactions
      .filter(t => {
        const search = recherche.trim().toLowerCase();
        const matchRecherche = search.length === 0 ? true : (t.categorie || '').toLowerCase().includes(search);
        const txCode = t.type === 'dépense' ? 'expense' : (t.type === 'revenu' ? 'income' : (t.type as any));
        const matchType = filtreType === 'tous' || txCode === filtreType;
        const txDate = new Date(t.date);
        const matchYear = String(txDate.getFullYear()) === String(prevYear);
        const matchCategorie = categorie === 'Toutes' || t.categorie === categorie;
        const subName = (t as any).subcategoryName ?? (t as any).subCategory ?? '';
        const subId = (t as any).subcategoryId ?? (t as any).subCategoryId ?? (t as any).id_subcategory ?? null;
        const matchSous = sousCategorie === 'Toutes' || subName === sousCategorie || (subId !== null && String(subId) === String(sousCategorie));
        return matchRecherche && matchType && matchYear && matchCategorie && matchSous;
      })
      .filter(t => t.type === 'dépense')
      .reduce((s, t) => s + Math.abs(t.montant), 0);

    prevEpargne = transactions
      .filter(t => isSavingsTx(t))
      .filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === prevYear;
      })
      .reduce((s, t) => s + t.montant, 0);
  } else {
    const prevDate = new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1);
    const prevLabel = prevDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    prevLabelCapitalized = prevLabel.replace(/\p{L}/u, c => c.toUpperCase());

    // Compute previous-month totals using the full transactions list but applying the same filters and forcing month/year to prevDate
    prevRevenus = transactions
      .filter(t => {
        const search = recherche.trim().toLowerCase();
        const matchRecherche = search.length === 0 ? true : (t.categorie || '').toLowerCase().includes(search);
        const txCode = t.type === 'dépense' ? 'expense' : (t.type === 'revenu' ? 'income' : (t.type as any));
        const matchType = filtreType === 'tous' || txCode === filtreType;
        const txDate = new Date(t.date);
        const matchYear = String(txDate.getFullYear()) === String(prevDate.getFullYear());
        const matchMonth = txDate.getMonth() === prevDate.getMonth();
        const matchCategorie = categorie === 'Toutes' || t.categorie === categorie;
        const subName = (t as any).subcategoryName ?? (t as any).subCategory ?? '';
        const subId = (t as any).subcategoryId ?? (t as any).subCategoryId ?? (t as any).id_subcategory ?? null;
        const matchSous = sousCategorie === 'Toutes' || subName === sousCategorie || (subId !== null && String(subId) === String(sousCategorie));
        return matchRecherche && matchType && matchYear && matchMonth && matchCategorie && matchSous;
      })
      .filter(t => t.type === 'revenu')
      .reduce((s, t) => s + (t.montant ?? 0), 0);

    prevDepenses = transactions
      .filter(t => {
        const search = recherche.trim().toLowerCase();
        const matchRecherche = search.length === 0 ? true : (t.categorie || '').toLowerCase().includes(search);
        const txCode = t.type === 'dépense' ? 'expense' : (t.type === 'revenu' ? 'income' : (t.type as any));
        const matchType = filtreType === 'tous' || txCode === filtreType;
        const txDate = new Date(t.date);
        const matchYear = String(txDate.getFullYear()) === String(prevDate.getFullYear());
        const matchMonth = txDate.getMonth() === prevDate.getMonth();
        const matchCategorie = categorie === 'Toutes' || t.categorie === categorie;
        const subName = (t as any).subcategoryName ?? (t as any).subCategory ?? '';
        const subId = (t as any).subcategoryId ?? (t as any).subCategoryId ?? (t as any).id_subcategory ?? null;
        const matchSous = sousCategorie === 'Toutes' || subName === sousCategorie || (subId !== null && String(subId) === String(sousCategorie));
        return matchRecherche && matchType && matchYear && matchMonth && matchCategorie && matchSous;
      })
      .filter(t => t.type === 'dépense')
      .reduce((s, t) => s + Math.abs(t.montant), 0);

    prevEpargne = transactionsFiltres
      .filter(t => isSavingsTx(t))
      .filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === prevDate.getFullYear() && d.getMonth() === prevDate.getMonth();
      })
      .reduce((s, t) => s + t.montant, 0);

  }

  const computeChangeLabel = (current: number, previous: number) => {
    if (previous === 0) return `— par rapport à ${prevLabelCapitalized}`;
    const pct = (current - previous) / Math.abs(previous) * 100;
    const sign = pct >= 0 ? '+' : '-';
    return `${sign}${Math.abs(pct).toFixed(2)}% par rapport à ${prevLabelCapitalized}`;
  };

  revenusChangeLabel = computeChangeLabel(totalRevenusReal, prevRevenus);
  depensesChangeLabel = computeChangeLabel(totalDepensesReal, prevDepenses);
  epargneChangeLabel = computeChangeLabel(totalEpargneReal, prevEpargne);

  const currentSolde = totalRevenusReal - totalDepensesReal;
  const prevSolde = prevRevenus - prevDepenses;
  soldeChangeLabel = computeChangeLabel(currentSolde, prevSolde);

  // Build items for the DESIGN_CARTE stats component
  const statsItems = [
    {
      title: 'Solde total',
      value: formatCurrency(currentSolde),
      change: soldeChangeLabel,
      comparison: `Total (incl. prévisionnel): ${formatCurrency(totals.resteADepenserAll)}`,
      trend: (currentSolde >= prevSolde) ? ('up' as 'up') : ('down' as 'down'),
      icon: Wallet,
      gradient: 'from-blue-500 via-blue-600 to-indigo-600',
      bgGradient: 'from-blue-50 to-indigo-50',
    },


    {
      title: 'Revenus',
      value: formatCurrency(totalRevenusReal),
      change: revenusChangeLabel,
      comparison: revenusChangeLabel,
      trend: (totalRevenusReal >= prevRevenus) ? ('up' as 'up') : ('down' as 'down'),
      icon: TrendingUp,
      gradient: 'from-emerald-500 via-green-500 to-teal-500',
      bgGradient: 'from-emerald-50 to-teal-50',
    },
    {
      title: 'Dépenses',
      value: formatCurrency(totalDepensesReal),
      change: depensesChangeLabel,
      comparison: depensesChangeLabel,
      trend: (totalDepensesReal >= prevDepenses) ? ('up' as 'up') : ('down' as 'down'),
      icon: TrendingDown,
      gradient: 'from-rose-500 via-pink-500 to-red-500',
      bgGradient: 'from-rose-50 to-pink-50',
    },
  ];

  // Données graphique évolution (extraites via utilitaire)
  const evolutionData = aggregateMonthlyEvolution(transactionsFiltres, locale);
  // determine X ticks to avoid label crowding (show ~6 ticks)
  const xTickStep = Math.max(1, Math.ceil(evolutionData.length / 6));
  evolutionData.forEach((d, i) => { (d as any).index = i; });
  const xTicksIndices = evolutionData.map((d, i) => (i % xTickStep === 0 ? i : null)).filter((v) => v !== null) as number[];

  // Économies cumulées + projections (utilitaire)
  // Use the filtered transactions (respect active UI filters) so the savings chart reflects selected scope
  const monthlySavings = computeMonthlySavingsAndProjections(transactionsFiltres, projMonths); // returns trimmed series with projections
  const lastRealPoint = monthlySavings.slice().reverse().find(m => m.real !== null && m.real !== undefined);
  const lastRealValue = lastRealPoint ? (lastRealPoint.real as number) : 0;

  // Trim displayed series so the chart ends at the 3rd projected month
  const displayEndDate = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + projMonths, 1);
  let displayedMonthlySavings = monthlySavings.filter(m => m.date <= displayEndDate);
  if (annee && annee !== 'Tous') {
    displayedMonthlySavings = displayedMonthlySavings.filter(m => (m.real !== null && String(m.date.getFullYear()) === String(annee)) || (typeof m.proj === 'number'));
  }
  // Total projected provisions for the next 3 months (display purpose)
  const projSumValue = displayedMonthlySavings.filter(m => typeof m.proj === 'number').reduce((sum, m) => sum + (m.proj ?? 0), 0);
  const savingsChartData = displayedMonthlySavings.map((m, i) => ({ index: i, name: m.label, real: m.real, proj: m.proj }));

  // Données par catégorie (utilitaire)
  const categoriesData = aggregateCategoryBreakdown(transactionsFiltres);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

  // Make loader reusable so modals can refresh goals after actions
  const loadGoals = async () => {
    try {
      setGoalsLoading(true);
      const res = await api.getObjectifsCrees();
      if (res.ok && res.data && res.data.objectifs_crees) {
        setGoalsList(res.data.objectifs_crees.map((g: any) => {
          const montant_objectif = parseFloat(g.montant_objectif);
          const montant_depose = parseFloat(g.total_collected ?? 0);
          const reste = montant_objectif - montant_depose;
          return {
            id: g.id_objectif,
            nom: g.name ?? g.nom,
            montant_objectif,
            montant_depose,
            reste,
            date_creation: g.date_creation ? new Date(g.date_creation) : null,
            ...g
          };
        }));
        setGoalsError(null);
      } else {
        setGoalsError('Impossible de charger les objectifs');
      }
    } catch (e) {
      setGoalsError('Erreur réseau');
    } finally {
      setGoalsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    loadGoals();
    return () => { mounted = false };
  }, []);

  // Modal state for withdraw / transfer
  const totalSavedGoals = goalsList.reduce((s, g) => s + (g.montant_depose ?? 0), 0);
  const goalsReachedCount = goalsList.filter(g => (g.reste ?? 0) <= 0).length;

  const estimateMonthsLeft = (g: any) => {
    // average monthly = montant_depose / months_since_creation
    const created = g.date_creation ? new Date(g.date_creation) : null;
    const monthsSince = created ? Math.max(1, Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24 * 30))) : 1;
    const avg = monthsSince > 0 ? (g.montant_depose ?? 0) / monthsSince : 0;
    const remaining = (g.montant_objectif ?? 0) - (g.montant_depose ?? 0);
    if (remaining <= 0) return 0;
    if (avg <= 0) return null; // can't estimate
    return Math.ceil(remaining / avg);
  };

  // Projections: maintenant gérées par `computeMonthlySavingsAndProjections` (fonction pure).

  // Correction de l'appel à WithdrawFromGoalModal (suppression de la prop 'categories')
  // Correction : englober tout le contenu du return dans un seul parent <div>
  return (
    <div>
      <div className="p-3 lg:p-6 space-y-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}>
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Statistiques</h2>
            <p className="text-sm text-gray-500 mt-1">Analysez vos finances en détail</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPeriode('semaine')}
              className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                periode === 'semaine'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Semaine
            </button>
            <button
              onClick={() => setPeriode('mois')}
              className={`px-4 py-2 rounded-xl transition-all ${
                periode === 'mois'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Mois
            </button>
            <button
              onClick={() => setPeriode('annee')}
              className={`px-4 py-2 rounded-xl transition-all ${
                periode === 'annee'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Année
            </button>
          </div>
        </div>

        {/* Mobile: render Filters card (collapsible by default) */}
        <div className="lg:hidden mt-3">
          <Filters
            recherche={recherche} setRecherche={setRecherche}
            annee={annee} setAnnee={setAnnee} mois={mois} setMois={setMois}
            filtreType={filtreType} setFiltreType={setFiltreType}
            categorie={categorie} setCategorie={setCategorie} sousCategorie={sousCategorie} setSousCategorie={setSousCategorie}
            types={types} categories={categories} subcategories={subcategories}
            categoriesLoading={categoriesLoading} subcategoriesLoading={subcategoriesLoading}
            anneesDisponibles={anneesDisponibles} onReset={resetFilters}
            storageKey="filters:stats-modern-mobile"
            defaultCollapsed={true}
            compact={true}
          />
        </div>

        {/* Desktop: always visible */}
        <div className="hidden lg:block mt-3">
          <Filters
            recherche={recherche} setRecherche={setRecherche}
            annee={annee} setAnnee={setAnnee} mois={mois} setMois={setMois}
            filtreType={filtreType} setFiltreType={setFiltreType}
            categorie={categorie} setCategorie={setCategorie} sousCategorie={sousCategorie} setSousCategorie={setSousCategorie}
            types={types} categories={categories} subcategories={subcategories}
            categoriesLoading={categoriesLoading} subcategoriesLoading={subcategoriesLoading}
            anneesDisponibles={anneesDisponibles} onReset={resetFilters}
            storageKey="filters:stats"
          />
        </div>

        {/* Cards stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3">
            <StatsCardsDesign items={statsItems} />
          </div>
        </div>

        {/* Goals summary widget */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="col-span-1 lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-sm font-semibold">Objectifs</h4>
                <p className="text-xs text-gray-500">Vue d'ensemble</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Atteints</div>
                <div className="text-xl font-bold">{goalsReachedCount}</div>
              </div>
            </div>
            <p className="mt-3 text-sm font-semibold text-gray-700">Total épargné sur objectifs: <strong>{formatCurrency(totalSavedGoals)}</strong></p>
          </div>

          <div className="col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h4 className="font-semibold mb-3">Projections par objectif</h4>
            <div className="space-y-3">
              {goalsLoading && <div>Chargement…</div>}
              {goalsError && <div className="text-sm text-red-600">{goalsError}</div>}
              {!goalsLoading && !goalsError && goalsList.length === 0 && <div className="text-sm text-gray-500">Aucun objectif</div>}
              {!goalsLoading && goalsList.slice(0,6).map((g:any) => {
                const monthsLeft = estimateMonthsLeft(g);
                return (
                  <div key={g.id} className="flex items-center justify-between">
                    <div className="flex-1 pr-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-gray-900">{g.nom}</div>
                        <div className="text-xs text-gray-500">{((g.montant_depose / Math.max(1,g.montant_objectif))*100).toFixed(0)}%</div>
                      </div>
                      <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div style={{ width: `${Math.min(100, Math.round((g.montant_depose / Math.max(1,g.montant_objectif))*100))}%` }} className="h-full bg-gradient-to-r from-blue-600 to-purple-600"></div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-36 text-right text-sm text-gray-600 mr-2">
                        {monthsLeft === 0 ? <div className="text-green-600 font-medium">Atteint</div> : (monthsLeft === null ? <div>—</div> : <div>{monthsLeft} mois</div>)}
                      </div>

                      {/* Withdraw funds */}
                      <button
                        title="Retirer des fonds"
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-gray-100 text-red-600"
                        onClick={() => { setActiveGoal(g); setWithdrawOpen(true); }}
                      >
                        <MinusCircle size={18} />
                      </button>

                      {/* Transfer to another goal */}
                      <button
                        title="Transférer vers un autre objectif"
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-gray-100 text-indigo-600"
                        onClick={() => { setActiveGoal(g); setTransferOpen(true); }}
                      >
                        <Repeat size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modals for withdraw / transfer */}
        <WithdrawFromGoalModal open={withdrawOpen} goal={activeGoal} onClose={() => setWithdrawOpen(false)} onDone={() => loadGoals()} />
        <TransferGoalModal open={transferOpen} fromGoal={activeGoal} goals={goalsList} onClose={() => setTransferOpen(false)} onDone={() => loadGoals()} />
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution mensuelle */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm">Évolution mensuelle</h3>
            <div className="flex gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--color-revenu)' }}></div>
                <span className="text-gray-600">Revenus</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--color-depense)' }}></div>
                <span className="text-gray-600">Dépenses</span>
              </div>
            </div>
          </div>

          <div className="h-48">
            <EvolutionChart data={evolutionData} formatCurrency={formatCurrency} chartsReady={chartsReady} locale={locale} />
          </div>
        </div>

        {/* Répartition par catégorie (Histogramme) */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-lg mb-6">Répartition des dépenses</h3>
          <div className="h-48">
            <CategoryChart data={categoriesData} formatCurrency={formatCurrency} colors={COLORS} />
          </div>
        </div>
      </div>

      {/* Évolution des économies cumulées (réel + provisions 3 mois) */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm">Évolution des économies cumulées</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Cumul réel</span>
              <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: lastRealValue >= 0 ? 'var(--card-bg-revenu)' : 'var(--card-bg-depense)', color: lastRealValue >= 0 ? 'var(--color-revenu-foreground)' : 'var(--color-depense-foreground)' }}>
                {formatCurrency(lastRealValue)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Provisions (3 mois)</span>
              <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: 'var(--card-bg-epargne)', color: 'var(--color-epargne-foreground)' }}>
                {formatCurrency(projSumValue)}
              </span>
            </div>
          </div>
        </div>
        <div className="h-56">
          <SavingsChart data={savingsChartData} formatCurrency={formatCurrency} monthlySavings={displayedMonthlySavings} chartsReady={chartsReady} locale={locale} />
        </div>
      </div>

      {/* Top catégories détaillées */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-lg mb-6">Détails par catégorie</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoriesData.slice(0, 6).map((cat, index) => (
            <div key={index} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: COLORS[index % COLORS.length] + '20' }}
                >
                  {cat.emoji}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{cat.categorie}</p>
                  <p className="text-sm text-gray-500">
                    {((cat.montant / (totals.depenses.real || 1)) * 100).toFixed(1)}% du total
                  </p>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(cat.montant)}</p>
              </div>
              <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${(cat.montant / (totals.depenses.real || 1)) * 100}%`,
                    backgroundColor: COLORS[index % COLORS.length]
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
