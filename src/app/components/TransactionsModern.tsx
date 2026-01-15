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
      const matchMois = effectiveMois === 'Tous' || (effectiveMois !== 'Tous' && (txDate.getMonth() + 1) === Number(effectiveMois));
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

  // Build comparison labels vs previous year for the small stats
  const prevYear = new Date().getFullYear() - 1;
  const prevRevenus = transactionsFiltrees
    .filter(t => new Date(t.date).getFullYear() === prevYear && (t.type === 'revenu'))
    .reduce((s, t) => s + (t.montant ?? 0), 0);
  const prevDepenses = transactionsFiltrees
    .filter(t => new Date(t.date).getFullYear() === prevYear && (t.type === 'dépense'))
    .reduce((s, t) => s + Math.abs(t.montant), 0);

  const computeChangeLabel = (current: number, previous: number) => {
    if (previous === 0) return `— par rapport à ${prevYear}`;
    const pct = (current - previous) / Math.abs(previous) * 100;
    const sign = pct >= 0 ? '+' : '-';
    return `${sign}${Math.abs(pct).toFixed(2)}% par rapport à ${prevYear}`;
  };

  const revenusChangeLabel = computeChangeLabel(totals.revenus.real, prevRevenus);
  const depensesChangeLabel = computeChangeLabel(totals.depenses.real, prevDepenses);
  const soldeReal = totals.revenus.real - totals.depenses.real;
  const prevSolde = prevRevenus - prevDepenses;
  const soldeChangeLabel = computeChangeLabel(soldeReal, prevSolde);

  const statsItems = [
    {
      title: 'Solde total',
      value: formatCurrency(soldeReal),
      change: soldeChangeLabel.split(' ')[0] === '—' ? undefined : soldeChangeLabel.split(' ')[0],
      comparison: `— par rapport à ${prevYear}`,
      trend: (soldeReal >= prevSolde) ? 'up' : 'down',
      icon: Wallet,
      gradient: 'from-blue-500 via-blue-600 to-indigo-600',
      bgGradient: 'from-blue-50 to-indigo-50',
    },
    {
      title: 'Revenus',
      value: formatCurrency(totals.revenus.real),
      change: revenusChangeLabel.split(' ')[0] === '—' ? undefined : revenusChangeLabel.split(' ')[0],
      comparison: `— par rapport à ${prevYear}`,
      trend: 'up',
      icon: ArrowUpRight,
      gradient: 'from-emerald-500 via-green-500 to-teal-500',
      bgGradient: 'from-emerald-50 to-teal-50',
    },
    {
      title: 'Dépenses',
      value: formatCurrency(totals.depenses.real),
      change: depensesChangeLabel.split(' ')[0] === '—' ? undefined : depensesChangeLabel.split(' ')[0],
      comparison: `— par rapport à ${prevYear}`,
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
        {isFuturePeriodSelected && (
          <div className="rounded-2xl p-3 flex items-center justify-between" style={{ backgroundColor: '#fff7ed', border: '1px solid #fde3c6' }}>
            <div className="text-sm text-orange-800">Affichage incluant les transactions <strong>futures</strong> pour la période sélectionnée.</div>
            <div>
              <button onClick={() => setShowForecasts(!showForecasts)} className="px-3 py-1 rounded-full border bg-white text-sm shadow-sm">
                {showForecasts ? 'Masquer les prévisions' : 'Afficher les prévisions'}
              </button>
            </div>
          </div>
        )}

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
