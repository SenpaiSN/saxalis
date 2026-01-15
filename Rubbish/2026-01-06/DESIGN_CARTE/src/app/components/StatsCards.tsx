import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function StatsCards() {
  const stats = [
    {
      title: 'Solde total',
      value: '385,97 €',
      change: '+78.90%',
      comparison: 'par rapport à 2024',
      trend: 'up',
      icon: Wallet,
      gradient: 'from-blue-500 via-blue-600 to-indigo-600',
      bgGradient: 'from-blue-50 to-indigo-50',
      iconBg: 'bg-blue-500',
    },
    {
      title: 'Revenus',
      value: '70 247,12 €',
      change: '+42.50%',
      comparison: 'par rapport à 2024',
      trend: 'up',
      icon: TrendingUp,
      gradient: 'from-emerald-500 via-green-500 to-teal-500',
      bgGradient: 'from-emerald-50 to-teal-50',
      iconBg: 'bg-emerald-500',
    },
    {
      title: 'Dépenses',
      value: '69 861,75 €',
      change: '+16.20%',
      comparison: 'par rapport à 2024',
      trend: 'up',
      icon: TrendingDown,
      gradient: 'from-rose-500 via-pink-500 to-red-500',
      bgGradient: 'from-rose-50 to-pink-50',
      iconBg: 'bg-rose-500',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="group relative bg-white rounded-2xl md:rounded-3xl shadow-lg border border-gray-200 p-5 md:p-6 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
          >
            {/* Background gradient on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            
            {/* Content */}
            <div className="relative z-10">
              {/* Header: Titre et Badge */}
              <div className="flex items-start justify-between mb-4 md:mb-5">
                <div className="flex-1">
                  <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1">
                    {stat.title}
                  </h3>
                  {stat.trend === 'up' ? (
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                      <ArrowUpRight size={14} className="flex-shrink-0" />
                      <span className="text-xs font-semibold">{stat.change}</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-700">
                      <ArrowDownRight size={14} className="flex-shrink-0" />
                      <span className="text-xs font-semibold">{stat.change}</span>
                    </div>
                  )}
                </div>
                
                {/* Icon */}
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110 group-hover:rotate-3 flex-shrink-0 ml-3`}>
                  <stat.icon size={24} className="text-white" />
                </div>
              </div>

            
            {/* Value */}
            <div className="mb-3">
              <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 leading-none">
                {stat.value}
              </p>
            </div>
            
            {/* Comparison */}
            <p className="text-xs md:text-sm text-gray-500">
              {stat.comparison}
            </p>
          </div>

          {/* Decorative element */}
          <div className={`absolute -right-6 -bottom-6 w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br ${stat.gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
        </div>
      ))}
    </div>
    </div>
  );
}