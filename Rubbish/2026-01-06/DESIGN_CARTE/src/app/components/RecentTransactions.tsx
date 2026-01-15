import { ShoppingBag, Calendar } from 'lucide-react';

export function RecentTransactions() {
  const transactions = [
    {
      id: 1,
      title: 'Courses',
      category: 'Nourritures',
      date: '02 janv. 2027',
      amount: '80,00 €',
      icon: ShoppingBag,
      color: 'bg-orange-100 text-orange-600',
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-gray-900">Transactions récentes</h3>
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          Voir tout
        </button>
      </div>

      <div className="space-y-4">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg ${transaction.color} flex items-center justify-center`}>
                <transaction.icon size={20} />
              </div>
              <div>
                <p className="font-medium text-gray-900">{transaction.title}</p>
                <p className="text-xs text-gray-500">{transaction.category}</p>
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                  <Calendar size={12} />
                  <span>{transaction.date}</span>
                </div>
              </div>
            </div>
            <p className="font-semibold text-red-600">{transaction.amount}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
