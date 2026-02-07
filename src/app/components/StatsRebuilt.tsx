import React, { useState, useEffect } from 'react';
import Filters from './Filters';
import SummaryCards from './SummaryCards';
import MonthlyPerformanceCard from './MonthlyPerformanceCard';
import { computeTotals, isSavingsTx } from './statsUtils';
import { Transaction } from '../App';
import { usePreferences } from '../contexts/PreferencesContext';
import { aggregateMonthlyEvolution, aggregateCategoryBreakdown, computeMonthlySavingsAndProjections } from './statsAggregation';
import formatCurrency from '../../lib/formatCurrency';
import ComparisonChart from './charts/ComparisonChart';
import CategoryChart from './charts/CategoryChart';
import SavingsChart from './charts/SavingsChart';

interface Props {
  transactions: Transaction[];
  recherche: string;
  setRecherche: (v: string) => void;
  annee: string;
  setAnnee: (v: string) => void;
  mois: string;
  setMois: (v: string) => void;
  filtreType: 'tous' | 'expense' | 'income';
  setFiltreType: (v: 'tous' | 'expense' | 'income') => void;
  categorie: string;
  setCategorie: (v: string) => void;
  sousCategorie: string;
  setSousCategorie: (v: string) => void;
  types: Array<{ id_type: number; code: string; label: string }>;
  categories: Array<{ id_category: number; name: string }>;
  subcategories: Array<{ id_subcategory: number; name: string }>;
  categoriesLoading: boolean;
  subcategoriesLoading: boolean;
  anneesDisponibles: string[];
  resetFilters: () => void;

}

