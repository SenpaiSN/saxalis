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
        {rows.map(r => {
          // Calculate achievement statistics
          const dateCreation = new Date(r.date_creation);
          const dateAtteint = new Date(r.date_atteint);
          const joursEcoules = Math.floor((dateAtteint.getTime() - dateCreation.getTime()) / (1000 * 60 * 60 * 24));
          const totalCollected = parseFloat(String(r.total_collected ?? 0));
          const moyenneParJour = joursEcoules > 0 ? totalCollected / joursEcoules : 0;
          
          // Generate dynamic recommendation based on speed and performance
          let recommendationMessage = '';
          let recommendationType = 'success';
          let recommendationColor = 'bg-emerald-50 border-l-emerald-500 text-emerald-800';
          let recommendationTitle = '🎉 Félicitations !';
          
          if (joursEcoules <= 14) {
            // Very fast achievement
            recommendationMessage = `Objectif atteint en ${joursEcoules} jour${joursEcoules > 1 ? 's' : ''} avec une moyenne de ${formatCurrency(moyenneParJour)}/jour. Excellent travail! 🚀`;
          } else if (joursEcoules <= 60) {
            // Fast achievement (under 2 months)
            recommendationMessage = `Objectif atteint en ${joursEcoules} jours (${Math.floor(joursEcoules / 7)} semaines) avec une moyenne de ${formatCurrency(moyenneParJour)}/jour. Très bien! 💪`;
          } else if (joursEcoules <= 180) {
            // Regular achievement (under 6 months)
            const moisEcoules = Math.floor(joursEcoules / 30);
            recommendationMessage = `Objectif atteint en ${moisEcoules} mois avec une moyenne de ${formatCurrency(moyenneParJour)}/jour. Beau travail de persévérance! 💡`;
          } else {
            // Long achievement (over 6 months)
            const moisEcoules = Math.floor(joursEcoules / 30);
            recommendationMessage = `Objectif atteint en ${moisEcoules} mois. Bravo pour votre constance! La persévérance paie! 🏆`;
          }
          
          return (
            <div key={r.id_objectif_atteint} className="group relative bg-white rounded-2xl md:rounded-3xl shadow-lg border border-gray-200 p-5 md:p-6 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-green-50 opacity-100 transition-opacity duration-300"></div>
              <div className="absolute -right-3 -bottom-3 w-16 h-16 md:w-24 md:h-24 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-full opacity-10 transition-opacity duration-300"></div>
              
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-lg text-emerald-800">{r.name}</div>
                  <div className="text-sm text-emerald-700">Créé: {r.date_creation}</div>
                </div>
                <div className="text-sm text-emerald-700 mb-2">Atteint le: {r.date_atteint ?? '—'}</div>
                <div className="text-sm text-emerald-700 mb-2">Taux: {r.progress_pct ?? 0}% • Versements: {r.nb_versements ?? 0}</div>
                <div className="text-sm text-emerald-700 mb-4">Total collecté: {formatCurrency(totalCollected)} </div>
                
                {/* Achievement recommendation */}
                <div className={`p-3 rounded-r-lg border-l-4 ${recommendationColor} text-sm leading-relaxed`}>
                  <div className="font-semibold mb-2">{recommendationTitle}</div>
                  <div>{recommendationMessage}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}