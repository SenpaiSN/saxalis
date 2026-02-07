import { useState, useEffect, useRef } from 'react';
import * as api from '../../services/api';
import { X, Calendar as CalendarIcon, Camera } from 'lucide-react';
import { Transaction } from '../App';
import { usePreferences } from '../contexts/PreferencesContext';
import formatCurrency from '../../lib/formatCurrency';
import ReceiptScannerModal from './ReceiptScannerModal';

// Convertir une date UTC en heure Europe/Paris (HH:MM)
function getLocalTimeString(): string {
  const now = new Date();
  return now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
}

// Obtenir la date actuelle au format YYYY-MM-DD
function getLocalDateString(): string {
  const now = new Date();
  return now.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }).split('/').reverse().join('-');
}

interface AjouterTransactionModernProps {
  onAjouter: (transaction: Omit<Transaction, 'id'>, file?: File | null) => Promise<void> | void;
  onAjouterGoal: (payload: { goal_id: number; montant: number; date?: string; notes?: string; goalName?: string }, file?: File | null) => Promise<void> | void;
  onCancel: () => void;
}



export default function AjouterTransactionModern({ onAjouter, onAjouterGoal, onCancel }: AjouterTransactionModernProps) {
  const [montant, setMontant] = useState('');
  const [type, setType] = useState<string>('expense');
  const [categorieSelectionnee, setCategorieSelectionnee] = useState<number | ''>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | ''>('');
  const [date, setDate] = useState(getLocalDateString());
  const [time, setTime] = useState<string>(getLocalTimeString());
  const [note, setNote] = useState('');
  const { locale, currency } = usePreferences();

  // Types/categories loaded from API (transaction types + categories by type)
  const [types, setTypes] = useState<Array<{ id_type?: number; code: string; label: string }>>([]);
  const [categoriesState, setCategoriesState] = useState<Array<{ id_category: number; name: string }>>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // When a scan arrives but categories are not loaded yet, store it to re-attempt mapping later
  const [pendingScan, setPendingScan] = useState<{ data: { merchant: string; amount: number; date: string; category: string }; file: File | null } | null>(null);

  // goals state (for 'objectif' type)
  const [goals, setGoals] = useState<Array<{ id: number; nom: string; montant_objectif: string; montant_depose: string; reste: string }>>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [loadingGoals, setLoadingGoals] = useState(false);

  // subcategories for chosen category
  const [subcategories, setSubcategories] = useState<Array<{ id_subcategory: number; name: string }>>([]);
  const [loadingSubcats, setLoadingSubcats] = useState(false);

  // recurring and file
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'daily'|'weekly'|'monthly'|'yearly'>('monthly');
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(1);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>('');
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoiceName, setInvoiceName] = useState<string>('');

  // Scanner reset key: bumping this remounts the inline scanner to clear its internal state
  const [scannerKey, setScannerKey] = useState<number>(0);
  // Success message shown after a successful add
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const successTimerRef = useRef<number | null>(null);
  // Scanner section collapsible state
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const handleScannerComplete = async (data: { merchant: string; amount: number; date?: string; time?: string; category: string }, file: File | null) => {
    console.log('[AjouterTransaction] handleScannerComplete received', { data, file, categoriesCount: categoriesState.length });

    // Basic fills
    setMontant(String(Math.abs(data.amount)));
    if (data.date) setDate(data.date);
    if (data.time) setTime(data.time);
    setNote(prev => `${data.merchant}${prev ? ' — ' + prev : ''}`);
    if (file) { setInvoiceFile(file); setInvoiceName(file.name); }

    // Guess transaction type (prefer explicit types if available)
    let guessedTypeCode = 'expense';
    const expenseType = types.find(t => ['expense','depense','dépense'].includes(String(t.code).toLowerCase()));
    if (expenseType) guessedTypeCode = expenseType.code;
    else if (types.length) guessedTypeCode = types[0].code;

    // If amount is negative-like (refund), try to pick income
    if (Number(data.amount) < 0) {
      const incomeType = types.find(t => ['income','revenu'].includes(String(t.code).toLowerCase()));
      if (incomeType) guessedTypeCode = incomeType.code;
    }

    setType(guessedTypeCode);

    const catRaw = String(data.category || '').trim();
    const mainCat = catRaw.includes('—') ? catRaw.split('—')[0].trim() : catRaw;
    const suggestedSubCat = catRaw.includes('—') ? catRaw.split('—')[1].trim() : '';
    const lowerCat = mainCat.toLowerCase();
    let matchedCategory: { id_category: number; name: string } | undefined = undefined;

    // 1) Try current loaded categories (exact + partial)
    matchedCategory = categoriesState.find(c => String(c.name).toLowerCase() === lowerCat);
    if (matchedCategory) {
      setCategorieSelectionnee(matchedCategory.id_category);
      console.log('[AjouterTransaction] mapped category (exact current)', matchedCategory);
    } else {
      const partialCurrent = categoriesState.find(c => String(c.name).toLowerCase().includes(lowerCat) || lowerCat.includes(String(c.name).toLowerCase()));
      if (partialCurrent) {
        setCategorieSelectionnee(partialCurrent.id_category);
        matchedCategory = partialCurrent;
        console.log('[AjouterTransaction] mapped category (partial current)', partialCurrent);
      }
    }

    // 2) If still not found, use unified search endpoint (PERFORMANCE FIX: single query instead of N+1)
    if (!matchedCategory && lowerCat.length >= 2) {
      console.log('[AjouterTransaction] searching across types with unified endpoint', data.category);
      try {
        const searchRes = await api.searchCategories(lowerCat, 5);
        if (searchRes.ok && searchRes.data && Array.isArray(searchRes.data.results) && searchRes.data.results.length > 0) {
          const found = searchRes.data.results[0]; // Take best match (already sorted by relevance)
          // Update type and category
          setType(found.type_code);
          setCategorieSelectionnee(found.id_category);
          matchedCategory = { id_category: found.id_category, name: found.name };
          
          // Reload categories for this type to populate dropdown
          const catRes = await api.getCategories(found.type_id);
          if (catRes.ok && catRes.data && Array.isArray(catRes.data.categories)) {
            setCategoriesState(catRes.data.categories);
          }
          
          console.log('[AjouterTransaction] mapped category via search', found);
          setPendingScan(null);
        }
      } catch (e) {
        console.warn('Failed to search categories', e);
      }
    }

    // 3) If still no match, append suggestion to the note
    if (!matchedCategory && lowerCat) {
      console.log('[AjouterTransaction] category not matched', data.category);
      setNote(prev => `${prev} — catégorie suggérée: ${data.category}`);
      setPendingScan({ data, file });
    }

    // 4) Attempt to match a subcategory using the matched category context
    if (matchedCategory) {
      try {
        const subRes = await api.getSubcategories(matchedCategory.id_category);
        if (subRes.ok && subRes.data && Array.isArray(subRes.data.subcategories)) {
          const subcats = subRes.data.subcategories;
          const lowerMerchant = (data.merchant || '').toLowerCase();
          const subKey = suggestedSubCat ? suggestedSubCat.toLowerCase() : lowerCat;
          const subMatch = subcats.find((s: any) => String(s.name).toLowerCase() === subKey) ||
                           subcats.find((s: any) => String(s.name).toLowerCase().includes(subKey) || lowerMerchant.includes(String(s.name).toLowerCase()));
          if (subMatch) {
            setSelectedSubcategory(subMatch.id_subcategory);
            console.log('[AjouterTransaction] mapped subcategory', subMatch);
          }
        }
      } catch (e) {
        console.warn('failed to load/match subcategories', e);
      }
    }

    // done — form should now be prefilled
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!montant) return;

    // If adding to an objectif (goal)
    if (type === 'objectif') {
      if (!selectedGoalId) return;
      const mont = Math.abs(parseFloat(montant));
      try {
        const dateTime = `${date} ${time}:00`;
        await (onAjouterGoal({ goal_id: selectedGoalId, montant: mont, date: dateTime, notes: note, goalName: (goals.find(g=>g.id===selectedGoalId)?.nom ?? undefined) }, invoiceFile) as any);
        // show success and reset
        setMontant(''); setSelectedGoalId(null); setNote(''); setCategorieSelectionnee(''); setInvoiceFile(null); setInvoiceName(''); setIsRecurring(false);
        setPendingScan(null);
        setScannerKey(k => k + 1);
        if (successTimerRef.current) window.clearTimeout(successTimerRef.current);
        setSuccessMessage('Transaction ajoutée');
        successTimerRef.current = window.setTimeout(() => setSuccessMessage(null), 3000);
      } catch (e) {
        console.error('Erreur ajout dépôt objectif', e);
      }
      return;
    }

    const chosenCategory = categoriesState.find(c => c.id_category === Number(categorieSelectionnee));

    // Normalize type value (handle accents/variants) to the display strings used in App
    const normalize = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const normalized = normalize(type);
    const txTypeForApp = normalized === 'expense' || normalized === 'depense' ? 'dépense' : (normalized === 'income' || normalized === 'revenu' ? 'revenu' : (normalized === 'epargne' || normalized === 'eparge' || normalized === 'saving' ? 'epargne' : 'revenu'));

    const signedAmount = txTypeForApp === 'dépense' ? -Math.abs(parseFloat(montant)) : Math.abs(parseFloat(montant));

    const dateTime = `${date} ${time}:00`;

    const startDate = new Date(dateTime);
    const endOfToday = new Date(); endOfToday.setHours(23,59,59,999);
    const startIsInFuture = startDate > endOfToday;

    if (isRecurring) {
      // register recurrence on server
      try {
        const payload: any = {
          Date: dateTime,
          Type: txTypeForApp,
          Montant: signedAmount,
          Catégorie: chosenCategory?.name || (txTypeForApp === 'epargne' ? 'Épargne' : 'Autre'),
          'Sous-catégorie': selectedSubcategory ? Number(selectedSubcategory) : null,
          Notes: note,
          frequency: recurrenceFrequency,
          interval: recurrenceInterval,
          end_date: recurrenceEndDate || null,
          // explicit flag for server: skip initial occurrence when starting in the future
          skip_initial: startIsInFuture
        };
        // compatibility: older API clients may send create_initial_immediately
        payload.create_initial_immediately = !startIsInFuture;
        try {
          const addRes = await api.addRecurringTransaction(payload);
          if (!(addRes && addRes.ok)) {
            console.warn('Failed to create recurring transaction plan', addRes);
          } else {
            // if the server created the initial occurrence, skip local insertion and refresh the list
            if (payload.create_initial_immediately) {
              // reset form and reload to show created transaction/plan
              setMontant(''); setCategorieSelectionnee(''); setNote(''); setInvoiceFile(null); setInvoiceName(''); setIsRecurring(false); setRecurrenceInterval(1); setRecurrenceEndDate(''); setRecurrenceFrequency('monthly');
              // naive refresh — the parent should react to new data; for now reload
              window.location.reload();
              return;
            }
          }
        } catch (e) {
          console.error('Error creating recurring plan', e);
        }

        // If the recurrence starts in the future, do not create the initial transaction now — it will be generated when due
        if (startIsInFuture) {
          // reset form and exit
          setMontant(''); setCategorieSelectionnee(''); setNote(''); setInvoiceFile(null); setInvoiceName(''); setIsRecurring(false); setRecurrenceInterval(1); setRecurrenceEndDate(''); setRecurrenceFrequency('monthly');
          return;
        }

        // otherwise fall through and create the initial transaction now (server didn't create it)
      } catch (e) {
        console.error('Error registering recurrence', e);
      }
    }

    // create the initial transaction immediately
    await (onAjouter({
      montant: signedAmount,
      type: txTypeForApp as any,
      categorie: chosenCategory?.name || (txTypeForApp === 'epargne' ? 'Épargne' : 'Autre'),
      date: dateTime,
      note: note + (isRecurring ? ' (Récurrente)' : ''),
      emoji: undefined,
      subcategoryId: selectedSubcategory ? Number(selectedSubcategory) : null
    }, invoiceFile) as any);

    // show success and reset form + scanner
    setMontant('');
    setCategorieSelectionnee('');
    setNote('');
    setInvoiceFile(null); setInvoiceName(''); setIsRecurring(false); setRecurrenceInterval(1); setRecurrenceEndDate(''); setRecurrenceFrequency('monthly');
    setPendingScan(null);
    setScannerKey(k => k + 1);
    if (successTimerRef.current) window.clearTimeout(successTimerRef.current);
    setSuccessMessage('Transaction ajoutée');
    successTimerRef.current = window.setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Categories are loaded from the server into `categoriesState` (see effects above).

  // Load transaction types on mount
  useEffect(() => {
    let mounted = true;
    async function loadTypes() {
      try {
        const res = await api.getTransactionTypes();
        if (res.ok && res.data && res.data.types && mounted) setTypes(res.data.types);
      } catch (e) {
        console.warn('Failed to load transaction types', e);
      }
    }
    loadTypes();
    return () => { mounted = false; };
  }, []);

  // Load categories whenever type (or types list) changes
  useEffect(() => {
    let mounted = true;
    async function loadCategoriesForType() {
      setLoadingCategories(true);
      try {
        const selected = types.find(t => t.code === type);
        const id_type = selected ? selected.id_type : undefined;
        const res = await api.getCategories(id_type);
        if (res.ok && res.data && res.data.categories && mounted) {
          setCategoriesState(res.data.categories);
        } else {
          if (mounted) setCategoriesState([]);
        }
      } catch (e) {
        console.warn('Failed to load categories', e);
        if (mounted) setCategoriesState([]);
      } finally {
        if (mounted) setLoadingCategories(false);
      }
    }
    loadCategoriesForType();
    return () => { mounted = false; };
  }, [type, types]);

  // Load subcategories when category changes
  useEffect(() => {
    let mounted = true;
    async function loadSubcategories(catId: any) {
      if (!catId) { setSubcategories([]); return; }
      setLoadingSubcats(true);
      try {
        const res = await api.getSubcategories(Number(catId));
        if (res.ok && res.data && Array.isArray(res.data.subcategories)) {
          if (mounted) setSubcategories(res.data.subcategories);
        } else {
          if (mounted) setSubcategories([]);
        }
      } catch (e) {
        console.warn('Failed to load subcategories', e);
        if (mounted) setSubcategories([]);
      } finally {
        if (mounted) setLoadingSubcats(false);
      }
    }

    if (categorieSelectionnee) loadSubcategories(categorieSelectionnee);
    return () => { mounted = false; };
  }, [categorieSelectionnee]);

  // If we received a scan before categories were loaded, try remapping once categories arrive
  useEffect(() => {
    if (!pendingScan) return;
    if (!categoriesState || categoriesState.length === 0) return;

    const tryRemap = async () => {
      const { data, file } = pendingScan;
      console.log('[AjouterTransaction] attempting remap for pending scan', data.category);
      const lowerCat = String(data.category || '').toLowerCase().trim();
      const found = categoriesState.find(c => String(c.name).toLowerCase() === lowerCat) || categoriesState.find(c => String(c.name).toLowerCase().includes(lowerCat) || lowerCat.includes(String(c.name).toLowerCase()));
      if (found) {
        setCategorieSelectionnee(found.id_category);
        console.log('[AjouterTransaction] remapped pending scan to category', found);
        // try subcategory mapping as well
        try {
          const subRes = await api.getSubcategories(found.id_category);
          if (subRes.ok && subRes.data && Array.isArray(subRes.data.subcategories)) {
            const subcats = subRes.data.subcategories;
            const lowerMerchant = (data.merchant || '').toLowerCase();
            const subMatch = subcats.find((s: any) => String(s.name).toLowerCase() === lowerCat) || subcats.find((s: any) => String(s.name).toLowerCase().includes(lowerCat) || lowerMerchant.includes(String(s.name).toLowerCase()));
            if (subMatch) {
              setSelectedSubcategory(subMatch.id_subcategory);
              console.log('[AjouterTransaction] remapped pending scan subcategory', subMatch);
            }
          }
        } catch (e) {
          console.warn('failed to load/match subcategories during remap', e);
        }

        setPendingScan(null);
      }
    };

    tryRemap();
  }, [categoriesState, pendingScan]);

  // Load goals when the user selects 'objectif' (use objectif_crees)
  useEffect(() => {
    let mounted = true;
    async function loadGoals() {
      setLoadingGoals(true);
      try {
        const res = await api.getObjectifsCrees();
        if (res.ok && res.data && res.data.objectifs_crees && mounted) {
          // map server fields to expected shape
          const mapped = res.data.objectifs_crees.map((o: any) => ({
            id: o.id_objectif,
            nom: o.name,
            montant_objectif: o.montant_objectif,
            montant_depose: o.total_collected || '0',
            reste: (parseFloat(o.montant_objectif) - (parseFloat(o.total_collected || 0))).toFixed(2)
          }));
          setGoals(mapped);
        }
      } catch (e) {
        console.warn('Failed to load goals', e);
      } finally {
        if (mounted) setLoadingGoals(false);
      }
    }
    if (type === 'objectif') loadGoals();
    return () => { mounted = false; };
  }, [type]);

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-indigo-700">Ajouter une transaction</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-white border rounded-lg p-6 shadow-sm">

          {successMessage && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800">
              <strong>✅ {successMessage}</strong>
            </div>
          )}

          {/* Inline Scanner */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setIsScannerOpen(!isScannerOpen)}
              className="w-full py-3 text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center justify-center gap-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Camera className="w-4 h-4" />
              Scanner une facture
            </button>
            {isScannerOpen && (
              <div className="mt-4 p-4">
                <ReceiptScannerModal key={scannerKey} inline onClose={() => {}} onComplete={handleScannerComplete} />
              </div>
            )}
          </div>

          {/* Montant (en haut, grand) */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Montant</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 text-2xl font-bold border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <span className="absolute right-4 top-3 text-sm text-gray-500">{currency}</span>
            </div>
          </div>

          {/* Type de transaction */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Type de transaction</label>
            <div>
              <select value={type} onChange={(e) => { setType(e.target.value); setCategorieSelectionnee(''); setSelectedSubcategory(''); }} className="w-full px-3 py-2 border rounded-md">
                <option value="">Sélectionner un type</option>
                {types.map(t => (<option key={t.code} value={t.code}>{t.label}</option>))}
              </select>
            </div>
          </div> 

          {/* Catégorie / Objectif */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border)', borderRadius: 'var(--card-border-radius)' }}>
            {type === 'objectif' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">Sélectionnez un objectif</label>
                <div>
                  {loadingGoals ? (
                    <div className="text-sm text-gray-500">Chargement…</div>
                  ) : goals.length === 0 ? (
                    <div className="text-sm text-gray-500">Aucun objectif trouvé — créez-en un dans l'onglet Objectifs</div>
                  ) : (
                    <select value={selectedGoalId ?? ''} onChange={(e) => setSelectedGoalId(Number(e.target.value) || null)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">Sélectionner un objectif</option>
                      {goals.map(g => (
                        <option key={g.id} value={g.id}>{g.nom} — reste: {formatCurrency(parseFloat(g.reste))}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-3">Catégorie</label>
                  <select value={categorieSelectionnee ?? ''} onChange={(e)=>setCategorieSelectionnee(e.target.value ? Number(e.target.value) : '')} className="w-full px-4 py-3 bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200">
                    <option value="">Choisir une catégorie</option>
                    {loadingCategories ? <option>Chargement…</option> : categoriesState.map(c => (<option key={c.id_category} value={c.id_category}>{c.name}</option>))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-3">Sous-catégorie</label>
                  <select value={selectedSubcategory ?? ''} onChange={(e)=>setSelectedSubcategory(e.target.value ? Number(e.target.value) : '')} className="w-full px-4 py-3 bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200">
                    <option value="">Choisir une sous-catégorie</option>
                    {loadingSubcats ? <option>Chargement…</option> : subcategories.map(s => (<option key={s.id_subcategory} value={s.id_subcategory}>{s.name}</option>))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Date + Time */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Date et heure</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-1/2 px-3 py-2 border rounded-md"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-1/2 px-3 py-2 border rounded-md"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Note (optionnelle)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Notes (optionnel)"
              rows={3}
              className="w-full px-3 py-2 border rounded-md resize-none"
            />
          </div>

          {/* Recurrence + Attached invoice (scanner-only) */}
          <div className="flex items-center justify-between gap-4">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={isRecurring} onChange={(e)=>setIsRecurring(e.target.checked)} />
              <span className="text-sm text-gray-600">Transaction récurrente</span>
            </label>

            <div className="w-1/2">
              {/* Removed manual file input (duplicate) — invoice is supplied by the scanner. Show attached file name and allow removal. */}
              {invoiceName ? (
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-500 truncate">Facture attachée: {invoiceName}</div>
                  <button type="button" onClick={() => { setInvoiceFile(null); setInvoiceName(''); }} className="px-3 py-1 border rounded text-sm">Supprimer</button>
                </div>
              ) : (
                <div className="text-sm text-gray-500">Aucune facture attachée</div>
              )}
            </div>
          </div>

          {isRecurring && (
            <div className="rounded-2xl p-4 bg-gray-50 border border-gray-100">
              <div className="grid grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-xs text-gray-600">Fréquence</label>
                  <select value={recurrenceFrequency} onChange={(e)=>setRecurrenceFrequency(e.target.value as any)} className="w-full px-3 py-2 border rounded-md">
                    <option value="daily">Quotidienne</option>
                    <option value="weekly">Hebdomadaire</option>
                    <option value="monthly">Mensuelle</option>
                    <option value="yearly">Annuelle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-600">Intervalle</label>
                  <input type="number" min={1} value={recurrenceInterval} onChange={(e)=>setRecurrenceInterval(Number(e.target.value||1))} className="w-full px-3 py-2 border rounded-md" />
                </div>

                <div>
                  <label className="block text-xs text-gray-600">Date de fin (optionnelle)</label>
                  <input type="date" value={recurrenceEndDate} onChange={(e)=>setRecurrenceEndDate(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">{new Date(date) > new Date(new Date().setHours(23,59,59,999)) ? 'La transaction initiale ne sera pas créée maintenant. Le plan récurrent débutera à la date sélectionnée.' : 'La transaction initiale sera créée immédiatement et un plan récurrent sera enregistré.'}</p>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-4 border-2 border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!montant || (type === 'objectif' ? !selectedGoalId : !categorieSelectionnee)}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Ajouter la transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Scan modal handler: placed at file bottom to keep this file focused; the modal is mounted by state in the parent component