export default function StatsRebuilt({ transactions, recherche, setRecherche, annee, setAnnee, mois, setMois, filtreType, setFiltreType, categorie, setCategorie, sousCategorie, setSousCategorie, types, categories, subcategories, categoriesLoading, subcategoriesLoading, anneesDisponibles, resetFilters }: Props) {
  const { locale, currency } = usePreferences();

  // Apply same filters as in StatsModern
  const transactionsFiltres = transactions.filter(t => {
    const search = recherche.trim().toLowerCase();
    const matchRecherche = search.length === 0 ? true : (t.categorie || '').toLowerCase().includes(search);
    const txCode = t.type === 'dépense' ? 'expense' : (t.type === 'revenu' ? 'income' : (t.type as any));
    const matchType = filtreType === 'tous' || txCode === filtreType;
    const txDate = new Date(t.date);

    const noFiltersSelected = search.length === 0 && filtreType === 'tous' && categorie === 'Toutes' && sousCategorie === 'Toutes' && annee === 'Tous' && mois === 'Tous';
    // Keep 'Tous' when nothing selected
    const effectiveAnnee = annee;
    const effectiveMois = mois;

    const matchAnnee = effectiveAnnee === 'Tous' || String(txDate.getFullYear()) === effectiveAnnee;
    const matchMois = effectiveMois === 'Tous' || (effectiveMois !== 'Tous' && (txDate.getMonth() + 1) === Number(effectiveMois));
    const matchCategorie = categorie === 'Toutes' || t.categorie === categorie;
  const subName = (t as any).subcategoryName ?? (t as any).subCategory ?? '';
  const subId = (t as any).subcategoryId ?? (t as any).subCategoryId ?? (t as any).id_subcategory ?? null;
  const matchSous = sousCategorie === 'Toutes' || subName === sousCategorie || (subId !== null && String(subId) === String(sousCategorie));
    return matchRecherche && matchType && matchAnnee && matchMois && matchCategorie && matchSous;
  });

  // compute totals on the filtered set so all cards reflect active filters
  const totals = computeTotals(transactionsFiltres, types);

  // For Revenus/Dépenses cards: apply current month/year as default filter if not explicitly set
  const now = new Date();
  const defaultAnnee = String(now.getFullYear());
  const defaultMois = String(now.getMonth() + 1);
  
  // For current month display: include revenus/dépenses until end of month (including forecasts)
  const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  
  const transactionsRevenusDepenses = transactions.filter(t => {
    const search = recherche.trim().toLowerCase();
    const matchRecherche = search.length === 0 ? true : (t.categorie || '').toLowerCase().includes(search);
    const txCode = t.type === 'dépense' ? 'expense' : (t.type === 'revenu' ? 'income' : (t.type as any));
    const matchType = filtreType === 'tous' || txCode === filtreType;
    const txDate = new Date(t.date);
    // For Revenus/Dépenses: use current month/year by default, but respect explicit filter selections
    const effectiveAnnee = annee !== 'Tous' ? annee : defaultAnnee;
    const effectiveMois = mois !== 'Tous' ? mois : defaultMois;
    const matchAnnee = String(txDate.getFullYear()) === effectiveAnnee;
    const matchMois = (txDate.getMonth() + 1) === Number(effectiveMois);
    
    // For current month: include transactions up to end of month (even if in future)
    // For other months: keep strict date filtering
    let matchDate = true;
    if (effectiveAnnee === defaultAnnee && effectiveMois === defaultMois) {
      // Current month: include everything until end of month
      matchDate = txDate <= endOfCurrentMonth;
    } else {
      // Other months: use default behavior (only past transactions)
      matchDate = true; // Already filtered by year/month above
    }
    
    const matchCategorie = categorie === 'Toutes' || t.categorie === categorie;
    const subName = (t as any).subcategoryName ?? (t as any).subCategory ?? '';
    const subId = (t as any).subcategoryId ?? (t as any).subCategoryId ?? (t as any).id_subcategory ?? null;
    const matchSous = sousCategorie === 'Toutes' || subName === sousCategorie || (subId !== null && String(subId) === String(sousCategorie));
    const overall = matchRecherche && matchType && matchAnnee && matchMois && matchDate && matchCategorie && matchSous;
    return overall;
  });
  const totalsRevenusDepenses = computeTotals(transactionsRevenusDepenses, types);

  // For "Économie annuelle" and "Revenus annuels" cards: calculate full year totals WITHOUT month filter
  const transactionsAnnuelComplet = transactions.filter(t => {
    const search = recherche.trim().toLowerCase();
    const matchRecherche = search.length === 0 ? true : (t.categorie || '').toLowerCase().includes(search);
    const txCode = t.type === 'dépense' ? 'expense' : (t.type === 'revenu' ? 'income' : (t.type as any));
    const matchType = filtreType === 'tous' || txCode === filtreType;
    const txDate = new Date(t.date);
    
    // Use selected year, but NO month filter
    const effectiveAnnee = annee !== 'Tous' ? annee : defaultAnnee;
    const matchAnnee = String(txDate.getFullYear()) === effectiveAnnee;
    
    const matchCategorie = categorie === 'Toutes' || t.categorie === categorie;
    const subName = (t as any).subcategoryName ?? (t as any).subCategory ?? '';
    const subId = (t as any).subcategoryId ?? (t as any).subCategoryId ?? (t as any).id_subcategory ?? null;
    const matchSous = sousCategorie === 'Toutes' || subName === sousCategorie || (subId !== null && String(subId) === String(sousCategorie));
    
    return matchRecherche && matchType && matchAnnee && matchCategorie && matchSous;
  });
  const totalsAnnuelComplet = computeTotals(transactionsAnnuelComplet, types);

  const refDate = (() => {
    const now = new Date();
    let y = now.getFullYear();
    let m = now.getMonth() + 1;
    // Respect 'Afficher tout' and the default-to-current-month behavior
    const noFiltersSelected = recherche.trim().length === 0 && filtreType === 'tous' && categorie === 'Toutes' && sousCategorie === 'Toutes' && annee === 'Tous' && mois === 'Tous';
    // Keep 'Tous' when nothing selected
    const effectiveAnnee = annee;
    const effectiveMois = mois;

    if (effectiveAnnee && effectiveAnnee !== 'Tous') y = Number(effectiveAnnee);
    if (effectiveMois && effectiveMois !== 'Tous') m = Number(effectiveMois);
    return new Date(y, m - 1, 1);
  })();
  // Reference: monthly comparison when a month is selected, otherwise annual comparison (year-over-year)
  const isAnnual = !mois || mois === 'Tous';
  let prevLabelCapitalized = '';
  let prevRevenus = 0;
  let prevDepenses = 0;
  let prevEpargne = 0;

  // change labels
  let revenusChangeLabel = '';
  let depensesChangeLabel = '';
  let epargneChangeLabel = '';
  let soldeChangeLabel = '';

    if (isAnnual) {
    const prevYear = (annee && annee !== 'Tous') ? (Number(annee) - 1) : (new Date().getFullYear() - 1);
    prevLabelCapitalized = String(prevYear);

    prevRevenus = transactions
      .filter(t => {
        const search = recherche.trim().toLowerCase();
        const matchRecherche = search.length === 0 ? true : (t.categorie || '').toLowerCase().includes(search);
        const txCode = t.type === 'dépense' ? 'expense' : (t.type === 'revenu' ? 'income' : (t.type as any));
        const matchType = filtreType === 'tous' || txCode === filtreType;
        const txDate = new Date(t.date);
        const matchYear = String(txDate.getFullYear()) === String(prevYear);
        const matchCategorie = categorie === 'Toutes' || t.categorie === categorie;
        const subName = (t as any).subcategoryName ?? (t as any).subCategory ?? '';
        const subId = (t as any).subcategoryId ?? (t as any).subCategoryId ?? (t as any).id_subcategory ?? null;
        const matchSous = sousCategorie === 'Toutes' || subName === sousCategorie || (subId !== null && String(subId) === String(sousCategorie));
        return matchRecherche && matchType && matchYear && matchCategorie && matchSous;
      })
      .filter(t => t.type === 'revenu')
      .reduce((s, t) => s + (t.montant ?? 0), 0);

    prevDepenses = transactions
      .filter(t => {
        const search = recherche.trim().toLowerCase();
        const matchRecherche = search.length === 0 ? true : (t.categorie || '').toLowerCase().includes(search);
        const txCode = t.type === 'dépense' ? 'expense' : (t.type === 'revenu' ? 'income' : (t.type as any));
        const matchType = filtreType === 'tous' || txCode === filtreType;
        const txDate = new Date(t.date);
        const matchYear = String(txDate.getFullYear()) === String(prevYear);
        const matchCategorie = categorie === 'Toutes' || t.categorie === categorie;
        const subName = (t as any).subcategoryName ?? (t as any).subCategory ?? '';
        const subId = (t as any).subcategoryId ?? (t as any).subCategoryId ?? (t as any).id_subcategory ?? null;
        const matchSous = sousCategorie === 'Toutes' || subName === sousCategorie || (subId !== null && String(subId) === String(sousCategorie));
        return matchRecherche && matchType && matchYear && matchCategorie && matchSous;
      })
      .filter(t => t.type === 'dépense')
      .reduce((s, t) => s + Math.abs(t.montant), 0);

    prevEpargne = transactions
      .filter(t => isSavingsTx(t, types))
      .filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === prevYear;
      })
      .reduce((s, t) => s + t.montant, 0);
  } else {
    const prevDate = new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1);
    const prevLabel = prevDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    prevLabelCapitalized = prevLabel.replace(/\p{L}/u, c => c.toUpperCase());

    prevRevenus = transactions
      .filter(t => {
        const search = recherche.trim().toLowerCase();
        const matchRecherche = search.length === 0 ? true : (t.categorie || '').toLowerCase().includes(search);
        const txCode = t.type === 'dépense' ? 'expense' : (t.type === 'revenu' ? 'income' : (t.type as any));
        const matchType = filtreType === 'tous' || txCode === filtreType;
        const txDate = new Date(t.date);
        const matchYear = String(txDate.getFullYear()) === String(prevDate.getFullYear());
        const matchMonth = txDate.getMonth() === prevDate.getMonth();
        const matchCategorie = categorie === 'Toutes' || t.categorie === categorie;
        const subName = (t as any).subcategoryName ?? (t as any).subCategory ?? '';
        const subId = (t as any).subcategoryId ?? (t as any).subCategoryId ?? (t as any).id_subcategory ?? null;
        const matchSous = sousCategorie === 'Toutes' || subName === sousCategorie || (subId !== null && String(subId) === String(sousCategorie));
        return matchRecherche && matchType && matchYear && matchMonth && matchCategorie && matchSous;
      })
      .filter(t => t.type === 'revenu')
      .reduce((s, t) => s + (t.montant ?? 0), 0);

    prevDepenses = transactions
      .filter(t => {
        const search = recherche.trim().toLowerCase();
        const matchRecherche = search.length === 0 ? true : (t.categorie || '').toLowerCase().includes(search);
        const txCode = t.type === 'dépense' ? 'expense' : (t.type === 'revenu' ? 'income' : (t.type as any));
        const matchType = filtreType === 'tous' || txCode === filtreType;
        const txDate = new Date(t.date);
        const matchYear = String(txDate.getFullYear()) === String(prevDate.getFullYear());
        const matchMonth = txDate.getMonth() === prevDate.getMonth();
        const matchCategorie = categorie === 'Toutes' || t.categorie === categorie;
        const subName = (t as any).subcategoryName ?? (t as any).subCategory ?? '';
        const subId = (t as any).subcategoryId ?? (t as any).subCategoryId ?? (t as any).id_subcategory ?? null;
        const matchSous = sousCategorie === 'Toutes' || subName === sousCategorie || (subId !== null && String(subId) === String(sousCategorie));
        return matchRecherche && matchType && matchYear && matchMonth && matchCategorie && matchSous;
      })
      .filter(t => t.type === 'dépense')
      .reduce((s, t) => s + Math.abs(t.montant), 0);

    prevEpargne = transactionsFiltres
      .filter(t => isSavingsTx(t, types))
      .filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === prevDate.getFullYear() && d.getMonth() === prevDate.getMonth();
      })
      .reduce((s, t) => s + t.montant, 0);

  }

  const computeChangeLabel = (current: number, previous: number) => {
    if (previous === 0) return `— par rapport à ${prevLabelCapitalized}`;
    const pct = (current - previous) / Math.abs(previous) * 100;
    const sign = pct >= 0 ? '+' : '-';
    return `${sign}${Math.abs(pct).toFixed(2)}% par rapport à ${prevLabelCapitalized}`;
  };

  revenusChangeLabel = computeChangeLabel(totalsAnnuelComplet.revenus.real, prevRevenus);
  depensesChangeLabel = computeChangeLabel(totalsAnnuelComplet.depenses.real, prevDepenses);
  epargneChangeLabel = computeChangeLabel(totalsAnnuelComplet.epargne.real, prevEpargne);

  const currentSolde = totalsAnnuelComplet.revenus.real - totalsAnnuelComplet.depenses.real;
  const prevSolde = prevRevenus - prevDepenses;
  soldeChangeLabel = computeChangeLabel(currentSolde, prevSolde);

  // For Comparaison revenus vs dépenses: apply current year as default filter if not explicitly set
  const transactionsEvolution = transactions.filter(t => {
    const search = recherche.trim().toLowerCase();
    const matchRecherche = search.length === 0 ? true : (t.categorie || '').toLowerCase().includes(search);
    const txCode = t.type === 'dépense' ? 'expense' : (t.type === 'revenu' ? 'income' : (t.type as any));
    const matchType = filtreType === 'tous' || txCode === filtreType;
    const txDate = new Date(t.date);
    // For Evolution chart: use current year by default, but respect explicit filter selections
    const effectiveAnnee = annee !== 'Tous' ? annee : defaultAnnee;
    const matchAnnee = String(txDate.getFullYear()) === effectiveAnnee;
    // For evolution chart: only apply month filter if explicitly selected; otherwise show all months of the year
    const matchMois = mois === 'Tous' || (txDate.getMonth() + 1) === Number(mois);
    const matchCategorie = categorie === 'Toutes' || t.categorie === categorie;
    const subName = (t as any).subcategoryName ?? (t as any).subCategory ?? '';
    const subId = (t as any).subcategoryId ?? (t as any).subCategoryId ?? (t as any).id_subcategory ?? null;
    const matchSous = sousCategorie === 'Toutes' || subName === sousCategorie || (subId !== null && String(subId) === String(sousCategorie));
    return matchRecherche && matchType && matchAnnee && matchMois && matchCategorie && matchSous;
  });
  const effectiveAnneeEvolution = annee !== 'Tous' ? annee : defaultAnnee;

  const evolutionData = aggregateMonthlyEvolution(transactionsEvolution, locale);
  evolutionData.forEach((d, i) => { (d as any).index = i; });
  const xTickStep = Math.max(1, Math.ceil(evolutionData.length / 6));
  const xTicksIndices = evolutionData.map((d, i) => (i % xTickStep === 0 ? i : null)).filter(v => v !== null) as number[];

  // For Category breakdown: apply current month/year as default filter if not explicitly set
  const transactionsCategoryBreakdown = transactions.filter(t => {
    const search = recherche.trim().toLowerCase();
    const matchRecherche = search.length === 0 ? true : (t.categorie || '').toLowerCase().includes(search);
    const txCode = t.type === 'dépense' ? 'expense' : (t.type === 'revenu' ? 'income' : (t.type as any));
    const matchType = filtreType === 'tous' || txCode === filtreType;
    const txDate = new Date(t.date);
    // For Category breakdown: use current month/year by default, but respect explicit filter selections
    const effectiveAnnee = annee !== 'Tous' ? annee : defaultAnnee;
    const effectiveMois = mois !== 'Tous' ? mois : defaultMois;
    const matchAnnee = String(txDate.getFullYear()) === effectiveAnnee;
    const matchMois = (txDate.getMonth() + 1) === Number(effectiveMois);
    const matchCategorie = categorie === 'Toutes' || t.categorie === categorie;
    const subName = (t as any).subcategoryName ?? (t as any).subCategory ?? '';
    const subId = (t as any).subcategoryId ?? (t as any).subCategoryId ?? (t as any).id_subcategory ?? null;
    const matchSous = sousCategorie === 'Toutes' || subName === sousCategorie || (subId !== null && String(subId) === String(sousCategorie));
    const overall = matchRecherche && matchType && matchAnnee && matchMois && matchCategorie && matchSous;
    return overall;
  });

  const categoriesData = aggregateCategoryBreakdown(transactionsCategoryBreakdown);

  const monthlySavings = computeMonthlySavingsAndProjections(transactions);
  // Trim to show up to 3 months of projection after current month
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const projMonths = 3;
  const displayEndDate = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + projMonths, 1);
  let displayedMonthlySavings = monthlySavings.filter(m => m.date <= displayEndDate);

  // Apply YEAR filter only for the real points; keep projection months visible even if they fall into another year
  if (annee && annee !== 'Tous') {
    displayedMonthlySavings = displayedMonthlySavings.filter(m => (m.real !== null && String(m.date.getFullYear()) === String(annee)) || (typeof m.proj === 'number'));
  }
  const projSumValue = displayedMonthlySavings.filter(m => typeof m.proj === 'number').reduce((sum, m) => sum + (m.proj ?? 0), 0);
  const savingsChartData = displayedMonthlySavings.map((m, i) => ({ index: i, name: m.label, real: m.real, proj: m.proj }));

  // Calculate patrimoine (wealth) at beginning and end of year
  const selectedYear = annee && annee !== 'Tous' ? Number(annee) : new Date().getFullYear();
  const prevYear = selectedYear - 1;

  // Patrimoine at end of previous year (before selected year)
  const patrimoineDebut = transactions
    .filter(t => {
      const txDate = new Date(t.date);
      return txDate.getFullYear() < selectedYear;
    })
    .filter(t => isSavingsTx(t, types))
    .reduce((sum, t) => sum + t.montant, 0);

  // Patrimoine at end of selected year
  const patrimoineFin = transactions
    .filter(t => {
      const txDate = new Date(t.date);
      return txDate.getFullYear() <= selectedYear;
    })
    .filter(t => isSavingsTx(t, types))
    .reduce((sum, t) => sum + t.montant, 0);

  const patrimoineEvolution = patrimoineDebut !== 0
    ? ((patrimoineFin - patrimoineDebut) / Math.abs(patrimoineDebut)) * 100
    : (patrimoineFin > 0 ? 100 : 0);

  const patrimoineEvolutionEuros = patrimoineFin - patrimoineDebut;

  const patrimoineChangeLabel = patrimoineDebut !== 0
    ? `De ${formatCurrency(patrimoineDebut)} à ${formatCurrency(patrimoineFin)}`
    : `Patrimoine acquis: ${formatCurrency(patrimoineFin)}`;

  // Calculate monthly performance metrics
  const monthlyPerformance = (() => {
    const now = new Date();
    const monthData: { [key: string]: { revenues: number; expenses: number; month: string } } = {};
    
    transactionsFiltres.forEach(t => {
      const txDate = new Date(t.date);
      
      // Exclude future transactions (only include past transactions)
      if (txDate > now) return;
      
      // Only include transactions from the selected year
      if (txDate.getFullYear() !== selectedYear) return;
      
      const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthData[monthKey]) {
        const monthName = txDate.toLocaleDateString(locale, { month: 'long', year: undefined });
        monthData[monthKey] = { revenues: 0, expenses: 0, month: monthName.charAt(0).toUpperCase() + monthName.slice(1) };
      }
      
      if (t.type === 'revenu') {
        monthData[monthKey].revenues += t.montant ?? 0;
      } else if (t.type === 'dépense') {
        monthData[monthKey].expenses += Math.abs(t.montant);
      }
    });

    const months = Object.values(monthData);
    
    if (months.length === 0) {
      return {
        meilleurMois: null,
        pireMois: null,
        moisPlusDependsier: null,
        moisPlusEconome: null,
        year: selectedYear,
      };
    }

    // Calculate averages for comparison
    const avgCashFlow = months.reduce((sum, m) => sum + (m.revenues - m.expenses), 0) / months.length;
    const avgExpenses = months.reduce((sum, m) => sum + m.expenses, 0) / months.length;

    // Meilleur mois (cash flow le plus élevé)
    const meilleurMoisData = months.reduce((best, m) => (m.revenues - m.expenses > best.revenues - best.expenses) ? m : best);
    const meilleurCashFlow = meilleurMoisData.revenues - meilleurMoisData.expenses;
    const meilleurPercentChange = avgCashFlow !== 0 ? ((meilleurCashFlow - avgCashFlow) / Math.abs(avgCashFlow)) * 100 : 0;

    // Pire mois (cash flow le plus négatif)
    const pireMoisData = months.reduce((worst, m) => (m.revenues - m.expenses < worst.revenues - worst.expenses) ? m : worst);
    const pireCashFlow = pireMoisData.revenues - pireMoisData.expenses;
    const pirePercentChange = avgCashFlow !== 0 ? ((pireCashFlow - avgCashFlow) / Math.abs(avgCashFlow)) * 100 : 0;

    // Mois le plus dépensier
    const moisPlusDependsierData = months.reduce((max, m) => (m.expenses > max.expenses) ? m : max);
    const depensiePercentChange = avgExpenses !== 0 ? ((moisPlusDependsierData.expenses - avgExpenses) / avgExpenses) * 100 : 0;

    // Mois le plus économe
    const moisPlusEconomeData = months.reduce((min, m) => (m.expenses < min.expenses) ? m : min);
    const economePercentChange = avgExpenses !== 0 ? ((moisPlusEconomeData.expenses - avgExpenses) / avgExpenses) * 100 : 0;

    return {
      meilleurMois: {
        month: meilleurMoisData.month,
        value: meilleurCashFlow,
        description: meilleurMoisData.revenues > avgCashFlow ? 'Revenus exceptionnels' : 'Dépenses basses',
        percentChange: meilleurPercentChange,
        icon: '📈',
        label: 'Meilleur mois',
        color: 'green' as const,
      },
      pireMois: {
        month: pireMoisData.month,
        value: pireCashFlow,
        description: pireMoisData.revenues < avgCashFlow ? 'Revenus bas + dépenses élevées' : 'Dépenses exceptionnelles',
        percentChange: pirePercentChange,
        icon: '⚠️',
        label: 'Pire mois',
        color: 'red' as const,
      },
      moisPlusDependsier: {
        month: moisPlusDependsierData.month,
        value: moisPlusDependsierData.expenses,
        description: `+${Math.round(moisPlusDependsierData.expenses - avgExpenses)} € vs moyenne`,
        percentChange: depensiePercentChange,
        icon: '🛒',
        label: 'Mois le plus dépensier',
        color: 'red' as const,
      },
      moisPlusEconome: {
        month: moisPlusEconomeData.month,
        value: moisPlusEconomeData.expenses,
        description: `${Math.round(avgExpenses - moisPlusEconomeData.expenses)} € vs moyenne`,
        percentChange: economePercentChange,
        icon: '🌿',
        label: 'Mois le plus économe',
        color: 'green' as const,
      },
      year: selectedYear,
    };
  })();

  // Monthly savings from API (authoritative, uses validated transactions only)
  const [apiMonthlySavings, setApiMonthlySavings] = useState<{ revenues: number; expenses: number; savings: number; savings_pct: number | null } | null>(null);
  const [apiMonthlySavingsLoading, setApiMonthlySavingsLoading] = useState(false);
  const [apiMonthlySavingsError, setApiMonthlySavingsError] = useState<string | null>(null);

  // compute selected month in YYYY-MM (refDate already respects filters)
  const selectedMonth = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setApiMonthlySavingsLoading(true);
      setApiMonthlySavingsError(null);
      try {
        // Correct relative path from src/app/components -> src/services
        const api = await import('../../services/api');
        const res = await api.getMonthlySavings(selectedMonth);
        if (cancelled) return;
        if (res.ok && res.data && res.data.success) {
          setApiMonthlySavings({
            revenues: Number(res.data.revenues || 0),
            expenses: Number(res.data.expenses || 0),
            savings: Number(res.data.savings || 0),
            savings_pct: res.data.savings_pct !== undefined ? Number(res.data.savings_pct) : null
          });
        } else {
          setApiMonthlySavings(null);
          setApiMonthlySavingsError(res?.data?.error ?? res?.error ?? 'Erreur serveur');
        }
      } catch (e: any) {
        if (cancelled) return;
        setApiMonthlySavings(null);
        setApiMonthlySavingsError(String(e?.message ?? e));
      } finally {
        if (!cancelled) setApiMonthlySavingsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedMonth]);

  const [chartsReady, setChartsReady] = useState(false);
  useEffect(() => {
    setChartsReady(false);
    const id = window.setTimeout(() => setChartsReady(true), 0);
    return () => window.clearTimeout(id);
  }, [evolutionData.length, savingsChartData.length]);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

  return (
    <div className="p-3 lg:p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Statistique</h2>
          <p className="text-sm text-gray-500 mt-1">Analyser vos postes de dépenses</p>
        </div>
      </div>

      {/* Mobile: render Filters card (collapsible by default to save vertical space) */}
      <div className="lg:hidden mt-3">
        <Filters
          recherche={recherche} setRecherche={setRecherche}
          annee={annee} setAnnee={setAnnee} mois={mois} setMois={setMois}
          filtreType={filtreType} setFiltreType={setFiltreType}
          categorie={categorie} setCategorie={setCategorie} sousCategorie={sousCategorie} setSousCategorie={setSousCategorie}
          types={types} categories={categories} subcategories={subcategories}
          categoriesLoading={categoriesLoading} subcategoriesLoading={subcategoriesLoading}
          anneesDisponibles={anneesDisponibles} onReset={resetFilters}
          storageKey="filters:stats-mobile"
          defaultCollapsed={true}
          compact={true}
        />
      </div>

      {/* Desktop: always visible */}
      <div className="hidden lg:block mt-3">
        <Filters
          recherche={recherche} setRecherche={setRecherche}
          annee={annee} setAnnee={setAnnee} mois={mois} setMois={setMois}
          filtreType={filtreType} setFiltreType={setFiltreType}
          categorie={categorie} setCategorie={setCategorie} sousCategorie={sousCategorie} setSousCategorie={setSousCategorie}
          types={types} categories={categories} subcategories={subcategories}
          categoriesLoading={categoriesLoading} subcategoriesLoading={subcategoriesLoading}
          anneesDisponibles={anneesDisponibles} onReset={resetFilters}
          storageKey="filters:stats"
        />
      </div> 

      <SummaryCards
        totalRevenusReal={totalsAnnuelComplet.revenus.real}
        totalRevenusForecast={totalsAnnuelComplet.revenus.forecast}
        totalDepensesReal={totalsAnnuelComplet.depenses.real}
        totalDepensesForecast={totalsAnnuelComplet.depenses.forecast}
        totalEpargneReal={totalsAnnuelComplet.epargne.real}
        totalEpargneForecast={totalsAnnuelComplet.epargne.forecast}
        resteADepenserReal={totals.resteADepenserReal}
        resteADepenserAll={totals.resteADepenserAll}
        tauxEpargneReal={totalsAnnuelComplet.tauxEpargneReal}
        formatCurrencyFn={formatCurrency}
        revenusChangeLabel={revenusChangeLabel}
        depensesChangeLabel={depensesChangeLabel}
        epargneChangeLabel={epargneChangeLabel}
          soldeChangeLabel={soldeChangeLabel}
        soldeValue={totalsAnnuelComplet.revenus.real - totalsAnnuelComplet.depenses.real}
        patrimoineEvolution={patrimoineEvolution}
        patrimoineEvolutionEuros={patrimoineEvolutionEuros}
        patrimoineChangeLabel={patrimoineChangeLabel}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">Comparaison revenus vs dépenses</h3>
            <span className="text-sm font-bold text-gray-400">{effectiveAnneeEvolution}</span>
          </div>
          <div className="h-64">
            <ComparisonChart data={evolutionData} formatCurrency={formatCurrency} chartsReady={chartsReady} locale={locale} annee={effectiveAnneeEvolution} />
          </div>
        </div>

        <div className="col-span-1">
          <MonthlyPerformanceCard data={monthlyPerformance} formatCurrency={formatCurrency} />
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm">Évolution des économies cumulées</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Cumul réel</span>
              <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: totals.revenus.real - totals.depenses.real >= 0 ? 'var(--card-bg-revenu)' : 'var(--card-bg-depense)', color: totals.revenus.real - totals.depenses.real >= 0 ? 'var(--color-revenu-foreground)' : 'var(--color-depense-foreground)' }}>
                {formatCurrency(totals.revenus.real - totals.depenses.real)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Provisions (3 mois)</span>
              <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: 'var(--card-bg-epargne)', color: 'var(--color-epargne-foreground)' }}>
                {formatCurrency(projSumValue)}
              </span>
            </div>
          </div>
        </div>

        <div className="h-56">
          <SavingsChart data={savingsChartData} formatCurrency={formatCurrency} monthlySavings={displayedMonthlySavings} chartsReady={chartsReady} locale={locale} />
        </div>
      </div>

    </div>
  );
}
