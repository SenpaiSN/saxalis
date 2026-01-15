import { useEffect, useState } from 'react';
import * as api from '../../services/api';
import { usePreferences } from '../contexts/PreferencesContext';
import formatCurrency from '../../lib/formatCurrency';

interface Props {
  open: boolean;
  onClose: () => void;
  goalId: number;
  onUpdated: () => void;
}

export default function PlanModal({ open, onClose, goalId, onUpdated }: Props) {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'monthly'|'percent'|'round_up'>('monthly');
  const [amount, setAmount] = useState('');
  const [percent, setPercent] = useState('');
  const [scheduleDay, setScheduleDay] = useState<number>(1);
  const [error, setError] = useState<string|null>(null);

  const { locale, currency } = usePreferences();

  useEffect(() => { if (open) load(); }, [open]);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.getGoalPlans();
      if (res.ok && res.data && res.data.plans) {
        setPlans(res.data.plans.filter((p:any) => p.goal_id === goalId));
      } else {
        setError('Impossible de charger les plans');
      }
    } catch (e) {
      setError('Erreur réseau');
    } finally { setLoading(false); }
  };

  const submit = async (e:any) => {
    e.preventDefault(); setError(null);
    const payload: any = { goal_id: goalId, type };
    if (type === 'monthly') payload.amount = parseFloat(amount.replace(',', '.')) || 0;
    if (type === 'percent') payload.percent = parseFloat(percent.replace(',', '.')) || 0;
    if (type === 'monthly' || type === 'percent') payload.schedule_day = scheduleDay;

    try {
      const res = await api.addGoalPlan(payload);
      if (res.ok && res.data && res.data.success) {
        await load();
        onUpdated();
      } else setError('Erreur lors de la création');
    } catch (e) { setError('Erreur réseau'); }
  };

  const toggleActive = async (p:any, active:boolean) => {
    try {
      await api.updateGoalPlan({ id: p.id, active: active ? 1 : 0 });
      await load(); onUpdated();
    } catch (e) { alert('Erreur'); }
  };

  const remove = async (p:any) => {
    if (!confirm('Supprimer ce plan ?')) return;
    try { await api.deleteGoalPlan({ id: p.id }); await load(); onUpdated(); } catch (e) { alert('Erreur'); }
  };

  const runNow = async (p:any) => {
    if (!confirm('Exécuter ce plan maintenant (créera un dépôt) ?')) return;
    try {
      await api.runGoalPlans();
      await load(); onUpdated();
      alert('Plan exécuté (voir historique)');
    } catch (e) { alert('Erreur d\'exécution'); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Planification</h3>
          <button onClick={onClose} className="text-sm text-gray-500">Fermer</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <form onSubmit={submit} className="p-4 border rounded">
            <div className="mb-2">
              <label className="text-sm">Type</label>
              <select value={type} onChange={e => setType(e.target.value as any)} className="w-full p-2 border rounded mt-1">
                <option value="monthly">Montant mensuel fixe</option>
                <option value="percent">Pourcentage du revenu</option>
                <option value="round_up">Arrondi intelligent (micro-épargne)</option>
              </select>
            </div>

            {type === 'monthly' && (
              <div className="mb-2">
                <label className="text-sm">Montant ({currency === 'EUR' ? '€' : currency}/mois)</label>
                <input value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-2 border rounded mt-1" />
                <label className="text-sm mt-2">Jour du mois</label>
                <input type="number" value={scheduleDay} min={1} max={28} onChange={e => setScheduleDay(Number(e.target.value))} className="w-full p-2 border rounded mt-1" />
              </div>
            )}

            {type === 'percent' && (
              <div className="mb-2">
                <label className="text-sm">Pourcentage du revenu (ex: 5 pour 5%)</label>
                <input value={percent} onChange={e => setPercent(e.target.value)} className="w-full p-2 border rounded mt-1" />
                <label className="text-sm mt-2">Jour du mois</label>
                <input type="number" value={scheduleDay} min={1} max={28} onChange={e => setScheduleDay(Number(e.target.value))} className="w-full p-2 border rounded mt-1" />
              </div>
            )}

            {type === 'round_up' && (
              <div className="mb-2 text-sm text-gray-600">Les arrondis seront calculés depuis le dernier traitement (mensuel par défaut).</div>
            )}

            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-3 py-1 border rounded">Annuler</button>
              <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white">Ajouter</button>
            </div>
          </form>

          <div className="p-4 border rounded">
            <h4 className="font-medium mb-2">Plans existants</h4>
            {loading && <div>Chargement…</div>}
            {!loading && plans.length === 0 && <div className="text-sm text-gray-500">Aucun plan</div>}
            {!loading && plans.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2">
                <div className="text-sm">
                  <div className="font-medium">{p.type} {p.type === 'monthly' && `• ${formatCurrency(parseFloat(p.amount))}/mois`} {p.type === 'percent' && `• ${parseFloat(p.percent)}%`} </div>
                  <div className="text-xs text-gray-500">{p.active ? 'Actif' : 'Inactif'} • Dernier run: {p.last_run_date ?? '—'}</div>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <button onClick={() => toggleActive(p, !p.active)} className="px-2 py-1 border rounded text-sm">{p.active ? 'Désactiver' : 'Activer'}</button>
                  <div className="flex gap-2">
                    <button onClick={() => runNow(p)} className="px-2 py-1 border rounded text-sm">Exécuter</button>
                    <button onClick={() => remove(p)} className="px-2 py-1 border rounded text-sm text-red-600">Supprimer</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
