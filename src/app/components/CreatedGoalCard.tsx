import { MinusCircle, Repeat, AlertCircle, CheckCircle, Pencil } from 'lucide-react';
import formatCurrency from '../../lib/formatCurrency';
import { usePreferences } from '../contexts/PreferencesContext';

export default function CreatedGoalCard({ goal, onWithdraw, onTransfer, onEdit }: { goal: any; onWithdraw?: () => void; onTransfer?: () => void; onEdit?: () => void }) {
  const { currency } = usePreferences();
  
  // Calculations
  const montantObjectif = parseFloat(goal.montant_objectif || 0);
  const montantEpargne = parseFloat(goal.total_collected || 0);
  const montantRestant = Math.max(0, montantObjectif - montantEpargne);
  const progressPct = parseFloat(goal.progress_pct ?? 0);
  
  // Date calculations
  const dateCreation = new Date(goal.date_creation);
  const dateEcheance = goal.date_cible ? new Date(goal.date_cible) : null;
  const aujourd = new Date();
  
  const joursCoules = Math.floor((aujourd.getTime() - dateCreation.getTime()) / (1000 * 60 * 60 * 24));
  const moisCoules = Math.floor(joursCoules / 30);
  
  let joursRestants = 0;
  let moisRestants = 0;
  if (dateEcheance) {
    joursRestants = Math.floor((dateEcheance.getTime() - aujourd.getTime()) / (1000 * 60 * 60 * 24));
    moisRestants = Math.ceil(joursRestants / 30);
  }
  
  // Effort calculations
  const montantMensuel = montantEpargne / Math.max(1, moisCoules);
  const besoinMensuel = moisRestants > 0 ? montantRestant / moisRestants : 0;
  const besoinHebdo = besoinMensuel / 4.33;
  
  // Feasibility analysis - Intelligent recommendations based on actual savings rate
  const epargneReelleMensuelle = montantMensuel > 0 ? montantMensuel : 0;
  const effortPercentage = epargneReelleMensuelle > 0 ? (besoinMensuel / epargneReelleMensuelle) * 100 : 0;
  
  let recommendationMessage = '';
  let recommendationType = 'neutral';
  let recommendationColor = '';
  let recommendationTitle = '';
  
  if (montantRestant <= 0) {
    recommendationMessage = 'Objectif atteint! Félicitations 🎉';
    recommendationType = 'success';
    recommendationColor = 'bg-emerald-50 border-l-emerald-500 text-emerald-800';
    recommendationTitle = '✓ Succès';
  } else if (!dateEcheance) {
    recommendationMessage = `Fixez une date limite pour obtenir des recommandations personnalisées sur la faisabilité.`;
    recommendationType = 'neutral';
    recommendationColor = 'bg-blue-50 border-l-blue-500 text-blue-800';
    recommendationTitle = '📅 Date manquante';
  } else if (epargneReelleMensuelle === 0) {
    recommendationMessage = `Aucune épargne détectée actuellement. Commencez à épargner pour cet objectif pour des recommandations personnalisées.`;
    recommendationType = 'neutral';
    recommendationColor = 'bg-blue-50 border-l-blue-500 text-blue-800';
    recommendationTitle = '💰 En attente';
  } else if (effortPercentage > 150) {
    // Très ambitieux - effort dépasse largement l'épargne réelle
    const suggestedMonthsToDelay = Math.ceil(moisRestants * (effortPercentage / 100 - 1));
    recommendationMessage = `⚠️ Très ambitieux! Vous devriez épargner ${formatCurrency(besoinMensuel)}/mois (${effortPercentage.toFixed(0)}% de votre épargne réelle de ${formatCurrency(epargneReelleMensuelle)}/mois). Suggestions: (1) Étendre l'échéance de ${suggestedMonthsToDelay} mois, (2) Réduire la cible de ${formatCurrency(montantRestant - (epargneReelleMensuelle * moisRestants))}, ou (3) Augmenter votre épargne mensuelle.`;
    recommendationType = 'warning';
    recommendationColor = 'bg-red-50 border-l-red-500 text-red-800';
    recommendationTitle = '🚨 Très ambitieux';
  } else if (effortPercentage > 100) {
    // Ambitieux - effort dépasse l'épargne réelle actuelle
    const deficitMensuel = besoinMensuel - epargneReelleMensuelle;
    recommendationMessage = `⚠️ Objectif ambitieux! Vous épargnerez ${formatCurrency(besoinMensuel)}/mois (${effortPercentage.toFixed(0)}% de ${formatCurrency(epargneReelleMensuelle)}/mois). Cela nécessite ${formatCurrency(deficitMensuel)} d'efforts supplémentaires chaque mois.`;
    recommendationType = 'warning';
    recommendationColor = 'bg-orange-50 border-l-orange-500 text-orange-800';
    recommendationTitle = '⚠️ Ambitieux';
  } else if (effortPercentage > 75) {
    // Plutôt ambitieux mais possible
    recommendationMessage = `${formatCurrency(besoinMensuel)}/mois = ${effortPercentage.toFixed(0)}% de votre épargne réelle. C'est serré mais possible! Maintenez votre discipline sans dépenses imprévisibles.`;
    recommendationType = 'warning';
    recommendationColor = 'bg-yellow-50 border-l-yellow-500 text-yellow-800';
    recommendationTitle = '📊 Faisable mais serré';
  } else if (effortPercentage > 50) {
    // Réaliste et bien structuré
    recommendationMessage = `${formatCurrency(besoinMensuel)}/mois = ${effortPercentage.toFixed(0)}% de votre épargne réelle (${formatCurrency(epargneReelleMensuelle)}/mois). Bien structuré! Objectif réaliste et atteignable. 💡`;
    recommendationType = 'success';
    recommendationColor = 'bg-emerald-50 border-l-emerald-500 text-emerald-800';
    recommendationTitle = '💡 Bien structuré';
  } else if (effortPercentage > 25) {
    // Relativement facile
    recommendationMessage = `${formatCurrency(besoinMensuel)}/mois = ${effortPercentage.toFixed(0)}% de votre épargne réelle. Facile à atteindre! Vous pourriez accélérer ou augmenter la cible. ✨`;
    recommendationType = 'success';
    recommendationColor = 'bg-emerald-50 border-l-emerald-500 text-emerald-800';
    recommendationTitle = '✨ Très accessible';
  } else {
    // Minimal
    recommendationMessage = `${formatCurrency(besoinMensuel)}/mois = ${effortPercentage.toFixed(0)}% de votre épargne réelle. Effort minimal! Considérez un objectif supplémentaire ou accélération. 🚀`;
    recommendationType = 'success';
    recommendationColor = 'bg-emerald-50 border-l-emerald-500 text-emerald-800';
    recommendationTitle = '🚀 Très facile';
  }

  // Color indicator based on target/saved amount (kept for future use if needed)
  const dotColor = progressPct >= 100 ? 'bg-emerald-500' 
    : progressPct >= 75 ? 'bg-blue-500'
    : progressPct >= 50 ? 'bg-indigo-500'
    : 'bg-orange-500';

  return (
    <div className="group relative bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
      <div className="p-5 md:p-6">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-lg md:text-xl font-bold text-gray-900">{goal.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">Créé: {goal.date_creation}</p>
        </div>

        {/* Target and Saved info */}
        <div className="mb-4 pb-4 border-b border-gray-100">
          <div className="text-sm font-semibold text-gray-700 mb-2">
            Cible: {formatCurrency(montantObjectif)} • Épargné: {formatCurrency(montantEpargne)}
          </div>
          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500" style={{ width: `${Math.min(progressPct, 100)}%` }}></div>
          </div>
        </div>

        {/* Deadline and Monthly effort */}
        <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100">
          <div>
            <div className="text-xs text-gray-500 mb-1">Échéance</div>
            {dateEcheance ? (
              <>
                <div className="text-sm font-semibold text-gray-900">
                  {dateEcheance.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                <div className="text-xs text-gray-600 font-medium">({moisRestants} mois)</div>
              </>
            ) : (
              <div className="text-sm font-semibold text-gray-400">—</div>
            )}
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Besoin mensuel</div>
            <div className="text-sm font-semibold text-red-600">
              {formatCurrency(besoinMensuel)}/mois
            </div>
            {besoinHebdo > 0 && (
              <div className="text-xs text-gray-600">{formatCurrency(besoinHebdo)}/sem</div>
            )}
          </div>
        </div>

        {/* Recommendation message */}
        {recommendationMessage && (
          <div className={`mb-4 p-3 rounded-r-lg border-l-4 ${recommendationColor} text-sm leading-relaxed`}>
            <div className="font-semibold mb-2">{recommendationTitle}</div>
            <div>{recommendationMessage}</div>
          </div>
        )}

        {/* Statistics and Actions row */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {progressPct.toFixed(2)}% • {goal.nb_versements ?? 0} versements • {goal.nb_retraits ?? 0} retrait{((goal.nb_retraits ?? 0) <= 1) ? '' : 's'}
          </div>
          <div className="flex items-center gap-2">
            <button 
              title="Retirer des fonds" 
              onClick={onWithdraw} 
              className="w-10 h-10 flex items-center justify-center rounded-full border border-red-200 hover:bg-red-50 text-red-600 transition-colors"
            >
              <MinusCircle size={18} />
            </button>
            <button 
              title="Transférer" 
              onClick={onTransfer} 
              className="w-10 h-10 flex items-center justify-center rounded-full border border-blue-200 hover:bg-blue-50 text-blue-600 transition-colors"
            >
              <Repeat size={18} />
            </button>
            <button
              title="Modifier l'objectif"
              onClick={onEdit}
              className="w-10 h-10 flex items-center justify-center rounded-full border border-emerald-200 hover:bg-emerald-50 text-emerald-600 transition-colors"
            >
              <Pencil size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}