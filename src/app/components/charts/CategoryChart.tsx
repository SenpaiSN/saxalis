import React from 'react';
import { BarChart, Bar, Cell, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Item { categorie: string; montant: number; emoji?: string | null }

interface Props {
  data: Item[];
  formatCurrency: (v: number) => string;
  colors?: string[];
}

export default function CategoryChart({ data, formatCurrency, colors }: Props) {
  const COLORS = colors ?? ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data.slice(0, 6)} margin={{ top: 0, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="categorie" stroke="#9ca3af" tick={{ fontSize: 12 }} />
        <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value: any) => typeof value === 'number' ? formatCurrency(Number(value)) : String(value)} />
        <Bar dataKey="montant" radius={[8, 8, 0, 0]}>
          {data.slice(0, 6).map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
