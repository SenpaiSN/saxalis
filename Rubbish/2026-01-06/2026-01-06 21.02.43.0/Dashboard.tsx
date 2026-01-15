import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, TrendingDown, Calendar, Edit3, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import EditTransactionModal from './EditTransactionModal';
import StatsCardsDesign from './StatsCardsDesign';
import ChangeLabel from './ui/ChangeLabel';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Filters from './Filters';
import IconFromName from './IconFromName';
import BudgetRemainingCard from './BudgetRemainingCard';
import { computeTotals, isSavingsTx } from './statsUtils';
import { Transaction } from '../App';
import { usePreferences } from '../contexts/PreferencesContext';

function normalize(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

interface DashboardProps {
  transactions: Transaction[];
  // shared filters (from App)
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
  onReset: () => void;
  onDelete?: (id: string) => any;
  onEdit?: (payload: any) => any;
  currentUser?: any;

}

export default function Dashboard({ transactions,
  recherche, setRecherche, annee, setAnnee, mois, setMois,
  filtreType, setFiltreType, categorie, setCategorie, sousCategorie, setSousCategorie,
  types, categories, subcategories, categoriesLoading, subcategoriesLoading, anneesDisponibles, onReset
  , onDelete, onEdit, currentUser
}: DashboardProps) {
  // Recherche plein texte avancée sur tous les champs principaux
  const rechercheNorm = normalize(recherche);
  const transactionsFiltrees = transactions.filter(t => {
    const fields = [
      t.note,
      t.categorie,
      t.subcategoryName,
      String(t.montant),
      t.date
    ].map(v => normalize(String(v ?? ''))).join(' ');
    const matchRecherche = rechercheNorm.length === 0 ? true : fields.includes(rechercheNorm);
    const txCode = t.type === 'dépense' ? 'expense' : (t.type === 'revenu' ? 'income' : (t.type as any));
    const matchType = filtreType === 'tous' || txCode === filtreType;
    const txDate = new Date(t.date);
    const effectiveAnnee = annee;
    const effectiveMois = mois;
    const matchAnnee = effectiveAnnee === 'Tous' || String(txDate.getFullYear()) === effectiveAnnee;
    const matchMois = effectiveMois === 'Tous' || (effectiveMois !== 'Tous' && (txDate.getMonth() + 1) === Number(effectiveMois));
    const matchCategorie = categorie === 'Toutes' || t.categorie === categorie;
    const subName = (t as any).subcategoryName ?? (t as any).subCategory ?? '';
    const subId = (t as any).subcategoryId ?? (t as any).subCategoryId ?? (t as any).id_subcategory ?? null;
    const matchSous = sousCategorie === 'Toutes' || subName === sousCategorie || (subId !== null && String(subId) === String(sousCategorie));
    const overall = matchRecherche && matchType && matchAnnee && matchMois && matchCategorie && matchSous;
    return overall;
  });

  // Calculs
  const totals = computeTotals(transactionsFiltrees, types);

  // Additional debug: log counts per type and computed totals (mobile-only)
  // debug logging removed (totals/sample types)



  const { locale, currency } = usePreferences();

  // Date courte (jour mois année), ex: "27 Décembre 2025" — capitalize first letter of month if needed
  const todayShort = new Date().toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
  const todayShortCapitalized = todayShort.replace(/\p{L}/u, c => c.toUpperCase());

  // Comparison labels vs previous month (respecting active filters)
  const refDate = (() => {
    const now = new Date();
    let y = now.getFullYear();
    let m = now.getMonth() + 1;
    const effectiveAnnee = annee;
    const effectiveMois = mois;
    if (effectiveAnnee && effectiveAnnee !== 'Tous') y = Number(effectiveAnnee);
    if (effectiveMois && effectiveMois !== 'Tous') m = Number(effectiveMois);
    return new Date(y, m - 1, 1);
  })();
  // Reference: monthly comparison when a month is selected, otherwise annual comparison (year-over-year)
  const isAnnual = !mois || mois === 'Tous';
  let prevLabelCapitalized = '';
  let prevRevenus = 0;
  let prevDepenses = 0;
  let prevEpargne = 0;

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

    prevEpargne = transactionsFiltrees
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

  const revenusChangeLabel = computeChangeLabel(totals.revenus.real, prevRevenus);
  const depensesChangeLabel = computeChangeLabel(totals.depenses.real, prevDepenses);
  const totalEpargneReal = totals.epargne.real;
  const epargneChangeLabel = computeChangeLabel(totalEpargneReal, prevEpargne);

  const soldeReal = totals.revenus.real - totals.depenses.real;
  const soldeAll = totals.revenus.total - totals.depenses.total;
  const currentSolde = soldeReal;
  const prevSolde = prevRevenus - prevDepenses;
  const soldeChangeLabel = computeChangeLabel(currentSolde, prevSolde);

  const formatCurrency = (v: number) => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(v);

  // Compute épargne rate only when we have revenues; otherwise keep null to hide the badge
  const tauxEpargneValue = totals.revenus.real > 0 ? (soldeReal / totals.revenus.real) * 100 : null;
  const tauxEpargne = typeof tauxEpargneValue === 'number' ? `${tauxEpargneValue >= 0 ? '+' : '-'}${Math.abs(tauxEpargneValue).toFixed(1)}` : null;

  // statsItems moved below to compute monthly forecast using upcoming expenses
  // Removed temporary filter diagnostics (cleanup)
  const filterDiagnostics = { rechercheOk: 0, typeOk: 0, anneeOk: 0, moisOk: 0, categorieOk: 0, sousOk: 0 };


  // Données graphique mensuel (placeholder static for now)
  const graphData = [
    { mois: 'Jan', revenus: 3200, depenses: 2400 },
    { mois: 'Fév', revenus: 3400, depenses: 2600 },
    { mois: 'Mar', revenus: 3300, depenses: 2500 },
    { mois: 'Avr', revenus: 3500, depenses: 2700 },
    { mois: 'Mai', revenus: 3600, depenses: 2800 },
    { mois: 'Juin', revenus: 3750, depenses: 2650 },
  ];

  // Données par catégorie (appliquées aux transactions filtrées)
  const categoriesData = transactionsFiltrees
    .filter(t => t.type === 'dépense')
    .reduce((acc: any[], t) => {
      const existing = acc.find(c => c.categorie === t.categorie);
      if (existing) {
        existing.montant += Math.abs(t.montant);
      } else {
        acc.push({ categorie: t.categorie, montant: Math.abs(t.montant), emoji: t.emoji });
      }
      return acc;
    }, [])
    .sort((a, b) => b.montant - a.montant)
    .slice(0, 4);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

  // Upcoming transactions within the current month (forecast window)
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  // compute end of current month (last day at 23:59:59.999)
  const endOfMonth = new Date(endOfToday.getFullYear(), endOfToday.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);

  // Use global month/year filters for the upcoming transactions (defaults to current month when not set)
  const selectedYear = (annee && annee !== 'Tous') ? Number(annee) : endOfToday.getFullYear();
  const selectedMonthIndex = (mois && mois !== 'Tous') ? (Number(mois) - 1) : endOfToday.getMonth();
  const startOfSelectedMonth = new Date(selectedYear, selectedMonthIndex, 1);
  startOfSelectedMonth.setHours(0, 0, 0, 0);
  const endOfSelectedMonth = new Date(selectedYear, selectedMonthIndex + 1, 0);
  endOfSelectedMonth.setHours(23, 59, 59, 999);

  // If the selected month is in the past compared to current month, don't show upcoming transactions
  const selectedIsBeforeCurrent = (selectedYear < endOfToday.getFullYear()) || (selectedYear === endOfToday.getFullYear() && selectedMonthIndex < endOfToday.getMonth());

  const upcomingTransactions = selectedIsBeforeCurrent ? [] : transactionsFiltrees
    .filter(t => {
      if (!t || !t.date) return false;
      const d = new Date(t.date);
      // only show future transactions falling within the selected month
      return d > endOfToday && d >= startOfSelectedMonth && d <= endOfSelectedMonth;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Totals (split revenue / expenses) — hide revenue total per request
  const upcomingExpensesTotal = upcomingTransactions.filter(t => t.type === 'dépense').reduce((s, t) => s + Math.abs(t.montant ?? 0), 0);

  // Forecast at end of month = current real balance minus upcoming expenses in selected month
  const previsionFinDeMois = soldeReal - upcomingExpensesTotal;

  const statsItems = [
    {
      title: 'Solde total',
      value: formatCurrency(soldeReal),
      change: soldeChangeLabel,
      comparison: `Prévision en fin de mois: ${formatCurrency(previsionFinDeMois)}`,
      trend: (soldeReal >= prevSolde) ? 'up' : 'down',
      icon: Wallet,
      gradient: 'from-blue-500 via-blue-600 to-indigo-600',
      bgGradient: 'from-blue-50 to-indigo-50',
    },

    {
      title: 'Revenus',
      value: formatCurrency(totals.revenus.real),
      change: revenusChangeLabel,
      comparison: '',
      trend: 'up',
      icon: ArrowUpRight,
      gradient: 'from-emerald-500 via-green-500 to-teal-500',
      bgGradient: 'from-emerald-50 to-teal-50',
    },
    {
      title: 'Épargne',
      value: formatCurrency(totalEpargneReal),
      change: epargneChangeLabel,
      comparison: epargneChangeLabel,
      trend: (totalEpargneReal >= prevEpargne) ? 'up' : 'down',
      icon: TrendingUp,
      gradient: 'from-indigo-500 via-indigo-600 to-purple-600',
      bgGradient: 'from-indigo-50 to-purple-50',
    },
    {
      title: 'Dépenses',
      value: formatCurrency(totals.depenses.real),
      change: depensesChangeLabel,
      comparison: '',
      trend: 'down',
      icon: ArrowDownRight,
      gradient: 'from-rose-500 via-pink-500 to-red-500',
      bgGradient: 'from-rose-50 to-pink-50',
    },
  ];

  // small month label from selected filters
  const upcomingMonthLabel = startOfSelectedMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const upcomingMonthLabelCapitalized = upcomingMonthLabel.replace(/\p{L}/u, c => c.toUpperCase());

  // Edit modal state (transaction to edit)
  const [editing, setEditing] = useState<Transaction | null>(null);
  const openEdit = (tx: Transaction) => setEditing(tx);
  const closeEdit = () => setEditing(null);

  const confirmDelete = async (id: string) => {
    if (!onDelete) return;
    if (!window.confirm('Supprimer cette transaction ?')) return;
    try { await onDelete(id); } catch (e) { console.error('delete error', e); }
  };



  return (
    <div className="p-3 lg:p-6 space-y-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Bonjour {currentUser?.firstName ?? 'Invité'} 👋</h2>
          <p className="text-sm text-gray-500 mt-1">Voici un aperçu de vos finances</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar size={18} />
          <span className="whitespace-normal break-words">{todayShortCapitalized}</span>
        </div>
      </div>

      {/* Mobile: use the History-style filter card (collapsed by default) */}
      <div className="lg:hidden mt-3">
        <Filters
          recherche={recherche} setRecherche={setRecherche}
          annee={annee} setAnnee={setAnnee} mois={mois} setMois={setMois}
          filtreType={filtreType} setFiltreType={setFiltreType}
          categorie={categorie} setCategorie={setCategorie} sousCategorie={sousCategorie} setSousCategorie={setSousCategorie}
          types={types} categories={categories} subcategories={subcategories}
          categoriesLoading={categoriesLoading} subcategoriesLoading={subcategoriesLoading}
          anneesDisponibles={anneesDisponibles} onReset={onReset}
          storageKey="filters:dashboard-mobile"
          defaultCollapsed={true}
        />


      </div>

      {/* Desktop: keep filters always visible */}
      <div className="hidden lg:block mt-3">
        <Filters
          recherche={recherche} setRecherche={setRecherche}
          annee={annee} setAnnee={setAnnee} mois={mois} setMois={setMois}
          filtreType={filtreType} setFiltreType={setFiltreType}
          categorie={categorie} setCategorie={setCategorie} sousCategorie={sousCategorie} setSousCategorie={setSousCategorie}
          types={types} categories={categories} subcategories={subcategories}
          categoriesLoading={categoriesLoading} subcategoriesLoading={subcategoriesLoading}
          anneesDisponibles={anneesDisponibles} onReset={onReset}
          storageKey="filters:dashboard"
        />
      </div>

      {/* Cards principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-3">
          <StatsCardsDesign items={statsItems} />
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graphique principal */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--card)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border)', borderRadius: 'var(--card-border-radius)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-sm">Transaction à venir <span className="ml-2 text-sm font-medium text-gray-500">— {upcomingMonthLabelCapitalized}</span></h3>
            </div>
            <div className="flex gap-3 items-center text-xs">
              <span className="text-gray-600">{upcomingTransactions.length} prévues {upcomingTransactions.length > 0 ? <span className="text-gray-600">({formatCurrency(upcomingExpensesTotal)})</span> : null}</span>
            </div>
          </div>
          <div className="h-48 overflow-y-auto">
            <div className="space-y-2">
              {upcomingTransactions.length === 0 ? (
                <p className="text-sm text-gray-500">Aucune transaction prévue pour le reste du mois.</p>
              ) : (
                upcomingTransactions.map(tx => {
                  const subName = (tx as any).subcategoryName ?? (tx as any).subCategory ?? (tx as any).subCategory ?? tx.categorie;
                  return (
                    <div key={tx.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: tx.type === 'revenu' ? 'var(--card-bg-revenu)' : tx.type === 'dépense' ? 'var(--card-bg-depense)' : 'var(--card-bg-epargne)', color: tx.type === 'revenu' ? 'var(--color-revenu)' : tx.type === 'dépense' ? 'var(--color-depense)' : 'var(--color-epargne)' }}>
                          <IconFromName name={tx.subcategory_icon} fallback={tx.emoji || '📅'} size={18} />
                        </div>
                        <div>
                          <p className="font-medium">{subName}</p>
                          <p className="text-sm text-gray-500">{new Date(tx.date).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="font-bold" style={{ color: tx.type === 'dépense' ? 'var(--color-depense)' : 'var(--color-revenu)' }}>
                          {tx.type === 'revenu' ? '+' : ''}{formatCurrency(tx.montant)}
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                          <button onClick={()=>openEdit(tx)} title="Modifier" className="p-1 rounded-md hover:bg-gray-50"><Edit3 size={16} /></button>
                          <button onClick={()=>confirmDelete(tx.id)} title="Supprimer" className="p-1 text-red-600 rounded-md hover:bg-red-50"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>  



        {editing && (<EditTransactionModal open={!!editing} transaction={editing} onClose={closeEdit} onSave={async (payload)=>{ if (!onEdit) { console.warn('onEdit handler not provided'); closeEdit(); return; } try { await onEdit(payload); } catch (e) { console.error('save edit error', e); } closeEdit(); }} types={types} categories={categories} subcategories={subcategories} />)}
        {/* Top catégories */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--card)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border)', borderRadius: 'var(--card-border-radius)' }}>
          <h3 className="font-bold text-sm mb-4">Top Catégories</h3>
          <div className="space-y-4">
            {categoriesData.map((cat, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: COLORS[index] + '20' }}>
                  {cat.emoji}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">{cat.categorie}</span>
                    <span className="text-sm font-bold">{formatCurrency(cat.montant)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${(cat.montant / (totals.depenses.real || 1)) * 100}%`,
                        backgroundColor: COLORS[index]
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Budget remaining (new) */}
        <div>
          {/* @ts-ignore */}
          <BudgetRemainingCard
            recherche={recherche}
            // Force the budget remaining card to always use the current month
            annee={String(endOfToday.getFullYear())}
            mois={String(endOfToday.getMonth() + 1)}
            filtreType={filtreType}
            categorie={categorie}
            sousCategorie={sousCategorie}
          />
        </div>

        {/* Transactions récentes (moved into grid) */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--card)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border)', borderRadius: 'var(--card-border-radius)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm">Transactions récentes</h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">Voir tout</button>
          </div>
          <div className="h-48 overflow-y-auto">
            <div className="space-y-2">
              {transactions.slice(0, 20).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: transaction.type === 'revenu' ? 'var(--card-bg-revenu)' : transaction.type === 'dépense' ? 'var(--card-bg-depense)' : 'var(--card-bg-epargne)', color: transaction.type === 'revenu' ? 'var(--color-revenu)' : transaction.type === 'dépense' ? 'var(--color-depense)' : 'var(--color-epargne)' }}>
                    <IconFromName name={transaction.subcategory_icon} fallback={transaction.emoji || '💰'} size={18} />
                    </div>
                    <div>
                      <p className="font-medium">{transaction.subcategoryName ?? transaction.categorie}</p>
                      {transaction.subcategoryName ? <p className="text-sm text-gray-500">{transaction.categorie}</p> : null}
                      <p className="text-sm text-gray-500">
                        {new Date(transaction.date).toLocaleDateString(locale, {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="font-bold" style={{ color: transaction.type === 'dépense' ? 'var(--color-depense)' : 'var(--color-revenu)' }}>
                    {transaction.type === 'revenu' ? '+' : ''}{formatCurrency(transaction.montant)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}
