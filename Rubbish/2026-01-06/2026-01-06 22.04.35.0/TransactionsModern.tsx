import { useState, useEffect } from 'react';
import { Search, Filter, Download, Calendar, TrendingDown, TrendingUp, Edit3, Trash2, X, Eye, ChevronUp, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import StatsCardsDesign from './StatsCardsDesign';
import InvoicePreviewModal from './InvoicePreviewModal';
import { Transaction } from '../App';
import IconFromName from './IconFromName';
import Filters from './Filters';
import { usePreferences } from '../contexts/PreferencesContext';
import * as api from '../../services/api';
import { computeTotals, isRealTransaction } from './statsUtils';

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

  // Filtrer les transactions
  let __dbgCount = 0;
  const transactionsFiltrees = transactions
    .filter(t => {
      // exclude future / forecast transactions — keep only real transactions
      if (!isRealTransaction(t)) return false;
      const matchRecherche = (t.categorie ?? '').toLowerCase().includes(recherche.toLowerCase());
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
      // debug logging removed
      return overall;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const { locale, currency } = usePreferences();

  // Grouper par date
  const transactionsParDate: { [key: string]: Transaction[] } = {};
  transactionsFiltrees.forEach(transaction => {
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
  const formatCurrency = (v: number) => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(v);

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

  const activeCount = [annee !== 'Tous', mois !== 'Tous', categorie !== 'Toutes', sousCategorie !== 'Toutes', filtreType !== 'tous', recherche.length > 0].filter(Boolean).length; 

  // edit modal state
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editTime, setEditTime] = useState<string>('12:00');
  const [editType, setEditType] = useState<string>('expense');
  const [editCategorie, setEditCategorie] = useState<string>('');
  const [editSousCategorie, setEditSousCategorie] = useState<string>('');
  const [editMontant, setEditMontant] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>('');

  // invoice preview modal state
  const [invoicePreview, setInvoicePreview] = useState<{ urls: string[]; initialIndex: number } | null>(null);
  const openPreview = (urls: string[], index = 0) => setInvoicePreview({ urls, initialIndex: index });
  const closePreview = () => setInvoicePreview(null);

  // modal-specific categories/subcategories (loaded dynamically based on Type/Catégorie)
  const [modalCategories, setModalCategories] = useState<Array<{ id_category: number; name: string }>>([]);
  const [loadingModalCategories, setLoadingModalCategories] = useState(false);
  const [modalSubcategories, setModalSubcategories] = useState<Array<{ id_subcategory: number; name: string }>>([]);
  const [loadingModalSubcategories, setLoadingModalSubcategories] = useState(false);

  const openEdit = async (t: Transaction) => {
    setEditing(t);
    // parse existing date (may include time)
    try {
      const dt = new Date(t.date);
      setEditDate(dt.toISOString().split('T')[0]);
      setEditTime(dt.toISOString().slice(11,16));
    } catch (e) {
      setEditDate(t.date);
      setEditTime('12:00');
    }
    const typeCode = t.type === 'dépense' ? 'expense' : (t.type === 'revenu' ? 'income' : t.type);
    setEditType(typeCode);
    setEditMontant(Math.abs(t.montant));
    setEditNotes(t.note || '');

    // Load categories for this type
    try {
      setLoadingModalCategories(true);
      const typeItem = types.find(tt => tt.code === typeCode as string);
      const res = await api.getCategories(typeItem?.id_type);
      if (res.ok && res.data && Array.isArray(res.data.categories)) {
        setModalCategories(res.data.categories);
        // Prefill category name (prefer the exact match if present)
        const foundCat = res.data.categories.find((c: any) => c.name === t.categorie);
        const prefCat = foundCat ? foundCat.name : (res.data.categories[0]?.name ?? '');
        setEditCategorie(prefCat);

        // Now load subcategories for the chosen category (if any)
        if (foundCat) {
          try {
            setLoadingModalSubcategories(true);
            const subRes = await api.getSubcategories(foundCat.id_category);
            if (subRes.ok && subRes.data && Array.isArray(subRes.data.subcategories)) {
              setModalSubcategories(subRes.data.subcategories);
              const foundSub = subRes.data.subcategories.find((s: any) => s.name === t.note || s.name === t.categorie || s.name === (t as any).subCategory);
              // Try to match by existing subcategory id if present on transaction
              const subFromId = (t as any).subcategoryId ? subRes.data.subcategories.find((s: any) => s.id_subcategory === (t as any).subcategoryId) : null;
              setEditSousCategorie((subFromId && subFromId.name) ? (subFromId.name) : (foundSub ? foundSub.name : (subRes.data.subcategories[0]?.name ?? '')));
            } else {
              setModalSubcategories([]);
              setEditSousCategorie('');
            }
          } catch (e) {
            console.warn('Failed to load subcategories for edit', e);
            setModalSubcategories([]);
            setEditSousCategorie('');
          } finally {
            setLoadingModalSubcategories(false);
          }
        } else {
          setModalSubcategories([]);
          setEditSousCategorie('');
        }
      } else {
        setModalCategories([]);
        setEditCategorie(t.categorie || '');
        setModalSubcategories([]);
        setEditSousCategorie('');
      }
    } catch (e) {
      console.warn('Failed to load categories for edit', e);
      setModalCategories([]);
      setEditCategorie(t.categorie || '');
      setModalSubcategories([]);
      setEditSousCategorie('');
    } finally {
      setLoadingModalCategories(false);
    }
  };

  const closeEdit = () => {
    setEditing(null);
    setEditDate(''); setEditType('expense'); setEditCategorie(''); setEditSousCategorie(''); setEditMontant(0); setEditNotes('');
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

  function CollapsibleFilters() {
    const storageKey = 'filters:transactions';
    const [collapsed, setCollapsed] = useState<boolean>(() => {
      try { return localStorage.getItem(storageKey) === 'true'; } catch { return false; }
    });
    useEffect(() => { try { localStorage.setItem(storageKey, String(collapsed)); } catch {} }, [collapsed]);

    return (
      <div className="rounded-2xl p-4 overflow-x-auto" style={{ backgroundColor: 'var(--card)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border)', borderRadius: 'var(--card-border-radius)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Filter size={16} />
            <span className="font-semibold">Filtres</span>
            {activeCount > 0 && <span className="text-xs text-gray-600 ml-2">{activeCount} actif{activeCount > 1 ? 's' : ''}</span>}
          </div>
          <div>
            {collapsed ? (
              <button onClick={() => setCollapsed(false)} className="px-3 py-1 rounded-md bg-gray-100 text-sm">Déplier</button>
            ) : (
              <button onClick={() => setCollapsed(true)} className="p-2 rounded-md hover:bg-gray-100" title="Replier"><ChevronUp size={16} /></button>
            )}
          </div>
        </div>

        {!collapsed ? (
          <div className="flex flex-wrap items-center gap-4 px-1">
            <div className="flex-1 w-full sm:min-w-[260px]">
              <label className="text-xs text-gray-600 inline-flex items-center gap-2 mb-1"><Search size={14} /> Recherche</label>
              <input
                type="text"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher une transaction..."
                className="w-full px-3 py-2 rounded-full border border-gray-200 bg-white text-sm shadow-sm placeholder-gray-400"
              />
            </div>

            <div className="w-full sm:min-w-[110px] sm:w-auto">
              <label className="text-xs text-gray-600 inline-flex items-center gap-2 mb-1"><Calendar size={14} /> Année</label>
              <select value={annee} onChange={(e)=>setAnnee(e.target.value)} className="w-full sm:w-auto px-3 py-2 rounded-full border border-gray-200 bg-white text-sm shadow-sm">
                <option value="Tous">Année</option>
                {anneesDisponibles.map(y => (<option key={y} value={y}>{y}</option>))}
              </select>
            </div>

            <div className="w-full sm:min-w-[100px] sm:w-auto">
              <label className="text-xs text-gray-600 mb-1">Mois</label>
              <select value={mois} onChange={(e)=>setMois(e.target.value)} className="w-full sm:w-auto px-3 py-2 rounded-full border border-gray-200 bg-white text-sm shadow-sm">
                <option value="Tous">Tous</option>
                {[
                  ['01','Janv.'],['02','Févr.'],['03','Mars'],['04','Avr.'],['05','Mai'],['06','Juin'],
                  ['07','Juil.'],['08','Août'],['09','Sept.'],['10','Oct.'],['11','Nov.'],['12','Déc.']
                ].map(([val,label]) => (<option key={val} value={val}>{label}</option>))}
              </select>
            </div>

            <div className="w-full sm:min-w-[120px] sm:w-auto">
              <label className="text-xs text-gray-600 mb-1">Type</label>
              <select value={filtreType} onChange={(e)=>setFiltreType(e.target.value as any)} className="w-full sm:w-auto px-3 py-2 rounded-full border border-gray-200 bg-white text-sm shadow-sm">
                <option value="tous">Tous</option>
                {types.map(t => (<option key={t.id_type} value={t.code}>{t.label}</option>))}
              </select>
            </div>

            <div className="w-full sm:min-w-[180px] sm:w-auto">
              <label className="text-xs text-gray-600 mb-1">Catégorie</label>
              <select value={categorie} onChange={(e)=>setCategorie(e.target.value)} disabled={categoriesLoading || categories.length === 0} className={`w-full sm:w-auto px-3 py-2 rounded-full border border-gray-200 bg-white text-sm shadow-sm ${categoriesLoading || categories.length === 0 ? 'opacity-70 cursor-not-allowed' : ''}`}>
                <option value="Toutes">Toutes les catégories</option>
                {categories.map(c => (<option key={c.id_category} value={c.name}>{c.name}</option>))}
              </select>
            </div>

            <div className="w-full sm:min-w-[180px] sm:w-auto">
              <label className="text-xs text-gray-600 mb-1">Sous-catégorie</label>
              <select value={sousCategorie} onChange={(e)=>setSousCategorie(e.target.value)} disabled={subcategoriesLoading || subcategories.length === 0} className={`w-full sm:w-auto px-3 py-2 rounded-full border border-gray-200 bg-white text-sm shadow-sm ${subcategoriesLoading || subcategories.length === 0 ? 'opacity-70 cursor-not-allowed' : ''}`}>
                <option value="Toutes">Toutes les sous-catégories</option>
                {subcategories.map(s => (<option key={s.id_subcategory} value={s.name}>{s.name}</option>))}
              </select>
            </div>

            <div className="ml-auto pr-2 flex items-center gap-4">

              <button
                onClick={resetFilters}
                className="text-sm text-gray-600 hover:underline"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-2 py-3">
            <div className="text-sm text-gray-600">Filtres repliés</div>
            <div className="flex items-center gap-3">
              {activeCount > 0 && <div className="text-sm text-gray-700">{activeCount} actif{activeCount > 1 ? 's' : ''}</div>}
              {/* Single header toggle controls expand/collapse — avoid duplicate button here */}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">Historique</h2>
          <p className="text-gray-500 mt-1">{transactionsFiltrees.length} transactions</p>
        </div>

      </div>

      {/* Barre de recherche et filtres */}
      {/* Mobile: keep inline collapsible filters to save vertical space */}
      <div className="lg:hidden">
        <CollapsibleFilters />
      </div>

      {/* Desktop: use shared Filters card to match Dashboard design */}
      <div className="hidden lg:block mt-3">
        <Filters
          recherche={recherche} setRecherche={setRecherche}
          annee={annee} setAnnee={setAnnee} mois={mois} setMois={setMois}
          filtreType={filtreType} setFiltreType={setFiltreType}
          categorie={categorie} setCategorie={setCategorie} sousCategorie={sousCategorie} setSousCategorie={setSousCategorie}
          types={types} categories={categories} subcategories={subcategories}
          categoriesLoading={categoriesLoading} subcategoriesLoading={subcategoriesLoading}
          anneesDisponibles={anneesDisponibles} onReset={resetFilters}
          storageKey="filters:transactions"
        />
      </div>



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
                        <button title={`Voir la facture (${transaction.invoices.length})`} onClick={() => openPreview(transaction.invoices!, 0)} className="p-2 rounded-md hover:bg-gray-100">
                          <Eye size={16} />
                        </button>
                      )} 

                      <button title="Modifier" onClick={() => openEdit(transaction)} className="p-2 rounded-md hover:bg-gray-100">
                        <Edit3 size={16} />
                      </button>
                      <button title="Supprimer" onClick={() => confirmDelete(transaction.id)} className="p-2 rounded-md hover:bg-gray-100 text-red-600">
                        <Trash2 size={16} />
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

        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black opacity-40" onClick={closeEdit} />
            <div className="bg-white rounded-2xl p-6 z-10 w-full max-w-lg mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Modifier la transaction</h3>
                <button onClick={closeEdit} className="p-2 rounded-md hover:bg-gray-100"><X size={18} /></button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <label className="text-xs text-gray-600">Date et heure</label>
                <div className="flex gap-2">
                  <input type="date" value={editDate} onChange={(e)=>setEditDate(e.target.value)} className="px-3 py-2 border rounded-md" />
                  <input type="time" value={editTime} onChange={(e)=>setEditTime(e.target.value)} className="px-3 py-2 border rounded-md" />
                </div>

                <label className="text-xs text-gray-600">Type</label>
                <select value={editType} onChange={async (e)=>{
                  const newType = e.target.value;
                  setEditType(newType);
                  setEditCategorie('');
                  setEditSousCategorie('');

                  // load categories for this type
                  try {
                    setLoadingModalCategories(true);
                    const typeItem = types.find(tt => tt.code === newType);
                    const res = await api.getCategories(typeItem?.id_type);
                    if (res.ok && res.data && Array.isArray(res.data.categories)) {
                      setModalCategories(res.data.categories);
                      setEditCategorie(res.data.categories[0]?.name ?? '');
                      // load subcategories for first category
                      const firstCat = res.data.categories[0];
                      if (firstCat) {
                        setLoadingModalSubcategories(true);
                        const subRes = await api.getSubcategories(firstCat.id_category);
                        if (subRes.ok && subRes.data && Array.isArray(subRes.data.subcategories)) {
                          setModalSubcategories(subRes.data.subcategories);
                          setEditSousCategorie(subRes.data.subcategories[0]?.name ?? '');
                        } else {
                          setModalSubcategories([]);
                          setEditSousCategorie('');
                        }
                        setLoadingModalSubcategories(false);
                      }
                    } else {
                      setModalCategories([]);
                    }
                  } catch (e) {
                    console.warn('Failed to load categories for type', e);
                    setModalCategories([]);
                  } finally {
                    setLoadingModalCategories(false);
                  }
                }} className="px-3 py-2 border rounded-md">
                  {types.map(t => (<option key={t.id_type} value={t.code}>{t.label}</option>))}
                </select>

                <label className="text-xs text-gray-600">Catégorie</label>
                <select value={editCategorie} onChange={async (e)=>{
                  const catName = e.target.value; setEditCategorie(catName); setEditSousCategorie('');
                  // find category id from modalCategories (fallback to props categories)
                  const chosen = (modalCategories.length ? modalCategories : categories).find(c => c.name === catName);
                  if (!chosen) { setModalSubcategories([]); return; }
                  try {
                    setLoadingModalSubcategories(true);
                    const subRes = await api.getSubcategories(chosen.id_category);
                    if (subRes.ok && subRes.data && Array.isArray(subRes.data.subcategories)) {
                      setModalSubcategories(subRes.data.subcategories);
                      setEditSousCategorie(subRes.data.subcategories[0]?.name ?? '');
                    } else {
                      setModalSubcategories([]);
                    }
                  } catch (e) {
                    console.warn('Failed to load subcategories for category', e);
                    setModalSubcategories([]);
                  } finally {
                    setLoadingModalSubcategories(false);
                  }
                }} className="px-3 py-2 border rounded-md">
                  {loadingModalCategories ? (
                    <option key="loading">Chargement…</option>
                  ) : (
                    (modalCategories.length ? modalCategories : categories).map((c:any) => (<option key={c.id_category} value={c.name}>{c.name}</option>))
                  )}
                </select>

                <label className="text-xs text-gray-600">Sous-catégorie</label>
                <select value={editSousCategorie} onChange={(e)=>setEditSousCategorie(e.target.value)} className="px-3 py-2 border rounded-md">
                  {loadingModalSubcategories ? (
                    <option key="loading">Chargement…</option>
                  ) : (
                    (modalSubcategories.length ? modalSubcategories : subcategories).map((s:any) => (<option key={s.id_subcategory} value={s.name}>{s.name}</option>))
                  )}
                </select>

                <label className="text-xs text-gray-600">Montant</label>
                <input type="number" value={String(editMontant)} onChange={(e)=>setEditMontant(Number(e.target.value))} className="px-3 py-2 border rounded-md" />

                <label className="text-xs text-gray-600">Notes</label>
                <input type="text" value={editNotes} onChange={(e)=>setEditNotes(e.target.value)} className="px-3 py-2 border rounded-md" />

                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={closeEdit} className="px-4 py-2 border rounded-md">Annuler</button>
                  <button onClick={saveEdit} className="px-4 py-2 bg-blue-600 text-white rounded-md">Enregistrer</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {transactionsFiltrees.length === 0 && (
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
