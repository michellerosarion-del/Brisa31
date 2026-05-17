import React, { useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { 
  db, 
  handleFirestoreError,
  OperationType,
} from './firebase';
import { 
  doc, 
  updateDoc, 
  deleteDoc, 
} from 'firebase/firestore';
import { 
  Search, 
  ShoppingBag, 
  Plus, 
  User as UserIcon, 
  LogOut, 
  LayoutDashboard, 
  Package, 
  Users, 
  TrendingUp, 
  DollarSign, 
  BarChart3, 
  Settings, 
  Menu, 
  X, 
  Bell, 
  ChevronRight,
  Filter,
  Calendar,
  Download,
  Clock,
  Trash2,
  Edit2,
  MoreVertical,
  PlusCircle,
  History,
  Minus,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Mail,
  Lock,
  CheckSquare,
  Square,
  Tag,
  Briefcase,
  PieChart,
  Megaphone,
  ArrowLeft,
  Truck,
  CreditCard,
  Wallet,
  MapPin,
  CircleAlert,
  Save,
  Moon,
  Sun,
  Layout,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toNum, formatCurrency, getLocalDate, isSaleCompleted } from './lib/utils';

// Types
import { 
  Product, 
  Sale, 
  Purchase,
  Customer, 
  Expense, 
  Seller, 
  Ad, 
  StockMovement, 
  StoreSettings as StoreSettingsType,
  Variation
} from './types';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// UI Components
import { Card } from './components/ui/Card';
import { Modal } from './components/ui/Modal';
import { ConfirmModal } from './components/ui/ConfirmModal';

// Layout Components
import { Sidebar } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { Header } from './components/layout/Header';

// Module Components
import { Dashboard } from './modules/Dashboard/Dashboard';
import { SalesList } from './modules/Sales/SalesList';
import { ProductsList } from './modules/Products/ProductsList';
import { CustomersList } from './modules/Customers/CustomersList';
import { Pricing } from './modules/Finance/Pricing';
import { CashControl } from './modules/Finance/CashControl';
import { ProfitReport } from './modules/Reports/ProfitReport';
import { SellersList } from './modules/Sellers/SellersList';
import { CatalogTab } from './modules/Catalog/CatalogTab';
import { UserProfile } from './modules/Settings/UserProfile';
import { StoreSettings } from './modules/Settings/StoreSettings';
import { StockHistoryContent } from './modules/Products/StockHistory';
import { Purchases } from './modules/Purchases/Purchases';
import { StoreXRay } from './modules/Reports/StoreXRay';
import { InventoryPerformance } from './modules/Reports/InventoryPerformance';
import { CatalogPage } from './pages/Catalog';
import { QuickSaleModal } from './modules/Sales/QuickSaleModal';

// Form Components
import { ProductForm } from './components/forms/ProductForm';
import { CustomerForm } from './components/forms/CustomerForm';
import { TransactionForm } from './components/forms/TransactionForm';
import { SellerForm } from './components/forms/SellerForm';
import { AdForm } from './components/forms/AdForm';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useUI } from './hooks/useUI';
import { useProducts } from './hooks/useProducts';
import { useSales } from './hooks/useSales';
import { useFinance } from './hooks/useFinance';
import { useCustomers } from './hooks/useCustomers';
import { usePurchases } from './hooks/usePurchases';
import { useUsers } from './hooks/useUsers';
import { useStoreSettings } from './hooks/useStoreSettings';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

