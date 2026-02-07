import React, { useEffect, useState } from 'react';
import { usePreferences } from '../contexts/PreferencesContext';
import formatCurrency from '../../lib/formatCurrency';
import * as api from '../../services/api';
import { PiggyBank } from 'lucide-react';

interface Props {
  recherche?: string;
  annee?: string;
  mois?: string;
  filtreType?: 'tous' | 'expense' | 'income';
  categorie?: string;
  sousCategorie?: string;
}

export default function BudgetRemainingCard({ recherche, annee, mois, filtreType, categorie, sousCategorie }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const { locale, currency } = usePreferences();

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const payload = { recherche, annee, mois, filtreType, categorie, sousCategorie, avgMode: 'ignore_empty', onlyPositiveBudgets: true };
        const res = await api.getBudgets(payload);
        if (mounted) setData(res.data);
      } catch (e) {
        console.error('get_budgets failed', e);
      } finally { if (mounted) setLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, [recherche, annee, mois, filtreType, categorie, sousCategorie]);

  const format = formatCurrency;
  if (loading || !data) {
    return (
      <div tabindex="0" className="group relative bg-white rounded-2xl md:rounded-3xl shadow-lg border border-gray-200 p-5 md:p-6 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex flex-col 80">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-orange-50 opacity-0 group-hover:opacity-100 group-active:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300"></div>
        <div className="absolute -right-3 -bottom-3 w-16 h-16 md:w-24 md:h-24 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-full opacity-0 group-hover:opacity-10 group-active:opacity-10 group-focus-within:opacity-10 transition-opacity duration-300"></div>
        <div className="relative">
          <h3 className="font-bold text-sm mb-3">Rester à dépenser</h3>
          <p className="text-sm text-gray-500">Chargement…</p>
        </div>
      </div>
    );
  }

  let subs: any[] = data?.subcategories || [];
  // Client-side additional filters: recherche matches name; categoria/sousCategorie already applied on server when possible
  const search = (recherche || '').trim().toLowerCase();
  if (search.length > 0) subs = subs.filter(s => ((s.name ?? '') + ' ' + (s.category_name ?? '')).toLowerCase().includes(search));
  if (categorie && categorie !== 'Toutes') subs = subs.filter(s => (s.category_name ?? '') === categorie);
  if (sousCategorie && sousCategorie !== 'Toutes') subs = subs.filter(s => (s.name ?? '') === sousCategorie);

  // Show items with lowest remaining (most at risk) sorted ascending, excluding items with remaining = 0
  const sorted = subs.slice()
    .filter(s => s.remaining !== 0)
    .sort((a,b) => a.remaining - b.remaining);

  return (
    <div tabindex="0" className="group relative bg-white rounded-2xl md:rounded-3xl shadow-lg border border-gray-200 p-5 md:p-6 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex flex-col min-h-96 lg:min-h-80">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-orange-50 opacity-0 group-hover:opacity-100 group-active:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300"></div>
      <div className="absolute -right-3 -bottom-3 w-16 h-16 md:w-24 md:h-24 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-full opacity-0 group-hover:opacity-10 group-active:opacity-10 group-focus-within:opacity-10 transition-opacity duration-300"></div>
      
      <div className="relative flex flex-col h-full">
        <div className="mb-3">
          <h3 className="font-bold text-sm">Rester à dépenser</h3>
        </div>
        <div className="absolute top-0 right-0 p-1.5 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-lg text-white group-hover:scale-110 transition-transform duration-300">
          <PiggyBank size={16} />
        </div>

        <div className="space-y-3 overflow-y-auto pr-2 flex-1">
          {sorted.length === 0 ? <p className="text-sm text-gray-500">Aucune donnée.</p> : sorted.map(s => {
            const percent = s.percent_spent ?? (s.budget_used ? (s.spent_this_month / (s.budget_used || 1)) * 100 : null);
            const pctClamped = percent === null ? 0 : Math.max(0, Math.min(100, percent));
            const barColor = percent === null ? 'bg-gray-300' : (percent > 100 ? 'bg-red-500' : (percent > 80 ? 'bg-yellow-400' : 'bg-green-500'));
            return (
              <div key={s.id_subcategory} className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{s.name}</span>
                    <div className="text-sm font-bold flex items-center gap-2">
                      <span>{format(s.remaining)}</span>
                      <small className="text-xs text-gray-500">{percent !== null ? `${percent.toFixed(0)}%` : '—'}</small>
                    </div>
                  </div>

                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent !== null ? Math.round(Math.min(999, percent)) : 0} aria-label={`Consommation ${s.name}: ${percent !== null ? Math.round(percent) + '%' : 'Aucun budget'}`}>
                    <div style={{ width: `${pctClamped}%` }} className={`h-full rounded-full ${barColor}`}></div>
                  </div>

                  <div className="text-xs text-gray-500 mt-1">
                    <span>Budget: {format(s.budget_used)}</span>
                    <span className="mx-2">•</span>
                    <span>Dépenses: {format(s.spent_this_month)}</span>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}