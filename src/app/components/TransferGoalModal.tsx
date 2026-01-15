import { useState } from 'react';
import * as api from '../../services/api';
import formatCurrency from '../../lib/formatCurrency';
import { usePreferences } from '../contexts/PreferencesContext';

interface Props {
  open: boolean;
  fromGoal: any;
  goals: any[];
  onClose: () => void;
  onDone: () => void;
}

export default function TransferGoalModal({ open, fromGoal, goals, onClose, onDone }: Props) {
  const [toGoalId, setToGoalId] = useState<number | undefined>(undefined);
  const [montant, setMontant] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !fromGoal) return null;

  const { locale, currency } = usePreferences();

  const submit = async (e: any) => {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(montant.replace(',', '.'));
    if (!toGoalId) { setError('Choisissez un objectif cible'); return; }
    if (isNaN(amt) || amt <= 0) { setError('Montant invalide'); return; }
    setLoading(true);
    try {
      const res = await api.transferBetweenGoals({ from_goal_id: fromGoal.id, to_goal_id: toGoalId, montant: amt, notes: notes || undefined });
      if (res.ok && res.data && res.data.success) {
        onDone();
        onClose();
      } else {
        setError(res.data?.error || 'Erreur serveur');
      }
    } catch (e) {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={submit} className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-2">Transférer — {fromGoal.nom}</h3>
        <p className="text-sm text-gray-500 mb-4">Transfert interne entre objectifs (aucune transaction bancaire).</p>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">Objectif cible</label>
            <select value={toGoalId ?? ''} onChange={e => setToGoalId(e.target.value ? Number(e.target.value) : undefined)} className="w-full mt-1 p-2 border rounded-md">
              <option value="">Choisir</option>
              {goals.filter(g => g.id !== fromGoal.id).map(g => <option key={g.id} value={g.id}>{g.nom} — {g.montant_depose ? formatCurrency(g.montant_depose, currency, locale) : ''}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600">Montant</label>
            <input value={montant} onChange={e => setMontant(e.target.value)} className="w-full mt-1 p-2 border rounded-md" placeholder="200.00" />
          </div>

          <div>
            <label className="text-sm text-gray-600">Notes (optionnel)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full mt-1 p-2 border rounded-md" placeholder="Transfert permis -> Livret A" />
          </div>
        </div>

        {error && <div className="text-sm text-red-600 mt-3">{error}</div>}

        <div className="mt-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md">Annuler</button>
          <button type="submit" disabled={loading} className="px-4 py-2 rounded-md bg-indigo-600 text-white">{loading ? 'En cours…' : 'Transférer'}</button>
        </div>
      </form>
    </div>
  );
}
