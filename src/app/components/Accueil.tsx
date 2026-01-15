import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import IconFromName from './IconFromName';
import Filters from './Filters';
import StatsCardsDesign from './StatsCardsDesign';
import { TrendingUp, TrendingDown, Calendar, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import { Transaction } from '../App';
import { usePreferences } from '../contexts/PreferencesContext';
import formatCurrency from '../../lib/formatCurrency';
import { computeTotals } from './statsUtils';

interface AccueilProps {
  transactions: Transaction[];
  // shared filters (optional when Accueil is rendered outside App)
  recherche?: string;
  setRecherche?: (v: string) => void;
  annee?: string;
  setAnnee?: (v: string) => void;
  mois?: string;
  setMois?: (v: string) => void;
  filtreType?: 'tous' | 'expense' | 'income';
  setFiltreType?: (v: 'tous' | 'expense' | 'income') => void;
  categorie?: string;
  setCategorie?: (v: string) => void;
  sousCategorie?: string;
  setSousCategorie?: (v: string) => void;
  types?: Array<{ id_type: number; code: string; label: string }>;
  categories?: Array<{ id_category: number; name: string }>;
  subcategories?: Array<{ id_subcategory: number; name: string }>;
  categoriesLoading?: boolean;
  subcategoriesLoading?: boolean;
  anneesDisponibles?: string[];
  onReset?: () => void;
}

export default function Accueil({ transactions,
  recherche, setRecherche, annee, setAnnee, mois, setMois,
  filtreType, setFiltreType, categorie, setCategorie, sousCategorie, setSousCategorie,
  types, categories, subcategories, categoriesLoading, subcategoriesLoading, anneesDisponibles, onReset
}: AccueilProps) {
  // Calculer les totaux et construire les stat cards
  const { locale, currency } = usePreferences();


  // Use computeTotals to derive consistent values
  const totals = computeTotals(transactions || [], types ?? []);
  const totalDepenses = totals.depenses.real;
  const totalRevenus = totals.revenus.real;
  const solde = totals.revenus.real - totals.depenses.real;
  const epargne = totals.epargne.real;

  // Comparison vs previous year
  const prevYear = new Date().getFullYear() - 1;
  const prevRevenus = (transactions || [])
    .filter(t => new Date(t.date).getFullYear() === prevYear && t.type === 'revenu')
    .reduce((s, t) => s + (t.montant ?? 0), 0);
  const prevDepenses = (transactions || [])
    .filter(t => new Date(t.date).getFullYear() === prevYear && t.type === 'dépense')
    .reduce((s, t) => s + Math.abs(t.montant), 0);

  const computeChangeLabel = (current: number, previous: number) => {
    if (previous === 0) return `— par rapport à ${prevYear}`;
    const pct = (current - previous) / Math.abs(previous) * 100;
    const sign = pct >= 0 ? '+' : '-';
    return `${sign}${Math.abs(pct).toFixed(2)}% par rapport à ${prevYear}`;
  };

  const revenusChangeLabel = computeChangeLabel(totalRevenus, prevRevenus);
  const depensesChangeLabel = computeChangeLabel(totalDepenses, prevDepenses);
  const soldeChangeLabel = computeChangeLabel(solde, prevRevenus - prevDepenses);

  const statsItems = [
    {
      title: 'Solde total',
      value: formatCurrency(solde),
      change: soldeChangeLabel.split(' ')[0] === '—' ? undefined : soldeChangeLabel.split(' ')[0],
      comparison: `— par rapport à ${prevYear}`,
      trend: (solde >= (prevRevenus - prevDepenses)) ? 'up' : 'down',
      icon: Wallet,
      gradient: 'from-blue-500 via-blue-600 to-indigo-600',
      bgGradient: 'from-blue-50 to-indigo-50',
    },
    {
      title: 'Revenus',
      value: formatCurrency(totalRevenus),
      change: revenusChangeLabel.split(' ')[0] === '—' ? undefined : revenusChangeLabel.split(' ')[0],
      comparison: `— par rapport à ${prevYear}`,
      trend: 'up',
      icon: ArrowUpRight,
      gradient: 'from-emerald-500 via-green-500 to-teal-500',
      bgGradient: 'from-emerald-50 to-teal-50',
    },
    {
      title: 'Dépenses',
      value: formatCurrency(totalDepenses),
      change: depensesChangeLabel.split(' ')[0] === '—' ? undefined : depensesChangeLabel.split(' ')[0],
      comparison: `— par rapport à ${prevYear}`,
      trend: 'down',
      icon: ArrowDownRight,
      gradient: 'from-rose-500 via-pink-500 to-red-500',
      bgGradient: 'from-rose-50 to-pink-50',
    },
  ];


  // Date d'aujourd'hui formatée selon la locale (ex: "Samedi 27 décembre 2025")
  const todayLabel = new Date().toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const todayLabelCapitalized = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1);

  // Données pour le graphique
  const graphData = [
    { mois: 'Jan', valeur: 1100 },
    { mois: 'Mar', valeur: 1000 },
    { mois: 'Avr', valeur: 1200 },
    { mois: 'Mai', valeur: 1250 },
    { mois: 'Juin', valeur: 1180 },
    { mois: 'Juil', valeur: 1300 },
    { mois: 'Août', valeur: 1220 },
    { mois: 'Sep', valeur: 1350 },
    { mois: 'Oct', valeur: 1400 },
    { mois: 'Nov', valeur: 1380 },
    { mois: 'Déc', valeur: 1254.80 },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}>
      <div className="max-w-md mx-auto">
        {/* Header avec carte verte */}
        <div className="bg-green-700 rounded-3xl p-6 text-white shadow-lg mb-4">
          {/* En-tête */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm opacity-90">Accueil</span>
              </div>
              <h1 className="text-xl mb-2">Bonjour 👋</h1>
              <div className="flex items-center gap-2 text-sm">
                <span className="whitespace-normal break-words">{todayLabelCapitalized}</span>
                <Calendar size={14} />
              </div>
            </div>
            <button className="min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </button>
          </div>

          {/* Solde principal */}
          <div className="mb-4">
              <div className="text-4xl font-bold mb-1">{formatCurrency(solde)}</div>
            <div className="flex items-center gap-1 text-sm opacity-90">
              <TrendingUp size={14} />
              <span>{soldeChangeLabel}</span>
            </div>
          </div>

          {/* Stats cards (responsive) */}
          <div className="mb-6">
            <StatsCardsDesign items={statsItems} />
          </div>

          {/* Graphique */}
          <div className="h-28 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={graphData}>
                <defs>
                  <linearGradient id="colorValeur" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.3}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis 
                  dataKey="mois" 
                  stroke="rgba(255,255,255,0.5)" 
                  tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.7)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '12px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="valeur" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fill="url(#colorValeur)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mobile: use the History-style filter card (collapsed & compact) */}
        {setRecherche ? (
          <div className="lg:hidden mt-3">
            <Filters
              recherche={recherche ?? ''} setRecherche={setRecherche}
              annee={annee ?? 'Tous'} setAnnee={setAnnee}
              mois={mois ?? 'Tous'} setMois={setMois}
              filtreType={filtreType ?? 'tous'} setFiltreType={setFiltreType}
              categorie={categorie ?? 'Toutes'} setCategorie={setCategorie} sousCategorie={sousCategorie ?? 'Toutes'} setSousCategorie={setSousCategorie}
              types={types ?? []} categories={categories ?? []} subcategories={subcategories ?? []}
              categoriesLoading={!!categoriesLoading} subcategoriesLoading={!!subcategoriesLoading}
              anneesDisponibles={anneesDisponibles ?? []} onReset={onReset}
              storageKey="filters:accueil-mobile"
              defaultCollapsed={true}
              compact={true}
            />


          </div>
        ) : null}

        {/* Transactions récentes */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold">Transactions récentes</h2>
            <button className="text-gray-400 hover:text-gray-600">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <circle cx="10" cy="4" r="1.5" />
                <circle cx="10" cy="10" r="1.5" />
                <circle cx="10" cy="16" r="1.5" />
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            {transactions.slice(0, 4).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ backgroundColor: transaction.type === 'revenu' ? 'var(--card-bg-revenu)' : transaction.type === 'dépense' ? 'var(--card-bg-depense)' : 'var(--card-bg-epargne)', color: transaction.type === 'revenu' ? 'var(--color-revenu)' : transaction.type === 'dépense' ? 'var(--color-depense)' : 'var(--color-epargne)' }}>
                    <IconFromName name={transaction.subcategory_icon} fallback={transaction.emoji || '💰'} size={18} />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{transaction.subcategoryName ?? transaction.categorie}</div>
                    {transaction.subcategoryName ? <div className="text-xs text-gray-500">{transaction.categorie}</div> : null}
                    <div className="text-xs text-gray-500">
                      {new Date(transaction.date).toLocaleDateString(locale, {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
                <div className="font-bold text-sm" style={{ color: transaction.type === 'dépense' ? 'var(--color-depense)' : 'var(--color-revenu)' }}>
                  {formatCurrency(transaction.montant)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
