import React from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import StatsCardsDesign from './StatsCardsDesign';

interface Props {
  totalRevenusReal: number;
  totalRevenusForecast: number;
  totalDepensesReal: number;
  totalDepensesForecast: number;
  totalEpargneReal: number;
  totalEpargneForecast: number;
  resteADepenserReal: number;
  resteADepenserAll: number;
  tauxEpargneReal: number;
  formatCurrencyFn: (v: number) => string;
  revenusChangeLabel?: string;
  depensesChangeLabel?: string;
  epargneChangeLabel?: string;
  soldeChangeLabel?: string;
  soldeValue?: number | null;
  monthlySavingsPct?: number | null;
  monthlySavingsAmount?: number | null;
  monthlySavingsLoading?: boolean;
  patrimoineEvolution?: number;
  patrimoineEvolutionEuros?: number;
  patrimoineChangeLabel?: string;
}

export default function SummaryCards({ totalRevenusReal, totalRevenusForecast, totalDepensesReal, totalDepensesForecast, totalEpargneReal, totalEpargneForecast, resteADepenserReal, resteADepenserAll, tauxEpargneReal, formatCurrencyFn, revenusChangeLabel, depensesChangeLabel, epargneChangeLabel, soldeChangeLabel, soldeValue = null, monthlySavingsPct = null, monthlySavingsAmount = null, monthlySavingsLoading = false, patrimoineEvolution = 0, patrimoineEvolutionEuros = 0, patrimoineChangeLabel = '' }: Props) {
  const soldeDisplayed = (typeof soldeValue === 'number') ? soldeValue : (resteADepenserReal);
  
  // Calculate average monthly revenues
  const avgMonthlyRevenue = totalRevenusReal / 12;
  
  // Calculate average monthly expenses
  const avgMonthlyExpense = totalDepensesReal / 12;

  const statsItems = [
    {
      title: 'Economie annuelle',
      value: formatCurrencyFn(soldeDisplayed),
      change: soldeChangeLabel,
      comparison: `Taux d'épargne: ${tauxEpargneReal.toFixed(1)}%`,
      trend: (soldeDisplayed >= 0) ? 'up' : 'down',
      icon: TrendingUp,
      gradient: 'from-indigo-500 via-indigo-600 to-purple-600',
      bgGradient: 'from-indigo-50 to-purple-50',
      valueColor: soldeDisplayed > 0 ? 'green' : 'red',
    },

    {
      title: 'Revenus annuels',
      value: formatCurrencyFn(totalRevenusReal),
      change: revenusChangeLabel,
      comparison: `Moyenne: ${formatCurrencyFn(avgMonthlyRevenue)}/mois`,
      trend: 'up',
      icon: ArrowUpRight,
      gradient: 'from-emerald-500 via-green-500 to-teal-500',
      bgGradient: 'from-emerald-50 to-teal-50',
    },
    {
      title: 'Dépenses annuels',
      value: formatCurrencyFn(totalDepensesReal),
      change: depensesChangeLabel,
      comparison: `Moyenne: ${formatCurrencyFn(avgMonthlyExpense)}/mois`,
      trend: 'down',
      icon: ArrowDownRight,
      gradient: 'from-rose-500 via-pink-500 to-red-500',
      bgGradient: 'from-rose-50 to-pink-50',
    },
    {
      title: 'Évolution patrimoine',
      value: `${patrimoineEvolution.toFixed(1)}%`,
      change: patrimoineChangeLabel,
      comparison: patrimoineEvolutionEuros >= 0 ? 'Votre patrimoine augmente' : 'Votre patrimoine diminue',
      trend: patrimoineEvolutionEuros >= 0 ? 'up' : 'down',
      icon: TrendingUp,
      gradient: patrimoineEvolutionEuros >= 0 ? 'from-violet-500 via-purple-500 to-indigo-500' : 'from-orange-500 via-red-500 to-rose-500',
      bgGradient: patrimoineEvolutionEuros >= 0 ? 'from-violet-50 to-indigo-50' : 'from-orange-50 to-rose-50',
      valueColor: patrimoineEvolutionEuros >= 0 ? 'green' : 'red',
    },
  ];

  return (
    <div>
      <StatsCardsDesign items={statsItems} />
    </div>
  );
}
