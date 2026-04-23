import React from 'react';
import { LayoutDashboard, Users, ShoppingBag, Package, Menu } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

export const BottomNav = ({ activeTab, setActiveTab, setIsSidebarOpen }: BottomNavProps) => {
  const items = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'vendas', label: 'Vendas', icon: ShoppingBag },
    { id: 'produtos', label: 'Produtos', icon: Package },
    { id: 'clientes', label: 'Clientes', icon: Users },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 py-1.5 z-50 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              isActive ? 'text-slate-950 font-bold' : 'text-slate-400 font-medium'
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-all ${isActive ? 'bg-slate-100' : ''}`}>
              <Icon className={`w-5 h-5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
            </div>
            <span className="text-[9px] uppercase tracking-wider">{item.label}</span>
          </button>
        );
      })}
      
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="flex flex-col items-center gap-1 p-2 rounded-xl text-slate-400 font-medium"
      >
        <div className="p-1.5">
          <Menu className="w-5 h-5" />
        </div>
        <span className="text-[9px] uppercase tracking-wider">Mais</span>
      </button>
    </div>
  );
};
