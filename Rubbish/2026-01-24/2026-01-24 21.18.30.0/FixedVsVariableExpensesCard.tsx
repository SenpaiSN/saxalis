import React, { useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import formatCurrency from '../../lib/formatCurrency';

// ============================================
// TYPES
// ============================================

interface Transaction {
  id: string;
  id_type: number;
  categorie: string;
  montant: number;
  date: string;
  is_fixed?: number;
}

interface FixedVsVariableExpensesCardProps {
  transactions?: Transaction[];
  locale?: string;
  annee?: string;
  mois?: string;
}

// ============================================
// CONSTANTES
// ============================================

const EXPENSE_TYPE_ID = 1; // À adapter selon la valeur réelle de la base pour les dépenses

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function FixedVsVariableExpensesCard({ 
  transactions = [],
  locale = 'fr-FR',
  annee,
  mois
}: FixedVsVariableExpensesCardProps) {
  const expenseData = useMemo(() => {
    const now = new Date();
    const refYear = (annee && annee !== 'Tous') ? Number(annee) : now.getFullYear();
    const refMonth = (mois && mois !== 'Tous') ? Number(mois) : now.getMonth() + 1;
    const displayStartDate = new Date(refYear, refMonth - 1, 1);
    const displayEndDate = new Date(refYear, refMonth, 0);

    // Filtrer les transactions du mois sélectionné
    const expensesForDisplay = transactions.filter(t => {
      if (t.id_type !== EXPENSE_TYPE_ID) return false;
      const txDate = new Date(t.date);
      return txDate >= displayStartDate && txDate <= displayEndDate;
    });

    // Calculer les totaux en se basant uniquement sur is_fixed
    let totalFixed = 0;
    let totalVariable = 0;
    expensesForDisplay.forEach(tx => {
      const amount = Math.abs(tx.montant);
      const isFixed = tx.is_fixed === 1;
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
      fixedPercent: totalExpenses > 0 ? (totalFixed / totalExpenses) * 100 : 0,
      variablePercent: totalExpenses > 0 ? (totalVariable / totalExpenses) * 100 : 0,
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

  return (
    <div 
      tabIndex={0}
      role="region"
      aria-label={`Dépenses fixes: ${Math.round(expenseData.fixedPercent)}%, variables: ${Math.round(expenseData.variablePercent)}%`}
      className="group relative bg-white rounded-2xl md:rounded-3xl shadow-lg border border-gray-200 p-5 md:p-6 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 focus-within:ring-2 focus-within:ring-blue-500 flex flex-col lg:min-h-80"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300" />
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base md:text-lg font-bold text-gray-900">
            Dépenses fixes vs variables
          </h3>
          {isIdealRatio && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
              ✓ Équilibré
            </span>
          )}
        </div>
        {/* Horizontal Bar Chart */}
        <div className="mb-6">
          <div className="flex h-12 rounded-full overflow-hidden shadow-md mb-4">
            {/* Fixed expenses bar */}
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm transition-all duration-500"
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
              className="bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm transition-all duration-500"
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
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg transition-colors hover:bg-blue-100">
            <div className="w-4 h-4 rounded bg-blue-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Fixes</p>
              <p className="text-xs text-gray-600">Loyer, abonnements, etc.</p>
            </div>
            <p className="text-sm font-bold text-gray-900">{formatCurrency(expenseData.fixed)}</p>
          </div>
          <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg transition-colors hover:bg-purple-100">
            <div className="w-4 h-4 rounded bg-purple-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Variables</p>
              <p className="text-xs text-gray-600">Courses, loisirs, etc.</p>
            </div>
            <p className="text-sm font-bold text-gray-900">{formatCurrency(expenseData.variable)}</p>
          </div>
        </div>
        {/* Advice */}
        {tooManyFixed ? (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg flex gap-3 mt-auto">
            <AlertCircle size={18} className="text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-orange-800">
              <p className="font-semibold mb-1">⚠️ Beaucoup de dépenses fixes</p>
              <p>
                Vos charges fixes représentent {Math.round(expenseData.fixedPercent)}% de vos dépenses.
                Marge de manœuvre réduite : {formatCurrency(margin)}.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3 mt-auto">
            <AlertCircle size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-800">
              <span className="font-semibold">💡 Idéal :</span> 50% fixes / 50% variables. 
              Vous avez une marge de manœuvre de{' '}
              <span className="font-bold">{formatCurrency(margin)}</span> sur votre budget.
            </p>
          </div>
        )}
      </div>
      <div className="absolute -right-3 -bottom-3 w-16 h-16 md:w-24 md:h-24 md:-right-6 md:-bottom-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 opacity-5 group-hover:opacity-10 transition-opacity" />
    </div>
  );
}