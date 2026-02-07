import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import formatCurrency from '../../lib/formatCurrency';
import * as api from '../../services/api';

interface FinancialHealthCardProps {
  transactions?: any[];
  totalsRevenusDepenses?: any;
  soldeReal?: number;
  tauxEpargne?: string | null;
  locale?: string;
}

export default function FinancialHealthCard({
  transactions = [],
  totalsRevenusDepenses,
  soldeReal = 0,
  tauxEpargne,
  locale = 'fr-FR'
}: FinancialHealthCardProps) {
  // Ajout: état pour stocker la somme des montants versés dans les objectifs en cours
  const [totalObjectifsEnCours, setTotalObjectifsEnCours] = useState(0);

  useEffect(() => {
    // Charger les objectifs en cours et additionner les montants versés
    async function fetchGoals() {
      const res = await api.getGoals();
      if (res.ok && res.data && Array.isArray(res.data.goals)) {
        // On ne prend que les objectifs non atteints (reste > 0)
        const total = res.data.goals
          .filter((g: any) => Number(g.reste) > 0)
          .reduce((sum: number, g: any) => sum + Number(g.montant_depose || 0), 0);
        setTotalObjectifsEnCours(total);
      }
    }
    fetchGoals();
  }, []);

  // Ajout : calcul explicite des montants de type 'épargne' ET catégorie 'Objectif' dans les transactions du mois
  function getVersementsObjectifsEnCours() {
    if (!transactions || !Array.isArray(transactions)) return 0;
    // On prend les transactions de type 'épargne' ET catégorie 'Objectif' (ou goal)
    return transactions.filter(t => {
      const type = String(t.type || '').toLowerCase();
      const cat = String(t.categorie || '').toLowerCase();
      return (type === 'epargne' || type === 'épargne' || type === 'savings') && (cat.includes('objectif') || cat.includes('goal'));
    }).reduce((sum, t) => sum + (Number(t.montant) || 0), 0);
  }

  // Helper function to get color based on savings rate
  const getSavingsRateColor = (rate: number) => {
    return rate > 0 ? 'text-green-600' : 'text-red-600';
  };

  // Helper function to get color based on expense ratio
  const getExpenseRatioColor = (ratio: number) => {
    if (ratio < 100) return 'text-green-600';
    if (ratio === 100) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Helper function to get color based on regularity points
  const getRegularityColor = (points: number) => {
    if (points >= 10) return 'text-green-600';
    if (points >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Helper function to get color based on cash flow
  const getCashFlowColor = (cashFlow: number) => {
    if (cashFlow > 0) return 'text-green-600';
    if (cashFlow === 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Helper function to get color based on emergency fund
  const getEmergencyFundColor = (months: number) => {
    if (months >= 6) return 'text-green-600';
    if (months >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };
  // Calculate financial health score based on three factors
  const calculateHealthScore = () => {
    // Factor 1: Taux d'épargne (30 points max)
    // Formula: (Revenus - Dépenses + Montants versés dans objectifs en cours) / Revenus
    let savingsRatePoints = 0;
    let calculatedSavingsRate = 0;
    if (totalsRevenusDepenses?.revenus?.real) {
      // Ajout du totalObjectifsEnCours ET des versements détectés dans les transactions du mois
      const versementsObjectifs = getVersementsObjectifsEnCours();
      const savingsRate = ((totalsRevenusDepenses.revenus.real - totalsRevenusDepenses.depenses.real + totalObjectifsEnCours + versementsObjectifs) / totalsRevenusDepenses.revenus.real) * 100;
      calculatedSavingsRate = savingsRate;
      if (savingsRate >= 20) savingsRatePoints = 30;
      else if (savingsRate >= 15) savingsRatePoints = 25;
      else if (savingsRate >= 10) savingsRatePoints = 20;
      else if (savingsRate >= 5) savingsRatePoints = 15;
      else if (savingsRate >= 0) savingsRatePoints = 10;
      else savingsRatePoints = 0; // Negative savings rate
    }

    // Factor 2: Taux de dépenses fixes (20 points max)
    // Formula: Dépenses / Revenus (lower is better)
    let expenseRatioPoints = 0;
    let calculatedExpenseRatio = 0;
    if (totalsRevenusDepenses?.revenus?.real && totalsRevenusDepenses?.depenses?.real) {
      const expenseRatio = (totalsRevenusDepenses.depenses.real / totalsRevenusDepenses.revenus.real) * 100;
      calculatedExpenseRatio = expenseRatio;
      if (expenseRatio <= 50) expenseRatioPoints = 20;
      else if (expenseRatio <= 60) expenseRatioPoints = 18;
      else if (expenseRatio <= 70) expenseRatioPoints = 15;
      else if (expenseRatio <= 80) expenseRatioPoints = 12;
      else if (expenseRatio <= 90) expenseRatioPoints = 8;
      else if (expenseRatio <= 100) expenseRatioPoints = 4;
      else expenseRatioPoints = 0;
    }

    // Factor 3: Régularité financière (15 points max)
    // Calculate standard deviation of monthly expenses over last 3-6 months
    let regularityPoints = 0;
    let monthlyExpenses: number[] = [];
    if (transactions && transactions.length > 0) {
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      
      const monthlyMap = new Map<string, number>();
      transactions
        .filter(t => new Date(t.date) >= sixMonthsAgo && t.type === 'dépense')
        .forEach(t => {
          const d = new Date(t.date);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + Math.abs(t.montant));
        });

      monthlyExpenses = Array.from(monthlyMap.values());

      if (monthlyExpenses.length >= 2) {
        const mean = monthlyExpenses.reduce((a, b) => a + b, 0) / monthlyExpenses.length;
        const variance = monthlyExpenses.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / monthlyExpenses.length;
        const stdDev = Math.sqrt(variance);
        
        // Coefficient of variation (lower is better = more regular)
        const coefficientOfVariation = (stdDev / mean) * 100;
        
        if (coefficientOfVariation <= 10) regularityPoints = 15;
        else if (coefficientOfVariation <= 20) regularityPoints = 13;
        else if (coefficientOfVariation <= 30) regularityPoints = 11;
        else if (coefficientOfVariation <= 40) regularityPoints = 9;
        else if (coefficientOfVariation <= 50) regularityPoints = 7;
        else regularityPoints = 3;
      }
    }

    // Total score out of 65 points, normalized to 100
    const totalPoints = savingsRatePoints + expenseRatioPoints + regularityPoints;
    const normalizedScore = Math.round((totalPoints / 65) * 100);
    
    // Calculate cash flow (monthly) and average monthly expenses
    let cashFlow = 0;
    let avgMonthlyExpenses = 0;
    let monthlyExpensesForAvg: number[] = [];
    
    if (transactions && transactions.length > 0) {
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      
      const monthlyMap = new Map<string, number>();
      transactions
        .filter(t => new Date(t.date) >= sixMonthsAgo && t.type === 'dépense')
        .forEach(t => {
          const d = new Date(t.date);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + Math.abs(t.montant));
        });

      monthlyExpensesForAvg = Array.from(monthlyMap.values());
      if (monthlyExpensesForAvg.length > 0) {
        avgMonthlyExpenses = monthlyExpensesForAvg.reduce((a, b) => a + b, 0) / monthlyExpensesForAvg.length;
      }
    }
    
    // Cash flow = revenus réels - dépenses réelles
    if (totalsRevenusDepenses?.revenus?.real && totalsRevenusDepenses?.depenses?.real) {
      cashFlow = totalsRevenusDepenses.revenus.real - totalsRevenusDepenses.depenses.real;
    }
    
    return {
      score: Math.min(100, normalizedScore),
      savingsRate: calculatedSavingsRate,
      expenseRatio: calculatedExpenseRatio,
      savingsRatePoints,
      expenseRatioPoints,
      regularityPoints,
      cashFlow,
      avgMonthlyExpenses,
      totalObjectifsEnCours,
      versementsObjectifsEnCours: getVersementsObjectifsEnCours(),
    };
  };

  const getHealthStatus = (score: number) => {
    if (score >= 70) return { label: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-50', circleColor: 'from-green-500 to-emerald-600' };
    if (score >= 40) return { label: 'À améliorer', color: 'text-yellow-600', bgColor: 'bg-yellow-50', circleColor: 'from-yellow-500 to-orange-600' };
    return { label: 'Critique', color: 'text-red-600', bgColor: 'bg-red-50', circleColor: 'from-red-500 to-pink-600' };
  };

  const healthData = calculateHealthScore();
  const score = healthData.score;
  const status = getHealthStatus(score);

  // Extract individual metrics for display
  const savingsRatePercent = Math.round(healthData.savingsRate * 10) / 10;
  const expenseRatioPercent = Math.round(healthData.expenseRatio * 10) / 10;
  
  // Calculate emergency fund (in months of expenses)
  const emergencyFundMonths = healthData.avgMonthlyExpenses > 0 
    ? Math.round((soldeReal / healthData.avgMonthlyExpenses) * 10) / 10 
    : 0;

  return (
    <div tabIndex={0} className="group relative bg-white rounded-2xl md:rounded-3xl shadow-lg border border-gray-200 p-5 md:p-6 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex flex-col lg:min-h-80">
      <div className={`absolute inset-0 bg-gradient-to-br ${status.bgColor} opacity-0 group-hover:opacity-100 group-active:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300`} />
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-2">
              <Activity size={20} className={status.color} />
              Score de santé financière
            </h3>
          </div>
        </div>

        <div className="flex gap-6 mb-6">
          {/* Score Gauge */}
          <div className="flex-shrink-0">
            <div className="relative w-24 h-24 md:w-28 md:h-28">
              <svg className="w-full h-full" viewBox="0 0 120 120">
                {/* Background arc */}
                <defs>
                  <style>{`
                    .gauge-progress {
                      transform: rotate(-90deg);
                      transform-origin: 60px 60px;
                      transition: stroke-dasharray 0.5s ease;
                    }
                  `}</style>
                </defs>
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                {/* Progress arc */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  strokeWidth="10"
                  stroke={status.color === 'text-green-600' ? '#16a34a' : status.color === 'text-blue-600' ? '#2563eb' : status.color === 'text-yellow-600' ? '#ca8a04' : '#dc2626'}
                  strokeDasharray={`${(score / 100) * 314.16} 314.16`}
                  strokeLinecap="round"
                  className="gauge-progress"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-gray-900">{score}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Status and Metrics */}
          <div className="flex-1">
            <div className="mb-4">
              <h4 className={`text-lg md:text-xl font-bold ${status.color}`}>{status.label}</h4>
              <p className="text-sm text-gray-600 mt-1">
                Votre santé financière est {status.label.toLowerCase()} ce mois-ci.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Taux d'épargne</span>
                <span className={`text-sm font-bold ${getSavingsRateColor(savingsRatePercent)}`}>
                  {savingsRatePercent}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Taux de dépenses</span>
                <span className={`text-sm font-bold ${getExpenseRatioColor(expenseRatioPercent)}`}>
                  {expenseRatioPercent}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Régularité</span>
                <span className={`text-sm font-bold ${getRegularityColor(healthData.regularityPoints)}`}>
                  {healthData.regularityPoints}/15
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Cash flow mensuel</span>
                  <span className={`text-sm font-bold ${getCashFlowColor(healthData.cashFlow)}`}>
                    {formatCurrency(healthData.cashFlow)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Fonds d'urgence</span>
                  <span className={`text-sm font-bold ${getEmergencyFundColor(emergencyFundMonths)}`}>
                    {emergencyFundMonths.toFixed(1)} mois
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Advice based on score */}
        <div className={`p-3 rounded-lg text-sm ${status.bgColor} border border-current border-opacity-20 mt-auto`}>
          {score >= 70 && <p className={status.color}>Excellente gestion financière ! Continuez comme cela.</p>}
          {score >= 40 && score < 70 && <p className={status.color}>Votre situation financière peut s'améliorer. Travaillez sur votre taux d'épargne et vos dépenses.</p>}
          {score < 40 && <p className={status.color}>Situation critique. Réduisez vos dépenses et cherchez à augmenter vos revenus.</p>}
        </div>
      </div>
      
      <div className={`absolute -right-3 -bottom-3 w-16 h-16 md:w-24 md:h-24 md:-right-6 md:-bottom-6 rounded-full bg-gradient-to-br ${status.circleColor} opacity-5 group-hover:opacity-10 transition-opacity`} />
    </div>
  );
}