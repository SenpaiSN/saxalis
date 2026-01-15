import React from 'react';
import { Search, Calendar, Filter, ChevronUp, ChevronDown } from 'lucide-react';

interface TypeItem { id_type: number; code: string; label: string }
interface CategoryItem { id_category: number; name: string }
interface SubcategoryItem { id_subcategory: number; name: string }

interface Props {
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
  types?: TypeItem[];
  categories?: CategoryItem[];
  subcategories?: SubcategoryItem[];
  categoriesLoading?: boolean;
  subcategoriesLoading?: boolean;
  anneesDisponibles?: string[];
  onReset: () => void;
  storageKey?: string;
  /** If true, the filter panel starts collapsed when there's no saved preference in localStorage */
  defaultCollapsed?: boolean;
  /** Compact layout for mobile (smaller paddings and min widths) */
  compact?: boolean;
}

export default function Filters(props: Props) {
  const {
    recherche, setRecherche, annee, setAnnee, mois, setMois,
    filtreType, setFiltreType, categorie, setCategorie, sousCategorie, setSousCategorie,
    types, categories, subcategories, categoriesLoading, subcategoriesLoading, anneesDisponibles, onReset
  } = props;

  const compact = Boolean(props.compact);
  const inputPy = compact ? 'py-1.5' : 'py-2';
  const largeMin = compact ? 'min-w-[160px]' : 'min-w-[220px]';
  const mediumMin = compact ? 'min-w-[140px]' : 'min-w-[160px]';
  const smallMin = compact ? 'min-w-[80px]' : 'min-w-[100px]';

  const years = anneesDisponibles ?? [];
  const safeTypes = types ?? [];
  const safeCategories = categories ?? [];
  const safeSubcategories = subcategories ?? [];
  const catLoading = categoriesLoading ?? false;
  const subLoading = subcategoriesLoading ?? false;
  // active filters count for compact display
  const activeCount = [recherche.trim().length > 0, annee !== 'Tous', mois !== 'Tous', categorie !== 'Toutes', sousCategorie !== 'Toutes', filtreType !== 'tous'].filter(Boolean).length;
  const key = props.storageKey ?? 'filters:collapsed';
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) return stored === 'true';
      return Boolean(props.defaultCollapsed);
    } catch { return Boolean(props.defaultCollapsed); }
  });
  React.useEffect(() => {
    try { localStorage.setItem(key, String(collapsed)); } catch { /* ignore */ }
  }, [collapsed, key]);

  return (
    <div className="rounded-2xl p-3 overflow-x-auto" style={{ backgroundColor: 'var(--card)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border)', borderRadius: 'var(--card-border-radius)' }}>
          <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Filter size={16} />
          <span className="font-semibold">Filtres</span>
          {activeCount > 0 && <span className="text-xs text-gray-600 ml-2">{activeCount} actif{activeCount > 1 ? 's' : ''}</span>}
        </div>
        <div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-expanded={!collapsed}
            className="p-2 rounded-md hover:bg-gray-100"
            title={collapsed ? 'Déplier' : 'Replier'}
          >
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {!collapsed ? (
        <>
          {/* Mobile: compact stacked design only */}
          <div className="lg:hidden">
            <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} items-start`}>
              <div className="w-full">
                <label className="text-xs text-gray-600 inline-flex items-center gap-2 mb-1"><Search size={14} /> Recherche</label>
                <input
                  type="text"
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder="Rechercher une transaction..."
                  className={`w-full px-3 ${inputPy} rounded-full border border-gray-200 bg-white text-sm shadow-sm placeholder-gray-400`}
                />
              </div>

              <div className="w-full sm:w-auto">
                <label className="text-xs text-gray-600 inline-flex items-center gap-2 mb-1"><Calendar size={14} /> Année</label>
                <select value={annee} onChange={(e)=>setAnnee(e.target.value)} className={`w-full px-3 ${inputPy} rounded-full border border-gray-200 bg-white text-sm shadow-sm`}>
                  <option value="Tous">Année</option>
                  {years.map(y => (<option key={y} value={y}>{y}</option>))}
                </select>
              </div>

              <div className="w-full sm:w-auto">
                <label className="text-xs text-gray-600 mb-1">Mois</label>
                <select value={mois} onChange={(e)=>setMois(e.target.value)} className={`w-full px-3 ${inputPy} rounded-full border border-gray-200 bg-white text-sm shadow-sm`}>
                  <option value="Tous">Tous</option>
                  {[
                    ['01','Janv.'],['02','Févr.'],['03','Mars'],['04','Avr.'],['05','Mai'],['06','Juin'],
                    ['07','Juil.'],['08','Août'],['09','Sept.'],['10','Oct.'],['11','Nov.'],['12','Déc.']
                  ].map(([val,label]) => (<option key={val} value={val}>{label}</option>))}
                </select>
              </div>

              <div className="w-full sm:w-auto">
                <label className="text-xs text-gray-600 mb-1">Type</label>
                <select value={filtreType} onChange={(e)=>setFiltreType(e.target.value as any)} className={`w-full px-3 ${inputPy} rounded-full border border-gray-200 bg-white text-sm shadow-sm`}>
                  <option value="tous">Tous</option>
                  {safeTypes.map(t => (<option key={t.id_type} value={t.code}>{t.label}</option>))}
                </select>
              </div>

              <div className="w-full">
                <label className="text-xs text-gray-600 mb-1">Catégorie</label>
                <select value={categorie} onChange={(e)=>setCategorie(e.target.value)} disabled={catLoading || safeCategories.length === 0} className={`w-full px-3 ${inputPy} rounded-full border border-gray-200 bg-white text-sm shadow-sm ${catLoading || safeCategories.length === 0 ? 'opacity-70 cursor-not-allowed' : ''}`}>
                  <option value="Toutes">Toutes les catégories</option>
                  {safeCategories.map(c => (<option key={c.id_category} value={c.name}>{c.name}</option>))}
                </select>
              </div>

              <div className="w-full">
                <label className="text-xs text-gray-600 mb-1">Sous-catégorie</label>
                <select value={sousCategorie} onChange={(e)=>setSousCategorie(e.target.value)} disabled={subLoading || safeSubcategories.length === 0} className={`w-full px-3 ${inputPy} rounded-full border border-gray-200 bg-white text-sm shadow-sm ${subLoading || safeSubcategories.length === 0 ? 'opacity-70 cursor-not-allowed' : ''}`}>
                  <option value="Toutes">Toutes les sous-catégories</option>
                  {safeSubcategories.map(s => (<option key={s.id_subcategory} value={s.name}>{s.name}</option>))}
                </select>
              </div>

              <div className="w-full flex justify-end mt-1">
                <button
                  onClick={onReset}
                  className="text-sm font-semibold text-gray-700 hover:underline"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>

          {/* Desktop: restore previous inline layout */}
          <div className="hidden lg:block">
            <div className="flex items-center gap-4 min-w-max px-1">
              <div className={`flex-1 ${largeMin}`}>
                <label className="text-xs text-gray-600 inline-flex items-center gap-2 mb-1"><Search size={14} /> Recherche</label>
                <input
                  type="text"
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder="Rechercher une transaction..."
                  className={`w-full px-3 ${inputPy} rounded-full border border-gray-200 bg-white text-sm shadow-sm placeholder-gray-400`}
                />
              </div>

              <div className={`${smallMin}`}>
                <label className="text-xs text-gray-600 inline-flex items-center gap-2 mb-1"><Calendar size={14} /> Année</label>
                <select value={annee} onChange={(e)=>setAnnee(e.target.value)} className={`w-full px-3 ${inputPy} rounded-full border border-gray-200 bg-white text-sm shadow-sm`}>
                  <option value="Tous">Année</option>
                  {years.map(y => (<option key={y} value={y}>{y}</option>))}
                </select>
              </div>

              <div className={`${smallMin}`}>
                <label className="text-xs text-gray-600 mb-1">Mois</label>
                <select value={mois} onChange={(e)=>setMois(e.target.value)} className={`w-full px-3 ${inputPy} rounded-full border border-gray-200 bg-white text-sm shadow-sm`}>
                  <option value="Tous">Tous</option>
                  {[
                    ['01','Janv.'],['02','Févr.'],['03','Mars'],['04','Avr.'],['05','Mai'],['06','Juin'],
                    ['07','Juil.'],['08','Août'],['09','Sept.'],['10','Oct.'],['11','Nov.'],['12','Déc.']
                  ].map(([val,label]) => (<option key={val} value={val}>{label}</option>))}
                </select>
              </div>

              <div className={`${smallMin}`}>
                <label className="text-xs text-gray-600 mb-1">Type</label>
                <select value={filtreType} onChange={(e)=>setFiltreType(e.target.value as any)} className={`w-full px-3 ${inputPy} rounded-full border border-gray-200 bg-white text-sm shadow-sm`}>
                  <option value="tous">Tous</option>
                  {safeTypes.map(t => (<option key={t.id_type} value={t.code}>{t.label}</option>))}
                </select>
              </div>

              <div className={`${mediumMin}`}>
                <label className="text-xs text-gray-600 mb-1">Catégorie</label>
                <select value={categorie} onChange={(e)=>setCategorie(e.target.value)} disabled={catLoading || safeCategories.length === 0} className={`w-full px-3 ${inputPy} rounded-full border border-gray-200 bg-white text-sm shadow-sm ${catLoading || safeCategories.length === 0 ? 'opacity-70 cursor-not-allowed' : ''}`}>
                  <option value="Toutes">Toutes les catégories</option>
                  {safeCategories.map(c => (<option key={c.id_category} value={c.name}>{c.name}</option>))}
                </select>
              </div>

              <div className={`${mediumMin}`}>
                <label className="text-xs text-gray-600 mb-1">Sous-catégorie</label>
                <select value={sousCategorie} onChange={(e)=>setSousCategorie(e.target.value)} disabled={subLoading || safeSubcategories.length === 0} className={`w-full px-3 ${inputPy} rounded-full border border-gray-200 bg-white text-sm shadow-sm ${subLoading || safeSubcategories.length === 0 ? 'opacity-70 cursor-not-allowed' : ''}`}>
                  <option value="Toutes">Toutes les sous-catégories</option>
                  {safeSubcategories.map(s => (<option key={s.id_subcategory} value={s.name}>{s.name}</option>))}
                </select>
              </div>

              <div className="ml-auto pr-2 flex items-center gap-4">
                <button
                  onClick={onReset}
                  className="text-sm font-semibold text-gray-700 hover:underline"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between px-2 py-3">
          <div className="text-sm text-gray-600">Filtres repliés</div>
          <div className="flex items-center gap-3">
            {activeCount > 0 && <div className="text-sm text-gray-700">{activeCount} actif{activeCount > 1 ? 's' : ''}</div>}
            {/* Header toggle already provides the expand action; avoid duplicate button here */}
          </div>
        </div>
      )}
    </div>
  );
}
