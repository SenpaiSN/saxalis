import { useEffect, useState } from 'react';
import * as api from '../../services/api';
import formatCurrency from '../../lib/formatCurrency';
import { usePreferences } from '../contexts/PreferencesContext';

export default function ObjectifsAtteints() {
  // usePreferences included so this component rerenders when currency changes
  const { currency } = usePreferences();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.getObjectifsAtteints();
      if (res.ok && res.data && res.data.objectifs_atteints) {
        setRows(res.data.objectifs_atteints);
      } else {
        setError('Impossible de charger les objectifs atteints');
      }
    } catch (e) {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const onUpdated = (e: any) => { load(); };
    window.addEventListener('objectifs:updated', onUpdated as EventListener);
    return () => { window.removeEventListener('objectifs:updated', onUpdated as EventListener); };
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Objectifs atteints</h3>
          <p className="text-sm text-gray-500">Historique des objectifs atteints</p>
        </div>
      </div>

      {loading && <div>Chargement…</div>}
      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map(r => (
          <div key={r.id_objectif_atteint} className="p-4 border rounded-lg bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-lg text-green-800">{r.name}</div>
              <div className="text-sm text-green-700">Créé: {r.date_creation}</div>
            </div>
            <div className="text-sm text-green-700 mb-2">Atteint le: {r.date_atteint ?? '—'}</div>
            <div className="text-sm text-green-700 mb-2">Taux: {r.progress_pct ?? 0}% • Versements: {r.nb_versements ?? 0}</div>
            <div className="text-sm text-green-700 mb-2">Total collecté: {formatCurrency(parseFloat(String(r.total_collected ?? 0)))} </div>
          </div>
        ))}
      </div>
    </div>
  );
}