export function BudgetBalance() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-6">Rester à équilibrer</h3>

      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100">
          <p className="text-sm text-gray-600 mb-2">Affecter uniquement budgets</p>
          <p className="text-3xl font-bold text-gray-900">0</p>
        </div>

        <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
          <p className="text-sm text-gray-600 mb-2">Aucune donnée</p>
        </div>

        <div className="p-4 rounded-xl bg-gray-50">
          <p className="text-sm text-gray-600">Total de la moyenne des 3 derniers mois</p>
          <p className="text-xs text-gray-500 mt-1">Aucune donnée disponible</p>
        </div>
      </div>
    </div>
  );
}
