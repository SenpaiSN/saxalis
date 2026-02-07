import React, { useMemo, useRef } from 'react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import useAxesReady from '../../hooks/useAxesReady';

interface Point { 
  index?: number; 
  moisShort?: string; 
  date?: Date; 
  revenus: number; 
  depenses: number;
}

interface Props {
  data: Point[];
  formatCurrency: (v: number) => string;
  locale?: string;
  chartsReady?: boolean;
  annee?: string;
}

export default function ComparisonChart({ data, formatCurrency, chartsReady = true, locale, annee }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const axesReady = useAxesReady(containerRef, [data.length, chartsReady]);

  // Filter data by year if annee is provided and not 'Tous'
  const filteredData = useMemo(() => {
    if (!annee || annee === 'Tous') return data;
    
    return data.filter(point => {
      if (!point.date) return true;
      const pointYear = new Date(point.date).getFullYear();
      return pointYear === Number(annee);
    });
  }, [data, annee]);

  // Calculate averages for legend
  const { avgRevenus, avgDepenses } = useMemo(() => {
    if (filteredData.length === 0) return { avgRevenus: 0, avgDepenses: 0 };
    const totalRevenus = filteredData.reduce((sum, d) => sum + d.revenus, 0);
    const totalDepenses = filteredData.reduce((sum, d) => sum + d.depenses, 0);
    return {
      avgRevenus: totalRevenus / filteredData.length,
      avgDepenses: totalDepenses / filteredData.length
    };
  }, [filteredData]);

  // X-axis configuration
  const xTicksIndices = filteredData.map((d, i) => i);
  const xTickProps = filteredData.length > 6 
    ? { fontSize: 8, angle: -45 as const, textAnchor: 'end' as const } 
    : { fontSize: 9 };

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = filteredData[label];
      if (dataPoint) {
        const cashFlow = dataPoint.revenus - dataPoint.depenses;
        return (
          <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg border border-gray-700 text-xs">
            <p className="font-semibold text-sm mb-1">{dataPoint.moisShort}</p>
            <p className="text-xs flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
              <span>Revenus: {formatCurrency(dataPoint.revenus)}</span>
            </p>
            <p className="text-xs flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
              <span>Dépenses: {formatCurrency(dataPoint.depenses)}</span>
            </p>
            <p className={`text-xs font-semibold mt-1 ${cashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              Cash flow: {formatCurrency(cashFlow)}
            </p>
          </div>
        );
      }
    }
    return null;
  };

  // Get current year for display
  const currentYear = filteredData.length > 0 && filteredData[filteredData.length - 1]?.date 
    ? new Date(filteredData[filteredData.length - 1].date).getFullYear()
    : new Date().getFullYear();

  return (
    <div ref={containerRef} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs mb-2 px-1 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span className="text-gray-700">
            Revenus <span className="text-gray-500 text-xs">({formatCurrency(avgRevenus)})</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500"></span>
          <span className="text-gray-700">
            Dépenses <span className="text-gray-500 text-xs">({formatCurrency(avgDepenses)})</span>
          </span>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData.map((d, i) => ({ ...d, index: i }))} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="index"
              stroke="#9ca3af"
              tick={xTickProps}
              ticks={xTicksIndices}
              height={30}
              tickFormatter={(idx: any) => {
                if (typeof idx === 'number' && filteredData[idx]?.date) {
                  return filteredData[idx].moisShort ?? '';
                }
                return '';
              }}
            />
            <YAxis 
              stroke="#9ca3af" 
              width={35} 
              tick={{ fontSize: 8 }} 
              tickFormatter={(v: any) => {
                const num = Number(v);
                if (num >= 1000) {
                  return (num / 1000).toFixed(0) + 'k€';
                }
                return Math.round(num).toString();
              }}
              domain={['dataMin - 100', 'dataMax + 100']}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Revenus line */}
            <Line
              type="monotone"
              dataKey="revenus"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 3 }}
              activeDot={{ r: 4.5 }}
              name="Revenus"
              isAnimationActive={false}
            />
            
            {/* Dépenses line */}
            <Line
              type="monotone"
              dataKey="depenses"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: '#ef4444', r: 3 }}
              activeDot={{ r: 4.5 }}
              name="Dépenses"
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
