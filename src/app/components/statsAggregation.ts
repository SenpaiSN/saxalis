import { Transaction } from '../App';
import { isTotalGeneralCategory } from './statsUtils';

export interface EvolutionPoint {
  mois: string; // YYYY-MM
  moisShort?: string;
  date: Date;
  revenus: number;
  depenses: number;
  index?: number;
}

export interface CategoryBreakdownItem {
  categorie: string;
  montant: number;
  emoji?: string | null;
}

export interface MonthlySavingPoint {
  label: string; // MM/YYYY
  date: Date;
  real: number | null;
  proj?: number;
}

const getMonthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export function aggregateMonthlyEvolution(transactions: Transaction[], locale = 'fr-FR') : EvolutionPoint[] {
  const map = new Map<string, { date: Date; revenus: number; depenses: number }>();

  transactions.forEach(t => {
    if (!t || !t.date) return;
    if (isTotalGeneralCategory(t.categorie)) return; // ignore aggregated rows
    const parsed = Date.parse(t.date);
    if (isNaN(parsed)) return;
    const d = new Date(parsed);
    const key = getMonthKey(d);
    const existing = map.get(key) ?? { date: new Date(d.getFullYear(), d.getMonth(), 1), revenus: 0, depenses: 0 };
    if (t.type === 'revenu') existing.revenus += t.montant;
    if (t.type === 'dépense') existing.depenses += Math.abs(t.montant);
    map.set(key, existing);
  });

  const keys = Array.from(map.keys());
  let minDate: Date | null = null;
  let maxDate: Date | null = null;
  keys.forEach(k => {
    const d = new Date(k + '-01');
    if (!minDate || d < minDate) minDate = d;
    if (!maxDate || d > maxDate) maxDate = d;
  });

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  // Cap the max date to the current month so the 'Évolution mensuelle' chart stops at the current month
  if (!maxDate || (maxDate as Date).getTime() > currentMonthStart.getTime()) maxDate = currentMonthStart;

  const result: EvolutionPoint[] = [];
  if (minDate) {
    const start = minDate as Date;
    let cur = new Date(start.getFullYear(), start.getMonth(), 1);
    let idx = 0;
    while (cur <= (maxDate as Date)) {
      const key = getMonthKey(cur);
      const v = map.get(key) ?? { date: new Date(cur), revenus: 0, depenses: 0 };
      const moisShort = cur.toLocaleDateString(locale, { month: 'short' });
      result.push({ mois: key, moisShort, date: new Date(cur), revenus: v.revenus, depenses: v.depenses, index: idx });
      idx++;
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  } else {
    // fallback: last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({ mois: getMonthKey(d), moisShort: d.toLocaleDateString(locale, { month: 'short' }), date: d, revenus: 0, depenses: 0, index: result.length });
    }
  }

  return result;
}

export function aggregateCategoryBreakdown(transactions: Transaction[], topN = 6) : CategoryBreakdownItem[] {
  const acc: Record<string, { montant: number; emoji?: string | null }> = {};
  transactions.forEach(t => {
    if (!t || t.type !== 'dépense') return;
    if (isTotalGeneralCategory(t.categorie)) return; // ignore aggregated rows
    const key = t.categorie || 'Autres';
    if (!acc[key]) acc[key] = { montant: 0, emoji: t.emoji };
    acc[key].montant += Math.abs(t.montant);
  });
  const arr = Object.keys(acc).map(k => ({ categorie: k, montant: acc[k].montant, emoji: acc[k].emoji }));
  arr.sort((a,b) => b.montant - a.montant);
  return arr.slice(0, topN);
}

