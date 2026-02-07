import React, { useMemo } from 'react';
import { AlertCircle, TrendingDown } from 'lucide-react';
import formatCurrency from '../../lib/formatCurrency';

// ============================================
// TYPES
// ============================================

interface Transaction {
  id: string;
  type: 'dépense' | 'revenu' | 'epargne';
  categorie: string;
  montant: number;
  date: string;
}

interface FixedVsVariableExpensesCardProps {
  transactions?: Transaction[];
  locale?: string;
  annee?: string;
  mois?: string;
  fixedThreshold?: number; // Seuil pour déterminer si une dépense est fixe (défaut: 0.15)
}

// ============================================
// CONSTANTES
// ============================================

const DEFAULT_FIXED_THRESHOLD = 0.15; // 15% de variation = fixe
const MIN_MONTHS_FOR_CLASSIFICATION = 2; // Minimum de mois pour classifier
const CLASSIFICATION_WINDOW_MONTHS = 3; // Fenêtre d'analyse pour la classification

// Liste des sous-catégories toujours fixes
const ALWAYS_FIXED_SUBCATEGORIES = [
  'Loyer',
  'Transport',
  'Électricité',
  'Box Internet',
  'Dépenses Sénégal',
  'Forfait mobile',
  'Frais bancaire',
  'Scolarité Mamadou',
  'Scolarité Mère Wane',
  'Dépense Adama'
];

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function FixedVsVariableExpensesCard({ 
  transactions = [],
  locale = 'fr-FR',
  annee,
  mois,
  fixedThreshold = DEFAULT_FIXED_THRESHOLD
}: FixedVsVariableExpensesCardProps) {
  
  // ============================================
  // LOGIQUE DE CLASSIFICATION (MEMOIZED)
  // ============================================
  
  const expenseData = useMemo(() => {
    const now = new Date();
    
    // Determine the reference year and month
    const refYear = (annee && annee !== 'Tous') ? Number(annee) : now.getFullYear();
    const refMonth = (mois && mois !== 'Tous') ? Number(mois) : now.getMonth() + 1;
    
    // CLASSIFICATION: Analyze past months to determine if a category is fixed or variable
    const classificationStartDate = new Date(refYear, refMonth - CLASSIFICATION_WINDOW_MONTHS, 1);
    const classificationEndDate = new Date(refYear, refMonth, 0);
    
    // DISPLAY: Only show amounts for the selected month
    const displayStartDate = new Date(refYear, refMonth - 1, 1);
    const displayEndDate = new Date(refYear, refMonth, 0);
    
    // Get expenses for CLASSIFICATION
    const expensesForClassification = transactions.filter(t => {
      if (t.type !== 'dépense') return false;
      const txDate = new Date(t.date);
      return txDate >= classificationStartDate && txDate <= classificationEndDate;
    });

    // Group by category and month for classification analysis
    const categoryMonthMap = new Map<string, Map<number, number[]>>();
    
    expensesForClassification.forEach(tx => {
      const category = tx.categorie;
      const txDate = new Date(tx.date);
      const monthKey = txDate.getFullYear() * 100 + (txDate.getMonth() + 1);
      const amount = Math.abs(tx.montant);
      
      if (!categoryMonthMap.has(category)) {
        categoryMonthMap.set(category, new Map());
      }
      const monthMap = categoryMonthMap.get(category)!;
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, []);
      }
      monthMap.get(monthKey)!.push(amount);
    });

    // Determine if a category is "fixed" (constant amount month-to-month)
    const isFixedExpense = (categoryData: Map<number, number[]>): boolean => {
      const monthAmounts: number[] = [];
      
      categoryData.forEach(amounts => {
        // Sum all expenses for that month
        monthAmounts.push(amounts.reduce((a, b) => a + b, 0));
      });
      
      // Need minimum data to classify
      if (monthAmounts.length < MIN_MONTHS_FOR_CLASSIFICATION) return false;
      
      // Calculate coefficient of variation
      const avg = monthAmounts.reduce((a, b) => a + b, 0) / monthAmounts.length;
      if (avg === 0) return false;
      
      const variance = monthAmounts.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / monthAmounts.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = stdDev / avg;
      
      // If variation is low, consider it fixed
      return coefficientOfVariation < fixedThreshold;
    };

    // Build classification map: category -> isFixed
    const categoryClassification = new Map<string, boolean>();
    categoryMonthMap.forEach((monthData, category) => {
      // Si la catégorie est dans la liste des sous-catégories fixes, on force à true
      if (ALWAYS_FIXED_SUBCATEGORIES.includes(category)) {
        categoryClassification.set(category, true);
      } else {
        categoryClassification.set(category, isFixedExpense(monthData));
      }
    });

    // Get expenses for DISPLAY (only selected month)
    const expensesForDisplay = transactions.filter(t => {
      if (t.type !== 'dépense') return false;
      const txDate = new Date(t.date);
      return txDate >= displayStartDate && txDate <= displayEndDate;
    });

    // Calculate totals using classification and display period
    let totalFixed = 0;
    let totalVariable = 0;

    expensesForDisplay.forEach(tx => {
      const amount = Math.abs(tx.montant);
      const isFixed = categoryClassification.get(tx.categorie) ?? false;
      
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
  }, [transactions, annee, mois, fixedThreshold]);

  // ============================================
  // ÉTAT VIDE
  // ============================================

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

  // ============================================
  // CALCULS POUR L'AFFICHAGE
  // ============================================
  
  // Marge de manœuvre = montant total des dépenses variables
  const margin = expenseData.variable;
  
  // Ratio idéal 50/50
  const isIdealRatio = Math.abs(expenseData.fixedPercent - 50) < 10; // Tolérance de 10%
  
  // Warning si trop de dépenses fixes (>70%)
  const tooManyFixed = expenseData.fixedPercent > 70;

  // ============================================
  // RENDER
  // ============================================

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