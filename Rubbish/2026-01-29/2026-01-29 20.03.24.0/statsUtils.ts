import { Transaction } from '../App';

export function detectSavingsCodes(types?: Array<{ id_type: number; code: string; label: string }>) {
  const codes = new Set<string>(['épargne', 'epargne', 'savings', 'saving']);
  (types ?? []).forEach(t => {
    const label = String(t.label ?? '').toLowerCase();
    const code = String(t.code ?? '').toLowerCase();
    if (label.includes('épar') || label.includes('epar') || code.includes('saving') || code.includes('epar')) {
      codes.add(code);
    }
  });
  return codes;
}

export function isRealTransaction(t: Transaction): boolean {
  if (!t || !t.date) return false;
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const d = new Date(t.date);
  const validated = (t as any).validated === undefined ? true : Boolean((t as any).validated);
  return d <= endOfToday && validated;
}

export function isSavingsTx(tx: Transaction, types?: Array<{ id_type: number; code: string; label: string }>) {
  if (!tx || !tx.type) return false;
  const codes = detectSavingsCodes(types);
  return codes.has(String(tx.type).toLowerCase());
}

export function isForecastTransaction(t: Transaction) {
  if (!t || !t.date) return false;
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const d = new Date(t.date);
  const maxForecast = new Date(endOfToday);
  maxForecast.setMonth(maxForecast.getMonth() + 3);
  maxForecast.setHours(23, 59, 59, 999);
  return d > endOfToday && d <= maxForecast;
}

// Exclude the special aggregated row named "Total général" (or similar variants) from calculations
export function isTotalGeneralCategory(categorie?: string) {
  if (!categorie) return false;
  // normalize and remove diacritics to cover "général" / "general" variants
  const normalized = String(categorie).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  return normalized.includes('total') && (normalized.includes('gen') || normalized.includes('general'));
}

export function isObjectiveCategory(categorie?: string) {
  if (!categorie) return false;
  // normalize and remove diacritics to cover "Objectif" / "objectif" variants and english "goal"
  const normalized = String(categorie).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  return normalized.includes('objectif') || normalized.includes('objectif') || normalized.includes('goal');
}

export interface TotalsSplitResult {
  revenus: { real: number; forecast: number; total: number };
  depenses: { real: number; forecast: number; total: number };
  epargne: { real: number; forecast: number; total: number };
  resteADepenserReal: number; // revenus.real - depenses.real - epargne.real
  resteADepenserAll: number; // revenus.total - depenses.total - epargne.total
  tauxEpargneReal: number; // based on real revenus
  tauxEpargneAll: number; // based on all revenus
}

export function computeTotals(transactions: Transaction[], types?: Array<{ id_type: number; code: string; label: string }>): TotalsSplitResult {
  // classify by date: real = date <= end of today and (validated !== false),
  // forecast = date > today but not further than +3 months from today
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  // maximum date to consider as 'prévisionnel' is endOfToday + 3 months
  const maxForecast = new Date(endOfToday);
  maxForecast.setMonth(maxForecast.getMonth() + 3);
  maxForecast.setHours(23, 59, 59, 999);

  const isReal = (t: Transaction) => {
    if (!t || !t.date) return false;
    const d = new Date(t.date);
    const validated = (t as any).validated === undefined ? true : Boolean((t as any).validated);
    return d <= endOfToday && validated;
  };
  const isForecast = (t: Transaction) => {
    if (!t || !t.date) return false;
    const d = new Date(t.date);
    // forecast only if after today and no later than the 3-month cap
    return d > endOfToday && d <= maxForecast;
  };

  const sum = (arr: Transaction[]) => arr.reduce((s, t) => s + (t.montant ?? 0), 0);

  // revenus (exclude aggregated "Total général" rows and exclude savings)
  const revenusAll = transactions.filter(t => t.type === 'revenu' && !isTotalGeneralCategory(t.categorie) && !isSavingsTx(t, types));
  const revenusReal = revenusAll.filter(isReal);
  const revenusForecast = revenusAll.filter(isForecast);

  // depenses (exclude aggregated "Total général" rows)
  // Exclure aussi les transactions de catégorie "Epargne" (ou savings)
  const depensesAll = transactions.filter(t => (t.type === 'dépense') && !isTotalGeneralCategory(t.categorie) && !isSavingsTx(t, types));
  const depensesReal = depensesAll.filter(isReal);
  const depensesForecast = depensesAll.filter(isForecast);

  // epargne (exclude aggregated "Total général" rows)
  // Exclude "Objectif" category from savings so it's not double-counted (we treat it comme de l'épargne affectée)
  const epargneAll = transactions.filter(t => t && t.date && !isNaN(Date.parse(t.date)) && isSavingsTx(t, types) && !isTotalGeneralCategory(t.categorie));
  const epargneReal = epargneAll.filter(isReal);
  const epargneForecast = epargneAll.filter(isForecast);

  const revenusRealSum = sum(revenusReal);
  const revenusForecastSum = sum(revenusForecast);
  const revenusTotalSum = sum(revenusAll);

  const depensesRealSum = depensesReal.reduce((s, t) => s + Math.abs(t.montant), 0);
  const depensesForecastSum = depensesForecast.reduce((s, t) => s + Math.abs(t.montant), 0);
  const depensesTotalSum = depensesAll.reduce((s, t) => s + Math.abs(t.montant), 0);

  const epargneRealSum = sum(epargneReal);
  const epargneForecastSum = sum(epargneForecast);
  const epargneTotalSum = sum(epargneAll);

  const resteADepenserReal = revenusRealSum - depensesRealSum - epargneRealSum;
  const resteADepenserAll = revenusTotalSum - depensesTotalSum - epargneTotalSum;

  const tauxEpargneReal = revenusRealSum > 0 ? (epargneRealSum / revenusRealSum * 100) : 0;
  const tauxEpargneAll = revenusTotalSum > 0 ? (epargneTotalSum / revenusTotalSum * 100) : 0;

  return {
    revenus: { real: revenusRealSum, forecast: revenusForecastSum, total: revenusTotalSum },
    depenses: { real: depensesRealSum, forecast: depensesForecastSum, total: depensesTotalSum },
    epargne: { real: epargneRealSum, forecast: epargneForecastSum, total: epargneTotalSum },
    resteADepenserReal,
    resteADepenserAll,
    tauxEpargneReal,
    tauxEpargneAll
  };
}
