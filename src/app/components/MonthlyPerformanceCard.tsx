import React from 'react';

interface MonthlyMetric {
  month: string;
  value: number;
  description: string;
  percentChange: number;
  icon: string;
  label: string;
  color: 'green' | 'red' | 'orange';
}

interface MonthlyPerformance {
  meilleurMois: MonthlyMetric | null;
  pireMois: MonthlyMetric | null;
  moisPlusDependsier: MonthlyMetric | null;
  moisPlusEconome: MonthlyMetric | null;
  year: number;
}

interface Props {
  data: MonthlyPerformance;
  formatCurrency: (v: number) => string;
}

export default function MonthlyPerformanceCard({ data, formatCurrency }: Props) {
  const getColorClasses = (color: 'green' | 'red' | 'orange') => {
    switch (color) {
      case 'green':
        return { text: 'text-green-600', bg: 'bg-green-50', badge: 'bg-green-100 text-green-700' };
      case 'red':
        return { text: 'text-red-600', bg: 'bg-red-50', badge: 'bg-red-100 text-red-700' };
      case 'orange':
        return { text: 'text-orange-600', bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700' };
    }
  };

  const renderMetric = (metric: MonthlyMetric | null, icon: string) => {
    if (!metric) return <p className="text-gray-400 text-sm">Aucune donnée</p>;

    const colors = getColorClasses(metric.color);

    return (
      <div className={`${colors.bg} p-4 rounded-lg`}>
        <div className="flex items-center gap-2 mb-3">
          <span>{icon}</span>
          <p className="text-sm text-gray-600">{metric.label}</p>
        </div>
        <p className={`text-lg font-bold ${colors.text}`}>
          <span className="text-gray-900">{metric.month}</span> {metric.value >= 0 ? '+' : ''}{formatCurrency(metric.value)}
        </p>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <span className="text-xl">📊</span> Performance mensuelle
        </h3>
        <span className="text-sm text-gray-500">{data.year}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderMetric(data.meilleurMois, '📈')}
        {renderMetric(data.pireMois, '⚠️')}
        {renderMetric(data.moisPlusDependsier, '🛒')}
        {renderMetric(data.moisPlusEconome, '🌿')}
      </div>
    </div>
  );
}