export function computeMonthlySavingsAndProjections(transactions: Transaction[], projMonths = 3) : MonthlySavingPoint[] {
  const monthTotals = new Map<string, number>();
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  transactions.forEach(t => {
    if (!t || !t.date) return;
    if (isTotalGeneralCategory(t.categorie)) return; // ignore aggregated rows
    const parsed = Date.parse(t.date);
    if (isNaN(parsed)) return;
    if (t.type !== 'revenu' && t.type !== 'dépense') return;
    const d = new Date(parsed);
    const key = getMonthKey(d);
    const prev = monthTotals.get(key) ?? 0;
    const delta = t.type === 'revenu' ? t.montant : (t.type === 'dépense' ? -Math.abs(t.montant) : 0);
    monthTotals.set(key, prev + delta);
  });

  const keys = Array.from(monthTotals.keys());
  let minDate: Date | null = null;
  let maxDate: Date | null = null;
  keys.forEach(k => {
    const d = new Date(k + '-01');
    if (!minDate || d < minDate) minDate = d;
    if (!maxDate || d > maxDate) maxDate = d;
  });

  const monthlySavings: MonthlySavingPoint[] = [];
  if (minDate) {
    const endDate = (maxDate && (maxDate as Date).getTime() > currentMonthStart.getTime()) ? (maxDate as Date) : currentMonthStart;
    const start = minDate as Date;
    let cur = new Date(start.getFullYear(), start.getMonth(), 1);
    let running = 0;
    while (cur <= endDate) {
      const key = getMonthKey(cur);
      const delta = monthTotals.get(key) ?? 0;
      running += delta;
      const isReal = cur.getFullYear() < currentMonthStart.getFullYear() || (cur.getFullYear() === currentMonthStart.getFullYear() && cur.getMonth() <= currentMonthStart.getMonth());
      const label = `${String(cur.getMonth() + 1).padStart(2,'0')}/${cur.getFullYear()}`;
      monthlySavings.push({ label, date: new Date(cur), real: isReal ? Number(running.toFixed(2)) : null });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  }

  // projection
  const realIndices: number[] = [];
  const realVals: number[] = [];
  monthlySavings.forEach((m, i) => {
    if (m.real !== null && m.real !== undefined) {
      realIndices.push(i);
      realVals.push(m.real as number);
    }
  });

  if (realIndices.length >= 2) {
    const xs = realIndices;
    const ys = realVals;
    const n = xs.length;
    const meanX = xs.reduce((a,b)=>a+b,0)/n;
    const meanY = ys.reduce((a,b)=>a+b,0)/n;
    const num = xs.reduce((s, xi, i) => s + (xi - meanX) * (ys[i] - meanY), 0);
    const den = xs.reduce((s, xi) => s + (xi - meanX) * (xi - meanX), 0);
    const slope = den === 0 ? 0 : num / den;
    const intercept = meanY - slope * meanX;

    const currentMonthLabel = `${String(currentMonthStart.getMonth() + 1).padStart(2,'0')}/${currentMonthStart.getFullYear()}`;
    const currentMonthIndex = monthlySavings.findIndex(m => m.label === currentMonthLabel);
    const baseIndex = currentMonthIndex !== -1 ? currentMonthIndex : Math.max(...realIndices);

    for (let m = 1; m <= projMonths; m++) {
      const projIndex = baseIndex + m;
      const projValue = intercept + slope * projIndex;
      const nextDate = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + m, 1);
      const nextLabel = `${String(nextDate.getMonth() + 1).padStart(2,'0')}/${nextDate.getFullYear()}`;
      const existing = monthlySavings.find(s => s.label === nextLabel);
      if (existing) existing.proj = Number(projValue.toFixed(2));
      else monthlySavings.push({ label: nextLabel, date: nextDate, real: null, proj: Number(projValue.toFixed(2)) });
    }
  } else if (realIndices.length === 1) {
    const lastRealIndex = realIndices[0];
    const val = realVals[0];
    const lastRealDate = monthlySavings[lastRealIndex].date;
    const baseDate = currentMonthStart > lastRealDate ? currentMonthStart : lastRealDate;
    for (let m = 1; m <= projMonths; m++) {
      const nextDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + m, 1);
      const nextLabel = `${String(nextDate.getMonth() + 1).padStart(2,'0')}/${nextDate.getFullYear()}`;
      const existing = monthlySavings.find(s => s.label === nextLabel);
      if (existing) existing.proj = Number(val.toFixed(2));
      else monthlySavings.push({ label: nextLabel, date: nextDate, real: null, proj: Number(val.toFixed(2)) });
    }
  }

  // trim to show up to projMonths beyond current month
  const displayEndDate = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + projMonths, 1);
  const displayed = monthlySavings.filter(m => m.date <= displayEndDate);
  return displayed;
}
