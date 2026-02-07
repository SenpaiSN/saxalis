import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

type IconType = React.ComponentType<any>;

interface StatItem {
  title: string;
  subtitle?: string;
  value: string;
  change?: string;
  comparison?: string;
  trend?: 'up' | 'down';
  icon: IconType;
  gradient?: string;
  bgGradient?: string;
  iconBg?: string;
  meta?: string;
  valueColor?: 'default' | 'green' | 'red';
}

export default function StatsCardsDesign({ items }: { items: StatItem[] }) {
  return (
    // add bottom margin on small screens so cards aren't hidden by mobile nav when scrolling
    <div className="max-w-full mb-24 sm:mb-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {items.map((stat) => (
          <div
            key={stat.title}
            className="group relative bg-white rounded-2xl md:rounded-3xl shadow-lg border border-gray-200 p-5 md:p-6 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex flex-col lg:min-h-48"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient ?? ''} opacity-0 group-hover:opacity-100 group-active:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300`} />

            <div className="relative z-10 flex flex-col h-full">
              <div className="mb-4 md:mb-5">
                <div className="flex-1">
                  <div className="flex items-baseline gap-1 md:gap-2 mb-1 whitespace-nowrap overflow-hidden">
                    <h3 className="text-sm md:text-lg font-bold text-gray-900">{stat.title}</h3>
                    {stat.subtitle && <span className="text-xs md:text-sm text-gray-500">{stat.subtitle}</span>}
                  </div>
                  {stat.change ? (
                    stat.trend === 'up' ? (
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                        <ArrowUpRight size={14} className="flex-shrink-0" />
                        <span className="text-xs font-semibold">{stat.change}</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-700">
                        <ArrowDownRight size={14} className="flex-shrink-0" />
                        <span className="text-xs font-semibold">{stat.change}</span>
                      </div>
                    )
                  ) : null}
                </div>
              </div>

              <div className={`absolute top-0 right-0 w-8 h-8 md:w-9 md:h-9 rounded-lg bg-gradient-to-br ${stat.gradient ?? ''} flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                <stat.icon size={16} className="text-white" />
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between">
                  <p className={`text-2xl md:text-3xl lg:text-4xl font-bold leading-none ${
                    stat.valueColor === 'green' ? 'text-emerald-600' :
                    stat.valueColor === 'red' ? 'text-rose-600' :
                    'text-gray-900'
                  }`}>{stat.value}</p>
                </div>
                {stat.meta ? <p className="text-xs text-gray-500 mt-1 italic">{stat.meta}</p> : null}
              </div>

              {stat.comparison ? <p className="text-xs md:text-sm text-gray-500 flex-shrink-0">{stat.comparison}</p> : null}
            </div>

            {/* decorative circle: smaller offsets on mobile to avoid overflowing under bottom nav */}
            <div className={`absolute -right-3 -bottom-3 w-16 h-16 md:w-24 md:h-24 md:-right-6 md:-bottom-6 rounded-full bg-gradient-to-br ${stat.gradient ?? ''} opacity-5 group-hover:opacity-10 transition-opacity`} />
          </div>
        ))}
      </div>
    </div>
  );
}
