import React, { useRef } from 'react';
import useAxesReady from '../../hooks/useAxesReady';
import { LineChart, Line, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Customized } from 'recharts';

interface Point { index: number; name: string; real: number | null; proj?: number }

interface Props {
  data: Point[];
  formatCurrency: (v: number) => string;
  monthlySavings?: Array<{ label: string; date: Date; real: number | null; proj?: number }>;
  locale?: string;
  chartsReady?: boolean;
}

export default function SavingsChart({ data, formatCurrency, monthlySavings = [], chartsReady = true, locale }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const axesReady = useAxesReady(containerRef, [data.length, chartsReady, monthlySavings.length]);

  // show a tick for every month on the savings chart
  const savingsTicksIndices = data.map((s, i) => i);
  const savingsTickProps = data.length > 6 ? { fontSize: 12, angle: -30 as const, textAnchor: 'end' as const } : { fontSize: 12 };
  const hasValidSavingsAxis = data.length > 1 && savingsTicksIndices.length > 0 && typeof (data[0] as any)?.index === 'number';

  const domAxesHaveTicks = () => {
    const el = containerRef.current;
    if (!el) return false;
    const ticks = el.querySelectorAll('.recharts-cartesian-axis .recharts-cartesian-axis-tick');
    if (ticks.length === 0) return false;
    const firstText = ticks[0].querySelector('text');
    return !!(firstText && typeof firstText.textContent === 'string' && firstText.textContent.trim().length > 0);
  };

  const shouldRenderOverlay = axesReady && domAxesHaveTicks() && chartsReady && hasValidSavingsAxis;

  return (
    <div ref={containerRef} style={{ height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 0, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="realGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="projGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.14} />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis
          dataKey="index"
          xAxisId={0}
          stroke="#9ca3af"
          tick={savingsTickProps}
          ticks={savingsTicksIndices}
          tickFormatter={(idx:any) => {
            const usedLocale = locale ?? undefined;
            if (typeof idx === 'number' && monthlySavings && monthlySavings[idx]?.date) {
              try { return monthlySavings[idx].date.toLocaleDateString(usedLocale, { month: 'short', year: 'numeric' }); } catch (e) {}
            }
            return data[idx]?.name ?? '';
          }}
        />
        <YAxis yAxisId={0} stroke="#9ca3af" tickFormatter={(v)=>formatCurrency(Number(v))} />
          <Tooltip
            formatter={(value: any) => typeof value === 'number' ? formatCurrency(Number(value)) : String(value)}
            labelFormatter={(idx:any) => (typeof idx === 'number' ? (data[idx]?.name ?? String(idx)) : String(idx))}
          />
        {/* explicit legend to call out projections */}
        <Legend
          verticalAlign="top"
          align="right"
          payload={[
            { value: 'Cumul réel', type: 'line', color: '#10b981' },
            { value: 'Projection (3 mois)', type: 'line', color: '#f59e0b' }
          ]}
        />

        <Area type="monotone" dataKey="real" stroke="#10b981" strokeWidth={3} fill="url(#realGradient)" name="Cumulés (réel)" fillOpacity={1} connectNulls={false} />
        <Line type="monotone" dataKey="real" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} connectNulls={false} />

        <Line type="monotone" dataKey="proj" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} strokeDasharray="6 6" name="Provisions (3 mois)" />
        <Area type="monotone" dataKey="proj" stroke="#f59e0b" fill="url(#projGradient)" fillOpacity={1} name="Provisions (3 mois)" />





          <Customized component={(props:any) => {
            try {
              const { xAxisMap, yAxisMap, chartWidth, chartHeight } = props;
              if (!xAxisMap || !yAxisMap) return null;
              const xAxis = xAxisMap[0];
              const yAxis = yAxisMap[0];
              if (!xAxis?.scale || !yAxis?.scale) return null;

              const projEndLabel = [...monthlySavings].reverse().find(m => m.proj !== undefined)?.label;
              const projStartLabel = monthlySavings.find(m => m.proj !== undefined)?.label;
              const projStartIdx = projStartLabel ? data.findIndex(s => s.name === projStartLabel) : -1;
              const projEndIdx = projEndLabel ? data.findIndex(s => s.name === projEndLabel) : -1;

              const lastReal = monthlySavings.slice().reverse().find(m => m.real !== null && m.real !== undefined);
              const lastRealIdx = lastReal ? data.findIndex(s => s.name === lastReal.label) : -1;

              const nodes: any[] = [];

              if (projStartIdx >= 0 && projEndIdx >= 0) {
                const x1 = xAxis.scale(projStartIdx);
                const x2 = xAxis.scale(projEndIdx);
                const rectX = Math.min(x1, x2);
                const rectW = Math.abs(x2 - x1);
                nodes.push(<rect key="projArea" x={rectX} y={0} width={rectW} height={chartHeight} fill="#f59e0b" fillOpacity={0.06} />);
              }

              if (lastReal && lastRealIdx >= 0 && typeof lastReal.real === 'number') {
                const x = xAxis.scale(lastRealIdx);
                const y = yAxis.scale(lastReal.real as number);
                nodes.push(<circle key="lastReal" cx={x} cy={y} r={6} fill="#10b981" stroke="#f43f5e" strokeWidth={3} />);
              }

              return <g>{nodes}</g>;
            } catch (e) {
              return null;
            }
          }} />

      </LineChart>
    </ResponsiveContainer>
    </div>
  );
}
