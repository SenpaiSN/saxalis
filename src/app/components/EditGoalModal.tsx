import { useState, useEffect } from 'react';
import * as api from '../../services/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  goal: any;
}

export default function EditGoalModal({ open, onClose, onUpdated, goal }: Props) {
  // The objectif model stores the name in the subcategory; editing the name requires subcategory operations.
  // For now we only allow editing the target amount and the 'automatique' flag.
  const [montant, setMontant] = useState(goal?.montant_objectif ? String(goal.montant_objectif) : '');
  const [automatique, setAutomatique] = useState(Boolean(goal?.automatique));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMontant(goal?.montant_objectif ? String(goal.montant_objectif) : '');
      setAutomatique(Boolean(goal?.automatique));
      setError(null);
    }
  }, [open, goal]);

  if (!open) return null;

  const submit = async (e: any) => {
    e.preventDefault();
    setError(null);
    const value = parseFloat(montant.replace(',', '.'));
    if (isNaN(value) || value <= 0) {
      setError('Montant cible invalide');
      return;
    }
    setLoading(true);
    try {
      const payload: any = { id: goal.id, montant: value, automatique: automatique ? 1 : 0 };
      const res = await api.updateGoal(payload);
      if (res.ok && res.data && res.data.success) {
        onUpdated();
        onClose();
      } else {
        setError('Erreur lors de la mise à jour');
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
        <h3 className="text-lg font-semibold mb-2">Modifier l'objectif</h3>
        <p className="text-sm text-gray-500 mb-4">Modifie le montant cible et l'option de versement automatique.</p>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">Nom</label>
            <div className="mt-1 p-2 border rounded-md bg-gray-50">{goal?.name ?? goal?.nom}</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">Montant cible</label>
            <input value={montant} onChange={e => setMontant(e.target.value)} className="w-full mt-1 p-2 border rounded-md" />
          </div>
          <div className="flex items-center gap-2">
            <input id="auto" type="checkbox" checked={automatique} onChange={e => setAutomatique(e.target.checked)} />
            <label htmlFor="auto" className="text-sm text-gray-600">Versements automatiques</label>
          </div>
        </div>

        {error && <div className="text-sm text-red-600 mt-3">{error}</div>}

        <div className="mt-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md">Annuler</button>
          <button type="submit" disabled={loading} className="px-4 py-2 rounded-md bg-blue-600 text-white">{loading ? 'Mise à jour…' : 'Mettre à jour'}</button>
        </div>
      </form>
    </div>
  );
}
