import React, { useState } from 'react';
import { Menu, Plus, User as UserIcon, Bell, ChevronDown, Settings, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  setIsSidebarOpen: (isOpen: boolean) => void;
  activeTab: string;
  user: any;
  setActiveTab: (tab: string) => void;
  setIsQuickSaleModalOpen: (isOpen: boolean) => void;
  notificationsCount: number;
  storeSettings: any;
  handleLogout: () => void;
}

export const Header = ({ 
  setIsSidebarOpen, 
  activeTab, 
  user, 
  setActiveTab, 
  setIsQuickSaleModalOpen,
  notificationsCount,
  storeSettings,
  handleLogout
}: HeaderProps) => {
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const getTitle = () => {
    switch(activeTab) {
      case 'dashboard': return 'Visão Geral';
      case 'vendas': return 'Gestão de Vendas';
      case 'produtos': return 'Catálogo de Produtos';
      case 'clientes': return 'Base de Clientes';
      case 'financeiro': return 'Controle Financeiro';
      case 'relatorios': return 'Análise de Dados';
      case 'configuracoes': return 'Configurações';
      case 'perfil': return 'Meu Perfil';
      case 'estoque-historico': return 'Histórico de Estoque';
      case 'vendedores': return 'Equipe de Vendas';
      case 'fluxo-caixa': return 'Fluxo de Caixa';
      case 'precificacao': return 'Precificação';
      case 'catalogo': return 'Catálogo Público';
      default: return 'Sistema ERP';
    }
  };

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 hover:bg-gray-50 rounded-xl transition-all lg:hidden active:scale-90"
        >
          <Menu className="w-5 h-5 text-midnight" />
        </button>
        
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-3 pr-4 border-r border-gray-100">
            <div className="w-8 h-8 bg-midnight rounded-lg flex items-center justify-center overflow-hidden shadow-lg shadow-midnight/10">
              <img 
                src={storeSettings?.logo_url || "/logo.png"} 
                alt="Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.src = 'https://picsum.photos/seed/brisa/100/100'; }}
              />
            </div>
            <div>
              <h1 className="text-xs font-black text-slate-900 leading-tight">
                {storeSettings?.nome_loja || 'Brisa 31'}
              </h1>
              <p className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em] opacity-100">Moda Masculina</p>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-serif font-black text-gray-900 tracking-tight">{getTitle()}</h2>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <button 
          onClick={() => setActiveTab('nova-venda')}
          className="hidden md:flex items-center gap-2 bg-midnight text-champagne px-4 py-2 rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-midnight/10 active:scale-95 group"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" /> Nova Venda
        </button>
        
        <button 
          onClick={() => setActiveTab('nova-venda')}
          className="md:hidden p-2 bg-midnight text-champagne rounded-xl shadow-lg active:scale-90"
        >
          <Plus className="w-5 h-5" />
        </button>
        
        <div className="h-8 w-[1px] bg-gray-100 mx-1 hidden sm:block" />

        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <button className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-slate-900 relative">
              <Bell className="w-5 h-5" />
              {notificationsCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-600 border-2 border-white rounded-full" />
              )}
            </button>
          </div>

          <div className="relative">
            <button 
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className="flex items-center gap-2 p-1 pr-2 hover:bg-gray-50 rounded-xl transition-all group"
            >
              <div className="w-8 h-8 bg-midnight rounded-lg flex items-center justify-center text-champagne font-black text-sm shadow-lg group-hover:scale-105 transition-transform">
                {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-black text-slate-900 leading-none">{user?.name?.split(' ')[0] || user?.email?.split('@')[0]}</p>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1 opacity-100">{user?.role === 'admin' ? 'Administrador' : 'Vendedor'}</p>
              </div>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-300 ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isUserDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsUserDropdownOpen(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 p-2"
                  >
                    <button
                      onClick={() => {
                        setActiveTab('perfil');
                        setIsUserDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 p-3 text-sm font-bold text-gray-600 hover:text-midnight hover:bg-gray-50 rounded-xl transition-all"
                    >
                      <UserIcon className="w-4 h-4" /> Meu Perfil
                    </button>
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => {
                          setActiveTab('configuracoes');
                          setIsUserDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 p-3 text-sm font-bold text-gray-600 hover:text-midnight hover:bg-gray-50 rounded-xl transition-all"
                      >
                        <Settings className="w-4 h-4" /> Configurações
                      </button>
                    )}
                    <div className="h-[1px] bg-gray-100 my-1 mx-2" />
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsUserDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 p-3 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <LogOut className="w-4 h-4" /> Sair
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};
