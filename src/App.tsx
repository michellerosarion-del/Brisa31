import React, { useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { 
  db, 
  auth, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  produtosRef,
  clientesRef,
  vendasRef,
  gastosRef,
  usuariosRef,
  estoqueMovimentacoesRef,
  configuracoesRef,
  handleFirestoreError,
  handleStorageError,
  OperationType,
  storage,
  storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from './firebase';
import { 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit, 
  where,
  increment,
  runTransaction,
  collection,
  onSnapshot
} from 'firebase/firestore';
import { 
  updatePassword,
  sendPasswordResetEmail
} from 'firebase/auth';
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
import { toNum, formatCurrency } from './lib/utils';

// Types
import { 
  Product, 
  Sale, 
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
import { CatalogPage } from './pages/Catalog';
import { QuickSaleModal } from './modules/Sales/QuickSaleModal';

// Form Components
import { ProductForm } from './components/forms/ProductForm';
import { CustomerForm } from './components/forms/CustomerForm';
import { TransactionForm } from './components/forms/TransactionForm';
import { SellerForm } from './components/forms/SellerForm';
import { AdForm } from './components/forms/AdForm';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

const App = () => {
  // --- State ---
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.pathname + window.location.hash + window.location.search);

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
  
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettingsType>({
    id: '',
    nome_loja: 'Minha Loja',
    logo_url: '',
    telefone_whatsapp: '',
    mensagem_padrao_whatsapp: '',
    monthly_goal: 10000,
    card_fee: 4.99,
    low_stock_threshold: 3,
    low_stock_alert_enabled: true
  });

  // UI State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [confirmConfig, setConfirmConfig] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<string>('');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isQuickSaleModalOpen, setIsQuickSaleModalOpen] = useState(false);
  const [quickSaleTab, setQuickSaleTab] = useState<'products' | 'cart'>('products');
  
  // Pagination State - Reduced initial limits to save quota
  const [productsLimit, setProductsLimit] = useState(100);
  const [salesLimit, setSalesLimit] = useState(50);
  const [customersLimit, setCustomersLimit] = useState(50);
  const [expensesLimit, setExpensesLimit] = useState(50);
  const [stockLimit, setStockLimit] = useState(50);
  const [adsLimit, setAdsLimit] = useState(50);
  
  // Sales Filters
  const [salesSearchTerm, setSalesSearchTerm] = useState('');
  const [salesDateFilter, setSalesDateFilter] = useState('');
  const [globalMonthFilter, setGlobalMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [salesPaymentFilter, setSalesPaymentFilter] = useState('');
  const [salesSellerFilter, setSalesSellerFilter] = useState('');
  const [salesStatusFilter, setSalesStatusFilter] = useState('');

  // Product Filters
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [saleDiscount, setSaleDiscount] = useState(0);
  const [saleDiscountType, setSaleDiscountType] = useState<'value' | 'percentage'>('value');
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  
  // Form State
  const [tempVariations, setTempVariations] = useState<Variation[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // --- Notifications & Confirm ---
  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
  }, []);

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'info') => {
    setConfirmConfig({ title, message, onConfirm, type });
  }, []);

  // --- Auth & Initial Data ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        // Fetch user doc for role/additional info
        getDoc(doc(db, 'usuarios', authUser.uid)).then((docSnap) => {
          if (docSnap.exists()) {
            setUser({ ...authUser, ...docSnap.data(), id: authUser.uid });
          } else {
            setUser({ ...authUser, id: authUser.uid });
          }
        });
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showNotification('Sessão encerrada');
    } catch (err: any) {
      showNotification('Erro ao sair: ' + err.message, 'error');
    }
  };

  // --- Handlers: Real-time Data Listeners ---
  useEffect(() => {
    if (!user) return;

    // Listeners for essential collections
    const unsubs: (() => void)[] = [];

    // 1. Products
    const qProd = query(produtosRef, orderBy('name', 'asc'), limit(productsLimit));
    unsubs.push(onSnapshot(qProd, (snap) => {
      setProducts(snap.docs.map(d => {
        const data = d.data();
        const variations = data.variations || data.variacoes || data.options || [];
        const normalizedVariations = variations.map((v: any) => ({
          ...v,
          id: v.id || Math.random().toString(36).substr(2, 9),
          cor: v.cor || v.color || 'Única',
          tamanho: v.tamanho || v.size || 'Único',
          estoque: toNum(v.estoque || v.stock || 0)
        }));
        
        // Ensure total stock is recalculated if variations exist
        const totalStock = variations.length > 0 
          ? normalizedVariations.reduce((sum: number, v: any) => sum + v.estoque, 0)
          : toNum(data.stock);

        return { 
          id: d.id, 
          ...data,
          variations: normalizedVariations,
          has_variations: data.has_variations === true || variations.length > 0,
          stock: totalStock // Sync main stock with variations sum
        } as Product;
      }));
    }, err => handleFirestoreError(err, OperationType.LIST, 'produtos')));

    // 2. Sales
    const qSales = query(vendasRef, orderBy('date', 'desc'), limit(salesLimit));
    unsubs.push(onSnapshot(qSales, (snap) => {
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'vendas')));

    // 3. Customers
    const qCust = query(clientesRef, orderBy('name', 'asc'), limit(customersLimit));
    unsubs.push(onSnapshot(qCust, (snap) => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'clientes')));

    // 4. Expenses
    const qExp = query(gastosRef, orderBy('date', 'desc'), limit(expensesLimit));
    unsubs.push(onSnapshot(qExp, (snap) => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'gastos')));

    // 5. Users/Sellers
    const qUsers = query(usuariosRef, orderBy('name', 'asc'), limit(100));
    unsubs.push(onSnapshot(qUsers, (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => handleFirestoreError(err, OperationType.LIST, 'usuarios')));

    // 6. Config
    unsubs.push(onSnapshot(configuracoesRef, (snap) => {
      if (!snap.empty) {
        setStoreSettings({ id: snap.docs[0].id, ...snap.docs[0].data() } as any);
      }
    }, err => handleFirestoreError(err, OperationType.LIST, 'configuracoes')));

    // 7. Recent Stock Movements
    const qStock = query(estoqueMovimentacoesRef, orderBy('date', 'desc'), limit(stockLimit));
    unsubs.push(onSnapshot(qStock, (snap) => {
      setStockMovements(snap.docs.map(d => ({ id: d.id, ...d.data() } as StockMovement)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'estoque_movimentacoes')));

    return () => unsubs.forEach(fn => fn());
  }, [user, productsLimit, salesLimit, customersLimit, expensesLimit, stockLimit]);

  // Periodic Refresh replaced by onSnapshot logic above
  const fetchData = useCallback(async () => {
    // This function is now mostly redundant but kept for any manual force refresh needs
    // We already use onSnapshot for live updates.
    console.log("Using live synchronization...");
  }, []);

  const loadMoreProducts = useCallback(() => {
    setProductsLimit(prev => Math.min(prev + 50, 2000));
  }, []);

  const loadMoreSales = useCallback(() => {
    setSalesLimit(prev => Math.min(prev + 50, 1000));
  }, []);

  const loadMoreCustomers = useCallback(() => {
    setCustomersLimit(prev => Math.min(prev + 50, 1000));
  }, []);

  const loadMoreExpenses = useCallback(() => {
    setExpensesLimit(prev => Math.min(prev + 50, 1000));
  }, []);

  const loadMoreStock = useCallback(() => {
    setStockLimit(prev => Math.min(prev + 50, 500));
  }, []);

  const loadMoreAds = useCallback(() => {
    setAdsLimit(prev => Math.min(prev + 50, 500));
  }, []);

  // --- Handlers ---
  const handleEdit = (type: string, item: any) => {
    if (user?.role !== 'admin' && ['vendedores', 'configuracoes', 'financeiro', 'relatorios'].includes(type)) {
      showNotification('Acesso restrito ao administrador', 'error');
      return;
    }
    
    if (type === 'vendas') {
      setEditingSale(item);
      setCart(item.items || []);
      setSaleDiscount(item.discount || 0);
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

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    console.log('Iniciando processo de cadastro/edição de produto...');
    
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);

    try {
      // Validar tamanho dos arquivos (2MB = 2 * 1024 * 1024 bytes)
      const MAX_FILE_SIZE = 2 * 1024 * 1024;
      for (const file of selectedFiles) {
        if (file.size > MAX_FILE_SIZE) {
          throw new Error(`O arquivo ${file.name} excede o limite de 2MB.`);
        }
      }

      const uploadedUrls = [];
      console.log(`Diagnostic: Starting upload for ${selectedFiles.length} files. Auth state: ${!!auth.currentUser ? 'Logged in' : 'Not logged in'}`);
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        try {
          console.log(`Diagnostic [Step 1/3]: Preparing ref for file ${i + 1}/${selectedFiles.length}: ${file.name}`);
          const fileRef = storageRef(storage, `produtos/${Date.now()}_${file.name}`);
          
          console.log(`Diagnostic [Step 2/3]: Calling uploadBytes for ${file.name}...`);
          const snapshot = await uploadBytes(fileRef, file);
          console.log(`Diagnostic [Step 2/3]: uploadBytes SUCCESS for ${file.name}`);
          
          console.log(`Diagnostic [Step 3/3]: Calling getDownloadURL for ${file.name}...`);
          const url = await getDownloadURL(snapshot.ref);
          uploadedUrls.push(url);
          console.log(`Diagnostic [Step 3/3]: getDownloadURL SUCCESS: ${url}`);
        } catch (uploadError: any) {
          const detailedErrorMessage = handleStorageError(uploadError);
          showNotification(detailedErrorMessage, 'error');
          throw new Error(detailedErrorMessage);
        }
      }

      const finalImages = [...existingImages, ...uploadedUrls];
      const totalStock = tempVariations.length > 0 
        ? tempVariations.reduce((sum, v) => sum + toNum(v.estoque), 0)
        : toNum(data.stock);

      const productData = {
        name: data.name,
        category: data.category,
        brand: data.brand,
        code: data.code,
        cost: toNum(data.cost),
        frete: toNum(data.frete),
        price: toNum(data.price),
        cash_price: toNum(data.cash_price) || toNum(data.price),
        promo_price: toNum(data.promo_price) || 0,
        stock: totalStock,
        min_stock: toNum(data.min_stock),
        cor: data.cor || 'Única',
        tamanho: data.tamanho || 'Único',
        status: data.status || 'ativo',
        variations: tempVariations,
        images: finalImages,
        updatedAt: new Date().toISOString()
      };

      console.log('Salvando dados no Firestore...');
      if (editingItem) {
        await updateDoc(doc(db, 'produtos', editingItem.id), productData);
        showNotification('Produto atualizado!');
      } else {
        await addDoc(produtosRef, { ...productData, createdAt: new Date().toISOString() });
        showNotification('Produto cadastrado!');
      }
      console.log('Processo finalizado com sucesso.');
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Erro no processo de salvamento do produto:', err);
      showNotification(err.message || 'Erro ao salvar produto', 'error');
      // Adicionalmente loga no formato padrão se for erro do Firestore
      if (err.code || err.name === 'FirebaseError') {
        handleFirestoreError(err, OperationType.WRITE, 'produtos');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleCompleteSale = async (
    paymentMethod: string, 
    sellerName: string, 
    finalValue: number, 
    customerId?: string, 
    customerName?: string,
    installments?: number,
    grossValue?: number,
    netValue?: number,
    feeValue?: number,
    feePercentage?: number
  ) => {
    if (cart.length === 0) return;

    try {
      const saleDate = editingSale ? editingSale.date : new Date().toISOString();
      const totalCostItems = cart.reduce((sum, item) => sum + ((toNum(item.cost) + toNum(item.frete)) * toNum(item.quantity)), 0);

      const saleData = {
        customer_id: customerId || 'consumidor-final',
        customer_name: customerName || 'Consumidor Final',
        date: saleDate,
        payment_method: paymentMethod,
        seller_id: user?.id || 'manual',
        seller_name: sellerName || 'Sistema',
        status: 'concluida',
        items: cart.map(item => ({
          ...item,
          status: 'concluido'
        })),
        subtotal: cart.reduce((sum, i) => sum + (toNum(i.unit_price) * toNum(i.quantity)), 0),
        discount_value: toNum(saleDiscount),
        discount_type: saleDiscountType,
        valor_bruto: toNum(grossValue),
        valor_liquido: toNum(netValue),
        tax_value: toNum(feeValue),
        installment_fee_value: toNum(feeValue),
        installment_fee_percentage: toNum(feePercentage),
        total_cost: totalCostItems,
        profit: toNum(netValue) - totalCostItems,
        installments: toNum(installments),
        createdAt: new Date().toISOString()
      };

      await runTransaction(db, async (transaction) => {
        // 1. Collect all product IDs to read
        const productIds = new Set<string>();
        if (editingSale) {
          editingSale.items.forEach(i => productIds.add(i.product_id));
        }
        cart.forEach(i => productIds.add(i.product_id));

        // 2. READ phase - all transaction.get() must happen here
        const productSnaps = new Map<string, any>();
        for (const pid of productIds) {
          const snap = await transaction.get(doc(db, 'produtos', pid));
          if (snap.exists()) {
            productSnaps.set(pid, snap.data());
          }
        }

        // 3. Calculation & WRITE phase
        
        // If editing, restore stock from old sale first
        if (editingSale) {
          for (const oldItem of editingSale.items) {
            if (oldItem.status === 'cancelado') continue;
            const pData = productSnaps.get(oldItem.product_id);
            if (pData) {
              const newStock = toNum(pData.stock) + toNum(oldItem.quantity);
              pData.stock = newStock; // Update local copy for subsequent items
              
              const updateObj: any = { stock: newStock };
              if (pData.variations && oldItem.variation_id) {
                pData.variations = pData.variations.map((v: any) => 
                  v.id === oldItem.variation_id ? { ...v, estoque: toNum(v.estoque) + toNum(oldItem.quantity) } : v
                );
                updateObj.variations = pData.variations;
              }
              transaction.update(doc(db, 'produtos', oldItem.product_id), updateObj);
            }
          }
        }

        // Apply new stock deductions
        for (const item of cart) {
          const pData = productSnaps.get(item.product_id);
          if (pData) {
            const newStock = toNum(pData.stock) - toNum(item.quantity);
            pData.stock = newStock; // Update local copy
            
            const updateObj: any = { stock: newStock };
            if (pData.variations && item.variation_id) {
              pData.variations = pData.variations.map((v: any) => 
                v.id === item.variation_id ? { ...v, estoque: toNum(v.estoque) - toNum(item.quantity) } : v
              );
              updateObj.variations = pData.variations;
            }
            transaction.update(doc(db, 'produtos', item.product_id), updateObj);

            // Movement record
            transaction.set(doc(estoqueMovimentacoesRef), {
              product_id: item.product_id,
              produto: item.product_name,
              quantidade: -item.quantity,
              tipo_movimento: 'venda',
              usuario: user?.name || sellerName || 'Sistema',
              date: saleDate,
              createdAt: new Date().toISOString()
            });
          }
        }

        if (editingSale) {
          transaction.set(doc(db, 'vendas', editingSale.id), saleData);
        } else {
          transaction.set(doc(vendasRef), saleData);
        }
      });

      showNotification(editingSale ? 'Venda atualizada!' : 'Venda realizada com sucesso!');
      setIsQuickSaleModalOpen(false);
      setCart([]);
      setEditingSale(null);
      setSaleDiscount(0);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'vendas');
    }
  };

  const handleDeleteSale = async (id: string) => {
    if (user?.role !== 'admin') {
      showNotification('Acesso restrito ao administrador', 'error');
      return;
    }
    showConfirm('Excluir Venda', 'Tem certeza? O estoque será restaurado automaticamente.', async () => {
      try {
        await runTransaction(db, async (transaction) => {
          const saleRef = doc(db, 'vendas', id);
          const saleDoc = await transaction.get(saleRef);
          if (!saleDoc.exists()) return;
          const sale = saleDoc.data() as Sale;

          // Collect all product IDs to read before any writes
          const productIds = new Set<string>();
          if (sale.status !== 'cancelada') {
            sale.items.forEach(i => {
              if (i.status !== 'cancelado') productIds.add(i.product_id);
            });
          }

          const productSnaps = new Map<string, any>();
          for (const pid of productIds) {
            const snap = await transaction.get(doc(db, 'produtos', pid));
            if (snap.exists()) {
              productSnaps.set(pid, snap.data());
            }
          }

          // Now perform all WRITES
          if (sale.status !== 'cancelada') {
            for (const item of sale.items) {
              if (item.status === 'cancelado') continue;
              
              const pData = productSnaps.get(item.product_id);
              if (pData) {
                const newStock = toNum(pData.stock) + toNum(item.quantity);
                pData.stock = newStock; // Local update

                const updateObj: any = { stock: newStock };
                if (pData.variations && item.variation_id) {
                  pData.variations = pData.variations.map((v: any) => 
                    v.id === item.variation_id ? { ...v, estoque: toNum(v.estoque) + toNum(item.quantity) } : v
                  );
                  updateObj.variations = pData.variations;
                }
                transaction.update(doc(db, 'produtos', item.product_id), updateObj);

                // Record Restock Movement
                transaction.set(doc(estoqueMovimentacoesRef), {
                  product_id: item.product_id,
                  produto: item.product_name,
                  quantidade: toNum(item.quantity),
                  tipo_movimento: 'ajuste',
                  usuario: user?.name || 'Sistema',
                  observacao: `Estorno de venda deletada (${id})`,
                  date: new Date().toISOString(),
                  createdAt: new Date().toISOString()
                });
              }
            }
          }

          transaction.delete(saleRef);
        });

        showNotification('Venda excluída e estoque restaurado!');
      } catch (err: any) {
        handleFirestoreError(err, OperationType.DELETE, 'vendas');
      }
    }, 'danger');
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);
    try {
      const customerData = {
        name: data.name,
        phone: data.phone,
        instagram: data.instagram || '',
        status: data.status || 'ativo',
        updatedAt: new Date().toISOString()
      };
      if (editingItem) {
        await updateDoc(doc(db, 'clientes', editingItem.id), customerData);
        showNotification('Cliente atualizado!');
      } else {
        await addDoc(clientesRef, { ...customerData, createdAt: new Date().toISOString() });
        showNotification('Cliente cadastrado!');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'clientes');
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);
    try {
      const flow_type = data.flow_type || 'saída';
      const tData = {
        type: data.type,
        flow_type,
        payment_method: data.payment_method || 'pix',
        description: data.description,
        value: toNum(data.value),
        date: data.date || new Date().toISOString(),
        observations: data.observations || '',
        updatedAt: new Date().toISOString()
      };
      if (editingItem) {
        await updateDoc(doc(db, 'gastos', editingItem.id), tData);
      } else {
        await addDoc(gastosRef, { ...tData, createdAt: new Date().toISOString() });
      }
      showNotification('Lançamento salvo!');
      setIsModalOpen(false);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'gastos');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);
    try {
      const uData = {
        name: data.name,
        email: data.email,
        role: data.role || 'vendedor',
        status: data.status || 'ativo',
        updatedAt: new Date().toISOString()
      };
      if (editingItem) {
        await updateDoc(doc(db, 'usuarios', editingItem.id), uData);
        showNotification('Usuário atualizado!');
      } else {
        await addDoc(usuariosRef, { ...uData, createdAt: new Date().toISOString() });
        showNotification('Usuário cadastrado!');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'usuarios');
    }
  };

  const handleResetUserPassword = async (email: string) => {
    if (!email) return;
    showConfirm('Resetar Senha', `Deseja enviar um e-mail de recuperação para ${email}?`, async () => {
      try {
        await sendPasswordResetEmail(auth, email);
        showNotification(`E-mail enviado para ${email}`);
      } catch (err: any) {
        showNotification(err.message, 'error');
      }
    });
  };

  const handleAddAd = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);

    try {
      const adData = {
        platform: data.platform,
        investment: toNum(data.investment),
        sales_generated: toNum(data.sales_generated),
        date: new Date().toISOString()
      };

      if (editingItem) {
        await updateDoc(doc(db, 'anuncios', editingItem.id), adData);
        showNotification('Anúncio atualizado!');
      } else {
        await addDoc(collection(db, 'anuncios'), { ...adData, createdAt: new Date().toISOString() });
        showNotification('Anúncio cadastrado!');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'anuncios');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      showNotification('As senhas não coincidem', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showNotification('A senha deve ter pelo menos 6 caracteres', 'error');
      return;
    }
    
    try {
      await updatePassword(auth.currentUser!, newPassword);
      showNotification('Senha atualizada com sucesso!');
      setIsChangePasswordModalOpen(false);
      setNewPassword('');
      setConfirmNewPassword('');
      setCurrentPassword('');
    } catch (err: any) {
      showNotification('Erro ao atualizar senha: ' + err.message, 'error');
    }
  };

  const handleAdjustStock = async (id: string, amount: number, type: string, variationId?: string) => {
    try {
      await runTransaction(db, async (transaction) => {
        const prodRef = doc(db, 'produtos', id);
        const prodDoc = await transaction.get(prodRef);
        if (!prodDoc.exists()) return;

        const pData = prodDoc.data();
        const newTotalStock = toNum(pData.stock) + amount;
        transaction.update(prodRef, { stock: newTotalStock });

        if (variationId && pData.variations) {
          const updatedVars = pData.variations.map((v: any) => 
            v.id === variationId ? { ...v, estoque: toNum(v.estoque) + amount } : v
          );
          transaction.update(prodRef, { variations: updatedVars });
        }

        transaction.set(doc(estoqueMovimentacoesRef), {
          product_id: id,
          produto: pData.name,
          quantidade: amount,
          tipo_movimento: type === 'reposicao' ? 'entrada' : 'ajuste',
          usuario: user?.name || 'Sistema',
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          variation_id: variationId
        });
      });
      showNotification('Estoque atualizado!');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'produtos');
    }
  };

  const handlePromote = async (id: string) => {
    const p = products.find(prod => prod.id === id);
    if (!p) return;
    try {
      await updateDoc(doc(db, 'produtos', id), { is_featured: !p.is_featured });
      showNotification(p.is_featured ? 'Destaque removido' : 'Produto destacado!');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'produtos');
    }
  };

  const handleCancelItem = async (saleId: string, itemIndex: number) => {
    if (user?.role !== 'admin') {
      showNotification('Acesso restrito ao administrador para cancelamentos', 'error');
      return;
    }

    showConfirm('Cancelar Item', 'Confirmar cancelamento deste item?', async () => {
      try {
        await runTransaction(db, async (transaction) => {
          const saleRef = doc(db, 'vendas', saleId);
          const saleDoc = await transaction.get(saleRef);
          if (!saleDoc.exists()) return;
          const sale = saleDoc.data() as Sale;

          if (sale.status === 'cancelada') return;
          const item = sale.items[itemIndex];
          if (!item || item.status === 'cancelado') return;

          // 1. Restore Stock
          const prodRef = doc(db, 'produtos', item.product_id);
          const prodDoc = await transaction.get(prodRef);
          if (prodDoc.exists()) {
            const pData = prodDoc.data();
            const newStock = toNum(pData.stock) + toNum(item.quantity);
            transaction.update(prodRef, { stock: newStock });
            
            if (pData.variations && item.variation_id) {
              const updatedVars = pData.variations.map((v: any) => 
                v.id === item.variation_id ? { ...v, estoque: toNum(v.estoque) + toNum(item.quantity) } : v
              );
              transaction.update(prodRef, { variations: updatedVars });
            }

            // Movement
            transaction.set(doc(estoqueMovimentacoesRef), {
              product_id: item.product_id,
              produto: item.product_name,
              quantidade: toNum(item.quantity),
              tipo_movimento: 'ajuste',
              usuario: user?.name || 'Sistema',
              observacao: `Item cancelado na venda ${saleId.slice(-6)}`,
              date: new Date().toISOString(),
              createdAt: new Date().toISOString()
            });
          }

          // 2. Update Sale Item status
          const updatedItems = sale.items.map((it, idx) => 
            idx === itemIndex ? { ...it, status: 'cancelado' } : it
          );

          // 3. Recalculate Sale values based on remaining active items
          const activeItems = updatedItems.filter(it => it.status !== 'cancelado');
          
          if (activeItems.length === 0) {
            // Cancel whole sale if no items left
            transaction.update(saleRef, { 
              items: updatedItems,
              status: 'cancelada',
              valor_bruto: 0,
              valor_liquido: 0,
              profit: 0,
              total_cost: 0,
              tax_value: 0
            });
          } else {
            // Note: Since discounts/fees applied to the total, we maintain them or scale them?
            // Re-calculating correctly requires checking how we handle fees
            const subtotal = activeItems.reduce((sum, i) => sum + (toNum(i.unit_price) * toNum(i.quantity)), 0);
            const totalCostItems = activeItems.reduce((sum, item) => sum + (toNum(item.cost) * toNum(item.quantity)), 0);
            
            // Re-apply discount
            const discount = sale.discount_type === 'percentage' 
              ? (subtotal * (toNum(sale.discount_value) / 100)) 
              : toNum(sale.discount_value);
            
            const bruto = Math.max(0, subtotal - discount);
            
            // PRESERVE original fee percentage
            const feePercent = toNum(sale.installment_fee_percentage);
            const fee = bruto * (feePercent / 100);
            const liquido = bruto - fee;

            transaction.update(saleRef, {
              items: updatedItems,
              subtotal,
              valor_bruto: bruto,
              valor_liquido: liquido,
              tax_value: fee,
              installment_fee_value: fee,
              total_cost: totalCostItems,
              profit: liquido - totalCostItems
            });
          }
        });
        showNotification('Item cancelado e valores atualizados!');
      } catch (err: any) {
        handleFirestoreError(err, OperationType.WRITE, 'vendas');
      }
    });
  };

  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category))).sort(), [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || 
                            p.brand.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                            p.code.toLowerCase().includes(productSearchTerm.toLowerCase());
      const matchesCategory = !categoryFilter || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, productSearchTerm, categoryFilter]);

  const getCssColor = (color: string) => {
    const colors: Record<string, string> = {
      'Preto': '#000000', 'Branco': '#FFFFFF', 'Azul': '#3b82f6', 'Verde': '#22c55e', 
      'Vermelho': '#ef4444', 'Amarelo': '#eab308', 'Rosa': '#ec4899', 'Roxo': '#a855f7',
      'Cinza': '#64748b', 'Bege': '#f5f5dc', 'Marrom': '#78350f', 'Laranja': '#f97316'
    };
    return colors[color] || '#cbd5e1';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    const formData = new FormData(e.target as HTMLFormElement);
    const { login: email, password } = Object.fromEntries(formData);
    
    try {
      await signInWithEmailAndPassword(auth, email as string, password as string);
      showNotification('Bem-vindo de volta!');
    } catch (err: any) {
      let errorMessage = 'E-mail ou senha incorretos';
      if (err.code === 'auth/user-not-found') errorMessage = 'Usuário não encontrado';
      if (err.code === 'auth/wrong-password') errorMessage = 'Senha incorreta';
      if (err.code === 'auth/too-many-requests') errorMessage = 'Muitas tentativas. Tente novamente mais tarde.';
      
      showNotification(errorMessage, 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!loginEmail) {
      showNotification('Digite seu e-mail de acesso', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginEmail)) {
      showNotification('E-mail inválido', 'error');
      return;
    }

    setIsResettingPassword(true);
    try {
      await sendPasswordResetEmail(auth, loginEmail);
      showNotification('Enviamos um link para redefinir sua senha no seu e-mail', 'success');
    } catch (err: any) {
      showNotification('Erro ao enviar e-mail: ' + err.message, 'error');
    } finally {
      setIsResettingPassword(false);
    }
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

            <form onSubmit={handleLogin} className="space-y-4">
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
                  onClick={handleForgotPassword} 
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
      <div className="h-screen flex overflow-hidden bg-slate-50 font-sans text-gray-900">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          user={user} 
          handleLogout={handleLogout} 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          storeSettings={storeSettings}
        />

        <main className={`flex-1 transition-all duration-200 ease-in-out h-screen overflow-y-auto flex flex-col pb-20 lg:pb-0 ${isSidebarOpen ? 'lg:pl-72' : 'lg:pl-[72px]'}`}>
          <Header 
            setIsSidebarOpen={setIsSidebarOpen} 
            activeTab={activeTab} 
            user={user} 
            setActiveTab={setActiveTab} 
            setIsQuickSaleModalOpen={setIsQuickSaleModalOpen}
            notificationsCount={notifications.length}
            storeSettings={storeSettings}
            handleLogout={handleLogout}
          />

          <div className="flex-1 pt-7 px-3 pb-3 md:p-6 max-w-7xl mx-auto w-full">
            <AnimatePresence mode="wait">
              <div key={activeTab}>
                {activeTab === 'dashboard' && (
                  <Dashboard 
                    sales={sales} 
                    products={products} 
                    customers={customers} 
                    expenses={expenses}
                    storeSettings={storeSettings}
                    monthlyGoal={toNum(storeSettings.monthly_goal) || 10000} 
                    user={user}
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
                    globalMonthFilter={globalMonthFilter}
                    setGlobalMonthFilter={setGlobalMonthFilter}
                    salesPaymentFilter={salesPaymentFilter}
                    setSalesPaymentFilter={setSalesPaymentFilter}
                    salesSellerFilter={salesSellerFilter}
                    setSalesSellerFilter={setSalesSellerFilter}
                    salesStatusFilter={salesStatusFilter}
                    setSalesStatusFilter={setSalesStatusFilter}
                    handleEdit={handleEdit} 
                    handleDeleteSale={handleDeleteSale}
                    handleCancelItem={handleCancelItem}
                    onNewSale={() => {
                      setEditingSale(null);
                      setCart([]);
                      setSaleDiscount(0);
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
                    handleAdjustStock={handleAdjustStock}
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
                    onPromote={handlePromote}
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
                    handleResetPassword={handleResetUserPassword}
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
                    handleCompleteSale={handleCompleteSale}
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
            handleAddProduct={handleAddProduct}
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
          <CustomerForm key={editingItem?.id || 'new_customer'} editingItem={editingItem} handleAddCustomer={handleAddCustomer} />
        )}

        {modalType === 'gastos' && (
          <TransactionForm key={editingItem?.id || 'new_expense'} editingItem={editingItem} handleAddTransaction={handleAddTransaction} />
        )}

        {modalType === 'financeiro' && (
          <TransactionForm key={editingItem?.id || 'new_finance'} editingItem={editingItem} handleAddTransaction={handleAddTransaction} />
        )}

        {modalType === 'vendedores' && (
          <SellerForm key={editingItem?.id || 'new_seller'} editingItem={editingItem} handleAddSeller={handleAddUser} />
        )}

        {modalType === 'anuncios' && (
          <AdForm key={editingItem?.id || 'new_ad'} editingItem={editingItem} handleAddAd={handleAddAd} />
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
        handleCompleteSale={handleCompleteSale}
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
        <form onSubmit={handleUpdatePassword} className="space-y-4">
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
