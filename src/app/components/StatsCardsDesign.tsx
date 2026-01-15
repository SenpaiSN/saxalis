import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

type IconType = React.ComponentType<any>;

interface StatItem {
  title: string;
  value: string;
  change?: string;
  comparison?: string;
  trend?: 'up' | 'down';
  icon: IconType;
  gradient?: string;
  bgGradient?: string;
  iconBg?: string;
  meta?: string;
}

export default function StatsCardsDesign({ items }: { items: StatItem[] }) {
  return (
    // add bottom margin on small screens so cards aren't hidden by mobile nav when scrolling
    <div className="max-w-full mb-24 sm:mb-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {items.map((stat) => (
          <div
            key={stat.title}
            className="group relative bg-white rounded-2xl md:rounded-3xl shadow-lg border border-gray-200 p-5 md:p-6 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient ?? ''} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4 md:mb-5">
                <div className="flex-1">
                  <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1">{stat.title}</h3>
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

                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br ${stat.gradient ?? ''} flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110 group-hover:rotate-3 flex-shrink-0 ml-3`}>
                  <stat.icon size={24} className="text-white" />
                </div>
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between">
                  <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 leading-none">{stat.value}</p>
                  {stat.meta ? <span className="text-sm font-semibold text-gray-600 ml-3">{stat.meta}</span> : null}
                </div>
              </div>

              {stat.comparison ? <p className="text-xs md:text-sm text-gray-500">{stat.comparison}</p> : null}
            </div>

            {/* decorative circle: smaller offsets on mobile to avoid overflowing under bottom nav */}
            <div className={`absolute -right-3 -bottom-3 w-16 h-16 md:w-24 md:h-24 md:-right-6 md:-bottom-6 rounded-full bg-gradient-to-br ${stat.gradient ?? ''} opacity-5 group-hover:opacity-10 transition-opacity`} />
          </div>
        ))}
      </div>
    </div>
  );
}
