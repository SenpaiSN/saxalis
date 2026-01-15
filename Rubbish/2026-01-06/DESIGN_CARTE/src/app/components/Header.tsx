import { Calendar } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Bonjour Omar <span className="inline-block animate-wave">👋</span>
          </h2>
          <p className="text-gray-500 mt-1">Voici un aperçu de vos finances</p>
        </div>
        
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar size={18} />
          <span>30 Décembre 2025</span>
        </div>
      </div>
    </header>
  );
}
