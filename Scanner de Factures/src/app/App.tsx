import { useState } from 'react';
import { TransactionList } from './components/TransactionList';
import { AddTransactionForm } from './components/AddTransactionForm';
import { ReceiptScanner } from './components/ReceiptScanner';
import { Receipt, Wallet, ScanLine } from 'lucide-react';

export interface Transaction {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  category: string;
  type: 'expense' | 'income';
  description?: string;
  receiptImage?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'scan'>('list');
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: '1',
      date: '2026-01-08',
      merchant: 'Supermarché Casino',
      amount: 45.50,
      category: 'Alimentation',
      type: 'expense',
      description: 'Courses hebdomadaires',
    },
    {
      id: '2',
      date: '2026-01-07',
      merchant: 'Salaire Entreprise XYZ',
      amount: 2500.00,
      category: 'Salaire',
      type: 'income',
      description: 'Salaire mensuel',
    },
    {
      id: '3',
      date: '2026-01-06',
      merchant: 'Station Service Total',
      amount: 60.00,
      category: 'Transport',
      type: 'expense',
      description: 'Essence',
    },
  ]);

  const handleAddTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
    };
    setTransactions([newTransaction, ...transactions]);
    setActiveTab('list');
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpenses;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Wallet className="w-8 h-8 text-blue-600" />
            Gestionnaire de Finances
          </h1>
          
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600 font-medium">Revenus</p>
              <p className="text-2xl font-bold text-green-700">
                {totalIncome.toFixed(2)} €
              </p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm text-red-600 font-medium">Dépenses</p>
              <p className="text-2xl font-bold text-red-700">
                {totalExpenses.toFixed(2)} €
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600 font-medium">Solde</p>
              <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                {balance.toFixed(2)} €
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('list')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'list'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Receipt className="w-5 h-5" />
                Transactions
              </button>
              <button
                onClick={() => setActiveTab('add')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'add'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Wallet className="w-5 h-5" />
                Ajouter
              </button>
              <button
                onClick={() => setActiveTab('scan')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'scan'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <ScanLine className="w-5 h-5" />
                Scanner Facture
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'list' && (
              <TransactionList
                transactions={transactions}
                onDelete={handleDeleteTransaction}
              />
            )}
            {activeTab === 'add' && (
              <AddTransactionForm onSubmit={handleAddTransaction} />
            )}
            {activeTab === 'scan' && (
              <ReceiptScanner onSubmit={handleAddTransaction} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
