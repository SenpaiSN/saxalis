import { Calendar, ShoppingBag, Smartphone } from 'lucide-react';

export function UpcomingTransactions() {
  const transactions = [
    {
      id: 1,
      title: 'Charge fixe',
      date: '01 janv. 2026',
      amount: '26,80 €',
      icon: ShoppingBag,
      color: 'bg-red-100 text-red-600',
    },
    {
      id: 2,
      title: 'Charge fixe',
      date: '01 janv. 2026',
      amount: '19,99 €',
      icon: Smartphone,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      id: 3,
      title: 'Nourritures',
      date: '01 janv. 2026',
      amount: '76,00 €',
      icon: ShoppingBag,
      color: 'bg-purple-100 text-purple-600',
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-gray-900">Transactions à venir (3 mois)</h3>
        <span className="text-sm text-gray-500">33 prévus</span>
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
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <Calendar size={12} />
                  <span>{transaction.date}</span>
                </div>
              </div>
            </div>
            <p className="font-semibold text-gray-900">{transaction.amount}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
