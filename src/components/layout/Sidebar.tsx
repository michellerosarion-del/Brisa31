import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Settings, 
  LogOut, 
  ChevronRight,
  History,
  Globe,
  Wallet,
  Tag,
  BarChart3,
  UserCog,
  Menu,
  ChevronLeft,
  Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  handleLogout: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  storeSettings: any;
}

export const Sidebar = ({ activeTab, setActiveTab, user, handleLogout, isSidebarOpen, setIsSidebarOpen, storeSettings }: SidebarProps) => {
  const menuSections = [
    {
      title: 'GERAL',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'clientes', label: 'Clientes', icon: Users },
      ]
    },
    {
      title: 'OPERAÇÃO',
      items: [
        { id: 'vendas', label: 'Vendas', icon: ShoppingBag },
        { id: 'compras', label: 'Compras', icon: Truck },
        { id: 'produtos', label: 'Produtos', icon: Package },
        { id: 'catalogo', label: 'Link da Loja', icon: Globe },
        { id: 'estoque-historico', label: 'Histórico', icon: History, adminOnly: true },
      ]
    },
    {
      title: 'FINANCEIRO',
      items: [
        { id: 'financeiro', label: 'Financeiro', icon: DollarSign, adminOnly: true },
        { id: 'precificacao', label: 'Precificação', icon: Tag, adminOnly: true },
      ]
    },
    {
      title: 'RELATÓRIOS',
      items: [
        { id: 'relatorios', label: 'Relatórios', icon: BarChart3, adminOnly: true },
      ]
    },
    {
      title: 'SISTEMA',
      items: [
        { id: 'vendedores', label: 'Usuários', icon: UserCog, adminOnly: true },
        { id: 'configuracoes', label: 'Configurações', icon: Settings, adminOnly: true },
      ]
    },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`fixed top-0 left-0 h-full bg-slate-950 text-slate-400 z-50 transition-all duration-200 ease-in-out flex flex-col shadow-2xl overflow-visible ${isSidebarOpen ? 'w-72 translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-[72px]'}`}>
        {/* Toggle Button for Desktop */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="hidden lg:flex absolute -right-3 top-24 w-6 h-6 bg-slate-900 border border-white/10 rounded-full items-center justify-center text-white shadow-xl hover:bg-slate-800 transition-colors z-[60]"
        >
          {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <div className="p-4 flex items-center justify-between h-20 shrink-0 border-b border-white/5 overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-lg overflow-hidden border border-white/10">
              <img 
                src={storeSettings?.logo_url || "/logo.png"} 
                alt="Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.src = 'https://picsum.photos/seed/brisa/100/100'; }}
              />
            </div>
            
            <AnimatePresence mode="wait">
              {isSidebarOpen && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  <span className="font-serif font-black text-lg tracking-tight block leading-tight text-white">
                    {storeSettings?.nome_loja || 'Brisa 31'}
                  </span>
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Moda Masculina</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Mobile Collapse Button */}
          {isSidebarOpen && (
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 text-slate-400 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto no-scrollbar overflow-x-visible">
          {menuSections.map((section) => {
            const visibleItems = section.items.filter(item => !item.adminOnly || user?.role === 'admin');
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                <AnimatePresence>
                  {isSidebarOpen && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="px-4 mb-2 overflow-hidden"
                    >
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{section.title}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <div key={item.id} className="relative group/item">
                        <button
                          onClick={() => {
                            setActiveTab(item.id);
                            if (window.innerWidth < 1024) setIsSidebarOpen(false);
                          }}
                          className={`w-full flex items-center px-4 py-2.5 rounded-lg transition-all duration-200 relative ${
                            isActive 
                              ? 'bg-white text-slate-900 shadow-sm' 
                              : 'hover:bg-white/10 text-slate-400'
                          } ${isSidebarOpen ? 'gap-3' : 'justify-center px-0 h-10 w-10 mx-auto'}`}
                        >
                          <div className="w-5 h-5 flex items-center justify-center shrink-0">
                            <Icon className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'scale-110 text-slate-900' : 'text-slate-400 group-hover/item:text-white group-hover/item:scale-110'}`} />
                          </div>
                          
                          <AnimatePresence mode="wait">
                            {isSidebarOpen && (
                              <motion.span 
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.2 }}
                                className="text-[13px] tracking-wide whitespace-nowrap overflow-hidden font-medium"
                              >
                                {item.label}
                              </motion.span>
                            )}
                          </AnimatePresence>
                          
                          {isActive && isSidebarOpen && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="ml-auto opacity-50"
                            >
                              <ChevronRight className="w-3 h-3 text-slate-900" />
                            </motion.div>
                          )}
                        </button>

                        {/* Tooltip */}
                        {!isSidebarOpen && (
                          <div className="fixed left-[84px] px-3 py-1.5 bg-slate-900 text-white text-[11px] font-bold rounded-lg opacity-0 invisible group-hover/item:opacity-100 group-hover/item:visible pointer-events-none whitespace-nowrap shadow-2xl transition-all duration-200 translate-x-[-10px] group-hover/item:translate-x-0 z-[100] border border-white/10 after:content-[''] after:absolute after:right-full after:top-1/2 after:-translate-y-1/2 after:border-8 after:border-y-transparent after:border-l-transparent after:border-r-slate-900">
                            {item.label}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/5 shrink-0 overflow-visible">
          <div className="relative group/logout">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center px-4 rounded-lg text-red-400 hover:bg-red-500/10 transition-all duration-300 ${isSidebarOpen ? 'h-11 gap-3' : 'h-10 w-10 mx-auto justify-center px-0'}`}
            >
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <LogOut className="w-4 h-4 group-hover/logout:rotate-12 transition-transform" />
              </div>
              <AnimatePresence mode="wait">
                {isSidebarOpen && (
                  <motion.span 
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="font-bold text-[13px] tracking-wide whitespace-nowrap overflow-hidden"
                  >
                    Sair do Sistema
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Logout Tooltip */}
            {!isSidebarOpen && (
              <div className="fixed left-[84px] px-3 py-1.5 bg-rose-600 text-white text-[11px] font-bold rounded-lg opacity-0 invisible group-hover/logout:opacity-100 group-hover/logout:visible pointer-events-none whitespace-nowrap shadow-2xl transition-all duration-200 translate-x-[-10px] group-hover/logout:translate-x-0 z-[100] after:content-[''] after:absolute after:right-full after:top-1/2 after:-translate-y-1/2 after:border-8 after:border-y-transparent after:border-l-transparent after:border-r-rose-600">
                Sair do Sistema
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
