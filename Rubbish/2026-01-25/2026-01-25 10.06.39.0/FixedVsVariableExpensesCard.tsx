import React, { useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import formatCurrency from '../../lib/formatCurrency';

// ============================================
// TYPES
// ============================================

interface Transaction {
  id: string;
  type: string; // Ajouté pour le filtrage
  id_type?: number;
  categorie: string;
  montant: number;
  date: string;
  is_fixed?: number | string | boolean;
}

interface FixedVsVariableExpensesCardProps {
  transactions?: Transaction[];
  locale?: string;
  annee?: string;
  mois?: string;
}

// Utilitaire pour normaliser is_fixed
const isFixedExpense = (value: any) => value === 1 || value === "1" || value === true;

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function FixedVsVariableExpensesCard({ 
  transactions = [],
  locale = 'fr-FR',
  annee,
  mois
}: FixedVsVariableExpensesCardProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  let filterYear = annee && annee !== 'Tous' ? Number(annee) : 'Tous';
  let filterMonth = mois && mois !== 'Tous' ? Number(mois) : 'Tous';
  // Si aucun filtre année sélectionné, prendre l'année en cours
  if (!annee || annee === '') filterYear = currentYear;

  // Génération du texte d'aide sur le filtre appliqué
  const getFiltreLabel = () => {
    if (filterYear === 'Tous' && filterMonth === 'Tous') {
      return `Année en cours (${currentYear})`;
    } else if (filterYear === 'Tous' && filterMonth !== 'Tous') {
      return `${getMonthName(filterMonth)} (toutes années)`;
    } else if (filterYear !== 'Tous' && filterMonth === 'Tous') {
      return `Tous les mois, ${filterYear}`;
    } else {
      return `${getMonthName(filterMonth)}, ${filterYear}`;
    }
  };
  // Utilitaire pour nom du mois
  function getMonthName(month: number | string) {
    if (typeof month === 'string') month = Number(month);
    return new Date(2000, month - 1, 1).toLocaleString(locale, { month: 'long' });
  }

  const expenseData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    let filterYear = annee && annee !== 'Tous' ? Number(annee) : 'Tous';
    let filterMonth = mois && mois !== 'Tous' ? Number(mois) : 'Tous';
    // Si aucun filtre année sélectionné, prendre l'année en cours
    if (!annee || annee === '') filterYear = currentYear;

    const expensesForDisplay = transactions.filter(t => {
      if (t.type !== 'dépense') return false;
      // Correction parsing date : extraire uniquement la partie YYYY-MM-DD
      const dateStr = t.date.split(' ')[0];
      const txDate = new Date(dateStr);
      const txYear = txDate.getFullYear();
      const txMonth = txDate.getMonth() + 1;
      // Exclure les transactions futures
      if (txDate > now) return false;
      if (filterYear === 'Tous' && filterMonth === 'Tous') {
        return txYear === currentYear;
      } else if (filterYear === 'Tous' && filterMonth !== 'Tous') {
        return txMonth === filterMonth;
      } else if (filterYear !== 'Tous' && filterMonth === 'Tous') {
        return txYear === filterYear;
      } else {
        return txYear === filterYear && txMonth === filterMonth;
      }
    });
  
    // Calculer les totaux en se basant uniquement sur is_fixed
    let totalFixed = 0;
    let totalVariable = 0;
    expensesForDisplay.forEach(tx => {
      const amount = Math.abs(tx.montant);
      const isFixed = isFixedExpense(tx.is_fixed);
      if (isFixed) {
        totalFixed += amount;
      } else {
        totalVariable += amount;
      }
    });

    const totalExpenses = totalFixed + totalVariable;

    return {
      fixed: totalFixed,
      variable: totalVariable,
      total: totalExpenses,
      fixedPercent: totalExpenses > 0 ? Math.round((totalFixed / totalExpenses) * 100) : 0,
      variablePercent: totalExpenses > 0 ? Math.round((totalVariable / totalExpenses) * 100) : 0,
      hasData: expensesForDisplay.length > 0
    };
  }, [transactions, annee, mois]);

  if (!expenseData.hasData || expenseData.total === 0) {
    return (
      <div 
        tabIndex={0}
        role="region"
        aria-label="Répartition dépenses fixes et variables - Aucune donnée"
        className="bg-white rounded-2xl md:rounded-3xl shadow-lg border border-gray-200 p-5 md:p-6"
      >
        <h3 className="text-base md:text-lg font-bold text-gray-900 mb-6">
          Dépenses fixes vs variables
        </h3>
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <AlertCircle size={48} className="mb-3 opacity-20" />
          <p className="text-sm font-medium">Aucune dépense pour cette période</p>
          <p className="text-xs text-gray-500 mt-1">Ajoutez des transactions pour voir l'analyse</p>
        </div>
      </div>
    );
  }

  // Marge de manœuvre = montant total des dépenses variables
  const margin = expenseData.variable;
  const isIdealRatio = Math.abs(expenseData.fixedPercent - 50) < 10;
  const tooManyFixed = expenseData.fixedPercent > 70;

  // Recommandation intelligente selon le ratio
  function getSmartAdvice(fixedPercent: number, variablePercent: number, margin: number) {
    if (fixedPercent > 80) {
      return (
        <><span className="font-semibold">⚠️ Charges fixes très élevées :</span> Essayez de réduire certains abonnements ou charges récurrentes pour retrouver de la flexibilité.</>
      );
    } else if (fixedPercent > 70) {
      return (
        <><span className="font-semibold">✅ Proche de l’idéal :</span> 70% fixes / 30% variables. Continuez à surveiller vos charges fixes.</>
      );
    } else if (fixedPercent >= 60) {
      return (
        <><span className="font-semibold">👍 Budget équilibré :</span> Vous avez une bonne marge de manœuvre sur vos dépenses variables.</>
      );
    } else if (fixedPercent < 60 && variablePercent > 40) {
      return (
        <><span className="font-semibold">⚠️ Dépenses variables importantes :</span> Essayez de mieux planifier vos achats ou de fixer des limites pour certains loisirs.</>
      );
    } else if (fixedPercent < 60) {
      return (
        <><span className="font-semibold">💡 Charges fixes faibles :</span> Attention à ne pas trop augmenter vos dépenses variables pour garder le contrôle de votre budget.</>
      );
    } else {
      return (
        <><span className="font-semibold">ℹ️ Idéal :</span> 70% fixes / 30% variables. Vous avez une marge de manœuvre de <span className="font-bold">{formatCurrency(margin)}</span> sur votre budget.</>
      );
    }
  }

  return (
    <div 
      tabIndex={0}
      role="region"
      aria-label={`Dépenses fixes: ${expenseData.fixedPercent}%, variables: ${expenseData.variablePercent}%`}
      aria-live="polite"
      className="group relative bg-white rounded-2xl md:rounded-3xl shadow-lg border border-gray-200 p-5 md:p-6 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 focus-within:ring-2 focus-within:ring-blue-500 flex flex-col lg:min-h-80"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300" />
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base md:text-lg font-bold text-gray-900">
            Dépenses fixes vs variables
          </h3>
          {/* Label filtre appliqué */}
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full ml-2" title="Filtre appliqué">
            {getFiltreLabel()}
          </span>
          {isIdealRatio && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium ml-2">
              ✓ Équilibré
            </span>
          )}
        </div>
        {/* Horizontal Bar Chart */}
        <div className="mb-6">
          <div className="flex h-12 rounded-full overflow-hidden shadow-md mb-4">
            {/* Fixed expenses bar */}
            <div 
              className="bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-sm transition-all duration-500"
              style={{ 
                width: `${expenseData.fixedPercent}%`,
                minWidth: expenseData.fixedPercent > 0 ? '40px' : '0'
              }}
              aria-label={`Dépenses fixes: ${Math.round(expenseData.fixedPercent)}%`}
            >
              {expenseData.fixedPercent > 10 && `${Math.round(expenseData.fixedPercent)}%`}
            </div>
            {/* Variable expenses bar */}
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm transition-all duration-500"
              style={{ 
                width: `${expenseData.variablePercent}%`,
                minWidth: expenseData.variablePercent > 0 ? '40px' : '0'
              }}
              aria-label={`Dépenses variables: ${Math.round(expenseData.variablePercent)}%`}
            >
              {expenseData.variablePercent > 10 && `${Math.round(expenseData.variablePercent)}%`}
            </div>
          </div>
        </div>
        {/* Legend and amounts */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg transition-colors hover:bg-green-100">
            <div className="w-4 h-4 rounded bg-green-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Fixes</p>
              <p className="text-xs text-gray-600">Loyer, abonnements, etc.</p>
            </div>
            <p className="text-sm font-bold text-gray-900">{formatCurrency(expenseData.fixed)}</p>
          </div>
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg transition-colors hover:bg-blue-100">
            <div className="w-4 h-4 rounded bg-blue-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Variables</p>
              <p className="text-xs text-gray-600">Courses, loisirs, etc.</p>
            </div>
            <p className="text-sm font-bold text-gray-900">{formatCurrency(expenseData.variable)}</p>
          </div>
        </div>
        {/* Advice */}
        <div className={`p-3 ${tooManyFixed ? 'bg-orange-50 border border-orange-200' : 'bg-yellow-50 border border-yellow-200'} rounded-lg flex gap-3 mt-auto`}>
          <AlertCircle size={18} className={`${tooManyFixed ? 'text-orange-600' : 'text-yellow-600'} flex-shrink-0 mt-0.5`} />
          <p className={`text-xs ${tooManyFixed ? 'text-orange-800' : 'text-yellow-800'}`}>
            {getSmartAdvice(expenseData.fixedPercent, expenseData.variablePercent, margin)}
          </p>
        </div>
      </div>
      <div className="absolute -right-3 -bottom-3 w-16 h-16 md:w-24 md:h-24 md:-right-6 md:-bottom-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 opacity-5 group-hover:opacity-10 transition-opacity" />
    </div>
  );
}