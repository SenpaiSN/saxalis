import { Search, Filter, ChevronDown } from 'lucide-react';

export function Filters() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter size={18} className="text-gray-600" />
        <h3 className="font-semibold text-gray-900">Filtres</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {/* Recherche */}
        <div className="md:col-span-2">
          <label className="text-xs text-gray-500 mb-1 block">Recherche</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une transaction..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Année */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Année</label>
          <div className="relative">
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Année</option>
              <option>2025</option>
              <option>2024</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Mois */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Mois</label>
          <div className="relative">
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Tous</option>
              <option>Janvier</option>
              <option>Février</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Type */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Type</label>
          <div className="relative">
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Tous</option>
              <option>Revenus</option>
              <option>Dépenses</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Catégorie */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Catégorie</label>
          <div className="relative">
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Toutes les catégories</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Sous-catégorie */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Sous-catégorie</label>
          <div className="relative">
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Toutes les sous-catégories</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <button className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium">
        Réinitialiser
      </button>
    </div>
  );
}
