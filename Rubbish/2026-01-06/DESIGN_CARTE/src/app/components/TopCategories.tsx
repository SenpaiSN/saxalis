export function TopCategories() {
  const categories = [
    { name: 'Charge fixe', amount: '24 735,40 €', percentage: 85, color: 'bg-blue-500' },
    { name: 'Famille SN', amount: '22 733,58 €', percentage: 78, color: 'bg-purple-500' },
    { name: 'Ma femme', amount: '16 712,00 €', percentage: 57, color: 'bg-pink-500' },
    { name: 'Imprevue', amount: '6 653,95 €', percentage: 23, color: 'bg-yellow-500' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-6">Top Catégories</h3>

      <div className="space-y-5">
        {categories.map((category) => (
          <div key={category.name}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-700">{category.name}</span>
              <span className="font-semibold text-gray-900">{category.amount}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${category.color} rounded-full transition-all duration-500`}
                style={{ width: `${category.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
