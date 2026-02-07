import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, TrendingDown, Calendar, Edit3, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import EditTransactionModal from './EditTransactionModal';
import StatsCardsDesign from './StatsCardsDesign';
import ChangeLabel from './ui/ChangeLabel';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Filters from './Filters';
import IconFromName from './IconFromName';
import BudgetRemainingCard from './BudgetRemainingCard';
import FinancialHealthCard from './FinancialHealthCard';
import FixedVsVariableExpensesCard from './FixedVsVariableExpensesCard';
import { computeTotals, isSavingsTx } from './statsUtils';
import { Transaction } from '../App';
import { usePreferences } from '../contexts/PreferencesContext';
import formatCurrency from '../../lib/formatCurrency';
import { matchesSearch } from './searchUtils';

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
  // Advanced full-text search on multiple fields (category, subcategory, note, amount, date)
  const transactionsFiltrees = transactions.filter(t => {
    const matchRecherche = matchesSearch(t, recherche);
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

  // For Revenus/Dépenses cards: apply current month/year as default filter if not explicitly set
  const now = new Date();
  const defaultAnnee = String(now.getFullYear());
  const defaultMois = String(now.getMonth() + 1);
  const transactionsRevenusDepenses = transactions.filter(t => {
    const matchRecherche = matchesSearch(t, recherche);
    const txCode = t.type === 'dépense' ? 'expense' : (t.type === 'revenu' ? 'income' : (t.type as any));
    const matchType = filtreType === 'tous' || txCode === filtreType;
    const txDate = new Date(t.date);
    // For Revenus/Dépenses: use current month/year by default, but respect explicit filter selections
    const effectiveAnnee = annee !== 'Tous' ? annee : defaultAnnee;
    const effectiveMois = mois !== 'Tous' ? mois : defaultMois;
    const matchAnnee = String(txDate.getFullYear()) === effectiveAnnee;
    const matchMois = (txDate.getMonth() + 1) === Number(effectiveMois);
    const matchCategorie = categorie === 'Toutes' || t.categorie === categorie;
    const subName = (t as any).subcategoryName ?? (t as any).subCategory ?? '';
    const subId = (t as any).subcategoryId ?? (t as any).subCategoryId ?? (t as any).id_subcategory ?? null;
    const matchSous = sousCategorie === 'Toutes' || subName === sousCategorie || (subId !== null && String(subId) === String(sousCategorie));
    const overall = matchRecherche && matchType && matchAnnee && matchMois && matchCategorie && matchSous;
    return overall;
  });

  // Calculs
  const totals = computeTotals(transactionsFiltrees, types);
  const totalsRevenusDepenses = computeTotals(transactionsRevenusDepenses, types);

  // Additional debug: log counts per type and computed totals (mobile-only)
  // debug logging removed (totals/sample types)



  const { locale, currency } = usePreferences();

  // Date courte (jour mois année), ex: "27 Décembre 2025" — capitalize first letter of month if needed
  const todayShort = new Date().toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
  const todayShortCapitalized = todayShort.replace(/\p{L}/u, c => c.toUpperCase());

  // Comparison labels vs previous month (respecting active filters)
  // ALWAYS compare with previous month, regardless of filters
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
  
  // Calculate previous month (always month-over-month comparison)
  const prevDate = new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1);
  const prevLabel = prevDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const prevLabelCapitalized = prevLabel.replace(/\p{L}/u, c => c.toUpperCase());
  
  let prevRevenus = 0;
  let prevDepenses = 0;
  let prevEpargne = 0;

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

  prevEpargne = transactions
    .filter(t => isSavingsTx(t))
    .filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === prevDate.getFullYear() && d.getMonth() === prevDate.getMonth();
    })
    .reduce((s, t) => s + t.montant, 0);

  const computeChangeLabel = (current: number, previous: number) => {
    if (previous === 0) return `— par rapport à ${prevLabelCapitalized}`;
    const pct = (current - previous) / Math.abs(previous) * 100;
    const sign = pct >= 0 ? '+' : '-';
    return `${sign}${Math.abs(pct).toFixed(2)}% par rapport à ${prevLabelCapitalized}`;
  };

  const revenusChangeLabel = computeChangeLabel(totalsRevenusDepenses.revenus.real, prevRevenus);
  const depensesChangeLabel = computeChangeLabel(totalsRevenusDepenses.depenses.real, prevDepenses);
  const totalEpargneReal = totals.epargne.real;
  const epargneChangeLabel = computeChangeLabel(totalEpargneReal, prevEpargne);

  // Solde total and Épargne should NOT be filtered by month/year — compute from ALL transactions
  const totalsGlobal = computeTotals(transactions, types);
  const soldeRealGlobal = totalsGlobal.revenus.real - totalsGlobal.depenses.real;
  const totalEpargneRealGlobal = totalsGlobal.epargne.real;
  
  // For comparison, we still use filtered values for Revenus/Dépenses
  const soldeReal = totalsGlobal.revenus.real - totalsGlobal.depenses.real;
  const soldeAll = totalsGlobal.revenus.total - totalsGlobal.depenses.total;
  const currentSolde = soldeRealGlobal;
  const prevSolde = prevRevenus - prevDepenses;
  const soldeChangeLabel = computeChangeLabel(currentSolde, prevSolde);


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
      trend: (soldeReal >= prevSolde) ? 'up' as const : 'down' as const,
      icon: Wallet,
      gradient: 'from-blue-500 via-blue-600 to-indigo-600',
      bgGradient: 'from-blue-50 to-indigo-50',
      valueColor: soldeReal > 0 ? 'green' as const : 'red' as const,
    },

    {
      title: 'Revenus',
      value: formatCurrency(totalsRevenusDepenses.revenus.real),
      change: revenusChangeLabel,
      comparison: '',
      trend: 'up' as const,
      icon: ArrowUpRight,
      gradient: 'from-emerald-500 via-green-500 to-teal-500',
      bgGradient: 'from-emerald-50 to-teal-50',
    },
    {
      title: 'Épargne',
      value: formatCurrency(totalEpargneRealGlobal),
      change: epargneChangeLabel,
      comparison: '',
      trend: (totalEpargneRealGlobal >= prevEpargne) ? 'up' as const : 'down' as const,
      icon: TrendingUp,
      gradient: 'from-indigo-500 via-indigo-600 to-purple-600',
      bgGradient: 'from-indigo-50 to-purple-50',
    },
    {
      title: 'Dépenses',
      value: formatCurrency(totalsRevenusDepenses.depenses.real),
      change: depensesChangeLabel,
      comparison: '',
      trend: 'down' as const,
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
      {/* (debug banner removed) */}

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Financial Health Score - First position */}
        <div>
          <FinancialHealthCard
            transactions={transactionsFiltrees}
            totalsRevenusDepenses={totalsRevenusDepenses}
            soldeReal={soldeReal}
            tauxEpargne={tauxEpargne}
            locale={locale}
          />
        </div>

        {/* Transactions à venir */}
        <div tabindex="0" className="group relative bg-white rounded-2xl md:rounded-3xl shadow-lg border border-gray-200 p-5 md:p-6 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex flex-col h-96 lg:h-auto lg:min-h-80">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50 opacity-0 group-hover:opacity-100 group-active:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300" />
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 md:mb-5">
              <div className="flex-1">
                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1">Transaction à venir</h3>
                <p className="text-xs md:text-sm text-gray-500">— {upcomingMonthLabelCapitalized}</p>
              </div>
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-600 flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110 group-hover:rotate-3 flex-shrink-0">
                <Calendar size={24} className="text-white" />
              </div>
            </div>
            
            <div className="overflow-y-auto flex-1 pr-2 max-h-60 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded-lg hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
              <div className="space-y-2">
                {upcomingTransactions.length === 0 ? (
                  <p className="text-sm text-gray-500">Aucune transaction prévue pour le reste du mois.</p>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-700 mb-3">{upcomingTransactions.length} prévues ({formatCurrency(upcomingExpensesTotal)})</p>
                    {upcomingTransactions.map(tx => {
                      const subName = (tx as any).subcategoryName ?? (tx as any).subCategory ?? tx.categorie;
                      return (
                        <div key={tx.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: tx.type === 'revenu' ? 'var(--card-bg-revenu)' : tx.type === 'dépense' ? 'var(--card-bg-depense)' : 'var(--card-bg-epargne)', color: tx.type === 'revenu' ? 'var(--color-revenu)' : tx.type === 'dépense' ? 'var(--color-depense)' : 'var(--color-epargne)' }}>
                              <IconFromName name={tx.subcategory_icon} fallback={tx.emoji || '📅'} size={18} />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{subName}</p>
                              <p className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="font-bold text-sm" style={{ color: tx.type === 'dépense' ? 'var(--color-depense)' : 'var(--color-revenu)' }}>
                              {tx.type === 'revenu' ? '+' : ''}{formatCurrency(tx.montant)}
                            </div>
                            <div className="flex items-center gap-2 text-gray-500">
                              <button onClick={()=>openEdit(tx)} title="Modifier" className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-md hover:bg-gray-50"><Edit3 size={16} /></button>
                              <button onClick={()=>confirmDelete(tx.id)} title="Supprimer" className="min-h-[32px] min-w-[32px] flex items-center justify-center text-red-600 rounded-md hover:bg-red-50"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="absolute -right-3 -bottom-3 w-16 h-16 md:w-24 md:h-24 md:-right-6 md:-bottom-6 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-600 opacity-5 group-hover:opacity-10 transition-opacity" />
        </div>  



        {editing && (<EditTransactionModal open={!!editing} transaction={editing} onClose={closeEdit} onSave={async (payload)=>{ if (!onEdit) { console.warn('onEdit handler not provided'); closeEdit(); return; } try { await onEdit(payload); } catch (e) { console.error('save edit error', e); } closeEdit(); }} types={types} categories={categories} subcategories={subcategories} />)}
        
        {/* Dépenses fixes vs variables - replaces Top catégories */}
        <div>
          <FixedVsVariableExpensesCard 
            transactions={transactions}
            locale={locale}
            annee={annee}
            mois={mois}
          />
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
      </div>


    </div>
  );
}