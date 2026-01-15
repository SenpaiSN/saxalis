import { Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import type { Transaction } from '../App';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

export function TransactionList({ transactions, onDelete }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Aucune transaction pour le moment</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              transaction.type === 'income'
                ? 'bg-green-100 text-green-600'
                : 'bg-red-100 text-red-600'
            }`}
          >
            {transaction.type === 'income' ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 truncate">
                {transaction.merchant}
              </h3>
              <span
                className={`font-bold text-lg ${
                  transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toFixed(2)} €
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span>{new Date(transaction.date).toLocaleDateString('fr-FR')}</span>
              <span className="text-gray-400">•</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                {transaction.category}
              </span>
              {transaction.description && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="truncate">{transaction.description}</span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={() => onDelete(transaction.id)}
            className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            aria-label="Supprimer"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      ))}
    </div>
  );
}
