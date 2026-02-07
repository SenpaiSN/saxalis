import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import * as api from '../../services/api';
import GoalCard from './GoalCard';
import AddGoalModal from './AddGoalModal';
import ObjectifsAtteints from './ObjectifsAtteints';
import CreatedGoalCard from './CreatedGoalCard';
import WithdrawFromGoalModal from './WithdrawFromGoalModal';
import TransferGoalModal from './TransferGoalModal';
import EditGoalModal from './EditGoalModal';

export default function Objectifs() {
  const [crees, setCrees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // modal state
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activeGoal, setActiveGoal] = useState<any>(null);

  const loadCrees = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getObjectifsCrees();
      if (res.ok && res.data && res.data.objectifs_crees) {
        setCrees(res.data.objectifs_crees);
      } else {
        setError('Impossible de charger les objectifs créés');
      }
    } catch (e) {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCrees(); }, []);

  // Listen to deposits/changes so objectives reload automatically when transactions affect goals
  useEffect(() => {
    const onUpdated = (e: any) => { loadCrees(); };
    window.addEventListener('objectifs:updated', onUpdated as EventListener);

    // Listen for global shortcut events from GoalCard components
    const openWithdraw = (e: any) => {
      const g = e.detail?.goal;
      if (g) {
        const subId = g.id_subcategory ?? g.idSubcategory ?? g.subcategory_id ?? g.subcategoryId ?? null;
        setActiveGoal({ id: g.id, name: g.name ?? g.nom, id_subcategory: subId, montant_objectif: g.montant_objectif ?? g.montant, total_collected: g.montant_depose ?? g.total_collected ?? 0, progress_pct: g.progress_pct, nb_versements: g.nb_versements, date_creation: g.date_creation });
        setWithdrawOpen(true);
      }
    };
    const openTransfer = (e: any) => {
      const g = e.detail?.goal;
      if (g) {
        const subId = g.id_subcategory ?? g.idSubcategory ?? g.subcategory_id ?? g.subcategoryId ?? null;
        setActiveGoal({ id: g.id, name: g.name ?? g.nom, id_subcategory: subId, montant_objectif: g.montant_objectif ?? g.montant, total_collected: g.montant_depose ?? g.total_collected ?? 0, progress_pct: g.progress_pct, nb_versements: g.nb_versements, date_creation: g.date_creation });
        setTransferOpen(true);
      }
    };

    window.addEventListener('objectifs:open-withdraw', openWithdraw as EventListener);
    window.addEventListener('objectifs:open-transfer', openTransfer as EventListener);

    return () => {
      window.removeEventListener('objectifs:updated', onUpdated as EventListener);
      window.removeEventListener('objectifs:open-withdraw', openWithdraw as EventListener);
      window.removeEventListener('objectifs:open-transfer', openTransfer as EventListener);
    };
  }, []);

  return (
    <div className="p-6 lg:p-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Objectifs</h2>
          <p className="text-sm text-gray-500">Suivez vos objectifs d'épargne et leur progression</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAdd(true)}
            aria-label="Nouvel objectif"
            title="Nouvel objectif"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md hover:scale-105 transition-transform"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {loading && <div>Chargement…</div>}
      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Objectifs en cours</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {crees.map(c => (
            <CreatedGoalCard
              key={c.id_objectif}
              goal={c}
              onWithdraw={() => { setActiveGoal({ id: c.id_objectif, name: c.name ?? c.nom, id_subcategory: c.id_subcategory, montant_objectif: c.montant_objectif, total_collected: c.total_collected, progress_pct: c.progress_pct, nb_versements: c.nb_versements, nb_retraits: c.nb_retraits, date_creation: c.date_creation }); setWithdrawOpen(true); }}
              onTransfer={() => { setActiveGoal({ id: c.id_objectif, name: c.name ?? c.nom, id_subcategory: c.id_subcategory, montant_objectif: c.montant_objectif, total_collected: c.total_collected, progress_pct: c.progress_pct, nb_versements: c.nb_versements, nb_retraits: c.nb_retraits, date_creation: c.date_creation }); setTransferOpen(true); }}
              onEdit={() => { setActiveGoal({ id: c.id_objectif, name: c.name ?? c.nom, id_subcategory: c.id_subcategory, montant_objectif: c.montant_objectif, total_collected: c.total_collected, progress_pct: c.progress_pct, nb_versements: c.nb_versements, nb_retraits: c.nb_retraits, date_creation: c.date_creation }); setEditOpen(true); }}
            />
          ))}
        </div>
      </div>

      <div className="mt-8">
        <ObjectifsAtteints />
      </div>

      <AddGoalModal open={showAdd} onClose={() => setShowAdd(false)} onCreated={() => loadCrees()} />

      <WithdrawFromGoalModal open={withdrawOpen} goal={activeGoal} onClose={() => setWithdrawOpen(false)} onDone={() => loadCrees()} />
      <TransferGoalModal open={transferOpen} fromGoal={activeGoal} goals={crees.map(c => ({ id: c.id_objectif, nom: c.name ?? c.nom, montant_depose: c.total_collected ?? 0 }))} onClose={() => setTransferOpen(false)} onDone={() => loadCrees()} />
      {editOpen && activeGoal && (
        <EditGoalModal open={editOpen} goal={activeGoal} onClose={() => setEditOpen(false)} onUpdated={() => loadCrees()} />
      )}
    </div>
  );
}
