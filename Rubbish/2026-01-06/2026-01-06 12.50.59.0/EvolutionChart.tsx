import React, { useRef } from 'react';
import useAxesReady from '../../hooks/useAxesReady';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Customized } from 'recharts';

interface Point { index?: number; moisShort?: string; date?: Date; revenus: number; depenses: number }

interface Props {
  data: Point[];
  formatCurrency: (v: number) => string;
  locale?: string;
  chartsReady?: boolean;
}

export default function EvolutionChart({ data, formatCurrency, chartsReady = true, locale }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const axesReady = useAxesReady(containerRef, [data.length, chartsReady]);

  // Show a tick for every month (user requested all months on the x-axis)
  const xTicksIndices = data.map((d, i) => i);
  const xTickProps = data.length > 6 ? { fontSize: 11, angle: -45 as const, textAnchor: 'end' as const } : { fontSize: 12 };

  data.forEach((d, i) => { (d as any).index = i; });

  const domAxesHaveTicks = () => {
    const el = containerRef.current;
    if (!el) return false;
    const ticks = el.querySelectorAll('.recharts-cartesian-axis .recharts-cartesian-axis-tick');
    if (ticks.length === 0) return false;
    const firstText = ticks[0].querySelector('text');
    return !!(firstText && typeof firstText.textContent === 'string' && firstText.textContent.trim().length > 0);
  };

  const shouldRenderOverlay = axesReady && domAxesHaveTicks() && chartsReady && data.length > 0;

  return (
    <div ref={containerRef} style={{ height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorRevenus" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.28}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorDepenses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.22}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="index"
            xAxisId={0}
            stroke="#9ca3af"
            tick={xTickProps}
            ticks={xTicksIndices}
            tickFormatter={(idx:any) => {
              const usedLocale = locale ?? undefined;
              if (typeof idx === 'number' && data[idx]?.date) {
                try {
                  // Format court : 'MMM yyyy'
                  return data[idx].date.toLocaleDateString(usedLocale, { month: 'short', year: 'numeric' });
                } catch (e) {}
              }
              return data[idx]?.moisShort ?? '';
            }}
          />
          <YAxis yAxisId={0} stroke="#9ca3af" tickFormatter={(v:any)=>formatCurrency(Number(v))} />
          <Tooltip formatter={(value: any) => typeof value === 'number' ? formatCurrency(Number(value)) : String(value)} labelFormatter={(idx:any) => (typeof idx === 'number' ? (data[idx]?.moisShort ?? String(idx)) : String(idx))} />

          <Area type="monotone" dataKey="revenus" stroke="#10b981" strokeWidth={2} fill="url(#colorRevenus)" />
          <Area type="monotone" dataKey="depenses" stroke="#ef4444" strokeWidth={2} fill="url(#colorDepenses)" />

          {/* safer overlays: draw via Customized only when axes/scales exist */}
          <Customized component={(props: any) => {
            try {
              const { xAxisMap, yAxisMap, chartWidth, chartHeight } = props;
              if (!xAxisMap || !yAxisMap) return null;
              const xAxis = xAxisMap[0];
              const yAxis = yAxisMap[0];
              if (!xAxis?.scale || !yAxis?.scale) return null;
              if (!data || data.length === 0) return null;

              const lastIndex = data.length - 1;
              const last = data[lastIndex];
              const x = xAxis.scale(lastIndex);

              const circles: any[] = [];
              if (typeof last.revenus === 'number') {
                const y = yAxis.scale(last.revenus);
                circles.push(<circle key="rev" cx={x} cy={y} r={6} fill="#10b981" stroke="#fff" strokeWidth={2} />);
              }
              if (typeof last.depenses === 'number') {
                const y = yAxis.scale(last.depenses);
                circles.push(<circle key="dep" cx={x} cy={y} r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />);
              }

              return <g>{circles}</g>;
            } catch (e) {
              // defensive: if anything fails here, avoid crashing the chart
              return null;
            }
          }} />

        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

