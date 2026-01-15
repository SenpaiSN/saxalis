import { MinusCircle, Repeat } from 'lucide-react';
import formatCurrency from '../../lib/formatCurrency';
import { usePreferences } from '../contexts/PreferencesContext';

export default function CreatedGoalCard({ goal, onWithdraw, onTransfer }: { goal: any; onWithdraw?: () => void; onTransfer?: () => void }) {
  // subscribe to preferences so component rerenders when currency/locale change
  const { currency } = usePreferences();
  return (
    <div className="p-4 border rounded-lg bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium text-lg">{goal.name}</div>
        <div className="text-sm text-gray-500">Créé: {goal.date_creation}</div>
      </div>
      <div className="text-sm font-semibold text-gray-700 mb-2">Cible: {formatCurrency(parseFloat(goal.montant_objectif))} • Épargné: {formatCurrency(parseFloat(goal.total_collected || 0))}</div>
      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
        <div className="h-2 bg-green-500" style={{ width: `${goal.progress_pct ?? 0}%` }}></div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-gray-500">{goal.progress_pct ?? 0}% • {goal.nb_versements ?? 0} versements • {goal.nb_retraits ?? 0} {((goal.nb_retraits ?? 0) <= 1) ? 'retrait' : 'retraits'}</div>

        <div className="flex items-center gap-2">
          <button title="Retirer des fonds" onClick={onWithdraw} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-gray-100 text-red-600">
            <MinusCircle size={18} />
          </button>
          <button title="Transférer" onClick={onTransfer} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-gray-100 text-indigo-600">
            <Repeat size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}