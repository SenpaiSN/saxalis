import { useState } from 'react';
import * as api from '../../services/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function AddGoalModal({ open, onClose, onCreated }: Props) {
  const [nom, setNom] = useState('');
  const [montant, setMontant] = useState('');
  const [dateCible, setDateCible] = useState('');
  const [automatique, setAutomatique] = useState(false);
  const [initialDeposit, setInitialDeposit] = useState('');
  const [initialDepositDate, setInitialDepositDate] = useState('');
  const [initialDepositNotes, setInitialDepositNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = async (e: any) => {
    e.preventDefault();
    setError(null);
    const value = parseFloat(montant.replace(',', '.'));
    const initVal = initialDeposit ? parseFloat(initialDeposit.replace(',', '.')) : 0;
    if (!nom.trim() || isNaN(value) || value <= 0) {
      setError('Nom et montant valides requis');
      return;
    }
    if (initialDeposit && (isNaN(initVal) || initVal < 0)) {
      setError('Montant de versement initial invalide');
      return;
    }
    setLoading(true);
    try {
      const res = await api.createGoal({ nom: nom.trim(), montant_objectif: value, date_cible: dateCible || undefined, automatique: automatique ? 1 : 0 });
      if (res.ok && res.data && res.data.success && (res.data.goal || res.data.id)) {
        const createdId = res.data.goal ? res.data.goal.id_objectif : res.data.id;
        // If an initial deposit was provided, use the existing endpoint to create it so all server-side checks run
        if (initVal > 0) {
          const depRes = await api.addGoalDeposit({ goal_id: createdId, montant: initVal, date: initialDepositDate || undefined, create_depot: true, notes: initialDepositNotes || undefined });
          if (!depRes.ok || !depRes.data || !depRes.data.success) {
            setError('Objectif créé, mais le versement initial a échoué');
            // Still update the list so user sees the new objective
            onCreated();
            setNom(''); setMontant(''); setDateCible(''); setAutomatique(false); setInitialDeposit(''); setInitialDepositDate(''); setInitialDepositNotes('');
            onClose();
            return;
          }
        }

        onCreated();
        setNom(''); setMontant(''); setDateCible(''); setAutomatique(false); setInitialDeposit(''); setInitialDepositDate(''); setInitialDepositNotes('');
        onClose();
      } else {
        setError('Erreur lors de la création');
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
        <h3 className="text-lg font-semibold mb-2">Nouvel objectif</h3>
        <p className="text-sm text-gray-500 mb-4">Définis un nom et un montant cible.</p>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">Nom</label>
            <input value={nom} onChange={e => setNom(e.target.value)} className="w-full mt-1 p-2 border rounded-md" placeholder="Voyage Paris" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Montant cible</label>
            <input value={montant} onChange={e => setMontant(e.target.value)} className="w-full mt-1 p-2 border rounded-md" placeholder="1000.00" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Date cible (optionnelle)</label>
            <input type="date" value={dateCible} onChange={e => setDateCible(e.target.value)} className="w-full mt-1 p-2 border rounded-md" />
          </div>

          <div>
            <label className="inline-flex items-center gap-2 mt-2">
              <input type="checkbox" checked={automatique} onChange={e => setAutomatique(e.target.checked)} />
              <span className="text-sm text-gray-600">Activer versements automatiques</span>
            </label>
          </div>

          <div>
            <label className="text-sm text-gray-600">Versement initial (optionnel)</label>
            <div className="flex gap-2 mt-1">
              <input value={initialDeposit} onChange={e => setInitialDeposit(e.target.value)} className="p-2 border rounded-md" placeholder="Montant initial" />
              <input type="date" value={initialDepositDate} onChange={e => setInitialDepositDate(e.target.value)} className="p-2 border rounded-md" />
            </div>
            <input value={initialDepositNotes} onChange={e => setInitialDepositNotes(e.target.value)} className="w-full mt-2 p-2 border rounded-md" placeholder="Notes (optionnel)" />
          </div>
        </div>

        {error && <div className="text-sm text-red-600 mt-3">{error}</div>}

        <div className="mt-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md">Annuler</button>
          <button type="submit" disabled={loading} className="px-4 py-2 rounded-md bg-blue-600 text-white">{loading ? 'Création…' : 'Créer'}</button>
        </div>
      </form>
    </div>
  );
}
