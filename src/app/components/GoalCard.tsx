import { useState } from 'react';
import * as api from '../../services/api';
import EditGoalModal from './EditGoalModal';
import PlanModal from './PlanModal';
import { usePreferences } from '../contexts/PreferencesContext';
import formatCurrency from '../../lib/formatCurrency';

interface Goal {
  id: number;
  nom: string;
  montant_objectif: number;
  montant_depose: number;
  reste: number;
  date_cible?: string | null;
  date_creation?: string;
}

interface Props {
  goal: Goal;
  onUpdated: () => void;
}

export default function GoalCard({ goal, onUpdated }: Props) {
  const [openDeposit, setOpenDeposit] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTx, setShowTx] = useState(false);
  const [txs, setTxs] = useState<any[]>([]);

  const { locale, currency } = usePreferences();
  const percent = Math.min(100, Math.round((goal.montant_depose / Math.max(1, goal.montant_objectif)) * 100));


  const submitDeposit = async (e: any) => {
    e.preventDefault();
    const val = parseFloat(amount.replace(',', '.'));
    if (isNaN(val) || val <= 0) return;
    setLoading(true);
    try {
      const res = await api.addGoalDeposit({ goal_id: goal.id, montant: val });
      if (res.ok && res.data && res.data.success) {
        setAmount(''); setOpenDeposit(false);
        onUpdated();
      } else {
        alert('Erreur lors de l\'ajout');
      }
    } catch (e) {
      alert('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const loadTx = async () => {
    try {
      const res = await api.getGoalTransactions({ projet_id: goal.id });
      if (res.ok && res.data && res.data.transactions) {
        setTxs(res.data.transactions);
        setShowTx(true);
      }
    } catch (e) {
      console.warn('getGoalTransactions failed', e);
      alert('Impossible de charger les transactions');
    }
  };

  return (
    <div className="border border-gray-100 rounded-xl p-4 bg-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-semibold text-gray-900">{goal.nom}</h4>
          <div className="text-sm text-gray-500">Cible: {formatCurrency(goal.montant_objectif)} • Épargné: {formatCurrency(goal.montant_depose)}</div>
          {goal.date_cible && <div className="text-xs text-gray-400 mt-1">Cible: {new Date(goal.date_cible).toLocaleDateString(locale)}</div>}
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">{percent}%</div>
          <div className="text-xl font-bold">{formatCurrency(goal.montant_depose)}</div>
        </div>
      </div>

      <div className="mt-3">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div style={{ width: `${percent}%` }} className="h-full bg-gradient-to-r from-blue-600 to-purple-600"></div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button onClick={() => setOpenDeposit(!openDeposit)} className="px-3 py-1 rounded-md border">+ Épargner</button>
        <button onClick={() => loadTx()} className="px-3 py-1 rounded-md border">Voir transactions</button>

        {/* Withdraw and transfer: dispatch global events so Objectifs page can open modals */}
        <button onClick={() => window.dispatchEvent(new CustomEvent('objectifs:open-withdraw', { detail: { goal } }))} className="px-3 py-1 rounded-md border text-red-600">Retirer</button>
        <button onClick={() => window.dispatchEvent(new CustomEvent('objectifs:open-transfer', { detail: { goal } }))} className="px-3 py-1 rounded-md border text-indigo-600">Transférer</button>

        <button onClick={() => setOpenEdit(true)} className="px-3 py-1 rounded-md border">Éditer</button>
        <button onClick={() => setShowPlan(true)} className="px-3 py-1 rounded-md border">Planifier</button>
        <button onClick={async () => {
          if (!confirm(`Supprimer « ${goal.nom} » ? Cette action supprimera également les dépôts liés.`)) return;
          try {
            const res = await api.deleteGoal({ id: goal.id });
            if (res.ok && res.data && res.data.success) {
              onUpdated();
            } else {
              alert('Erreur lors de la suppression');
            }
          } catch (e) {
            alert('Erreur réseau');
          }
        }} className="px-3 py-1 rounded-md border text-red-600">Supprimer</button>
      </div>

      {openDeposit && (
        <form onSubmit={submitDeposit} className="mt-3 flex gap-2">
          <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Montant" className="p-2 border rounded-md" />
          <button disabled={loading} type="submit" className="px-3 py-1 rounded-md bg-blue-600 text-white">{loading ? 'Ajout…' : 'Ajouter'}</button>
          <button type="button" onClick={() => setOpenDeposit(false)} className="px-3 py-1 rounded-md border">Annuler</button>
        </form>
      )}

      {showTx && (
        <div className="mt-3 text-sm">
          <h5 className="font-medium mb-2">Historique</h5>
          {txs.length === 0 && <div className="text-gray-500">Aucune transaction</div>}
          {txs.map(tx => (
            <div key={tx.id_transaction} className="flex items-center justify-between py-1">
              <div className="text-sm text-gray-700">{new Date(tx.Date).toLocaleDateString(locale)} • {tx.Notes}</div>
              <div className="font-medium">{formatCurrency(parseFloat(tx.Montant))}</div>
            </div>
          ))}
        </div>
      )}

      {openEdit && (
        <EditGoalModal open={openEdit} onClose={() => setOpenEdit(false)} onUpdated={onUpdated} goal={goal} />
      )}

      {showPlan && (
        <PlanModal open={showPlan} onClose={() => setShowPlan(false)} goalId={goal.id} onUpdated={onUpdated} />
      )}
    </div>
  );
}