const App = () => {
  // --- UI State & Logic ---
  const ui = useUI();
  const { 
    activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen, 
    notifications, showNotification, confirmConfig, setConfirmConfig, showConfirm,
    isModalOpen, setIsModalOpen, modalType, setModalType,
    editingItem, setEditingItem, isQuickSaleModalOpen, setIsQuickSaleModalOpen,
    quickSaleTab, setQuickSaleTab
  } = ui;

  const [currentPath, setCurrentPath] = useState(window.location.pathname + window.location.hash + window.location.search);
  
  // Hooks de Dados
  const { user, authLoading, login, logout, resetPassword, changePassword } = useAuth();
  const { storeSettings } = useStoreSettings(!!user);
  const isAdmin = user?.role === 'admin';

  const { 
    products, stockMovements, categories, loadMoreProducts, loadMoreStock,
    saveProduct, uploadImages, adjustStock, toggleFeatured 
  } = useProducts(!!user);

  const { 
    sales, loadMoreSales, completeSale, deleteSale, cancelSale, cancelItem 
  } = useSales(!!user);

  const { 
    expenses, ads, loadMoreExpenses, loadMoreAds, saveTransaction, saveAd 
  } = useFinance(isAdmin);

  const { customers, loadMoreCustomers, saveCustomer } = useCustomers(!!user);
  const { purchases } = usePurchases(isAdmin);
  const { users, saveUser } = useUsers(isAdmin);

  // Handle simple routing
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname + window.location.hash + window.location.search);
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const isCatalogRoute = useMemo(() => {
    const p = currentPath.toLowerCase();
    return p.includes('/catalogo') || p.includes('#catalog') || p.includes('view=catalog');
  }, [currentPath]);

  // Local UI State (Filters, Cart, etc)
  const [salesSearchTerm, setSalesSearchTerm] = useState('');
  const [salesDateFilter, setSalesDateFilter] = useState('');
  const [salesStartDate, setSalesStartDate] = useState('');
  const [salesEndDate, setSalesEndDate] = useState('');
  const [globalMonthFilter, setGlobalMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [salesPaymentFilter, setSalesPaymentFilter] = useState('');
  const [salesSellerFilter, setSalesSellerFilter] = useState('');
  const [salesStatusFilter, setSalesStatusFilter] = useState('');

  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [saleDiscount, setSaleDiscount] = useState<string>('0');
  const [saleDiscountType, setSaleDiscountType] = useState<'value' | 'percentage'>('value');
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  
  const [tempVariations, setTempVariations] = useState<Variation[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // --- Handlers ---
  const handleEdit = (type: string, item: any) => {
    if (!isAdmin && ['vendedores', 'configuracoes', 'financeiro', 'relatorios'].includes(type)) {
      showNotification('Acesso restrito ao administrador', 'error');
      return;
    }
    
    if (type === 'vendas') {
      setEditingSale(item);
      setCart(item.items || []);
      setSaleDiscount(String(item.discount || 0));
      setSaleDiscountType(item.discount_type || 'value');
      setIsQuickSaleModalOpen(true);
      return;
    }
    setModalType(type);
    setEditingItem(item);
    if (type === 'produtos') {
      setTempVariations(item?.variations || []);
      setExistingImages(item?.images || []);
      setSelectedFiles([]);
    }
    setIsModalOpen(true);
  };

  const onAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    const data = Object.fromEntries(new FormData(e.target as HTMLFormElement));
    try {
      const uploadedUrls = await uploadImages(selectedFiles);
      await saveProduct(data, editingItem, user, tempVariations, existingImages, uploadedUrls);
      showNotification(editingItem ? 'Produto atualizado!' : 'Produto cadastrado!');
      setIsModalOpen(false);
      setSelectedFiles([]);
    } catch (err: any) {
      showNotification(err.message || 'Erro ao salvar produto', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const onCompleteSale = async (
    paymentMethod: string, 
    sellerName: string, 
    finalValue: number, 
    customerId?: string, 
    customerName?: string,
    installments?: number,
    grossValue?: number,
    netValue?: number,
    feeValue?: number,
    feePercentage?: number,
    adjustment?: number,
    payments?: any[]
  ) => {
    try {
      await completeSale({
        paymentMethod,
        sellerName,
        finalValue,
        customerId,
        customerName,
        installments,
        grossValue,
        netValue,
        feeValue,
        feePercentage,
        adjustment,
        payments,
        cart,
        editingSale,
        user,
        saleDiscount,
        saleDiscountType
      });
      showNotification(editingSale ? 'Venda atualizada!' : 'Venda realizada com sucesso!');
      setIsQuickSaleModalOpen(false);
      setCart([]);
      setEditingSale(null);
      setSaleDiscount('0');
    } catch (err: any) {
      showNotification('Erro ao processar venda', 'error');
    }
  };

  const onDeleteSale = (id: string) => {
    showConfirm('Excluir Venda', 'Tem certeza? O estoque será restaurado automaticamente.', async () => {
      try {
        await deleteSale(id, user);
        showNotification('Venda excluída e estoque restaurado!');
      } catch (err: any) {
        showNotification('Erro ao excluir venda', 'error');
      }
    }, 'danger');
  };

  const onCancelSale = (id: string) => {
    showConfirm('Cancelar Venda', 'Deseja realmente cancelar esta venda? O status mudará para cancelada e os produtos voltarão ao estoque.', async () => {
      try {
        await cancelSale(id, user);
        showNotification('Venda cancelada com sucesso!');
      } catch (err: any) {
        showNotification('Erro ao cancelar venda', 'error');
      }
    }, 'danger');
  };

  const onCancelItem = (saleId: string, itemIndex: number) => {
    showConfirm('Cancelar Item', 'Confirmar cancelamento deste item?', async () => {
      try {
        await cancelItem(saleId, itemIndex, user);
        showNotification('Item cancelado e valores atualizados!');
      } catch (err: any) {
        showNotification('Erro ao cancelar item', 'error');
      }
    });
  };

  const onAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target as HTMLFormElement));
    try {
      await saveCustomer(data, editingItem);
      showNotification(editingItem ? 'Cliente atualizado!' : 'Cliente cadastrado!');
      setIsModalOpen(false);
    } catch (err: any) {
      showNotification('Erro ao salvar cliente', 'error');
    }
  };

  const onAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target as HTMLFormElement));
    try {
      await saveTransaction(data, editingItem);
      showNotification('Lançamento salvo!');
      setIsModalOpen(false);
    } catch (err: any) {
      showNotification('Erro ao salvar lançamento', 'error');
    }
  };

  const onAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target as HTMLFormElement));
    try {
      await saveUser(data, editingItem);
      showNotification(editingItem ? 'Usuário atualizado!' : 'Usuário cadastrado!');
      setIsModalOpen(false);
    } catch (err: any) {
      showNotification('Erro ao salvar usuário: ' + err.message, 'error');
    }
  };

  const onAddAd = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target as HTMLFormElement));
    try {
      await saveAd(data, editingItem);
      showNotification(editingItem ? 'Anúncio atualizado!' : 'Anúncio cadastrado!');
      setIsModalOpen(false);
    } catch (err: any) {
      showNotification('Erro ao salvar anúncio', 'error');
    }
  };

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    const { login: email, password } = Object.fromEntries(new FormData(e.target as HTMLFormElement));
    try {
      await login(email as string, password as string);
      showNotification('Bem-vindo de volta!');
    } catch (authErr: any) {
      showNotification('E-mail ou senha incorretos', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const onForgotPassword = async () => {
    if (!loginEmail) return showNotification('Digite seu e-mail de acesso', 'error');
    setIsResettingPassword(true);
    try {
      await resetPassword(loginEmail);
      showNotification('Link de recuperação enviado!', 'success');
    } catch (err: any) {
      showNotification('Erro ao enviar e-mail', 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const onUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) return showNotification('As senhas não coincidem', 'error');
    try {
      await changePassword(newPassword);
      showNotification('Senha atualizada!');
      setIsChangePasswordModalOpen(false);
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      showNotification('Erro ao atualizar senha', 'error');
    }
  };

  const onResetUserPassword = async (email: string) => {
    showConfirm('Resetar Senha', `Deseja enviar e-mail de recuperação para ${email}?`, async () => {
      try {
        await resetPassword(email);
        showNotification('E-mail enviado!');
      } catch (err: any) {
        showNotification('Erro ao enviar e-mail', 'error');
      }
    });
  };

  const onAdjustStock = async (id: string, amount: number, type: string, variationId?: string) => {
    try {
      await adjustStock(id, amount, user, variationId);
      showNotification('Estoque atualizado!');
    } catch (err: any) {
      showNotification('Erro ao ajustar estoque', 'error');
    }
  };

  const onTogglePromote = async (id: string) => {
    try {
      const p = products.find(prod => prod.id === id);
      if (!p) return;
      await toggleFeatured(p);
      showNotification(p.is_featured ? 'Destaque removido' : 'Produto destacado!');
    } catch (err: any) {
      showNotification('Erro ao alterar destaque', 'error');
    }
  };

  const onLogout = async () => {
    try {
      await logout();
      showNotification('Sessão encerrada');
    } catch (err: any) {
      showNotification('Erro ao sair', 'error');
    }
  };

  const getCssColor = (color: string) => {
    const colors: Record<string, string> = {
      'Preto': '#000000', 'Branco': '#FFFFFF', 'Azul': '#3b82f6', 'Verde': '#22c55e', 
      'Vermelho': '#ef4444', 'Amarelo': '#eab308', 'Rosa': '#ec4899', 'Roxo': '#a855f7',
      'Cinza': '#64748b', 'Bege': '#f5f5dc', 'Marrom': '#78350f', 'Laranja': '#f97316'
    };
    return colors[color] || '#cbd5e1';
  };

  // --- Variation Handlers ---
  const addVariation = () => {
    const id = Date.now().toString();
    setTempVariations(prev => [...prev, { id, cor: '', tamanho: '', estoque: 0 }]);
  };

  const updateVariation = (id: string, field: string, value: any) => {
    setTempVariations(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const removeVariation = (id: string) => {
    setTempVariations(prev => prev.filter(v => v.id !== id));
  };

  // --- Image Handlers ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const MAX_FILE_SIZE = 2 * 1024 * 1024;
      
      const validFiles = files.filter(file => {
        if (file.size > MAX_FILE_SIZE) {
          showNotification(`Arquivo ${file.name} muito grande (máximo 2MB)`, 'error');
          return false;
        }
        return true;
      });

      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeSelectedFile = (idx: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const removeExistingImage = (url: string) => {
    setExistingImages(prev => prev.filter(u => u !== url));
  };

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => {
      const matchesSearch = (p.name || '').toLowerCase().includes(productSearchTerm.toLowerCase()) || 
                            (p.brand || '').toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                            (p.code || '').toLowerCase().includes(productSearchTerm.toLowerCase());
      const matchesCategory = !categoryFilter || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, productSearchTerm, categoryFilter]);

  // --- Render ---
  if (isCatalogRoute) {
    return <CatalogPage initialProducts={products} initialSettings={storeSettings} />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }} 
          transition={{ duration: 2, repeat: Infinity }}
          className="w-16 h-16 bg-champagne rounded-2xl shadow-2xl shadow-black/40"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F172A] to-[#1E293B] flex items-center justify-center p-4 font-sans appearance-none">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full flex flex-col items-center"
        >
          {/* Logo Section */}
          <div className="mb-6 flex justify-center w-full">
            {storeSettings.logo_url ? (
              <img 
                src={storeSettings.logo_url} 
                alt="BRISA 31" 
                className="h-[50px] md:h-[70px] object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'block';
                }}
              />
            ) : null}
            <h1 className={`${storeSettings.logo_url ? 'hidden' : 'block'} text-3xl md:text-4xl font-serif font-black text-white tracking-widest uppercase`}>
              BRISA 31
            </h1>
          </div>

          <Card className="w-[90%] md:w-full md:max-w-sm p-6 bg-white border-none shadow-md rounded-xl">
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Brisa 31</h2>
              <p className="text-xs font-medium text-slate-500 mt-1">Sistema de Gestão</p>
            </div>

            <form onSubmit={onLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">E-mail</label>
                <input 
                  name="login" 
                  type="email" 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-4 h-[44px] rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-slate-900/5 focus:border-slate-800 outline-none font-medium text-sm transition-all placeholder:text-slate-400" 
                  placeholder="Seu e-mail de acesso" 
                  required 
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Senha</label>
                </div>
                <div className="relative group">
                  <input 
                    name="password" 
                    type={showPassword ? "text" : "password"} 
                    className="w-full px-4 h-[44px] pr-12 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-slate-900/5 focus:border-slate-800 outline-none font-medium text-sm transition-all placeholder:text-slate-400" 
                    placeholder="Sua senha secreta" 
                    required 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-800 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between px-1 mb-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lembrar</span>
                </label>

                <button 
                  type="button" 
                  disabled={isResettingPassword}
                  onClick={onForgotPassword} 
                  className="text-[11px] font-bold text-slate-800 uppercase tracking-wider hover:underline disabled:opacity-50 flex items-center gap-1"
                >
                  {isResettingPassword ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                  {isResettingPassword ? 'Enviando...' : 'Esqueci a senha'}
                </button>
              </div>

              <button 
                type="submit" 
                disabled={isLoggingIn}
                className="w-full h-[48px] bg-[#1E293B] text-white rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-[#334155] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-3"
              >
                {isLoggingIn ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  'Entrar no sistema'
                )}
              </button>
            </form>
          </Card>

          <p className="mt-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Sistema interno • Brisa 31 Moda Masculina
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <div className="h-screen flex overflow-hidden bg-gray-50 font-sans text-gray-900">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          user={user} 
          handleLogout={onLogout} 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          storeSettings={storeSettings}
        />

        <main className={`flex-1 transition-all duration-200 ease-in-out h-screen overflow-y-auto flex flex-col pb-20 lg:pb-0 bg-gray-50 ${isSidebarOpen ? 'lg:pl-72' : 'lg:pl-[72px]'}`}>
          <Header 
            setIsSidebarOpen={setIsSidebarOpen} 
            activeTab={activeTab} 
            user={user} 
            setActiveTab={setActiveTab} 
            setIsQuickSaleModalOpen={setIsQuickSaleModalOpen}
            notificationsCount={notifications.length}
            storeSettings={storeSettings}
            handleLogout={onLogout}
          />

          <div className={`flex-1 pt-4 sm:pt-7 px-3 pb-3 md:px-8 md:py-6 w-full mx-auto bg-gray-50 ${(activeTab === 'relatorios' || activeTab === 'raio-x' || activeTab === 'vendas' || activeTab === 'compras' || activeTab === 'clientes' || activeTab === 'financeiro' || activeTab === 'performance' || activeTab === 'nova-venda') ? 'max-w-none !px-4 sm:!px-6 md:!px-10' : 'max-w-[1600px]'}`}>
            <AnimatePresence mode="wait">
              <div key={activeTab}>
                {activeTab === 'dashboard' && (
                  <Dashboard 
                    sales={sales} 
                    products={products} 
                    customers={customers} 
                    expenses={expenses}
                    purchases={purchases}
                    storeSettings={storeSettings}
                    monthlyGoal={toNum(storeSettings.monthly_goal) || 10000} 
                    user={user}
                  />
                )}
                
                {activeTab === 'raio-x' && (
                  <StoreXRay 
                    sales={sales} 
                    products={products} 
                    expenses={expenses}
                    purchases={purchases}
                    storeSettings={storeSettings}
                  />
                )}

                {activeTab === 'performance' && (
                  <InventoryPerformance 
                    products={products}
                    sales={sales}
                    formatCurrency={formatCurrency}
                  />
                )}

                {activeTab === 'vendas' && (
                  <SalesList 
                    sales={sales} 
                    products={products}
                    salesSearchTerm={salesSearchTerm}
                    setSalesSearchTerm={setSalesSearchTerm}
                    salesDateFilter={salesDateFilter}
                    setSalesDateFilter={setSalesDateFilter}
                    salesStartDate={salesStartDate}
                    setSalesStartDate={setSalesStartDate}
                    salesEndDate={salesEndDate}
                    setSalesEndDate={setSalesEndDate}
                    globalMonthFilter={globalMonthFilter}
                    setGlobalMonthFilter={setGlobalMonthFilter}
                    salesPaymentFilter={salesPaymentFilter}
                    setSalesPaymentFilter={setSalesPaymentFilter}
                    salesSellerFilter={salesSellerFilter}
                    setSalesSellerFilter={setSalesSellerFilter}
                    salesStatusFilter={salesStatusFilter}
                    setSalesStatusFilter={setSalesStatusFilter}
                    handleEdit={handleEdit} 
                    handleDeleteSale={onDeleteSale}
                    handleCancelSale={onCancelSale}
                    handleCancelItem={onCancelItem}
                    onNewSale={() => {
                      setEditingSale(null);
                      setCart([]);
                      setSaleDiscount('0');
                      setActiveTab('nova-venda');
                    }}
                    user={user}
                    formatCurrency={formatCurrency}
                    toNum={toNum}
                    storeSettings={storeSettings}
                    loadMore={loadMoreSales}
                  />
                )}

                {activeTab === 'produtos' && (
                  <ProductsList 
                    filteredProducts={filteredProducts}
                    searchTerm={productSearchTerm}
                    setSearchTerm={setProductSearchTerm}
                    categoryFilter={categoryFilter}
                    setCategoryFilter={setCategoryFilter}
                    categories={categories}
                    handleAdjustStock={onAdjustStock}
                    handleDeleteProduct={async (id) => {
                      showConfirm('Inativar Produto', 'O produto será marcado como inativo e não aparecerá nas novas vendas, mas seu histórico será preservado. Confirmar?', async () => {
                        try {
                          await updateDoc(doc(db, 'produtos', id), { status: 'inativo' });
                          showNotification('Produto inativado');
                        } catch (err: any) {
                          handleFirestoreError(err, OperationType.WRITE, `produtos/${id}`);
                        }
                      }, 'danger');
                    }}
                    handleEdit={handleEdit}
                    formatCurrency={formatCurrency}
                    toNum={toNum}
                    onPromote={onTogglePromote}
                    getCssColor={getCssColor}
                    storeSettings={storeSettings}
                    loadMore={loadMoreProducts}
                    user={user}
                  />
                )}

                {activeTab === 'catalogo' && (
                  <CatalogTab 
                    products={products}
                    storeSettings={storeSettings}
                    showNotification={showNotification}
                  />
                )}

                {activeTab === 'clientes' && (
                  <CustomersList 
                    customers={customers} 
                    handleEdit={handleEdit} 
                    handleDeleteCustomer={async (id) => {
                      showConfirm('Excluir Cliente', 'Tem certeza?', async () => {
                        try {
                          await deleteDoc(doc(db, 'clientes', id));
                          showNotification('Cliente excluído');
                        } catch (err: any) {
                          handleFirestoreError(err, OperationType.DELETE, `clientes/${id}`);
                        }
                      }, 'danger');
                    }}
                    storeSettings={storeSettings}
                    showNotification={showNotification}
                    showConfirm={showConfirm}
                    user={user}
                    formatCurrency={formatCurrency}
                    toNum={toNum}
                    loadMore={loadMoreCustomers}
                  />
                )}

                {activeTab === 'financeiro' && user?.role === 'admin' && (
                  <CashControl 
                    sales={sales} 
                    expenses={expenses} 
                    products={products}
                    purchases={purchases}
                    storeSettings={storeSettings}
                    formatCurrency={formatCurrency} 
                    toNum={toNum} 
                    handleEdit={handleEdit}
                    handleDeleteExpense={async (id) => {
                      if (user?.role !== 'admin') {
                        showNotification('Acesso restrito ao administrador', 'error');
                        return;
                      }
                      showConfirm('Excluir Lançamento', 'Tem certeza?', async () => {
                        try {
                          await deleteDoc(doc(db, 'gastos', id));
                          showNotification('Lançamento excluído');
                        } catch (err: any) {
                          handleFirestoreError(err, OperationType.DELETE, `gastos/${id}`);
                        }
                      }, 'danger');
                    }}
                    setIsModalOpen={setIsModalOpen}
                    setModalType={setModalType}
                    setEditingItem={setEditingItem}
                    loadMoreExpenses={loadMoreExpenses}
                  />
                )}

                {activeTab === 'precificacao' && user?.role === 'admin' && (
                  <Pricing formatCurrency={formatCurrency} toNum={toNum} storeSettings={storeSettings} />
                )}

                {activeTab === 'relatorios' && user?.role === 'admin' && (
                  <ProfitReport 
                    sales={sales} 
                    expenses={expenses} 
                    products={products} 
                    customers={customers}
                    ads={ads} 
                    sellers={users}
                    storeSettings={storeSettings}
                    showNotification={showNotification}
                    showConfirm={showConfirm}
                    formatCurrency={formatCurrency} 
                    toNum={toNum} 
                    handleEdit={handleEdit}
                    handleDeleteAd={async (id) => {
                      if (user?.role !== 'admin') {
                        showNotification('Acesso restrito ao administrador', 'error');
                        return;
                      }
                      showConfirm('Excluir Anúncio', 'Tem certeza?', async () => {
                        try {
                          await deleteDoc(doc(db, 'anuncios', id));
                          showNotification('Anúncio excluído');
                        } catch (err: any) {
                          handleFirestoreError(err, OperationType.DELETE, `anuncios/${id}`);
                        }
                      }, 'danger');
                    }}
                    setIsModalOpen={setIsModalOpen}
                    setModalType={setModalType}
                    setEditingItem={setEditingItem}
                    loadMoreAds={loadMoreAds}
                  />
                )}

                {activeTab === 'vendedores' && user?.role === 'admin' && (
                  <SellersList 
                    sellers={users}
                    handleEdit={handleEdit}
                    handleDeleteSeller={async (id) => {
                      if (user?.role !== 'admin') {
                        showNotification('Acesso restrito ao administrador', 'error');
                        return;
                      }
                      showConfirm('Excluir Usuário', 'Tem certeza?', async () => {
                        try {
                          await deleteDoc(doc(db, 'usuarios', id));
                          showNotification('Usuário excluído');
                        } catch (err: any) {
                          handleFirestoreError(err, OperationType.DELETE, `usuarios/${id}`);
                        }
                      }, 'danger');
                    }}
                    setIsModalOpen={setIsModalOpen}
                    setModalType={setModalType}
                    setEditingItem={setEditingItem}
                    handleResetPassword={onResetUserPassword}
                  />
                )}

                {activeTab === 'perfil' && (
                  <UserProfile 
                    user={user} 
                    showNotification={showNotification} 
                    setIsChangePasswordModalOpen={setIsChangePasswordModalOpen} 
                  />
                )}

                {activeTab === 'nova-venda' && (
                  <QuickSaleModal 
                    isOpen={true}
                    onClose={() => setActiveTab('vendas')}
                    editingSale={editingSale}
                    setEditingSale={setEditingSale}
                    cart={cart}
                    setCart={setCart}
                    saleDiscount={saleDiscount}
                    setSaleDiscount={setSaleDiscount}
                    saleDiscountType={saleDiscountType}
                    setSaleDiscountType={setSaleDiscountType}
                    quickSaleTab={quickSaleTab}
                    setQuickSaleTab={setQuickSaleTab}
                    searchTerm={productSearchTerm}
                    setSearchTerm={setProductSearchTerm}
                    products={products}
                    customers={customers}
                    sellers={users}
                    handleCompleteSale={onCompleteSale}
                    showNotification={showNotification}
                    isFullPage={true}
                    storeSettings={storeSettings}
                    loadMoreProducts={loadMoreProducts}
                  />
                )}

                {activeTab === 'configuracoes' && user?.role === 'admin' && (
                  <StoreSettings 
                    storeSettings={storeSettings} 
                    showNotification={showNotification} 
                    toNum={toNum}
                  />
                )}

                {activeTab === 'estoque-historico' && user?.role === 'admin' && (
                  <StockHistoryContent 
                    stockMovements={stockMovements}
                    showNotification={showNotification}
                    showConfirm={showConfirm}
                    formatCurrency={formatCurrency}
                    toNum={toNum}
                    loadMore={loadMoreStock}
                  />
                )}

                {activeTab === 'compras' && (
                  <Purchases />
                )}
              </div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      <BottomNav 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        setIsSidebarOpen={setIsSidebarOpen} 
      />

      {/* Notifications */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
                n.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-rose-500 text-white border-rose-400'
              }`}
            >
              {n.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <p className="font-bold text-sm">{n.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingItem ? `Editar ${modalType.slice(0, -1)}` : `Novo ${modalType.slice(0, -1)}`}
      >
        {modalType === 'produtos' && (
          <ProductForm 
            key={editingItem?.id || 'new_product'}
            editingItem={editingItem}
            handleAddProduct={onAddProduct}
            tempVariations={tempVariations}
            addVariation={addVariation}
            updateVariation={updateVariation}
            removeVariation={removeVariation}
            existingImages={existingImages}
            removeExistingImage={removeExistingImage}
            selectedFiles={selectedFiles}
            removeSelectedFile={removeSelectedFile}
            handleFileChange={handleFileChange}
            isUploading={isUploading}
            storeSettings={storeSettings}
          />
        )}

        {modalType === 'clientes' && (
          <CustomerForm key={editingItem?.id || 'new_customer'} editingItem={editingItem} handleAddCustomer={onAddCustomer} />
        )}

        {modalType === 'gastos' && (
          <TransactionForm key={editingItem?.id || 'new_expense'} editingItem={editingItem} handleAddTransaction={onAddTransaction} />
        )}

        {modalType === 'financeiro' && (
          <TransactionForm key={editingItem?.id || 'new_finance'} editingItem={editingItem} handleAddTransaction={onAddTransaction} />
        )}

        {modalType === 'vendedores' && (
          <SellerForm key={editingItem?.id || 'new_seller'} editingItem={editingItem} handleAddSeller={onAddUser} />
        )}

        {modalType === 'anuncios' && (
          <AdForm key={editingItem?.id || 'new_ad'} editingItem={editingItem} handleAddAd={onAddAd} />
        )}
      </Modal>

      <QuickSaleModal 
        isOpen={isQuickSaleModalOpen}
        onClose={() => setIsQuickSaleModalOpen(false)}
        editingSale={editingSale}
        setEditingSale={setEditingSale}
        cart={cart}
        setCart={setCart}
        saleDiscount={saleDiscount}
        setSaleDiscount={setSaleDiscount}
        saleDiscountType={saleDiscountType}
        setSaleDiscountType={setSaleDiscountType}
        quickSaleTab={quickSaleTab}
        setQuickSaleTab={setQuickSaleTab}
        searchTerm={productSearchTerm}
        setSearchTerm={setProductSearchTerm}
        products={products}
        customers={customers}
        sellers={users}
        handleCompleteSale={onCompleteSale}
        showNotification={showNotification}
        storeSettings={storeSettings}
        loadMoreProducts={loadMoreProducts}
      />

      <ConfirmModal 
        isOpen={!!confirmConfig}
        onClose={() => setConfirmConfig(null)}
        config={confirmConfig || {}}
      />

      <Modal 
        isOpen={isChangePasswordModalOpen} 
        onClose={() => setIsChangePasswordModalOpen(false)} 
        title="Alterar Minha Senha"
      >
        <form onSubmit={onUpdatePassword} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Senha Atual</label>
            <input 
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-midnight outline-none"
              placeholder="Digite sua senha atual"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nova Senha</label>
            <input 
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-midnight outline-none"
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Confirmar Nova Senha</label>
            <input 
              type={showNewPassword ? "text" : "password"}
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-midnight outline-none"
              placeholder="Repita a nova senha"
              required
            />
          </div>
          <button type="submit" className="w-full bg-midnight text-white py-4 rounded-2xl font-bold shadow-lg shadow-midnight/10 hover:bg-black transition-all">
            Atualizar Senha
          </button>
        </form>
      </Modal>
    </>
  );
};

const AppWrapper = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default AppWrapper;
