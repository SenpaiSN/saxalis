import { useState, useEffect } from 'react';
import { Download, TrendingDown, TrendingUp, Edit3, Trash2, X, Eye, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import StatsCardsDesign from './StatsCardsDesign';
import InvoicePreviewModal from './InvoicePreviewModal';
import EditTransactionModal from './EditTransactionModal';
import { Transaction } from '../App';
import IconFromName from './IconFromName';
import Filters from './Filters';
import { usePreferences } from '../contexts/PreferencesContext';
import formatCurrency from '../../lib/formatCurrency';
import * as api from '../../services/api';
import { computeTotals, isRealTransaction } from './statsUtils';
import { matchesSearch } from './searchUtils';

interface TransactionsModernProps {
  transactions: Transaction[]; // filtered transactions provided by App
  // filters (shared)
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


  // optional handlers provided by App
  onDelete?: (id: string) => any;
  onEdit?: (payload: { id: string; Date: string; Type: string; Catégorie: string; SousCatégorie: string; Montant: number; Notes?: string }) => any;
}

export default function TransactionsModern({ transactions,
  recherche, setRecherche, annee, setAnnee, mois, setMois,
  filtreType, setFiltreType, categorie, setCategorie, sousCategorie, setSousCategorie,
  types, categories, subcategories, categoriesLoading, subcategoriesLoading, anneesDisponibles, resetFilters,
  onDelete, onEdit
 }: TransactionsModernProps) {

  // Filter transactions with advanced search + other filters
  const transactionsAllFiltered = transactions
    .filter(t => {
      const matchRecherche = matchesSearch(t, recherche);
      // map local display type ('dépense'|'revenu') back to API codes ('expense'|'income')
      const txCode = t.type === 'dépense' ? 'expense' : (t.type === 'revenu' ? 'income' : t.type);
      const matchType = filtreType === 'tous' || txCode === filtreType;
      const txDate = new Date(t.date);

      // When no filters are selected we do NOT default to current month/year — keep the 'Tous' semantics
      const noFiltersSelected = recherche.trim().length === 0 && filtreType === 'tous' && categorie === 'Toutes' && sousCategorie === 'Toutes' && annee === 'Tous' && mois === 'Tous';
      const effectiveAnnee = annee;
      const effectiveMois = mois;

      const matchAnnee = effectiveAnnee === 'Tous' || String(txDate.getFullYear()) === effectiveAnnee;
      const txMonth = String(txDate.getMonth() + 1).padStart(2, '0');
      const matchMois = effectiveMois === 'Tous' || txMonth === effectiveMois;
      const matchCategorie = categorie === 'Toutes' || t.categorie === categorie;
      const subName = (t as any).subcategoryName ?? (t as any).subCategory ?? '';
      const subId = (t as any).subcategoryId ?? (t as any).subCategoryId ?? (t as any).id_subcategory ?? null;
      const matchSous = sousCategorie === 'Toutes' || subName === sousCategorie || (subId !== null && String(subId) === String(sousCategorie));
      const overall = matchRecherche && matchType && matchAnnee && matchMois && matchCategorie && matchSous;
      return overall;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // subset used for indicators (exclude future transactions)
  const transactionsFiltrees = transactionsAllFiltered.filter(isRealTransaction);

  // detect if the selected period ends after today -> treat as future period
  const isFuturePeriodSelected = (() => {
    if (annee === 'Tous') return false;
    const year = Number(annee);
    if (isNaN(year)) return false;
    const monthIndex = mois === 'Tous' ? 11 : (Number(mois) - 1);
    const periodEnd = new Date(year, monthIndex + 1, 0); // last day of month/year
    periodEnd.setHours(23, 59, 59, 999);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    return periodEnd > endOfToday;
  })();

  const [showForecasts, setShowForecasts] = useState<boolean>(() => Boolean(isFuturePeriodSelected));

  useEffect(() => {
    // if period selection changes, sync the showForecasts default
    if (isFuturePeriodSelected) setShowForecasts(true);
    else setShowForecasts(false);
  }, [isFuturePeriodSelected]);

  const displayedTransactions = showForecasts ? transactionsAllFiltered : transactionsFiltrees;

  const { locale, currency } = usePreferences();

  // Grouper par date (use displayed transactions for the main list)
  const transactionsParDate: { [key: string]: Transaction[] } = {};
  displayedTransactions.forEach(transaction => {
    const dateKey = new Date(transaction.date).toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    if (!transactionsParDate[dateKey]) {
      transactionsParDate[dateKey] = [];
    }
    transactionsParDate[dateKey].push(transaction);
  });



  // Calculer les totaux (séparés Réel / Prévisionnel)
  const totals = computeTotals(transactionsFiltrees, types);

  // For Revenus/Dépenses cards: apply current month/year as default filter if not explicitly set
  const now = new Date();
  const defaultAnnee = String(now.getFullYear());
  const defaultMois = String(now.getMonth() + 1);
  
  // For current month display: include revenus/dépenses until end of month (including forecasts)
  const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  
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
    
    // For current month: include transactions up to end of month (even if in future)
    // For other months: keep strict date filtering
    let matchDate = true;
    if (effectiveAnnee === defaultAnnee && effectiveMois === defaultMois) {
      // Current month: include everything until end of month
      matchDate = txDate <= endOfCurrentMonth;
    } else {
      // Other months: use default behavior (only past transactions)
      matchDate = true; // Already filtered by year/month above
    }
    
    const matchCategorie = categorie === 'Toutes' || t.categorie === categorie;
    const subName = (t as any).subcategoryName ?? (t as any).subCategory ?? '';
    const subId = (t as any).subcategoryId ?? (t as any).subCategoryId ?? (t as any).id_subcategory ?? null;
    const matchSous = sousCategorie === 'Toutes' || subName === sousCategorie || (subId !== null && String(subId) === String(sousCategorie));
    const overall = matchRecherche && matchType && matchAnnee && matchMois && matchDate && matchCategorie && matchSous;
    return overall;
  });
  const totalsRevenusDepenses = computeTotals(transactionsRevenusDepenses, types);

  // Calculate previous month (always month-over-month comparison)
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

  const prevDate = new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1);
  const prevLabel = prevDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const prevLabelCapitalized = prevLabel.replace(/\p{L}/u, c => c.toUpperCase());

  const prevRevenus = transactionsFiltrees
    .filter(t => {
      const txDate = new Date(t.date);
      const matchYear = String(txDate.getFullYear()) === String(prevDate.getFullYear());
      const matchMonth = txDate.getMonth() === prevDate.getMonth();
      return matchYear && matchMonth && (t.type === 'revenu');
    })
    .reduce((s, t) => s + (t.montant ?? 0), 0);

  const prevDepenses = transactionsFiltrees
    .filter(t => {
      const txDate = new Date(t.date);
      const matchYear = String(txDate.getFullYear()) === String(prevDate.getFullYear());
      const matchMonth = txDate.getMonth() === prevDate.getMonth();
      return matchYear && matchMonth && (t.type === 'dépense');
    })
    .reduce((s, t) => s + Math.abs(t.montant), 0);

  const computeChangeLabel = (current: number, previous: number) => {
    if (previous === 0) return `— par rapport à ${prevLabelCapitalized}`;
    const pct = (current - previous) / Math.abs(previous) * 100;
    const sign = pct >= 0 ? '+' : '-';
    return `${sign}${Math.abs(pct).toFixed(2)}% par rapport à ${prevLabelCapitalized}`;
  };

  // For current month: include both real and forecast revenus (to show anticipated income)
  // For other months: show only real transactions
  const effectiveAnnee = annee !== 'Tous' ? annee : defaultAnnee;
  const effectiveMois = mois !== 'Tous' ? mois : defaultMois;
  const isCurrentMonthDisplayed = effectiveAnnee === defaultAnnee && effectiveMois === defaultMois;
  const revenusDisplayed = isCurrentMonthDisplayed 
    ? (totalsRevenusDepenses.revenus.real + totalsRevenusDepenses.revenus.forecast)
    : totalsRevenusDepenses.revenus.real;

  const revenusChangeLabel = computeChangeLabel(revenusDisplayed, prevRevenus);
  const depensesChangeLabel = computeChangeLabel(totalsRevenusDepenses.depenses.real, prevDepenses);
  
  // Calculate long-term savings (Natixis) to exclude from "Économies réalisées"
  const epargneLongTermeTotal = transactionsRevenusDepenses
    .filter(t => {
      const type = String(t.type || '').toLowerCase();
      const cat = String(t.categorie || '').toLowerCase();
      return (type === 'epargne' || type === 'épargne' || type === 'savings') && cat.includes('natixis');
    })
    .reduce((sum, t) => sum + (Number(t.montant) || 0), 0);
  
  const totalEpargneRealLiquid = totalsRevenusDepenses.epargne.real - epargneLongTermeTotal;
  const soldeReal = totalsRevenusDepenses.revenus.real - totalsRevenusDepenses.depenses.real - totalEpargneRealLiquid;
  
  // Previous month savings (liquid only, excluding Natixis)
  const prevEpargne = transactionsFiltrees
    .filter(t => {
      const txDate = new Date(t.date);
      const matchYear = String(txDate.getFullYear()) === String(prevDate.getFullYear());
      const matchMonth = txDate.getMonth() === prevDate.getMonth();
      const type = String(t.type || '').toLowerCase();
      const cat = String(t.categorie || '').toLowerCase();
      return matchYear && matchMonth && (type === 'epargne' || type === 'épargne' || type === 'savings') && !cat.includes('natixis');
    })
    .reduce((s, t) => s + (t.montant ?? 0), 0);
  
  const prevSolde = prevRevenus - prevDepenses - prevEpargne;
  const soldeChangeLabel = computeChangeLabel(soldeReal, prevSolde);

  // Upcoming transactions within the current month (forecast window)
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

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

  // Totals (split revenue / expenses)
  const upcomingExpensesTotal = upcomingTransactions.filter(t => t.type === 'dépense').reduce((s, t) => s + Math.abs(t.montant ?? 0), 0);

  // Forecast at end of month = current real balance minus upcoming expenses in selected month
  const previsionFinDeMois = soldeReal - upcomingExpensesTotal;

  // Calculate revenues by category for details (exclude Salaire)
  const revenuesByCategory = transactionsRevenusDepenses
    .filter(t => t.type === 'revenu' && t.subcategoryName !== 'Salaire')
    .reduce((acc: Record<string, number>, t) => {
      // Use subcategory name if available, otherwise use category
      const detail = t.subcategoryName || t.categorie || 'Autre';
      acc[detail] = (acc[detail] ?? 0) + (t.montant ?? 0);
      return acc;
    }, {});

  // Build revenue details string (top 3 categories, sorted by amount, excluding 0€ amounts)
  const revenueDetails = Object.entries(revenuesByCategory)
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([detail, amount]) => `${formatCurrency(amount)} de ${detail}`)
    .join(', ');

  const revenuesComparison = revenueDetails ? `dont ${revenueDetails}` : '';

  const statsItems = [
    {
      title: 'Économies réalisées',
      subtitle: '(hors épargne & placements)',
      value: formatCurrency(soldeReal),
      change: soldeChangeLabel,
      comparison: `Prévision en fin de mois: ${formatCurrency(previsionFinDeMois)}`,
      trend: (soldeReal >= prevSolde) ? 'up' : 'down',
      icon: Wallet,
      gradient: 'from-blue-500 via-blue-600 to-indigo-600',
      bgGradient: 'from-blue-50 to-indigo-50',
      valueColor: soldeReal > 0 ? 'green' : 'red',
    },
    {
      title: 'Revenus',
      value: formatCurrency(revenusDisplayed),
      change: revenusChangeLabel,
      comparison: revenuesComparison,
      trend: 'up',
      icon: ArrowUpRight,
      gradient: 'from-emerald-500 via-green-500 to-teal-500',
      bgGradient: 'from-emerald-50 to-teal-50',
    },
    {
      title: 'Dépenses',
      value: formatCurrency(totalsRevenusDepenses.depenses.real),
      change: depensesChangeLabel,
      comparison: '',
      trend: 'down',
      icon: ArrowDownRight,
      gradient: 'from-rose-500 via-pink-500 to-red-500',
      bgGradient: 'from-rose-50 to-pink-50',
    },
  ];

  // edit modal state (transaction to edit)
  const [editing, setEditing] = useState<Transaction | null>(null);

  // invoice preview modal state
  const [invoicePreview, setInvoicePreview] = useState<{ urls: string[]; initialIndex: number } | null>(null);
  const openPreview = (urls: string[], index = 0) => setInvoicePreview({ urls, initialIndex: index });
  const closePreview = () => setInvoicePreview(null);

  const openEdit = (t: Transaction) => setEditing(t);

  const closeEdit = () => {
    setEditing(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!onEdit) {
      console.warn('onEdit handler not provided');
      closeEdit();
      return;
    }

    const payload = {
      id: editing.id,
      Date: `${editDate} ${editTime}:00`,
      Type: editType,
      Catégorie: editCategorie,
      SousCatégorie: editSousCategorie,
      Montant: editMontant,
      Notes: editNotes
    };

    try { await onEdit(payload); } catch (e) { console.error('saveEdit error', e); }
    closeEdit();
  };

  const confirmDelete = async (id: string) => {
    if (!onDelete) return;
    if (!window.confirm('Supprimer cette transaction ?')) return;
    try { await onDelete(id); } catch (e) { console.error('delete error', e); }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">Historique</h2>
          <div className="flex items-center gap-4">
            <p className="text-gray-500 mt-1">{transactionsAllFiltered.length} transactions</p>
          </div>
        </div>

      </div>

      {/* Barre de recherche et filtres */}
      {/* Mobile & Desktop: use shared Filters component to avoid duplication */}
      <Filters
        recherche={recherche} setRecherche={setRecherche}
        annee={annee} setAnnee={setAnnee} mois={mois} setMois={setMois}
        filtreType={filtreType} setFiltreType={setFiltreType}
        categorie={categorie} setCategorie={setCategorie} sousCategorie={sousCategorie} setSousCategorie={setSousCategorie}
        types={types} categories={categories} subcategories={subcategories}
        categoriesLoading={categoriesLoading} subcategoriesLoading={subcategoriesLoading}
        anneesDisponibles={anneesDisponibles} onReset={resetFilters}
        storageKey="filters:transactions"
        defaultCollapsed={false}
      />



      {/* Stats rapides */}
      <div className="mt-4">
        <StatsCardsDesign items={statsItems} />
      </div>



      {/* Liste des transactions */}
      <div className="space-y-6">
        {Object.entries(transactionsParDate).map(([date, transactionsJour]) => (
          <div key={date} className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border)', borderRadius: 'var(--card-border-radius)' }}>
            <h3 className="font-semibold text-gray-700 mb-4 capitalize">{date}</h3>
            <div className="space-y-2">
              {transactionsJour.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                      transaction.type === 'revenu' 
                        ? 'bg-gradient-to-br from-green-100 to-green-200' 
                        : 'bg-gradient-to-br from-red-100 to-red-200'
                    }`}>
                      <IconFromName name={transaction.subcategory_icon} fallback={transaction.emoji || '💰'} size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{transaction.subcategoryName ?? transaction.categorie}</p>
                      {transaction.subcategoryName ? <p className="text-sm text-gray-500">{transaction.categorie}</p> : null}
                      <p className="text-sm text-gray-500">
                        {transaction.note || 'Aucune note'}
                      </p>


                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg" style={{ color: transaction.type === 'dépense' ? 'var(--color-depense)' : 'var(--color-revenu)' }}>
                      {transaction.type === 'revenu' ? '+' : ''}{formatCurrency(transaction.montant)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(transaction.date).toLocaleTimeString(locale, { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-2 opacity-100 transition-opacity">
                      {transaction.invoices && transaction.invoices.length > 0 && (
                        <button title={`Voir la facture (${transaction.invoices.length})`} onClick={() => openPreview(transaction.invoices!, 0)} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-gray-100">
                          <Eye size={18} />
                        </button>
                      )} 

                      <button title="Modifier" onClick={() => openEdit(transaction)} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-gray-100">
                        <Edit3 size={18} />
                      </button>
                      <button title="Supprimer" onClick={() => confirmDelete(transaction.id)} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-gray-100 text-red-600">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}



        {invoicePreview && (
          <InvoicePreviewModal urls={invoicePreview.urls} initialIndex={invoicePreview.initialIndex} onClose={closePreview} />
        )}

        {editing && (<EditTransactionModal open={!!editing} transaction={editing} onClose={closeEdit} onSave={async (payload)=>{ if (!onEdit) { console.warn('onEdit handler not provided'); closeEdit(); return; } try { await onEdit(payload); } catch (e) { console.error('saveEdit error', e); } closeEdit(); }} types={types} categories={categories} subcategories={subcategories} />)}

        {displayedTransactions.length === 0 && (
          <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: 'var(--card)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border)', borderRadius: 'var(--card-border-radius)' }}>
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="font-bold text-xl text-gray-900 mb-2">Aucune transaction trouvée</h3>
            <p className="text-gray-500">Essayez de modifier vos filtres ou votre recherche</p>
          </div>
        )}
      </div>
    </div>
  );
}
