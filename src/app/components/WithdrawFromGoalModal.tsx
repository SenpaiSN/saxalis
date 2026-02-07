import { useEffect, useState } from 'react';
import * as api from '../../services/api';

interface Props {
  open: boolean;
  goal: any;
  onClose: () => void;
  onDone: () => void;
}

export default function WithdrawFromGoalModal({ open, goal, onClose, onDone }: Props) {
  const [montant, setMontant] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load transaction types and default to 'Dépense' (id_type === 1) when possible
    (async () => {
      try {
        const res = await api.getTransactionTypes();
        if (res.ok && res.data && Array.isArray(res.data.types)) {
          // (code removed - no longer needed)
        }
      } catch (e) {
        console.warn('Failed to load transaction types', e);
      }
    })();
  }, []);

  if (!open || !goal) return null;

  const submit = async (e: any) => {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(montant.replace(',', '.'));
    if (isNaN(amt) || amt <= 0) { setError('Montant invalide'); return; }
    setLoading(true);
    try {
      // Retrait simple : juste goal_id et montant
      // Le backend enregistrera cela comme épargne négative (id_type=3, montant négatif)
      // Cela réduit l'épargne SANS affecter le solde total
      const payload: any = { goal_id: goal.id, montant: amt, notes: notes || undefined };
      const res = await api.withdrawFromGoal(payload);
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
        <h3 className="text-lg font-semibold mb-2">Retirer des fonds — {goal.nom}</h3>
        <p className="text-sm text-gray-500 mb-4">Ce retrait réduit votre épargne. Le solde total n'est pas affecté.</p>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">Montant *</label>
            <input value={montant} onChange={e => setMontant(e.target.value)} className="w-full mt-1 p-2 border rounded-md" placeholder="300.00" required />
          </div>

          <div>
            <label className="text-sm text-gray-600">Notes (optionnel)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full mt-1 p-2 border rounded-md" placeholder="Raison du retrait" />
          </div>
        </div>

        {error && <div className="text-sm text-red-600 mt-3">{error}</div>}

        <div className="mt-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md">Annuler</button>
          <button type="submit" disabled={loading} className="px-4 py-2 rounded-md bg-red-600 text-white">{loading ? 'En cours…' : 'Retirer'}</button>
        </div>
      </form>
    </div>
  );
}
