import { 
  LayoutDashboard, 
  Plus, 
  ArrowLeftRight, 
  BarChart3, 
  Target, 
  Settings,
  User
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen }: SidebarProps) {
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: true },
    { icon: Plus, label: 'Ajouter', active: false },
    { icon: ArrowLeftRight, label: 'Transactions', active: false },
    { icon: BarChart3, label: 'Statistiques', active: false },
    { icon: Target, label: 'Objectifs', active: false },
    { icon: Settings, label: 'Paramètres', active: false },
  ];

  if (!isOpen) return null;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col z-10">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold">S</span>
          </div>
          <div>
            <h1 className="font-bold text-gray-900">SaXalis</h1>
            <p className="text-xs text-gray-500">Gérez vos finances</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        {menuItems.map((item) => (
          <button
            key={item.label}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all ${
              item.active
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <User size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">Omar Ndonque</p>
            <p className="text-xs text-gray-500">omarndonque@gmail.com</p>
          </div>
        </div>
        <button className="text-sm text-blue-600 hover:text-blue-700 mt-2">
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
