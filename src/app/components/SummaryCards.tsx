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
}

export default function SummaryCards({ totalRevenusReal, totalRevenusForecast, totalDepensesReal, totalDepensesForecast, totalEpargneReal, totalEpargneForecast, resteADepenserReal, resteADepenserAll, tauxEpargneReal, formatCurrencyFn, revenusChangeLabel, depensesChangeLabel, epargneChangeLabel, soldeChangeLabel, soldeValue = null, monthlySavingsPct = null, monthlySavingsAmount = null, monthlySavingsLoading = false }: Props) {
  const soldeDisplayed = (typeof soldeValue === 'number') ? soldeValue : (resteADepenserReal);

  const statsItems = [
    {
      title: 'Économies réalisées',
      value: formatCurrencyFn(soldeDisplayed),
      change: soldeChangeLabel,
      comparison: `Total (incl. prévisionnel): ${formatCurrencyFn(resteADepenserAll)}`,
      trend: (soldeDisplayed >= 0) ? 'up' : 'down',
      icon: TrendingUp,
      gradient: 'from-indigo-500 via-indigo-600 to-purple-600',
      bgGradient: 'from-indigo-50 to-purple-50',
    },

    {
      title: 'Revenus',
      value: formatCurrencyFn(totalRevenusReal),
      change: revenusChangeLabel,
      comparison: `Prévisionnels: ${formatCurrencyFn(totalRevenusForecast)}`,
      trend: 'up',
      icon: ArrowUpRight,
      gradient: 'from-emerald-500 via-green-500 to-teal-500',
      bgGradient: 'from-emerald-50 to-teal-50',
    },
    {
      title: 'Dépenses',
      value: formatCurrencyFn(totalDepensesReal),
      change: depensesChangeLabel,
      comparison: `Prévisionnels: ${formatCurrencyFn(totalDepensesForecast)}`,
      trend: 'down',
      icon: ArrowDownRight,
      gradient: 'from-rose-500 via-pink-500 to-red-500',
      bgGradient: 'from-rose-50 to-pink-50',
    },
  ];

  return (
    <div>
      <StatsCardsDesign items={statsItems} />
    </div>
  );
}
