import { useEffect, useState } from 'react';
import { Home, Plus, TrendingUp, Wallet, Settings, Menu, X, Sun, Moon, Target } from 'lucide-react';
import Dashboard from './components/Dashboard';
import AjouterTransactionModern from './components/AjouterTransactionModern';
import TransactionsModern from './components/TransactionsModern';
import StatsModern from './components/StatsModern';
import StatsRebuilt from './components/StatsRebuilt';
import ProfilModern from './components/ProfilModern';
import ErrorBoundary from './components/ErrorBoundary';
import StatsMaintenance from './components/StatsMaintenance';
import StatsSafe from './components/StatsSafe';
import Objectifs from './components/Objectifs';
import LoginModal from './components/LoginModal';
import TransactionModalContainer from './components/TransactionModalContainer';
import * as api from '../services/api';

import { PreferencesProvider } from './contexts/PreferencesContext';

export type Transaction = {
  id: string;
  montant: number;
  type: 'dépense' | 'revenu' | 'epargne';
  categorie: string;
  date: string;
  note?: string;
  emoji?: string;
  subcategoryId?: number | null;
  subcategory_icon?: string | null;
  subcategoryName?: string | null;
  invoices?: string[];
};

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ajouter' | 'transactions' | 'stats' | 'profil' | 'objectifs'>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const stored = localStorage.getItem('transactions');
      return stored ? JSON.parse(stored) as Transaction[] : [];
    } catch (e) {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // auth
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  const API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL) ?? '';
  function profilePhotoUrl(photo?: string | null) {
    // Use app-local default avatar when user has no uploaded photo
    if (!photo) return '/images/default-avatar.svg';
    if (photo.startsWith('http://') || photo.startsWith('https://')) return photo;
    const cleanBase = API_BASE.replace(/\/$/, '');
    return `${cleanBase}/${photo.replace(/^\//, '')}`;
  }

  // mappings for server ids
  const [categoriesMap, setCategoriesMap] = useState<Record<string, number>>({});
  const [typesMap, setTypesMap] = useState<Record<string, number>>({});

  // Shared filters state (lifted to App to be shared between pages)
  const [recherche, setRecherche] = useState('');
  const [filtreType, setFiltreType] = useState<'tous' | 'expense' | 'income'>('tous');
  const [annee, setAnnee] = useState<'Tous' | string>('Tous');
  const [mois, setMois] = useState<'Tous' | string>('Tous');
  const [categorie, setCategorie] = useState<'Toutes' | string>('Toutes');
  const [sousCategorie, setSousCategorie] = useState<'Toutes' | string>('Toutes');

  const [types, setTypes] = useState<Array<{ id_type: number; code: string; label: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id_category: number; name: string }>>([]);
  const [subcategories, setSubcategories] = useState<Array<{ id_subcategory: number; name: string }>>([]);

  // theme (light/dark) persisted in localStorage
  // Default to light theme unless user explicitly saved a value (do not auto-enable dark mode)
  const [theme, setTheme] = useState<'light'|'dark'>(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved as 'light'|'dark';
      return 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('theme', theme);
    } catch (e) {
      // ignore
    }
  }, [theme]);

  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);

  const anneesDisponibles = Array.from(new Set(transactions.map(t => new Date(t.date).getFullYear()))).sort((a,b)=>b-a).map(String);

  // load types and categories initially (for filters)
  useEffect(() => {
    let mounted = true;
    async function loadTypesAndCategories(){
      try {
        const typesRes = await api.getTransactionTypes();
        if (typesRes.ok && typesRes.data && typesRes.data.types) {
          if (mounted) {
            setTypes(typesRes.data.types);
            // normalize codes to lowercase for robust lookup (e.g., "Epargne" vs "epargne")
            const tmp: Record<string, number> = {};
            typesRes.data.types.forEach((t: any) => { tmp[String(t.code).toLowerCase()] = t.id_type; });
            setTypesMap(tmp);
          }
        }
      } catch (e) {
        console.warn('getTransactionTypes failed', e);
      }

      try {
        if (mounted) setCategoriesLoading(true);
        const res = await api.getCategories();
        if (res.ok && res.data && res.data.categories) {
          if (mounted) setCategories(res.data.categories);
        }
      } catch (e) {
        console.warn('getCategories failed', e);
      } finally {
        if (mounted) setCategoriesLoading(false);
      }
    }

    loadTypesAndCategories();
    return () => { mounted = false };
  }, []);

  // reload categories when type filter changes
  useEffect(() => {
    let mounted = true;
    async function loadCategoriesByType() {
      try {
        if (mounted) setCategoriesLoading(true);
        if (!filtreType || filtreType === 'tous') {
          const res = await api.getCategories();
          if (res.ok && res.data && res.data.categories) {
            if (mounted) setCategories(res.data.categories);
          }
        } else {
          const selected = types.find(t => t.code === filtreType);
          const id_type = selected ? selected.id_type : undefined;
          const res = await api.getCategories(id_type);
          if (res.ok && res.data && res.data.categories) {
            if (mounted) setCategories(res.data.categories);
          } else {
            if (mounted) setCategories([]);
          }
        }
        if (mounted) {
          setCategorie('Toutes');
          setSousCategorie('Toutes');
          setSubcategories([]);
        }
      } catch (e) {
        console.warn('getCategories by type failed', e);
      } finally {
        if (mounted) setCategoriesLoading(false);
      }
    }
    loadCategoriesByType();
    return () => { mounted = false };
  }, [filtreType, types]);

  // load subcategories when categorie changes
  useEffect(() => {
    let mounted = true;
    async function loadSubcats() {
      if (!categorie || categorie === 'Toutes') {
        setSousCategorie('Toutes');
        setSubcategories([]);
        return;
      }
      try {
        if (mounted) setSubcategoriesLoading(true);
        const selected = categories.find(c => c.name === categorie);
        const id = selected ? selected.id_category : undefined;
        const res = await api.getSubcategories(id);
        if (res.ok && res.data && res.data.subcategories) {
          if (mounted) setSubcategories(res.data.subcategories);
        } else {
          if (mounted) setSubcategories([]);
        }
      } catch (e) {
        console.warn('getSubcategories failed', e);
        if (mounted) setSubcategories([]);
      } finally {
        if (mounted) setSubcategoriesLoading(false);
      }
    }
    loadSubcats();
    return () => { mounted = false };
  }, [categorie, categories]);

  const resetFilters = () => {
    setAnnee('Tous');
    setMois('Tous');
    setCategorie('Toutes');
    setSousCategorie('Toutes');
    setFiltreType('tous');
    setRecherche('');
  };

  // extrait la logique de chargement pour être réutilisée après login
  async function loadData() {
    setLoading(true);

    try {
      // fetch categories and types (used for adding transactions)
      const [catsRes, typesRes] = await Promise.all([
        api.getCategories(),
        api.getTransactionTypes()
      ]);

      if (catsRes.ok && catsRes.data && catsRes.data.categories) {
        const map: Record<string, number> = {};
        catsRes.data.categories.forEach((c: any) => {
          map[c.name] = c.id_category;
        });
        setCategoriesMap(map);
      }

      if (typesRes.ok && typesRes.data && typesRes.data.types) {
        const map: Record<string, number> = {};
        typesRes.data.types.forEach((t: any) => {
          map[String(t.code).toLowerCase()] = t.id_type;
        });
        setTypesMap(map);
      }

      const res = await api.getTransactions();
      if (!res.ok) throw new Error('API GET transactions failed');
      // debug: if server returned non-json or unexpected payload, log it for inspection
      if (!res.data) {
        console.error('get_transactions unexpected response (no JSON):', res);
      }
      if (res.data && res.data.success && Array.isArray(res.data.transactions)) {
        const mapped = res.data.transactions.map((tx: any) => {
          // Normalize invoices sent by the API (concatenated by '||') into full URLs
          const raw = tx.invoices || '';
          const invoiceList = String(raw).split('||').map((p:any) => (p || '').trim()).filter(Boolean).map((p:string) => {
            if (p.startsWith('http://') || p.startsWith('https://')) return p;
            const cleanBase = API_BASE.replace(/\/$/, '');
            return `${cleanBase}/${p.replace(/^\//, '')}`;
          });

          return {
            id: String(tx.id_transaction),
            montant: parseFloat(tx.amount),
            type: tx.type === 'expense' ? 'dépense' : (tx.type === 'income' ? 'revenu' : tx.type),
            categorie: tx.category || tx.subCategory || 'Autre',
            date: tx.date,
            note: tx.notes || '',
            emoji: undefined,
            subcategoryId: tx.id_subcategory ?? null,
            subcategory_icon: tx.subcategory_icon ?? null,
            subcategoryName: tx.subCategory ?? null,
            invoices: invoiceList
          };
        }) as Transaction[];

        setTransactions(mapped);
        localStorage.setItem('transactions', JSON.stringify(mapped));
        setError(null);
      } else {
        throw new Error('get_transactions returned no data');
      }
    } catch (err: any) {
      console.error('Erreur chargement transactions:', err);
      const stored = localStorage.getItem('transactions');
      if (stored) {
        setTransactions(JSON.parse(stored));
      }
      setError(`Impossible de charger depuis le serveur — données locales utilisées. (${err?.message ?? 'erreur inconnue'})`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      try {
        const session = await api.checkSession();
        if (session.ok && session.data && session.data.success) {
          // utilisateur authentifié
          if (mounted) {
            setIsAuthenticated(true);
            setCurrentUser(session.data.user);
          }
          await loadData();
        } else {
          if (mounted) setIsAuthenticated(false);
          const stored = localStorage.getItem('transactions');
          if (stored) setTransactions(JSON.parse(stored));
          if (mounted) setError('Connectez‑vous pour charger les filtres et transactions (données locales affichées)');
        }
      } catch (e) {
        console.error('checkSession error', e);
        const stored = localStorage.getItem('transactions');
        if (stored) setTransactions(JSON.parse(stored));
        if (mounted) setError('Impossible de vérifier la session — données locales affichées');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    return () => { mounted = false; };
  }, []);


  // Client-side cleanup when logging out or when session expires
  const performClientLogout = (message = 'Déconnecté', openLogin = false) => {
    // 1) Reset auth and user info
    setIsAuthenticated(false);
    setCurrentUser(null);

    // 2) Clear in-memory sensitive data
    setTransactions([]);
    setTypes([]);
    setCategories([]);
    setSubcategories([]);
    setTypesMap({});
    setCategoriesMap({});

    // 3) Reset filters and visible UI state
    setAnnee('Tous');
    setMois('Tous');
    setCategorie('Toutes');
    setSousCategorie('Toutes');
    setFiltreType('tous');
    setRecherche('');
    setActiveTab('dashboard');

    // 4) Remove persisted caches that may contain user data (transactions, filters)
    try {
      localStorage.removeItem('transactions');
      // remove theme so default (light) applies for next session
      localStorage.removeItem('theme');
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key.startsWith('filters:')) toRemove.push(key);
      }
      toRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.warn('Failed to clear localStorage on logout/session expiry', e);
    }

    // 5) UX: show disconnected message, close menus
    setError(message);
    setMenuOpen(false);

    // 6) Notify other parts of the app
    try { window.dispatchEvent(new CustomEvent('user:loggedOut')); } catch (e) { /* ignore */ }



    // 7) Optionally open login modal to let user re-authenticate
    if (openLogin) setShowLoginModal(true);
  };

  // Handler to perform logout and securely clear sensitive data
  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.warn('logout failed', e);
    }
    performClientLogout('Déconnecté', true);
  };

  const ajouterTransaction = async (transaction: Omit<Transaction, 'id'>, file?: File | null) => {
    // Try to post to server using mapped ids; fallback to local if API not available
    // Normalize transaction.type robustly so we don't mis-map due to accents or different labels
    const normalize = (s: any) => String(s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const tnorm = normalize(transaction.type);
    const typeCode = (tnorm === 'depense' || tnorm === 'expense') ? 'expense' : ((tnorm === 'revenu' || tnorm === 'income') ? 'income' : ((tnorm === 'epargne' || tnorm === 'eparge' || tnorm === 'saving' || tnorm === 'savings') ? 'epargne' : 'income'));
    const id_type = typesMap[typeCode];
    const category_id = categoriesMap[transaction.categorie];

    // If not authenticated, fallback to local immediately
    if (isAuthenticated === false) {
      // Correction du type pour correspondre strictement au modèle Transaction
      let type: 'dépense' | 'revenu' | 'epargne' = 'revenu';
      const t = String(transaction.type).toLowerCase();
      if (t === 'dépense' || t === 'depense' || t === 'expense') type = 'dépense';
      else if (t === 'revenu' || t === 'income') type = 'revenu';
      else if (t === 'epargne' || t === 'saving' || t === 'savings') type = 'epargne';
      const nouvelleTransaction: Transaction = {
        ...transaction,
        type,
        id: Date.now().toString()
      };
      setTransactions(prev => { const next: Transaction[] = [nouvelleTransaction, ...prev]; localStorage.setItem('transactions', JSON.stringify(next)); return next; });
      setActiveTab('dashboard');
      return;
    }

    if (category_id) {
      try {
        const detectedCurrency = (() => { try { return localStorage.getItem('currency') || 'EUR'; } catch { return 'EUR'; } })();
        const payload: any = {
          Date: transaction.date,
          Type: typeCode,
          category_id,
          subcategory_id: transaction.subcategoryId ?? null,
          Montant: transaction.montant,
          currency: detectedCurrency,
          Notes: transaction.note || ''
        };
        // include id_type only when we have it (server will resolve otherwise)
        if (id_type) payload.id_type = id_type;

        // payload prepared for addTransaction call

        const res = await api.addTransaction(payload);
        if (res.ok && res.data && res.data.success) {
          const newTx: Transaction = { ...transaction, id: String(res.data.id_transaction) };

          // If file (invoice) provided, upload it now and associate with the created transaction
          if (file) {
            try {
              const uploadRes = await api.uploadInvoice({ transaction_id: res.data.id_transaction, file });
              if (!uploadRes.ok || !uploadRes.data || !uploadRes.data.success) {
                console.warn('uploadInvoice failed', uploadRes);
              } else if (uploadRes.data.file_path) {
                const fp = uploadRes.data.file_path;
                const fileUrl = (fp.startsWith('http://') || fp.startsWith('https://')) ? fp : `${API_BASE.replace(/\/$/, '')}/${fp.replace(/^\//, '')}`;
                // attach to newTx so when inserted it includes invoices
                (newTx as any).invoices = [fileUrl];
              }
            } catch (e) {
              console.warn('upload invoice error', e);
            }
          }

          setTransactions(prev => { const next = [newTx, ...prev]; localStorage.setItem('transactions', JSON.stringify(next)); return next; });

          // If transaction targeted a subcategory, notify objectives to refresh (some deposits may target goal subcategories)
          try { if (typeof transaction.subcategoryId !== 'undefined' && transaction.subcategoryId !== null) window.dispatchEvent(new CustomEvent('objectifs:updated', { detail: { transaction: newTx } })); } catch (e) { /* ignore */ }

          setActiveTab('dashboard');
          return;
        } else {
          console.warn('API addTransaction failed', res);
        }
      } catch (e) {
        console.error('add transaction error', e);
      }
    }



    // Fallback: add locally et persist
    let type: 'dépense' | 'revenu' | 'epargne' = 'revenu';
    const t = String(transaction.type).toLowerCase();
    if (t === 'dépense' || t === 'depense' || t === 'expense') type = 'dépense';
    else if (t === 'revenu' || t === 'income') type = 'revenu';
    else if (t === 'epargne' || t === 'saving' || t === 'savings') type = 'epargne';
    const nouvelleTransaction: Transaction = {
      ...transaction,
      type,
      id: Date.now().toString()
    };
    setTransactions(prev => { const next: Transaction[] = [nouvelleTransaction, ...prev]; localStorage.setItem('transactions', JSON.stringify(next)); return next; });
    setActiveTab('dashboard');
  };

  // New: ajouter dépôt vers un objectif (appel API dédié)
  const ajouterDepotObjectif = async ({ goal_id, montant, date, notes, goalName }: { goal_id: number; montant: number; date?: string; notes?: string; goalName?: string }, file?: File | null) => {
    // If not authenticated, fallback to local
    if (isAuthenticated === false) {
      const nouvelleTransaction: Transaction = {
        id: Date.now().toString(),
        montant: montant,
        type: 'epargne',
        categorie: goalName || 'Objectif',
        date: date ?? new Date().toISOString().split('T')[0],
        note: notes || ''
      };
      setTransactions(prev => { const next = [nouvelleTransaction, ...prev]; localStorage.setItem('transactions', JSON.stringify(next)); return next; });
      setActiveTab('dashboard');
      return;
    }

    try {
      const res = await api.addGoalDeposit({ goal_id, montant, date, create_depot: true, notes });
      if (res.ok && res.data && res.data.success) {
        const txId = res.data.transaction_id;

        // If an invoice file was provided, upload it and capture the uploaded path to attach to the new transaction
        let uploadedFileUrl: string | undefined = undefined;
        if (file) {
          try {
            const uploadRes = await api.uploadInvoice({ transaction_id: txId, file });
            if (!uploadRes.ok || !uploadRes.data || !uploadRes.data.success) {
              console.warn('uploadInvoice failed', uploadRes);
            } else if (uploadRes.data.file_path) {
              const fp = uploadRes.data.file_path;
              uploadedFileUrl = (fp.startsWith('http://') || fp.startsWith('https://')) ? fp : `${API_BASE.replace(/\/$/, '')}/${fp.replace(/^\//, '')}`;
            }
          } catch (e) {
            console.warn('upload invoice error', e);
          }
        }

        const newTx: Transaction = {
          id: String(txId),
          montant,
          type: 'epargne',
          categorie: goalName || 'Objectif',
          date: (date ?? new Date().toISOString().split('T')[0]),
          note: notes || '',
          invoices: uploadedFileUrl ? [uploadedFileUrl] : undefined
        };
        setTransactions(prev => { const next = [newTx, ...prev]; localStorage.setItem('transactions', JSON.stringify(next)); return next; });

        // Notify objectives components to reload their data (they listen to this event)
        try { window.dispatchEvent(new CustomEvent('objectifs:updated', { detail: { goal_id, montant, transaction_id: txId } })); } catch (e) { /* ignore */ }

        setActiveTab('dashboard');
        return;
      } else {
        console.warn('addGoalDeposit failed', res);
      }
    } catch (e) {
      console.error('add goal deposit error', e);
    }

    // fallback local
    const fallbackTx: Transaction = {
      id: Date.now().toString(),
      montant,
      type: 'epargne',
      categorie: goalName || 'Objectif',
      date: date ?? new Date().toISOString().split('T')[0],
      note: notes || ''
    };
    setTransactions(prev => { const next = [fallbackTx, ...prev]; localStorage.setItem('transactions', JSON.stringify(next)); return next; });
    setActiveTab('dashboard');
  };


  const NavItem = ({ icon: Icon, label, tabName }: { icon: any; label: string; tabName: typeof activeTab }) => (
      <button
        onClick={() => {
          setActiveTab(tabName);
          setMenuOpen(false);
        }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        activeTab === tabName
          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
          : 'text-gray-600 hover:bg-gray-100'
      }`}>
      
      <Icon size={22} />

      <span className="font-medium">{label}</span>
      </button>
    );

  // helper: delete a transaction (tries server then local)
  const supprimerTransaction = async (id: string) => {
    try {
      const res = await api.deleteTransaction({ id_transaction: id });
      if (res.ok && res.data && res.data.success) {
        setTransactions(prev => { const next = prev.filter(t => t.id !== id); localStorage.setItem('transactions', JSON.stringify(next)); return next; });
        return;
      }
    } catch (e) {
      console.error('delete tx error', e);
    }

    // fallback: delete locally
    setTransactions(prev => { const next = prev.filter(t => t.id !== id); localStorage.setItem('transactions', JSON.stringify(next)); return next; });
  };

  // helper: edit/update a transaction (tries server then local)
  const editTransaction = async (payload: { id: string; Date: string; Type: string; Catégorie: string; SousCatégorie: string; Montant: number; Notes?: string }) => {
    // Build API payload expected by update_transaction.php
    const apiPayload: any = {
      id_transaction: payload.id,
      Date: payload.Date,
      Type: payload.Type,
      'Catégorie': payload.Catégorie,
      'Sous-catégorie': payload.SousCatégorie,
      Montant: payload.Montant,
      Notes: payload.Notes || ''
    };

    try {
      const res = await api.updateTransaction(apiPayload);
      if (res.ok && res.data && res.data.success) {
        setTransactions(prev => {
          const next = prev.map(t => t.id === payload.id ? {
            ...t,
            montant: payload.Montant,
            date: payload.Date,
            type: payload.Type === 'expense' ? 'dépense' : (payload.Type === 'income' ? 'revenu' : payload.Type),
            categorie: payload.Catégorie,
            note: payload.Notes || ''
          } : t);
          localStorage.setItem('transactions', JSON.stringify(next));
          return next;
        });

        // notify objectives in case a subcategory or amount changed
        try { window.dispatchEvent(new CustomEvent('objectifs:updated', { detail: { transaction_id: payload.id, montant: payload.Montant } })); } catch (e) { /* ignore */ }
        return;
      }
    } catch (e) {
      console.error('update tx error', e);
    }

    // fallback: update locally
    setTransactions(prev => {
      const next = prev.map(t => t.id === payload.id ? { ...t,
        montant: payload.Montant,
        date: payload.Date,
        type: payload.Type === 'expense' ? 'dépense' : (payload.Type === 'income' ? 'revenu' : payload.Type),
        categorie: payload.Catégorie,
        note: payload.Notes || '' } : t);
      localStorage.setItem('transactions', JSON.stringify(next));
      return next;
    });
  };

  // expose supprimerTransaction and editTransaction to children via props
  // e.g. <TransactionsModern ... onDelete={supprimerTransaction} onEdit={editTransaction} />

  // Show a simple message if loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">Chargement…</div>
    );
  }

  // log error (we still render the app)
  if (error) console.warn(error);



  return (
    <PreferencesProvider>
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">

      {/* Layout Desktop */}
      <div className="hidden lg:flex h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl overflow-hidden">
                <img src="/images/favicon.png" alt="SaXalis" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                SaXalis
              </h1>
            </div>
            <p className="text-sm text-gray-500">Gérez vos finances</p>
          </div>

          <nav className="flex-1 space-y-2">
            <NavItem icon={Home} label="Dashboard" tabName="dashboard" />
            <NavItem icon={Plus} label="Ajouter" tabName="ajouter" />
            <NavItem icon={Wallet} label="Transactions" tabName="transactions" />
            <NavItem icon={TrendingUp} label="Statistiques" tabName="stats" />
            <NavItem icon={Target} label="Objectifs" tabName="objectifs" />
            <NavItem icon={Settings} label="Paramètres" tabName="profil" />
          </nav>

          {/* User Info */}
          <div className="mt-auto pt-6 border-t border-gray-200">
            <div
              onClick={() => { if (isAuthenticated !== true) setShowLoginModal(true); }}
              onKeyDown={(e) => { if (isAuthenticated !== true && (e.key === 'Enter' || e.key === ' ')) setShowLoginModal(true); }}
              role={isAuthenticated !== true ? 'button' : undefined}
              tabIndex={isAuthenticated !== true ? 0 : undefined}
              aria-label={isAuthenticated !== true ? 'Ouvrir connexion' : 'Profil utilisateur'}
              className={`flex items-center gap-3 ${isAuthenticated !== true ? 'cursor-pointer hover:bg-gray-50 p-2 rounded-md' : ''}`}
            >
              <img
                src={profilePhotoUrl(currentUser?.photo)}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1">
                <p className="font-medium text-sm">{currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Invité'}</p>
                <p className="text-xs text-gray-500">{currentUser?.email ?? 'non connecté'}</p>
              </div>
            </div>

            <div className="mt-4 text-center">
              {isAuthenticated ? (
                <button
                  onClick={() => handleLogout()}
                  className="text-sm font-medium hover:underline"
                  style={{ color: 'var(--color-depense)' }}
                >
                  Se déconnecter
                </button>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="text-sm text-blue-600 font-medium hover:underline"
                >
                  Se connecter
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {/* Banner if not authenticated */}
          {isAuthenticated !== true && (
            <div className="m-6 p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 flex items-center justify-between">
              <div>Connectez‑vous pour charger les filtres et transactions depuis le serveur.</div>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowLoginModal(true)} className="bg-yellow-600 text-white px-3 py-1 rounded-md">Se connecter</button>
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && <Dashboard transactions={transactions}
            recherche={recherche} setRecherche={setRecherche}
            annee={annee} setAnnee={setAnnee} mois={mois} setMois={setMois}
            filtreType={filtreType} setFiltreType={setFiltreType}
            categorie={categorie} setCategorie={setCategorie} sousCategorie={sousCategorie} setSousCategorie={setSousCategorie}
            types={types} categories={categories} subcategories={subcategories}
            categoriesLoading={categoriesLoading} subcategoriesLoading={subcategoriesLoading}
            anneesDisponibles={anneesDisponibles} onReset={resetFilters} onDelete={supprimerTransaction} onEdit={editTransaction}
            currentUser={currentUser}
          />}
          {activeTab === 'ajouter' && <AjouterTransactionModern onAjouter={ajouterTransaction} onAjouterGoal={ajouterDepotObjectif} onCancel={() => setActiveTab('dashboard')} />}
          {activeTab === 'transactions' && <TransactionsModern transactions={transactions} 
            recherche={recherche} setRecherche={setRecherche}
            annee={annee} setAnnee={setAnnee} mois={mois} setMois={setMois}
            filtreType={filtreType} setFiltreType={setFiltreType}
            categorie={categorie} setCategorie={setCategorie} sousCategorie={sousCategorie} setSousCategorie={setSousCategorie}
            types={types} categories={categories} subcategories={subcategories}
            categoriesLoading={categoriesLoading} subcategoriesLoading={subcategoriesLoading}
            anneesDisponibles={anneesDisponibles} resetFilters={resetFilters}            onDelete={supprimerTransaction} onEdit={editTransaction}          />}
          {activeTab === 'stats' && <StatsRebuilt transactions={transactions}
            recherche={recherche} setRecherche={setRecherche}
            annee={annee} setAnnee={setAnnee} mois={mois} setMois={setMois}
            filtreType={filtreType} setFiltreType={setFiltreType}
            categorie={categorie} setCategorie={setCategorie} sousCategorie={sousCategorie} setSousCategorie={setSousCategorie}
            types={types} categories={categories} subcategories={subcategories}
            categoriesLoading={categoriesLoading} subcategoriesLoading={subcategoriesLoading}
            anneesDisponibles={anneesDisponibles} resetFilters={resetFilters} /> }
          {activeTab === 'objectifs' && <Objectifs />}
          {activeTab === 'profil' && <ProfilModern theme={theme} setTheme={setTheme} currentUser={currentUser} setCurrentUser={setCurrentUser} isAuthenticated={isAuthenticated} onLogout={handleLogout} onOpenLogin={() => setShowLoginModal(true)} /> }
        </main>
      </div>

      {/* Layout Mobile */}
      <div className="lg:hidden flex flex-col h-screen">
        {/* Header Mobile */}
        <header className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden">
                <img src="/images/favicon.png" alt="SaXalis" className="w-full h-full object-cover" />
              </div>
              <h1 className="font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                SaXalis
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <img
                src={profilePhotoUrl(currentUser?.photo)}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover cursor-pointer"
                onClick={() => { if (isAuthenticated !== true) setShowLoginModal(true); else setActiveTab('profil'); }}
                aria-label={isAuthenticated !== true ? 'Ouvrir connexion' : 'Profil utilisateur'}
              />
            </div>
          </div>

          {/* Mobile Menu */}
          {menuOpen && (
            <div className="mt-4 space-y-2">
              <NavItem icon={Home} label="Dashboard" tabName="dashboard" />
              <NavItem icon={Plus} label="Ajouter" tabName="ajouter" />
              <NavItem icon={Wallet} label="Transactions" tabName="transactions" />
              <NavItem icon={TrendingUp} label="Statistiques" tabName="stats" />
              <NavItem icon={Target} label="Objectifs" tabName="objectifs" />
              <NavItem icon={Settings} label="Paramètres" tabName="profil" />

              {/* Mobile user info (matches desktop sidebar) */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div
                  onClick={() => { if (isAuthenticated !== true) setShowLoginModal(true); else setActiveTab('profil'); }}
                  onKeyDown={(e) => { if (isAuthenticated !== true && (e.key === 'Enter' || e.key === ' ')) setShowLoginModal(true); }}
                  role={isAuthenticated !== true ? 'button' : undefined}
                  tabIndex={isAuthenticated !== true ? 0 : undefined}
                  aria-label={isAuthenticated !== true ? 'Ouvrir connexion' : 'Profil utilisateur'}
                  className={`flex items-center gap-3 ${isAuthenticated !== true ? 'cursor-pointer hover:bg-gray-50 p-2 rounded-md' : ''}`}
                >
                  <img
                    src={profilePhotoUrl(currentUser?.photo)}
                    alt="Profile"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Invité'}</p>
                    <p className="text-xs text-gray-500">{currentUser?.email ?? 'non connecté'}</p>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  {isAuthenticated ? (
                    <button
                      onClick={() => handleLogout()}
                      className="text-sm font-medium hover:underline"
                      style={{ color: 'var(--color-depense)' }}
                    >
                      Se déconnecter
                    </button>
                  ) : (
                    <button
                      onClick={() => { setShowLoginModal(true); setMenuOpen(false); }}
                      className="text-sm text-blue-600 font-medium hover:underline"
                    >
                      Se connecter
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}
        </header>

        {/* Content Mobile */}
        <main className="flex-1 overflow-auto pb-20" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)' }}>
          {activeTab === 'dashboard' && <Dashboard transactions={transactions}
            recherche={recherche} setRecherche={setRecherche}
            annee={annee} setAnnee={setAnnee} mois={mois} setMois={setMois}
            filtreType={filtreType} setFiltreType={setFiltreType}
            categorie={categorie} setCategorie={setCategorie} sousCategorie={sousCategorie} setSousCategorie={setSousCategorie}
            types={types} categories={categories} subcategories={subcategories}
            categoriesLoading={categoriesLoading} subcategoriesLoading={subcategoriesLoading}
            anneesDisponibles={anneesDisponibles} onReset={resetFilters} onDelete={supprimerTransaction} onEdit={editTransaction}
            currentUser={currentUser}
          /> }
          {activeTab === 'ajouter' && <AjouterTransactionModern onAjouter={ajouterTransaction} onAjouterGoal={ajouterDepotObjectif} onCancel={() => setActiveTab('dashboard')} />}
          {activeTab === 'transactions' && <TransactionsModern transactions={transactions} 
            recherche={recherche} setRecherche={setRecherche}
            annee={annee} setAnnee={setAnnee} mois={mois} setMois={setMois}
            filtreType={filtreType} setFiltreType={setFiltreType}
            categorie={categorie} setCategorie={setCategorie} sousCategorie={sousCategorie} setSousCategorie={setSousCategorie}
            types={types} categories={categories} subcategories={subcategories}
            categoriesLoading={categoriesLoading} subcategoriesLoading={subcategoriesLoading}
            anneesDisponibles={anneesDisponibles} resetFilters={resetFilters}
            onDelete={supprimerTransaction} onEdit={editTransaction}
          /> }
          {activeTab === 'stats' && <StatsSafe transactions={transactions}
            recherche={recherche} setRecherche={setRecherche}
            annee={annee} setAnnee={setAnnee} mois={mois} setMois={setMois}
            filtreType={filtreType} setFiltreType={setFiltreType}
            categorie={categorie} setCategorie={setCategorie} sousCategorie={sousCategorie} setSousCategorie={setSousCategorie}
            types={types} categories={categories} subcategories={subcategories}
            categoriesLoading={categoriesLoading} subcategoriesLoading={subcategoriesLoading}
            anneesDisponibles={anneesDisponibles} resetFilters={resetFilters} /> }
          {activeTab === 'objectifs' && <Objectifs />}
          {activeTab === 'profil' && <ProfilModern theme={theme} setTheme={setTheme} currentUser={currentUser} setCurrentUser={setCurrentUser} isAuthenticated={isAuthenticated} onLogout={handleLogout} onOpenLogin={() => setShowLoginModal(true)} /> }
        </main>

        {/* Bottom Navigation Mobile */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-50 shadow-sm" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="flex justify-around items-center">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center gap-1 ${
                activeTab === 'dashboard' ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <Home size={24} />
              <span className="text-xs">Accueil</span>
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex flex-col items-center gap-1 ${
                activeTab === 'transactions' ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <Wallet size={24} />
              <span className="text-xs">Historique</span>
            </button>
            <button
              onClick={() => setActiveTab('ajouter')}
              className="flex items-center justify-center w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-lg -mt-8"
            >
              <Plus className="text-white" size={28} />
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex flex-col items-center gap-1 ${
                activeTab === 'stats' ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <TrendingUp size={24} />
              <span className="text-xs">Stats</span>
            </button>
            <button
              onClick={() => setActiveTab('objectifs')}
              className={`flex flex-col items-center gap-1 ${
                activeTab === 'objectifs' ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <Target size={24} />
              <span className="text-xs">Objectifs</span>
            </button>
            <button
              onClick={() => setActiveTab('profil')}
              className={`flex flex-col items-center gap-1 ${
                activeTab === 'profil' ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <Settings size={24} />
              <span className="text-xs">Profil</span>
            </button>
          </div>
        </nav>
      </div>
          <LoginModal open={showLoginModal} onClose={() => setShowLoginModal(false)} onSuccess={async () => {
            // after successful login, refresh session and data
            try {
              const session = await api.checkSession();
              if (session.ok && session.data && session.data.success) {
                setCurrentUser(session.data.user);
                setIsAuthenticated(true);
              }
            } catch (e) {
              console.warn('checkSession after login failed', e);
            }
            // after login, refresh data
            await loadData();
          }} />
      <TransactionModalContainer
        open={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        onSuccess={() => {
          // Rafraîchir la liste des transactions après ajout
          loadData();
        }}
      />
    </div>
    </PreferencesProvider>
  );
}

export default App;
