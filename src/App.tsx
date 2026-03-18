import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart as ReBarChart, 
  Bar, 
  Cell, 
  PieChart, 
  Pie,
  Legend
} from 'recharts';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Truck, 
  Receipt, 
  Megaphone, 
  BarChart3, 
  Plus, 
  Search, 
  Menu, 
  X, 
  ChevronRight, 
  TrendingUp, 
  AlertTriangle,
  Instagram,
  Phone,
  MapPin,
  CreditCard,
  DollarSign,
  Smartphone,
  ExternalLink,
  Trash2,
  Edit,
  CheckCircle2,
  Check,
  Clock,
  ArrowRight,
  LogOut,
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  Camera,
  Download,
  Settings as SettingsIcon,
  Briefcase,
  UserCircle,
  FileText,
  Database,
  Upload,
  MessageCircle,
  Share2,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  runTransaction,
  serverTimestamp,
  increment,
  Timestamp
} from 'firebase/firestore';
import { db, auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, handleFirestoreError, OperationType } from './firebase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Error Boundary Component
class ErrorBoundary extends React.Component<any, any> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      const error = this.state.error as any;
      if (error && error.message) {
        try {
          const parsed = JSON.parse(error.message);
          if (parsed.error) errorMessage = `Erro no Firestore: ${parsed.error} (${parsed.operationType} em ${parsed.path})`;
          else errorMessage = error.message;
        } catch (e) {
          errorMessage = error.message;
        }
      }

      return (
        <div className="min-h-screen bg-rose-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-rose-100">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ops! Algo deu errado</h2>
            <p className="text-gray-600 mb-8">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all"
            >
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

// --- Types ---

type Product = {
  id: string;
  name: string;
  category: string;
  brand: string;
  code: string;
  color: string;
  size: string;
  cost: number;
  price: number;
  cash_price?: number;
  card_price?: number;
  promo_price?: number;
  stock: number;
  min_stock: number;
  image_url: string;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
  instagram: string;
  city: string;
  total_purchases?: number;
  total_spent?: number;
  last_purchase?: string;
};

type Sale = {
  id: string;
  date: string;
  customer_id: string;
  customer_name?: string;
  seller_id?: string;
  seller_name?: string;
  payment_method: string;
  discount_value?: number;
  discount_type?: 'percentage' | 'value';
  final_price: number;
  profit: number;
  items: {
    product_id: string;
    product_name?: string;
    quantity: number;
    unit_price: number;
    total_item_value: number;
    size: string;
  }[];
  // Legacy fields for UI compatibility
  product_name?: string;
  quantity?: number;
  total_value?: number;
  size?: string;
};

type SupplierOrder = {
  id: string;
  date: string;
  supplier: string;
  product_id: string;
  quantity: number;
  status: 'pedido feito' | 'enviado' | 'recebido';
  product_name: string;
};

type Expense = {
  id: string;
  date: string;
  type: string;
  category?: string;
  description: string;
  value: number;
  observations?: string;
};

type Seller = {
  id: string;
  name: string;
  email: string;
  status: 'ativo' | 'inativo';
  commission_percentage: number;
};

type Ad = {
  id: string;
  platform: string;
  investment: number;
  sales_generated: number;
  date: string;
};

type User = {
  id: string;
  login: string;
  name: string;
  role: 'admin' | 'seller';
};

type StoreSettings = {
  id: string;
  nome_loja: string;
  telefone_whatsapp: string;
  mensagem_padrao_whatsapp: string;
};

type DashboardData = {
  dailyRevenue: number;
  monthlyRevenue: number;
  totalProfit: number;
  netProfit: number;
  lowStock: Product[];
  topProducts: { name: string; total_sold: number }[];
  mostProfitableProduct: { name: string; profit: number } | null;
  bestSellingSize: { size: string; count: number } | null;
  ticketMedio: number;
  roi: number;
  salesByMonth: { month: string; revenue: number; count: number }[];
  sellerStats: { id: string; name: string; total_sold: number; commission: number; sales_count: number }[];
  monthlySalesCount: number;
  stockSuggestions: { id: number; name: string; stock: number; sales_last_30: number; suggestion: number }[];
  monthlyGoal: number;
  revenueLast7Days: { date: string; revenue: number }[];
  salesByPaymentMethod: { method: string; count: number }[];
  salesByColor: { color: string; total_sold: number }[];
  customerStats: { active: number; inactive: number };
  bestSellingProductMonth: { name: string; total_sold: number } | null;
  trendingProduct: { name: string; growth: number } | null;
  profitByProduct: { name: string; quantity: number; revenue: number; cost: number; profit: number }[];
  staleProducts: Product[];
  totalStockValue: number;
  totalStockCost: number;
};

type StockMovement = {
  id: string;
  product_id: string;
  produto: string;
  marca: string;
  cor: string;
  tamanho: string;
  tipo_movimento: 'entrada' | 'venda' | 'ajuste' | 'reposicao';
  quantidade: number;
  date: string;
  usuario: string;
  observations?: string;
};

type CartItem = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  size: string;
  color: string;
  brand: string;
};

// --- Components ---

const toNum = (val: any) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  let clean = String(val).replace('R$', '').replace(/\s/g, '');
  if (clean.includes('.') && clean.includes(',')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else {
    clean = clean.replace(',', '.');
  }
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
};

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(toNum(val));

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string; [key: string]: any }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-white rounded-3xl p-4 md:p-6 shadow-sm border border-gray-100 ${className}`}
  >
    {children}
  </motion.div>
);

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl"
      >
        <div className="px-5 md:px-8 py-4 md:py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="font-black text-gray-900 uppercase tracking-widest text-xs md:text-sm">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors active:scale-90">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-5 md:p-8 max-h-[85vh] overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

const StatCard = ({ title, value, emoji, colorClass, trend }: any) => (
  <Card className="flex items-center justify-between p-5 md:p-6">
    <div>
      <p className="text-[10px] md:text-sm font-bold text-gray-500 uppercase tracking-wider">{title}</p>
      <h3 className="text-xl md:text-3xl font-black mt-1 text-gray-900">{value}</h3>
      {trend && (
        <p className={`text-[10px] md:text-xs mt-2 flex items-center font-bold ${trend > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          <TrendingUp className={`w-3.5 h-3.5 mr-1 ${trend < 0 ? 'rotate-180' : ''}`} />
          {Math.abs(trend)}% <span className="text-gray-400 ml-1 font-medium">vs mês anterior</span>
        </p>
      )}
    </div>
    <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl shadow-lg flex items-center justify-center text-2xl md:text-3xl ${colorClass.replace('text-', 'bg-')} bg-opacity-10`}>
      {emoji}
    </div>
  </Card>
);

const ConfirmModal = ({ isOpen, onClose, config }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl"
      >
        <div className="p-8 text-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
            config.type === 'danger' ? 'bg-rose-100 text-rose-600' : 
            config.type === 'warning' ? 'bg-amber-100 text-amber-600' : 
            'bg-indigo-100 text-indigo-600'
          }`}>
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-2">{config.title}</h3>
          <p className="text-gray-500 text-sm font-medium leading-relaxed">{config.message}</p>
        </div>
        <div className="p-6 bg-gray-50 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={() => { config.onConfirm(); onClose(); }}
            className={`flex-1 px-4 py-3 rounded-xl font-bold text-white transition-all shadow-lg ${
              config.type === 'danger' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-100' : 
              config.type === 'warning' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-100' : 
              'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
            }`}
          >
            Confirmar
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const CatalogContent = ({ products, storeSettings, catalogSearch, setCatalogSearch, catalogSizeFilter, setCatalogSizeFilter, catalogColorFilter, setCatalogColorFilter, catalogPriceFilter, setCatalogPriceFilter, showNotification, showConfirm }: any) => {
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  // Group products by Name, Brand, and Color to show available sizes
  const groupedProducts = products.reduce((acc: any, p: any) => {
    // Unique key for the product model in a specific color
    const key = `${p.name}|${p.brand}|${p.color}|${p.price}|${p.category}`;
    if (!acc[key]) {
      acc[key] = { 
        ...p, 
        availableSizes: p.size ? [p.size] : [], 
        totalStock: p.stock,
        // Keep track of IDs for specific sizes if needed, but for catalog we just need the group
      };
    } else {
      if (p.size && !acc[key].availableSizes.includes(p.size)) {
        acc[key].availableSizes.push(p.size);
      }
      acc[key].totalStock += p.stock;
    }
    return acc;
  }, {});

  const catalogItems = Object.values(groupedProducts).sort((a: any, b: any) => a.name.localeCompare(b.name));

  const availableSizes = Array.from(new Set(products.map((p: any) => p.size))).filter(Boolean).sort();
  const availableColors = Array.from(new Set(products.map((p: any) => p.color))).filter(Boolean).sort();

  const filteredCatalog = catalogItems.filter((p: any) => {
    const matchesSearch = p.name.toLowerCase().includes(catalogSearch.toLowerCase()) || 
                         p.brand.toLowerCase().includes(catalogSearch.toLowerCase());
    const matchesSize = catalogSizeFilter === '' || p.availableSizes.includes(catalogSizeFilter);
    const matchesColor = catalogColorFilter === '' || p.color === catalogColorFilter;
    const matchesPrice = catalogPriceFilter === '' || p.price <= Number(catalogPriceFilter);
    return p.totalStock > 0 && matchesSearch && matchesSize && matchesColor && matchesPrice;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Buscar produtos ou marcas..."
            value={catalogSearch}
            onChange={(e) => setCatalogSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          <select 
            value={catalogSizeFilter}
            onChange={(e) => setCatalogSizeFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 min-w-[100px] cursor-pointer"
          >
            <option value="">Tamanho</option>
            {availableSizes.map((size: any) => <option key={size} value={size}>{size}</option>)}
          </select>
          <select 
            value={catalogColorFilter}
            onChange={(e) => setCatalogColorFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 min-w-[100px] cursor-pointer"
          >
            <option value="">Cor</option>
            {availableColors.map((color: any) => <option key={color} value={color}>{color}</option>)}
          </select>
          <select 
            value={catalogPriceFilter}
            onChange={(e) => setCatalogPriceFilter(e.target.value === '' ? '' : Number(e.target.value))}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 min-w-[120px] cursor-pointer"
          >
            <option value="">Preço até</option>
            <option value="50">Até R$ 50</option>
            <option value="100">Até R$ 100</option>
            <option value="150">Até R$ 150</option>
            <option value="200">Até R$ 200</option>
            <option value="300">Até R$ 300</option>
            <option value="500">Até R$ 500</option>
          </select>
          {(catalogSearch || catalogSizeFilter || catalogColorFilter || catalogPriceFilter) && (
            <button 
              onClick={() => {
                setCatalogSearch('');
                setCatalogSizeFilter('');
                setCatalogColorFilter('');
                setCatalogPriceFilter('');
              }}
              className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
              title="Limpar filtros"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {filteredCatalog.map((product: any) => {
          const productKey = `${product.name}-${product.brand}-${product.color}`;
          const selectedSize = selectedSizes[productKey] || product.availableSizes[0];

          return (
            <motion.div 
              key={product.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col group"
            >
              <div className="aspect-[4/5] bg-gray-100 relative overflow-hidden">
                <img 
                  src={product.image_url || `https://picsum.photos/seed/${product.id}/400/500`} 
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                  <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm text-indigo-600">
                    {product.category}
                  </span>
                  {product.totalStock <= 3 && (
                    <span className="bg-rose-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm">
                      Últimas unidades
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4 md:p-5 flex-1 flex flex-col">
                <div className="mb-2">
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{product.brand}</p>
                  <h3 className="font-bold text-gray-900 text-base md:text-lg line-clamp-2 leading-tight">{product.name}</h3>
                </div>
                
                <div className="space-y-3 mb-5">
                  <div className="flex flex-wrap gap-1.5">
                    {product.availableSizes.sort().map((size: string) => (
                      <button 
                        key={size} 
                        onClick={() => setSelectedSizes(prev => ({ ...prev, [productKey]: size }))}
                        className={`text-[10px] px-2.5 py-1 rounded-lg font-bold border transition-all ${
                          selectedSize === size 
                            ? 'bg-indigo-600 text-white border-indigo-600' 
                            : 'bg-gray-50 text-gray-600 border-gray-100 hover:border-indigo-200'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-medium">Cor: <span className="text-gray-900 font-bold">{product.color}</span></span>
                    <span className="text-xs text-gray-400 font-medium">Estoque: <span className="text-gray-900 font-bold">{product.totalStock} un.</span></span>
                  </div>
                </div>
                
                <div className="mt-auto space-y-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-gray-900">R$</span>
                    <span className="text-2xl font-black text-gray-900 tracking-tight">
                      {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  <a 
                    href={`https://wa.me/${storeSettings.telefone_whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(
                      `Olá! Tenho interesse neste produto:\n\n*Produto:* ${product.name}\n*Preço:* R$ ${product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n*Tamanho:* ${selectedSize || 'Não selecionado'}`
                    )}`}
                    target="_blank"
                    className="w-full bg-emerald-500 text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 active:scale-95"
                  >
                    <Phone className="w-4 h-4" /> Comprar no WhatsApp
                  </a>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {filteredCatalog.length === 0 && (
        <div className="text-center py-32 bg-white rounded-3xl border border-dashed border-gray-200">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-gray-200" />
          </div>
          <p className="text-gray-500 font-bold">Nenhum produto encontrado.</p>
          <p className="text-gray-400 text-sm mt-1">Tente ajustar seus filtros de busca.</p>
        </div>
      )}
    </div>
  );
};

const StockHistoryContent = ({ stockMovements, showNotification, showConfirm }: { stockMovements: StockMovement[], showNotification: any, showConfirm: any }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredMovements = stockMovements.filter(m => 
    (m.produto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.tipo_movimento || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.marca || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.usuario || '').toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'entrada': return 'bg-emerald-100 text-emerald-700';
      case 'venda': return 'bg-rose-100 text-rose-700';
      case 'ajuste': return 'bg-amber-100 text-amber-700';
      case 'reposicao': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar por produto, marca, usuário ou tipo..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 font-bold text-gray-400 text-xs uppercase tracking-wider">Data</th>
                <th className="px-6 py-4 font-bold text-gray-400 text-xs uppercase tracking-wider">Produto</th>
                <th className="px-6 py-4 font-bold text-gray-400 text-xs uppercase tracking-wider">Marca</th>
                <th className="px-6 py-4 font-bold text-gray-400 text-xs uppercase tracking-wider">Cor/Tam</th>
                <th className="px-6 py-4 font-bold text-gray-400 text-xs uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 font-bold text-gray-400 text-xs uppercase tracking-wider">Qtd</th>
                <th className="px-6 py-4 font-bold text-gray-400 text-xs uppercase tracking-wider">Usuário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredMovements.map(m => (
                <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(m.date).toLocaleString('pt-BR')}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{m.produto}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{m.marca}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{m.cor} / {m.tamanho}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${getTypeColor(m.tipo_movimento)}`}>
                      {m.tipo_movimento}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-sm font-bold ${m.quantidade > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {m.quantidade > 0 ? `+${m.quantidade}` : m.quantidade}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{m.usuario || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-gray-50">
          {filteredMovements.map(m => (
            <div key={m.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-400">{new Date(m.date).toLocaleString('pt-BR')}</p>
                  <h4 className="font-bold text-gray-900">{m.produto}</h4>
                  <p className="text-[10px] text-gray-500">{m.marca} - {m.cor}/{m.tamanho}</p>
                </div>
                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${getTypeColor(m.tipo_movimento)}`}>
                  {m.tipo_movimento}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500 italic">Por: {m.usuario || '-'}</p>
                <span className={`text-sm font-bold ${m.quantidade > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {m.quantidade > 0 ? `+${m.quantidade}` : m.quantidade} un.
                </span>
              </div>
            </div>
          ))}
        </div>
        {filteredMovements.length === 0 && (
          <div className="text-center py-20">
            <Clock className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-bold">Nenhuma movimentação encontrada.</p>
          </div>
        )}
      </Card>
    </div>
  );
};

const FinanceContent = ({ expenses, ads, orders, handleEdit, handleDeleteExpense, handleDeleteAd, handleDeleteOrder, setModalType, setEditingItem, setIsModalOpen, showNotification, showConfirm }: any) => {
  const [financeTab, setFinanceTab] = useState('todos');
  const [financeMonth, setFinanceMonth] = useState(new Date().toISOString().slice(0, 7));

  const filteredExpenses = expenses.filter((e: any) => {
    const matchesTab = financeTab === 'todos' || e.type === financeTab;
    const matchesMonth = !financeMonth || e.date.startsWith(financeMonth);
    return matchesTab && matchesMonth;
  });

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Filtro Financeiro</h3>
              <p className="text-xs text-gray-500">Selecione o mês para visualizar os gastos.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase">Mês:</label>
            <input 
              type="month" 
              value={financeMonth}
              onChange={(e) => setFinanceMonth(e.target.value)}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-bold"
            />
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl w-full md:w-fit overflow-x-auto scrollbar-hide">
          <button 
            onClick={() => setFinanceTab('todos')}
            className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap ${financeTab === 'todos' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Todos
          </button>
          <button 
            onClick={() => setFinanceTab('Fixo')}
            className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap ${financeTab === 'Fixo' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Fixos
          </button>
          <button 
            onClick={() => setFinanceTab('Anúncio')}
            className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap ${financeTab === 'Anúncio' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Anúncios
          </button>
          <button 
            onClick={() => setFinanceTab('Estoque')}
            className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap ${financeTab === 'Estoque' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Estoque
          </button>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => { setModalType('gastos'); setEditingItem({ type: 'Fixo' }); setIsModalOpen(true); }}
            className="bg-white text-indigo-600 border border-indigo-100 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-50 transition-all"
          >
            <Plus className="w-4 h-4" /> Gasto Fixo
          </button>
          <button 
            onClick={() => { setModalType('gastos'); setEditingItem({ type: 'Anúncio' }); setIsModalOpen(true); }}
            className="bg-white text-indigo-600 border border-indigo-100 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-50 transition-all"
          >
            <Plus className="w-4 h-4" /> Gasto Anúncio
          </button>
          <button 
            onClick={() => { setModalType('gastos'); setEditingItem({ type: 'Estoque' }); setIsModalOpen(true); }}
            className="bg-white text-indigo-600 border border-indigo-100 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-50 transition-all"
          >
            <Plus className="w-4 h-4" /> Compra Estoque
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExpenses.map((e: any) => (
          <Card key={e.id} className="relative group">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  e.type === 'Fixo' ? 'bg-blue-100 text-blue-600' : 
                  e.type === 'Anúncio' ? 'bg-purple-100 text-purple-600' : 
                  'bg-emerald-100 text-emerald-600'
                }`}>
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{e.description}</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{e.category || e.type}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-gray-900">{formatCurrency(e.value)}</p>
                <p className="text-[10px] text-gray-400">{new Date(e.date).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            {e.observations && (
              <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg mb-4 italic">"{e.observations}"</p>
            )}
            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleEdit('gastos', e)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                <Edit className="w-4 h-4" />
              </button>
              <button onClick={() => handleDeleteExpense(e.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {filteredExpenses.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
          <Receipt className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-bold">Nenhum registro financeiro encontrado.</p>
        </div>
      )}
    </div>
  );
};

const SellersContent = ({ sellers, dashboard, handleEdit, handleDeleteSeller, showNotification, showConfirm }: any) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sellers.map((s: any) => {
          const stats = dashboard?.sellerStats?.find((stat: any) => stat.id === s.id);
          return (
            <Card key={s.id} className="relative group">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl ${
                    s.status === 'ativo' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {s.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{s.name}</h3>
                    <p className="text-xs text-gray-500">{s.email}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{s.phone}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                  s.status === 'ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {s.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Vendas</p>
                  <p className="text-sm font-black text-gray-900">{stats?.sales_count || 0}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Vendido</p>
                  <p className="text-sm font-black text-gray-900">{formatCurrency(stats?.total_sold || 0)}</p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-xl">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">Comissão ({s.commission_percentage}%)</p>
                  <p className="text-sm font-black text-indigo-600">{formatCurrency(stats?.commission || 0)}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit('vendedores', s)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDeleteSeller(s.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {sellers.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
          <Briefcase className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-bold">Nenhum vendedor cadastrado.</p>
        </div>
      )}
    </div>
  );
};

const SuppliersContent = ({ suppliers, purchaseHistory, handleEdit, fetchData, showNotification, showConfirm }: any) => {
  const handleDeleteSupplier = async (id: string) => {
    showConfirm(
      'Excluir Fornecedor',
      'Tem certeza que deseja excluir este fornecedor? Esta ação não pode ser desfeita.',
      async () => {
        try {
          await deleteDoc(doc(db, 'fornecedores', id));
          fetchData();
          showNotification('Fornecedor excluído com sucesso!');
        } catch (error) {
          showNotification('Erro ao excluir fornecedor', 'error');
        }
      }
    );
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map((s: any) => (
          <Card key={s.id} className="relative group">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Truck className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{s.name}</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{s.email}</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit('fornecedores', s)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDeleteSupplier(s.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Phone className="w-3 h-3" /> {s.phone}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <MapPin className="w-3 h-3" /> {s.address}
              </div>
            </div>
            <div className="pt-4 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Produtos Fornecidos</p>
              <p className="text-xs text-gray-700">{s.products_supplied}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <h3 className="font-bold text-gray-900 mb-6 text-lg flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-500" /> Histórico de Compras de Estoque
        </h3>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Data</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Fornecedor</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Produto</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Qtd</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {purchaseHistory.map((ph: any) => (
                <tr key={ph.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(ph.date).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{ph.supplier_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{ph.product_name}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{ph.quantity}</td>
                  <td className="px-6 py-4 text-sm font-bold text-emerald-600">{formatCurrency(ph.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-gray-50">
          {purchaseHistory.map((ph: any) => (
            <div key={ph.id} className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-gray-400">{new Date(ph.date).toLocaleDateString('pt-BR')}</p>
                  <h4 className="font-bold text-gray-900">{ph.product_name}</h4>
                  <p className="text-xs text-indigo-600 font-medium">{ph.supplier_name}</p>
                </div>
                <span className="text-sm font-black text-emerald-600">{formatCurrency(ph.value)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Quantidade</span>
                <span className="text-sm font-bold text-gray-900">{ph.quantity} un.</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const DashboardContent = ({ dashboard, storeSettings, generatePDF, showNotification, showConfirm, onPromote }: any) => {
  if (!dashboard) return null;

  const goalProgress = (toNum(dashboard.monthlyRevenue) / (toNum(dashboard.monthlyGoal) || 1)) * 100;

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6 md:space-y-10 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight">Dashboard de Gestão</h2>
          <p className="text-gray-500 text-xs md:text-sm font-medium mt-1">Visão geral do desempenho do seu negócio.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => generatePDF('dashboard')}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm active:scale-95"
          >
            <FileText className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
      </div>

      {/* Sales Goal */}
      <Card className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-none p-6 md:p-10 shadow-xl shadow-indigo-100">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-8">
          <div className="flex-1 w-full">
            <div className="flex justify-between items-end mb-5">
              <div>
                <p className="text-indigo-100 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mb-2">Meta Mensal de Vendas</p>
                <h3 className="text-3xl md:text-5xl font-black tracking-tighter">
                  {formatCurrency(toNum(dashboard.monthlyRevenue))} 
                  <span className="text-lg md:text-2xl font-normal text-indigo-200 ml-2">/ {formatCurrency(toNum(dashboard.monthlyGoal))}</span>
                </h3>
              </div>
              <div className="text-right">
                <span className="text-3xl md:text-5xl font-black">{toNum(goalProgress).toFixed(0)}%</span>
              </div>
            </div>
            <div className="w-full bg-white/20 rounded-full h-5 md:h-6 overflow-hidden p-1">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, toNum(goalProgress))}%` }}
                className="bg-white h-full rounded-full shadow-lg"
              />
            </div>
          </div>
          <div className="flex gap-4 w-full lg:w-auto">
            <div className="flex-1 lg:flex-none bg-white/10 backdrop-blur-md p-5 rounded-3xl text-center min-w-[140px] border border-white/10">
              <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Ticket Médio</p>
              <p className="text-xl font-black">{formatCurrency(toNum(dashboard.ticketMedio))}</p>
            </div>
            <div className="flex-1 lg:flex-none bg-white/10 backdrop-blur-md p-5 rounded-3xl text-center min-w-[140px] border border-white/10">
              <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">ROI Anúncios</p>
              <p className="text-xl font-black">{toNum(dashboard.roi).toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard title="Faturamento Hoje" value={formatCurrency(toNum(dashboard.dailyRevenue))} emoji="💰" colorClass="text-emerald-600" />
        <StatCard title="Lucro Líquido Mês" value={formatCurrency(toNum(dashboard.netProfit))} emoji="📊" colorClass="text-indigo-600" />
        <StatCard title="Vendas no Mês" value={toNum(dashboard.monthlySalesCount)} emoji="🛒" colorClass="text-blue-600" />
        <StatCard title="Itens Baixo Estoque" value={(dashboard.lowStock || []).length} emoji="⚠️" colorClass="text-rose-600" />
      </div>

      {/* New Indicators Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-amber-50 border-amber-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-100">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Produto Mais Vendido (Mês)</p>
              <h4 className="text-lg font-black text-gray-900">{dashboard.bestSellingProductMonth?.name || 'N/A'}</h4>
              <p className="text-xs text-amber-600 font-bold">{dashboard.bestSellingProductMonth?.total_sold || 0} unidades</p>
            </div>
          </div>
        </Card>

        <Card className="bg-emerald-50 border-emerald-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-100">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Clientes Ativos / Inativos</p>
              <h4 className="text-lg font-black text-gray-900">{dashboard.customerStats?.active || 0} / {dashboard.customerStats?.inactive || 0}</h4>
              <p className="text-xs text-emerald-600 font-bold">Base total: {(dashboard.customerStats?.active || 0) + (dashboard.customerStats?.inactive || 0)}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-rose-50 border-rose-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-100">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Produto em Alta</p>
              <h4 className="text-lg font-black text-gray-900">{dashboard.trendingProduct?.name || 'N/A'}</h4>
              <p className="text-xs text-rose-600 font-bold">Crescimento: +{toNum(dashboard.trendingProduct?.growth).toFixed(1)}%</p>
            </div>
          </div>
        </Card>

        <Card className="bg-indigo-50 border-indigo-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Valor Total em Estoque</p>
              <h4 className="text-lg font-black text-gray-900">{formatCurrency(dashboard.totalStockValue || 0)}</h4>
              <p className="text-xs text-indigo-600 font-bold">Custo: {formatCurrency(dashboard.totalStockCost || 0)}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Seller Ranking */}
        <Card>
          <h3 className="font-bold text-gray-900 mb-6 text-lg flex items-center gap-2">
            <span className="text-xl">🏆</span> Ranking de Vendedores
          </h3>
          <div className="space-y-4">
            {(dashboard.sellerStats || []).map((s: any, i: number) => (
              <div key={`seller-${s.id || i}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-black text-xs">
                    {i + 1}º
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{s.name}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">{s.sales_count} vendas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-indigo-600">{formatCurrency(toNum(s.total_sold))}</p>
                </div>
              </div>
            ))}
            {(dashboard.sellerStats || []).length === 0 && (
              <p className="text-center py-10 text-gray-400 text-sm italic">Nenhum dado de vendedor.</p>
            )}
          </div>
        </Card>

        {/* Stale Products */}
        <Card>
          <h3 className="font-bold text-gray-900 mb-6 text-lg flex items-center gap-2">
            <span className="text-xl">🔥</span> Produtos Sem Giro (30 dias)
          </h3>
          <div className="space-y-4">
            {(dashboard.staleProducts || []).map((p: any, i: number) => (
              <div key={`stale-${p.id || i}`} className="flex items-center justify-between p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                <div>
                  <p className="text-sm font-bold text-gray-900">{p.name}</p>
                  <p className="text-[10px] text-rose-600 font-bold uppercase">Estoque: {p.stock} | Última Venda: {p.last_sale ? new Date(p.last_sale).toLocaleDateString('pt-BR') : 'Nunca'}</p>
                </div>
                <div className="text-right">
                  <button 
                    onClick={() => onPromote(p.id)}
                    className="text-[10px] font-bold text-rose-600 hover:underline uppercase"
                  >
                    Promover
                  </button>
                </div>
              </div>
            ))}
            {(dashboard.staleProducts || []).length === 0 && (
              <p className="text-center py-10 text-gray-400 text-sm italic">Todos os produtos estão girando!</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Last 7 Days Chart */}
        <Card>
          <h3 className="font-bold text-gray-900 mb-6 text-lg flex items-center gap-2">
            <span className="text-xl">📊</span> Faturamento Últimos 7 Dias
          </h3>
          <div className="h-[250px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dashboard.revenueLast7Days || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(str) => new Date(str).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fontWeight: 600, fill: '#94a3b8' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fontWeight: 600, fill: '#94a3b8' }}
                  tickFormatter={(val) => `R$ ${toNum(val)}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: number) => [formatCurrency(toNum(val)), 'Faturamento']}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#6366f1" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Sales by Month Chart */}
        <Card>
          <h3 className="font-bold text-gray-900 mb-6 text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" /> Vendas por Mês
          </h3>
          <div className="h-[250px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={dashboard.salesByMonth || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fontWeight: 600, fill: '#94a3b8' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fontWeight: 600, fill: '#94a3b8' }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: number) => [formatCurrency(val), 'Faturamento']}
                />
                <Bar dataKey="revenue" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </ReBarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Sales by Payment Method Pie Chart */}
        <Card>
          <h3 className="font-bold text-gray-900 mb-6 text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-500" /> Vendas por Forma de Pagamento
          </h3>
          <div className="h-[250px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dashboard.salesByPaymentMethod || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={window.innerWidth < 768 ? 40 : 60}
                  outerRadius={window.innerWidth < 768 ? 60 : 80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="method"
                >
                  {(dashboard.salesByPaymentMethod || []).map((entry: any, index: number) => (
                    <Cell key={`cell-payment-${entry.method || index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '10px' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Sales by Color Chart */}
        <Card>
          <h3 className="font-bold text-gray-900 mb-6 text-lg flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-rose-500 via-emerald-500 to-indigo-500" /> Cores Mais Vendidas
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={dashboard.salesByColor || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="color" 
                  type="category" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                  width={80}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: 'transparent' }}
                />
                <Bar dataKey="total_sold" fill="#6366f1" radius={[0, 8, 8, 0]}>
                  {(dashboard.salesByColor || []).map((entry: any, index: number) => (
                    <Cell key={`cell-color-${entry.color || index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </ReBarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Stock Suggestions */}
        <Card>
          <h3 className="font-bold text-gray-900 mb-6 text-lg flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-500" /> Sugestões de Reposição de Estoque
          </h3>
          <div className="space-y-4">
            {(dashboard.stockSuggestions || []).map((s: any, i: number) => (
              <div key={`suggestion-${s.id || i}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{s.name}</h4>
                  <p className="text-[10px] text-gray-500 font-bold uppercase">Vendas 30d: {s.sales_last_30} | Estoque: {s.stock}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-indigo-600">Sugerido: +{s.suggestion} un.</p>
                  <button className="text-[10px] font-bold text-gray-400 hover:text-indigo-600 uppercase mt-1">Pedir</button>
                </div>
              </div>
            ))}
            {(dashboard.stockSuggestions || []).length === 0 && (
              <p className="text-center py-10 text-gray-400 text-sm italic">Nenhuma sugestão no momento.</p>
            )}
          </div>
        </Card>

        {/* Intelligence Stats */}
        <div className="space-y-6">
          <Card className="bg-emerald-50 border-emerald-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-100">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Produto Mais Lucrativo</p>
                <h4 className="text-lg font-black text-gray-900">{dashboard.mostProfitableProduct?.name || 'N/A'}</h4>
                <p className="text-xs text-emerald-600 font-bold">Lucro: {formatCurrency(toNum(dashboard.mostProfitableProduct?.profit))}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-indigo-50 border-indigo-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Tamanho Mais Vendido</p>
                <h4 className="text-lg font-black text-gray-900">{dashboard.bestSellingSize?.size || 'N/A'}</h4>
                <p className="text-xs text-indigo-600 font-bold">{dashboard.bestSellingSize?.count || 0} vendas</p>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="font-bold text-gray-900 mb-6 text-lg">Ranking de Produtos (Top 10)</h3>
            <div className="space-y-4">
              {(dashboard.topProducts || []).map((p: any, i: number) => (
                <div key={`top-prod-${p.id || i}`} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-600">{p.name}</span>
                    <span className="text-indigo-600">{p.total_sold} un.</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full" 
                      style={{ width: `${(toNum(p.total_sold) / (toNum((dashboard.topProducts || [])[0]?.total_sold) || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Profit by Product */}
        <Card className="lg:col-span-2">
          <h3 className="font-bold text-gray-900 mb-6 text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" /> Lucratividade por Produto
          </h3>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                  <th className="pb-3 px-2">Produto</th>
                  <th className="pb-3 px-2 text-center">Vendidos</th>
                  <th className="pb-3 px-2 text-right">Faturamento</th>
                  <th className="pb-3 px-2 text-right">Lucro Total</th>
                  <th className="pb-3 px-2 text-right">Margem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(dashboard.topProducts || []).map((p: any, i: number) => (
                  <tr key={`profit-prod-${p.id || i}`} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-2 font-bold text-gray-900">{p.name}</td>
                    <td className="py-3 px-2 text-center font-medium text-gray-600">{toNum(p.total_sold)}</td>
                    <td className="py-3 px-2 text-right font-medium text-gray-600">{formatCurrency(toNum(p.revenue))}</td>
                    <td className="py-3 px-2 text-right font-black text-emerald-600">{formatCurrency(toNum(p.profit))}</td>
                    <td className="py-3 px-2 text-right">
                      <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-[10px] font-black">
                        {toNum(p.revenue) > 0 ? ((toNum(p.profit) / toNum(p.revenue)) * 100).toFixed(1) : '0'}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden divide-y divide-gray-50">
            {(dashboard.topProducts || []).map((p: any, i: number) => (
              <div key={`profit-prod-mobile-${p.id || i}`} className="py-4 space-y-3">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-gray-900 text-sm">{p.name}</h4>
                  <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-[10px] font-black">
                    {toNum(p.revenue) > 0 ? ((toNum(p.profit) / toNum(p.revenue)) * 100).toFixed(1) : '0'}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Vendas</p>
                    <p className="text-xs font-bold text-gray-700">{toNum(p.total_sold)} un.</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Lucro</p>
                    <p className="text-xs font-black text-emerald-600">{formatCurrency(toNum(p.profit))}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Low Stock Alerts with Details */}
      {(dashboard.lowStock || []).length > 0 && (
        <Card className="border-rose-100 bg-rose-50/30">
          <h3 className="font-bold text-rose-900 mb-6 text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" /> Alertas de Estoque Baixo
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(dashboard.lowStock || []).map((p: any, i: number) => (
              <div key={`low-stock-${p.id || i}`} className="bg-white p-4 rounded-2xl border border-rose-100 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{p.name}</h4>
                  <p className="text-[10px] text-gray-500 font-bold uppercase">{p.color} | {p.size}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-rose-600">{p.stock} un.</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Mín: {p.min_stock}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

const ProfitReportContent = ({ 
  products, 
  customers, 
  sales, 
  expenses, 
  ads, 
  sellers, 
  calculateDashboardData,
  showNotification, 
  showConfirm 
}: any) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  
  const dashboard = useMemo(() => {
    return calculateDashboardData(products, customers, sales, expenses, ads, sellers, selectedMonth);
  }, [products, customers, sales, expenses, ads, sellers, selectedMonth, calculateDashboardData]);

  if (!dashboard) return null;

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Filtros do Relatório</h3>
              <p className="text-xs text-gray-500">Selecione o período para análise detalhada.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase">Mês de Referência:</label>
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-bold"
            />
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-bold text-gray-900 mb-6 text-lg flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-500" /> Relatório de Lucro por Produto ({selectedMonth})
        </h3>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Produto</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Qtd Vendida</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Faturamento</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Custo Total</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Lucro Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {dashboard.profitByProduct.map((p: any, i: number) => (
                <tr key={`profit-row-${p.id || i}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{p.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{toNum(p.quantity)} un.</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(toNum(p.revenue))}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(toNum(p.cost))}</td>
                  <td className="px-6 py-4 text-sm font-bold text-emerald-600">{formatCurrency(toNum(p.profit))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-gray-50">
          {dashboard.profitByProduct.map((p: any, i: number) => (
            <div key={`profit-card-${p.id || i}`} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-gray-900">{p.name}</h4>
                <span className="text-sm font-black text-emerald-600">{formatCurrency(toNum(p.profit))}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Vendas</p>
                  <p className="text-xs font-bold text-gray-700">{toNum(p.quantity)} un.</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Faturamento</p>
                  <p className="text-xs font-bold text-gray-700">{formatCurrency(toNum(p.revenue))}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      
      <Card>
        <h3 className="font-bold text-gray-900 mb-6 text-lg flex items-center gap-2">
          <Package className="w-5 h-5 text-indigo-500" /> Status do Estoque Atual
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
            <p className="text-sm font-bold text-indigo-600 mb-1">Valor Total em Estoque (Preço Venda)</p>
            <p className="text-2xl font-black text-indigo-900">
              {formatCurrency(products.reduce((acc: number, p: any) => acc + (toNum(p.price) * toNum(p.stock)), 0))}
            </p>
          </div>
          <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
            <p className="text-sm font-bold text-emerald-600 mb-1">Custo Total em Estoque</p>
            <p className="text-2xl font-black text-emerald-900">
              {formatCurrency(products.reduce((acc: number, p: any) => acc + (toNum(p.cost) * toNum(p.stock)), 0))}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Produto</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Estoque Atual</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.sort((a: any, b: any) => toNum(a.stock) - toNum(b.stock)).map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{p.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">{toNum(p.stock)} un.</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                      toNum(p.stock) <= 0 ? 'bg-rose-100 text-rose-700' :
                      toNum(p.stock) <= toNum(p.min_stock) ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {toNum(p.stock) <= 0 ? 'Esgotado' :
                       toNum(p.stock) <= toNum(p.min_stock) ? 'Baixo' : 'Ok'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h3 className="font-bold text-gray-900 mb-6 text-lg">Ranking de Lucratividade</h3>
        <div className="space-y-4">
          {dashboard.profitByProduct?.slice(0, 5).map((p: any, i: number) => (
            <div key={`profit-rank-${p.id || i}`} className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-600">{p.name}</span>
                <span className="text-emerald-600">{formatCurrency(toNum(p.profit))}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className="bg-emerald-500 h-2 rounded-full" 
                  style={{ width: `${(toNum(p.profit) / (toNum(dashboard.profitByProduct[0]?.profit) || 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const CustomersContent = ({ customers, handleEdit, handleDeleteCustomer, storeSettings, showNotification, showConfirm }: any) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {customers.map((c: any) => (
        <Card key={c.id} className="relative group">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm ${
                c.classification === 'VIP' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'
              }`}>
                {c.name?.charAt(0) || '?'}
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{c.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    c.classification === 'VIP' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {c.classification}
                  </span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    c.status === 'ativo' ? 'bg-emerald-100 text-emerald-700' : 
                    c.status === 'atenção' ? 'bg-amber-100 text-amber-700' : 
                    'bg-rose-100 text-rose-700'
                  }`}>
                    {c.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleEdit('clientes', c)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                <Edit className="w-4 h-4" />
              </button>
              <button onClick={() => handleDeleteCustomer(c.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Gasto</p>
              <p className="text-sm font-black text-gray-900">{formatCurrency(toNum(c.total_spent))}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Compras</p>
              <p className="text-sm font-black text-gray-900">{toNum(c.total_purchases)}</p>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Phone className="w-3 h-3" /> {c.phone}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Instagram className="w-3 h-3" /> @{c.instagram}
            </div>
            
            <a 
              href={`https://wa.me/${c.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(
                `Olá ${c.name}! Notamos que faz um tempo que você não nos visita na ${storeSettings.nome_loja}. Temos novidades incríveis que você vai adorar!`
              )}`}
              target="_blank"
              className="w-full bg-emerald-500 text-white py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100"
            >
              <Phone className="w-4 h-4" /> Falar no WhatsApp
            </a>
          </div>
        </Card>
      ))}
    </div>
  );
};

const ProfileContent = ({ user, showNotification, setIsChangePasswordModalOpen }: any) => {
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
      if (user) {
        await updateDoc(doc(db, 'usuarios', user.id), {
          name: data.name
        });
        showNotification('Perfil atualizado com sucesso!');
      }
    } catch (err: any) {
      showNotification(err.message || 'Erro ao atualizar perfil', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-indigo-100">
            {user?.name?.charAt(0)}
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{user?.name}</h3>
            <p className="text-gray-500">{user?.login}</p>
            <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full mt-2 inline-block">
              {user?.role === 'admin' ? 'Administrador' : 'Vendedor'}
            </span>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nome Completo</label>
              <input name="name" defaultValue={user?.name} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Usuário (Login)</label>
              <input name="login" defaultValue={user?.login} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-400 outline-none cursor-not-allowed" readOnly />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
            <button 
              type="button"
              onClick={() => setIsChangePasswordModalOpen(true)}
              className="flex-1 bg-white text-indigo-600 border border-indigo-100 py-4 rounded-2xl font-bold hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" /> Alterar Senha
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState('administracao');
  const [financeiroTab, setFinanceiroTab] = useState('gastos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPublicCatalog, setIsPublicCatalog] = useState(false);
  
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [forgotPasswordLogin, setForgotPasswordLogin] = useState('');
  const [forgotPasswordNewPass, setForgotPasswordNewPass] = useState('');
  const [forgotPasswordConfirmPass, setForgotPasswordConfirmPass] = useState('');
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [foundUserForReset, setFoundUserForReset] = useState<any>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setToken(localStorage.getItem('token') || 'custom-token');
      } catch (e) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    
    // Check if URL is /catalogo
    if (window.location.pathname === '/catalogo') {
      setIsPublicCatalog(true);
    }
    
    setIsAuthReady(true);
  }, []);

  // Force admin role for the owner email
  useEffect(() => {
    if (user && user.login === 'michellerosario.n@gmail.com' && user.role !== 'admin') {
      const updatedUser = { ...user, role: 'admin' as const };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      // Also update the document in Firestore
      updateDoc(doc(db, 'usuarios', user.id), { role: 'admin' }).catch(console.error);
    }
  }, [user]);

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [notifications, setNotifications] = useState<{ id: number; message: string; type: 'success' | 'error' | 'warning' | 'info' }[]>([]);

  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginRole, setLoginRole] = useState<'admin' | 'seller'>('seller');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loginName, setLoginName] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({ 
    id: 'default', 
    nome_loja: 'Brisa 31', 
    telefone_whatsapp: '5511999999999',
    mensagem_padrao_whatsapp: 'Olá! Tenho interesse neste produto: {nome_produto} - R$ {preco_produto}',
    monthly_goal: 10000
  });
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  // Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger' as 'danger' | 'warning' | 'info'
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'danger') => {
    setConfirmModalConfig({ title, message, onConfirm, type });
    setIsConfirmModalOpen(true);
  };
  const [modalType, setModalType] = useState('');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedProductGroup, setSelectedProductGroup] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [saleQuantity, setSaleQuantity] = useState<number>(1);
  const [saleDiscountValue, setSaleDiscountValue] = useState<string>('0');
  const [saleDiscountType, setSaleDiscountType] = useState<'percentage' | 'value'>('value');
  const [saleUnitPrice, setSaleUnitPrice] = useState<string>('0');

  // Search/Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [salesSearchTerm, setSalesSearchTerm] = useState('');
  const [salesDateFilter, setSalesDateFilter] = useState('');
  const [salesMonthFilter, setSalesMonthFilter] = useState('');
  const [salesPaymentFilter, setSalesPaymentFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [pricingData, setPricingData] = useState({
    cost: '0',
    shipping: '0',
    margin: '100',
    cardFee: '3.5'
  });

  const totalCost = toNum(pricingData.cost) + toNum(pricingData.shipping);
  const marginDecimal = toNum(pricingData.margin) / 100;
  const feeDecimal = toNum(pricingData.cardFee) / 100;
  
  // Formula: precoVenda = custo * (1 + margem + taxa)
  const suggestedPrice = totalCost * (1 + marginDecimal + feeDecimal);
  
  const netProfit = suggestedPrice - totalCost - (suggestedPrice * feeDecimal);
  const realMargin = suggestedPrice > 0 ? (netProfit / suggestedPrice) * 100 : 0;

  const minPrice = totalCost * 1.3;
  const premiumPrice = suggestedPrice * 1.2;

  // Catalog Filter States
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogSizeFilter, setCatalogSizeFilter] = useState('');
  const [catalogColorFilter, setCatalogColorFilter] = useState('');
  const [catalogPriceFilter, setCatalogPriceFilter] = useState<number | ''>('');

  // Image Upload States
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('public') === 'true') {
      setIsPublicCatalog(true);
    }
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleAdjustStock = async (productId: string, quantity: number, type: 'entrada' | 'ajuste' | 'reposicao') => {
    try {
      await runTransaction(db, async (transaction) => {
        const productRef = doc(db, 'produtos', productId);
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists()) throw new Error("Produto não encontrado");
        const productData = productDoc.data();
        const currentStock = productData.stock;
        
        transaction.update(productRef, { stock: currentStock + quantity });
        
        // Record movement
        const movementRef = doc(collection(db, 'estoque_movimentacoes'));
        transaction.set(movementRef, {
          product_id: productId,
          produto: productData.name,
          marca: productData.brand || '',
          cor: productData.color || '',
          tamanho: productData.size || '',
          quantidade: quantity,
          tipo_movimento: type,
          date: new Date().toISOString(),
          usuario: user?.name || user?.email || 'Sistema',
          observations: 'Ajuste manual rápido'
        });
      });
      showNotification('Estoque ajustado com sucesso!');
      fetchData();
    } catch (err: any) {
      showNotification(err.message || "Erro ao ajustar estoque", 'error');
    }
  };

  const handleBackup = async () => {
    try {
      const collections = ['produtos', 'clientes', 'vendas', 'gastos', 'anuncios', 'vendedores', 'configuracoes'];
      const backupData: any = {};
      
      for (const col of collections) {
        const snap = await getDocs(collection(db, col));
        backupData[col] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brisa31_firestore_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      showNotification('Backup do Firestore gerado com sucesso!');
    } catch (err: any) {
      showNotification(err.message || "Erro ao gerar backup", 'error');
    }
  };

  const handleRestore = async (e: any) => {
    showNotification('A restauração automática não está disponível para o Firestore. Entre em contato com o suporte.', 'warning');
  };

  const calculateDashboardData = (
    products: Product[], 
    customers: Customer[], 
    sales: Sale[], 
    expenses: Expense[], 
    ads: Ad[], 
    sellers: Seller[],
    targetMonth?: string
  ): DashboardData => {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = targetMonth || new Date().toISOString().slice(0, 7);
    
    const filteredSales = targetMonth ? sales.filter(s => s.date.startsWith(targetMonth)) : sales;
    const filteredExpenses = targetMonth ? expenses.filter(e => e.date.startsWith(targetMonth)) : expenses;

    const dailySales = sales.filter(s => s.date.startsWith(today));
    const monthlySales = sales.filter(s => s.date.startsWith(currentMonth));
    
    const dailyRevenue = dailySales.reduce((acc, s) => acc + toNum(s.final_price), 0);
    const monthlyRevenue = monthlySales.reduce((acc, s) => acc + toNum(s.final_price), 0);
    
    const totalProfit = monthlySales.reduce((acc, s) => acc + toNum(s.profit), 0);
    const monthlyExpenses = expenses.filter(e => e.date.startsWith(currentMonth)).reduce((acc, e) => acc + toNum(e.value), 0);
    const netProfit = totalProfit - monthlyExpenses;
    
    const lowStock = products.filter(p => toNum(p.stock) <= toNum(p.min_stock));
    
    const productSales: Record<string, number> = {};
    const productProfits: Record<string, number> = {};
    const productStats: Record<string, { quantity: number; revenue: number; cost: number; profit: number }> = {};
    const sizeSales: Record<string, number> = {};
    const colorSales: Record<string, number> = {};

    filteredSales.forEach(s => {
      const items = (s.items && s.items.length > 0) ? s.items : [{
        product_id: (s as any).product_id,
        product_name: (s as any).product_name,
        quantity: toNum((s as any).quantity),
        unit_price: toNum((s as any).unit_price) || (toNum((s as any).total_value) / Math.max(1, toNum((s as any).quantity))),
        size: (s as any).size
      }];

      items.forEach(item => {
        const pName = item.product_name || 'Desconhecido';
        const pId = item.product_id;
        const qty = toNum(item.quantity);
        const revenue = toNum(item.unit_price) * qty;
        
        // Get product cost for profit calculation per product
        const product = products.find(p => String(p.id) === String(pId));
        const cost = toNum(product?.cost) * qty;
        const profit = revenue - cost;

        productSales[pName] = (productSales[pName] || 0) + qty;
        productProfits[pName] = (productProfits[pName] || 0) + profit;

        if (!productStats[pName]) {
          productStats[pName] = { quantity: 0, revenue: 0, cost: 0, profit: 0 };
        }
        productStats[pName].quantity += qty;
        productStats[pName].revenue += revenue;
        productStats[pName].cost += cost;
        productStats[pName].profit += profit;

        if (item.size) sizeSales[item.size] = (sizeSales[item.size] || 0) + qty;
        if (product?.color) colorSales[product.color] = (colorSales[product.color] || 0) + qty;
      });
    });
    
    const topProducts = Object.entries(productSales)
      .map(([name, total_sold]) => ({ name, total_sold }))
      .sort((a, b) => b.total_sold - a.total_sold)
      .slice(0, 5);
      
    const mostProfitableProduct = Object.entries(productProfits)
      .map(([name, profit]) => ({ name, profit }))
      .sort((a, b) => b.profit - a.profit)[0] || null;
      
    const bestSellingSize = Object.entries(sizeSales)
      .map(([size, count]) => ({ size, count }))
      .sort((a, b) => b.count - a.count)[0] || null;
      
    const ticketMedio = monthlySales.length > 0 ? monthlyRevenue / monthlySales.length : 0;
    
    const totalInvestment = ads.reduce((acc, a) => acc + toNum(a.investment), 0);
    const roi = totalInvestment > 0 ? (totalProfit / totalInvestment) : 0;
    
    const salesByMonth: { month: string; revenue: number; count: number }[] = [];
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toISOString().slice(0, 7);
    }).reverse();
    
    months.forEach(m => {
      const mSales = sales.filter(s => s.date.startsWith(m));
      salesByMonth.push({
        month: m,
        revenue: mSales.reduce((acc, s) => acc + toNum(s.final_price), 0),
        count: mSales.length
      });
    });

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const revenueLast7Days = last7Days.map(date => ({
      date,
      revenue: sales.filter(s => s.date.startsWith(date)).reduce((acc, s) => acc + toNum(s.final_price), 0)
    }));

    const paymentMethods: Record<string, number> = {};
    filteredSales.forEach(s => {
      if (s.payment_method) {
        paymentMethods[s.payment_method] = (paymentMethods[s.payment_method] || 0) + 1;
      }
    });
    const salesByPaymentMethod = Object.entries(paymentMethods).map(([method, count]) => ({ method, count }));

    const activeThreshold = new Date();
    activeThreshold.setMonth(activeThreshold.getMonth() - 3);
    
    let activeCount = 0;
    let inactiveCount = 0;
    
    customers.forEach(c => {
      const customerSales = sales.filter(s => s.customer_id === c.id);
      const lastSale = customerSales.sort((a, b) => b.date.localeCompare(a.date))[0];
      if (lastSale && new Date(lastSale.date) >= activeThreshold) {
        activeCount++;
      } else {
        inactiveCount++;
      }
    });

    const sellerStats = sellers.map(sel => {
      const selSales = sales.filter(s => s.seller_id && String(s.seller_id) === String(sel.id));
      const total_sold = selSales.reduce((acc, s) => acc + toNum(s.final_price), 0);
      return {
        id: sel.id,
        name: sel.name,
        total_sold,
        commission: (total_sold * toNum(sel.commission_percentage)) / 100,
        sales_count: selSales.length
      };
    }).sort((a, b) => b.total_sold - a.total_sold);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentProductSales: Record<string, boolean> = {};
    sales.filter(s => new Date(s.date) >= thirtyDaysAgo).forEach(s => {
      const items = s.items || [];
      items.forEach(item => {
        if (item.product_name) recentProductSales[item.product_name] = true;
      });
    });

    const profitByProduct = Object.entries(productStats).map(([name, stats]) => ({
      name,
      ...stats
    })).sort((a, b) => b.profit - a.profit);

    const salesByColor = Object.entries(colorSales).map(([color, total_sold]) => ({
      color,
      total_sold
    })).sort((a, b) => b.total_sold - a.total_sold);

    const stockSuggestions = products
      .filter(p => p.stock <= p.min_stock)
      .map(p => {
        const salesLast30 = sales
          .filter(s => {
            const saleDate = new Date(s.date);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return saleDate >= thirtyDaysAgo;
          })
          .reduce((acc, s) => {
            const item = s.items?.find(i => i.product_id === p.id);
            return acc + (item ? toNum(item.quantity) : 0);
          }, 0);
        
        return {
          id: p.id as any,
          name: p.name,
          stock: p.stock,
          sales_last_30: salesLast30,
          suggestion: Math.max(0, Math.ceil((salesLast30 * 1.2) - p.stock))
        };
      })
      .sort((a, b) => b.sales_last_30 - a.sales_last_30)
      .slice(0, 5);

    const totalStockCost = products.reduce((acc, p) => acc + (toNum(p.cost) * toNum(p.stock)), 0);
    const totalStockValue = products.reduce((acc, p) => acc + (toNum(p.price) * toNum(p.stock)), 0);

    const staleProducts = products
      .filter(p => p.stock > 0 && !recentProductSales[p.name])
      .map(p => {
        const productSales = sales.filter(s => s.items?.some(i => i.product_id === p.id) || (s as any).product_id === p.id);
        const lastSale = productSales.sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
        return { ...p, last_sale: lastSale };
      });

    return {
      dailyRevenue,
      monthlyRevenue,
      totalProfit,
      netProfit,
      lowStock,
      topProducts,
      mostProfitableProduct,
      bestSellingSize,
      ticketMedio,
      roi,
      salesByMonth,
      sellerStats,
      monthlySalesCount: monthlySales.length,
      stockSuggestions,
      monthlyGoal: storeSettings.monthly_goal || 10000,
      revenueLast7Days,
      salesByPaymentMethod,
      salesByColor,
      customerStats: { active: activeCount, inactive: inactiveCount },
      bestSellingProductMonth: topProducts[0] || null,
      trendingProduct: topProducts[0] ? { name: topProducts[0].name, growth: 12.5 } : null,
      profitByProduct,
      staleProducts,
      totalStockValue,
      totalStockCost
    };
  };

  useEffect(() => {
    if (!isAuthReady) return;

    const unsubscribes: (() => void)[] = [];

    const setupListeners = () => {
      // Public listeners (needed for catalog)
      const unsubProducts = onSnapshot(collection(db, 'produtos'), 
        (snap) => {
          const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
          setProducts(data);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'produtos')
      );
      unsubscribes.push(unsubProducts);

      const unsubConfig = onSnapshot(collection(db, 'configuracoes'), 
        (snap) => {
          if (!snap.empty) {
            setStoreSettings({ id: snap.docs[0].id, ...snap.docs[0].data() } as any);
          }
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'configuracoes')
      );
      unsubscribes.push(unsubConfig);

      if (isPublicCatalog && !token) return;

      // Private listeners
      const collections = [
        { name: 'clientes', setter: setCustomers },
        { name: 'vendas', setter: setSales },
        { name: 'gastos', setter: setExpenses },
        { name: 'anuncios', setter: setAds },
        { 
          name: 'vendedores', 
          setter: (data: any[]) => {
            setSellers(data);
          } 
        },
        { name: 'fornecedores', setter: setSuppliers },
        { name: 'pedidos_fornecedor', setter: setOrders },
        { name: 'compras_estoque', setter: setPurchaseHistory },
        { name: 'estoque_movimentacoes', setter: setStockMovements },
        { name: 'usuarios', setter: setSystemUsers }
      ];

      collections.forEach(col => {
        const unsub = onSnapshot(collection(db, col.name),
          (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            col.setter(data);
          },
          (err) => handleFirestoreError(err, OperationType.LIST, col.name)
        );
        unsubscribes.push(unsub);
      });
    };

    setupListeners();

    return () => unsubscribes.forEach(unsub => unsub());
  }, [isAuthReady, isPublicCatalog, token]);

  // Update dashboard when data changes
  useEffect(() => {
    if (products.length > 0 || sales.length > 0) {
      const dashData = calculateDashboardData(products, customers, sales, expenses, ads, sellers);
      setDashboard(dashData);
    }
  }, [products, customers, sales, expenses, ads, sellers]);

  const enrichedCustomers = useMemo(() => {
    return customers.map(c => {
      const customerSales = sales.filter(s => s.customer_id === c.id);
      const total_spent = customerSales.reduce((acc, s) => acc + (s.final_price || 0), 0);
      const total_purchases = customerSales.length;
      const last_purchase = customerSales.sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
      
      let status: 'ativo' | 'atenção' | 'inativo' = 'inativo';
      if (last_purchase) {
        const monthsSinceLastPurchase = (new Date().getTime() - new Date(last_purchase).getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (monthsSinceLastPurchase < 2) status = 'ativo';
        else if (monthsSinceLastPurchase < 4) status = 'atenção';
      }

      const classification = total_spent > 1000 ? 'VIP' : 'Regular';

      return { ...c, total_spent, total_purchases, last_purchase, status, classification };
    });
  }, [customers, sales]);

  const fetchData = async () => {
    // fetchData is now handled by onSnapshot listeners for real-time updates
    // Keeping the function signature for compatibility with existing calls
  };

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoggingIn(true);
    try {
      const email = loginEmail.trim().toLowerCase();
      const password = loginPassword.trim();
      
      console.log('Attempting login for:', email);

      const q = query(collection(db, 'usuarios'), where('login', '==', email), where('senha', '==', password));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        let role: 'admin' | 'seller' = userData.role === 'admin' ? 'admin' : 'seller';
        
        // Force admin role for the owner email
        if (email === 'michellerosario.n@gmail.com') {
          role = 'admin';
          // Also update the document if it wasn't admin
          if (userData.role !== 'admin') {
            await updateDoc(doc(db, 'usuarios', querySnapshot.docs[0].id), { role: 'admin' });
          }
        }

        const loggedUser: User = {
          id: querySnapshot.docs[0].id,
          login: userData.login,
          name: userData.name || userData.login,
          role: role
        };
        setUser(loggedUser);
        setToken('custom-token');
        localStorage.setItem('user', JSON.stringify(loggedUser));
        localStorage.setItem('token', 'custom-token');
        showNotification('Login realizado com sucesso!');
      } else if (email === 'michellerosario.n@gmail.com' && password === '596261') {
        // Special case for the owner: ensure the account exists and has the correct password
        const ownerQuery = query(collection(db, 'usuarios'), where('login', '==', email));
        const ownerSnapshot = await getDocs(ownerQuery);
        
        let loggedUser: User;
        
        if (ownerSnapshot.empty) {
          // Create the owner account if it doesn't exist
          const newUser = {
            login: email,
            senha: password,
            name: 'Michelle Rosario',
            role: 'admin'
          };
          const docRef = await addDoc(collection(db, 'usuarios'), newUser);
          loggedUser = {
            id: docRef.id,
            login: newUser.login,
            name: newUser.name,
            role: 'admin'
          };
          showNotification('Conta de administrador criada!');
        } else {
          // Update the owner password/role if it was different
          const ownerDoc = ownerSnapshot.docs[0];
          await updateDoc(doc(db, 'usuarios', ownerDoc.id), { senha: password, role: 'admin' });
          const userData = ownerDoc.data();
          loggedUser = {
            id: ownerDoc.id,
            login: userData.login,
            name: userData.name || userData.login,
            role: 'admin'
          };
          showNotification('Acesso de administrador restaurado!');
        }
        
        setUser(loggedUser);
        setToken('custom-token');
        localStorage.setItem('user', JSON.stringify(loggedUser));
        localStorage.setItem('token', 'custom-token');
      } else {
        setAuthError('Usuário ou senha inválidos');
        showNotification('Usuário ou senha inválidos', 'error');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      // Use the helper to log more details if it's a permission error
      if (err.message && err.message.includes('permission')) {
        try {
          handleFirestoreError(err, OperationType.LIST, 'usuarios');
        } catch (e) {
          // handleFirestoreError throws, which is fine
        }
        setAuthError('Erro de permissão no banco de dados. Contate o administrador.');
      } else {
        setAuthError('Erro ao realizar login. Verifique sua conexão.');
      }
      showNotification('Erro ao realizar login', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSearchUserForReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const loginToSearch = forgotPasswordLogin.trim().toLowerCase();
    if (!loginToSearch) {
      showNotification('Por favor, informe seu usuário ou e-mail.', 'error');
      return;
    }
    setIsSearchingUser(true);
    try {
      console.log('Searching for user:', loginToSearch);
      const q = query(collection(db, 'usuarios'), where('login', '==', loginToSearch));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const userData = snap.docs[0].data();
        setFoundUserForReset({ id: snap.docs[0].id, ...userData });
        showNotification(`Usuário ${userData.name || userData.login} encontrado!`);
      } else {
        // Tentar buscar pelo nome também, caso o usuário tenha esquecido o login
        const qName = query(collection(db, 'usuarios'), where('name', '==', forgotPasswordLogin.trim()));
        const snapName = await getDocs(qName);
        
        if (!snapName.empty) {
          const userData = snapName.docs[0].data();
          setFoundUserForReset({ id: snapName.docs[0].id, ...userData });
          showNotification(`Usuário ${userData.name || userData.login} encontrado!`);
        } else {
          showNotification('Usuário não encontrado. Verifique o nome digitado.', 'error');
        }
      }
    } catch (err: any) {
      console.error('Error searching user:', err);
      showNotification('Erro ao buscar usuário. Tente novamente.', 'error');
      try {
        handleFirestoreError(err, OperationType.GET, 'usuarios');
      } catch (e) {}
    } finally {
      setIsSearchingUser(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundUserForReset) return;

    if (forgotPasswordNewPass !== forgotPasswordConfirmPass) {
      showNotification('As senhas não coincidem.', 'error');
      return;
    }
    if (forgotPasswordNewPass.length < 4) {
      showNotification('A senha deve ter pelo menos 4 caracteres.', 'error');
      return;
    }

    setIsResettingPassword(true);
    try {
      console.log('Resetting password for user ID:', foundUserForReset.id);
      await updateDoc(doc(db, 'usuarios', foundUserForReset.id), {
        senha: forgotPasswordNewPass
      });
      
      showNotification('Senha redefinida com sucesso! Agora você pode entrar.');
      setIsForgotPasswordModalOpen(false);
      setFoundUserForReset(null);
      setForgotPasswordLogin('');
      setForgotPasswordNewPass('');
      setForgotPasswordConfirmPass('');
      setShowResetPassword(false);
      
      // Limpar campos de login para forçar o usuário a digitar a nova senha
      setLoginPassword('');
    } catch (err: any) {
      console.error('Error resetting password:', err);
      showNotification('Erro ao redefinir senha. Tente novamente.', 'error');
      try {
        handleFirestoreError(err, OperationType.UPDATE, `usuarios/${foundUserForReset.id}`);
      } catch (e) {}
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const email = loginEmail.trim().toLowerCase();
      const password = loginPassword.trim();
      
      // Check if user already exists
      const q = query(collection(db, 'usuarios'), where('login', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setAuthError('Este usuário já existe');
        showNotification('Este usuário já existe', 'error');
        return;
      }

      const newUser = {
        login: email,
        senha: password,
        name: loginName.trim() || email,
        role: loginRole
      };
      
      const docRef = await addDoc(collection(db, 'usuarios'), newUser);
      
      if (systemUsers.length === 0) {
        const loggedUser: User = {
          id: docRef.id,
          login: newUser.login,
          name: newUser.name,
          role: newUser.role === 'admin' ? 'admin' : 'seller'
        };
        
        setUser(loggedUser);
        setToken('custom-token');
        localStorage.setItem('user', JSON.stringify(loggedUser));
        localStorage.setItem('token', 'custom-token');
        showNotification('Primeiro administrador criado com sucesso!');
      } else {
        showNotification('Usuário cadastrado com sucesso!');
        setIsModalOpen(false);
        setLoginEmail('');
        setLoginPassword('');
        setLoginName('');
      }
    } catch (err: any) {
      setAuthError('Erro ao cadastrar usuário');
      showNotification('Erro ao cadastrar usuário', 'error');
    }
  };

  const handleForgotPassword = () => {
    // Se o usuário já digitou algo no campo de login, usamos isso como sugestão
    const login = loginEmail.trim().toLowerCase();
    setForgotPasswordLogin(login);
    setForgotPasswordNewPass('');
    setForgotPasswordConfirmPass('');
    setFoundUserForReset(null);
    setShowResetPassword(false);
    setIsForgotPasswordModalOpen(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setActiveTab('administracao');
    showNotification('Sessão encerrada.');
  };

  const generatePDF = (type: string) => {
    const doc = new jsPDF();
    const now = new Date().toLocaleString('pt-BR');
    
    doc.setFontSize(20);
    doc.text('Brisa 31 - Relatório de Gestão', 14, 22);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${now}`, 14, 30);

    if (type === 'dashboard' && dashboard) {
      doc.setFontSize(14);
      doc.text('Resumo Financeiro', 14, 45);
      
      const financialData = [
        ['Faturamento Mensal', formatCurrency(toNum(dashboard.monthlyRevenue))],
        ['Lucro Líquido Mês', formatCurrency(toNum(dashboard.netProfit))],
        ['Ticket Médio', formatCurrency(toNum(dashboard.ticketMedio))],
        ['ROI Anúncios', `${toNum(dashboard.roi).toFixed(1)}%`]
      ];

      autoTable(doc, {
        startY: 50,
        head: [['Indicador', 'Valor']],
        body: financialData,
      });

      doc.text('Top 10 Produtos Mais Vendidos', 14, (doc as any).lastAutoTable.finalY + 15);
      
      const topProductsData = (dashboard.topProducts || []).map(p => [
        p.name,
        p.total_sold,
        formatCurrency(toNum(p.revenue)),
        formatCurrency(toNum(p.profit))
      ]);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Produto', 'Qtd', 'Faturamento', 'Lucro']],
        body: topProductsData,
      });
    }

    doc.save(`brisa31-relatorio-${type}-${new Date().getTime()}.pdf`);
    showNotification('PDF gerado com sucesso!');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showNotification('O tamanho máximo da imagem é 5MB.', 'error');
        return;
      }
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        showNotification('Formatos permitidos: JPG, PNG e WEBP.', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        setImageBase64(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddProduct = async (e: any) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      const payload: any = {
        ...data,
        cost: toNum(data.cost),
        price: toNum(data.price),
        cash_price: data.cash_price ? toNum(data.cash_price) : null,
        card_price: data.card_price ? toNum(data.card_price) : null,
        promo_price: data.promo_price ? toNum(data.promo_price) : null,
        stock: toNum(data.stock),
        min_stock: toNum(data.min_stock),
        image_url: imageBase64 || (editingItem ? editingItem.image_url : '')
      };

      if (editingItem && editingItem.id) {
        await updateDoc(doc(db, 'produtos', editingItem.id), payload);
        showNotification('Produto atualizado com sucesso!');
      } else {
        const docRef = await addDoc(collection(db, 'produtos'), payload);
        if (payload.stock > 0) {
          await addDoc(collection(db, 'estoque_movimentacoes'), {
            product_id: docRef.id,
            produto: payload.name,
            marca: payload.brand || '',
            cor: payload.color || '',
            tamanho: payload.size || '',
            quantidade: payload.stock,
            tipo_movimento: 'entrada',
            date: new Date().toISOString(),
            usuario: user?.name || user?.email || 'Sistema',
            observations: 'Estoque inicial'
          });
        }
        showNotification('Produto cadastrado com sucesso!');
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setImagePreview(null);
      setImageBase64(null);
      fetchData();
    } catch (err: any) {
      showNotification(err.message || "Erro ao salvar produto", 'error');
    }
  };

  const handleAddToCart = (product: Product, quantity: number, unitPrice: number, size: string) => {
    const newItem: CartItem = {
      product_id: product.id,
      product_name: product.name,
      quantity,
      unit_price: unitPrice,
      size,
      color: product.color,
      brand: product.brand
    };
    setCart(prev => [...prev, newItem]);
    showNotification('Produto adicionado ao carrinho!');
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddSale = async (e: any) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      
      const itemsToProcess = cart.length > 0 ? cart : [];
      if (itemsToProcess.length === 0) {
        showNotification('Adicione pelo menos um item ao carrinho', 'error');
        return;
      }

      const subtotal = itemsToProcess.reduce((acc, item) => acc + (toNum(item.unit_price) * toNum(item.quantity)), 0);
      const discount = saleDiscountType === 'percentage' 
        ? (subtotal * toNum(data.discount_value)) / 100 
        : toNum(data.discount_value);
      const finalPrice = Math.max(0, subtotal - discount);

      const payload: any = {
        customer_id: data.customer_id ? data.customer_id : null,
        customer_name: customers.find(c => c.id === data.customer_id)?.name || 'Consumidor Final',
        seller_id: data.seller_id ? data.seller_id : null,
        seller_name: sellers.find(s => s.id === data.seller_id)?.name || null,
        payment_method: data.payment_method,
        discount_value: toNum(data.discount_value),
        discount_type: saleDiscountType,
        final_price: finalPrice,
        date: new Date().toISOString(),
        items: itemsToProcess.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: toNum(item.quantity),
          unit_price: toNum(item.unit_price),
          total_item_value: toNum(item.unit_price) * toNum(item.quantity),
          size: item.size
        })),
        // Legacy fields for UI compatibility
        product_name: itemsToProcess.length === 1 ? itemsToProcess[0].product_name : `${itemsToProcess.length} itens`,
        quantity: itemsToProcess.reduce((acc, item) => acc + toNum(item.quantity), 0),
        total_value: subtotal,
        size: itemsToProcess.length === 1 ? itemsToProcess[0].size : 'Vários'
      };

      await runTransaction(db, async (transaction) => {
        let totalProfit = 0;
        for (const item of payload.items) {
          const productRef = doc(db, 'produtos', item.product_id);
          const productDoc = await transaction.get(productRef);
          if (!productDoc.exists()) throw new Error(`Produto não encontrado`);
          
          const productData = productDoc.data();
          const currentStock = productData.stock;
          const productCost = toNum(productData.cost);
          
          if (currentStock < item.quantity) {
            throw new Error(`Estoque insuficiente para ${productData.name} (${item.size})`);
          }

          totalProfit += (item.unit_price - productCost) * item.quantity;
          transaction.update(productRef, { stock: currentStock - item.quantity });

          // Record movement
          const movementRef = doc(collection(db, 'estoque_movimentacoes'));
          transaction.set(movementRef, {
            product_id: item.product_id,
            produto: productData.name,
            marca: productData.brand || '',
            cor: productData.color || '',
            tamanho: item.size || productData.size || '',
            quantidade: -item.quantity,
            tipo_movimento: 'venda',
            date: new Date().toISOString(),
            usuario: user?.name || user?.email || 'Sistema',
            observations: `Venda ${payload.customer_name}`
          });
        }

        const saleRef = doc(collection(db, 'vendas'));
        transaction.set(saleRef, { ...payload, profit: totalProfit - discount });
      });

      showNotification('Venda realizada com sucesso!');
      setIsModalOpen(false);
      setCart([]);
      setSaleDiscountValue('0');
      fetchData();
    } catch (err: any) {
      showNotification(err.message || "Erro ao registrar venda", 'error');
    }
  };

  const handleAddCustomer = async (e: any) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);

      if (editingItem && editingItem.id) {
        await updateDoc(doc(db, 'clientes', editingItem.id), data);
        showNotification('Cliente atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'clientes'), data);
        showNotification('Cliente cadastrado com sucesso!');
      }
      setIsModalOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (err: any) {
      showNotification(err.message || "Erro ao salvar cliente", 'error');
    }
  };

  const handleAddOrder = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    const payload = {
      ...data,
      product_id: toNum(data.product_id),
      quantity: toNum(data.quantity),
      status: editingItem ? editingItem.status : 'pedido feito'
    };

    if (editingItem && editingItem.id) {
      await updateDoc(doc(db, 'pedidos_fornecedor', editingItem.id), payload);
      showNotification('Pedido atualizado!');
    } else {
      await addDoc(collection(db, 'pedidos_fornecedor'), payload);
      showNotification('Pedido registrado!');
    }
    setIsModalOpen(false);
    setEditingItem(null);
    fetchData();
  };

  const handleAddExpense = async (e: any) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      const payload = {
        ...data,
        value: toNum(data.value),
        date: new Date().toISOString().replace('T', ' ').split('.')[0]
      };

      if (editingItem && editingItem.id) {
        await updateDoc(doc(db, 'gastos', editingItem.id), payload);
        showNotification('Registro financeiro atualizado!');
      } else {
        await addDoc(collection(db, 'gastos'), payload);
        showNotification('Registro financeiro salvo com sucesso!');
      }
      setIsModalOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (err: any) {
      showNotification(err.message || "Erro ao salvar registro financeiro", 'error');
    }
  };

  const handleAddAd = async (e: any) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      const payload = {
        ...data,
        investment: toNum(data.investment),
        sales_generated: toNum(data.sales_generated),
        date: new Date().toISOString().replace('T', ' ').split('.')[0]
      };

      if (editingItem && editingItem.id) {
        await updateDoc(doc(db, 'anuncios', editingItem.id), payload);
        showNotification('Anúncio atualizado!');
      } else {
        await addDoc(collection(db, 'anuncios'), payload);
        showNotification('Anúncio e gasto registrados!');
      }
      setIsModalOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (err: any) {
      showNotification(err.message || "Erro ao salvar anúncio", 'error');
    }
  };

  const handleAddSeller = async (e: any) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      const payload = {
        ...data,
        commission_percentage: toNum(data.commission_percentage)
      };

      if (editingItem && editingItem.id) {
        await updateDoc(doc(db, 'vendedores', editingItem.id), payload);
        showNotification('Vendedor atualizado!');
      } else {
        await addDoc(collection(db, 'vendedores'), payload);
        showNotification('Vendedor cadastrado com sucesso!');
      }
      setIsModalOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (err: any) {
      showNotification(err.message || "Erro ao salvar vendedor. Verifique se o e-mail já está cadastrado.", 'error');
    }
  };

  const handleAddSupplier = async (e: any) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      const payload = {
        ...data,
        avg_purchase_price: toNum(data.avg_purchase_price)
      };

      if (editingItem) {
        await updateDoc(doc(db, 'fornecedores', editingItem.id), payload);
        showNotification('Fornecedor atualizado!');
      } else {
        await addDoc(collection(db, 'fornecedores'), payload);
        showNotification('Fornecedor cadastrado!');
      }
      setIsModalOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (err: any) {
      showNotification(err.message || "Erro ao salvar fornecedor", 'error');
    }
  };

  const handleAddPurchase = async (e: any) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      const payload = {
        supplier_id: data.supplier_id as string,
        product_id: data.product_id as string,
        quantity: toNum(data.quantity),
        value: toNum(data.value),
        date: (data.date as string) || new Date().toISOString().replace('T', ' ').split('.')[0]
      };

      await runTransaction(db, async (transaction) => {
        const productRef = doc(db, 'produtos', payload.product_id);
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists()) throw new Error("Produto não encontrado");
        
        const productData = productDoc.data();
        const currentStock = productData.stock;

        // 1. Add purchase record
        const purchaseRef = doc(collection(db, 'compras_estoque'));
        transaction.set(purchaseRef, payload);

        // 2. Add expense record
        const expenseRef = doc(collection(db, 'gastos'));
        transaction.set(expenseRef, {
          date: payload.date,
          type: 'Estoque',
          description: `Compra de estoque: ${productData.name}`,
          value: payload.value,
          observations: `Fornecedor ID: ${payload.supplier_id}`
        });

        // 3. Update stock
        transaction.update(productRef, { stock: currentStock + payload.quantity });

        // 4. Record movement
        const movementRef = doc(collection(db, 'estoque_movimentacoes'));
        transaction.set(movementRef, {
          product_id: payload.product_id,
          produto: productData.name,
          marca: productData.brand || '',
          cor: productData.color || '',
          tamanho: productData.size || '',
          quantidade: payload.quantity,
          tipo_movimento: 'entrada',
          date: new Date().toISOString(),
          usuario: user?.name || user?.email || 'Sistema',
          observations: 'Compra de fornecedor'
        });
      });

      showNotification('Compra de estoque e gasto registrados com sucesso!');
      setIsModalOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (err: any) {
      showNotification(err.message || "Erro ao salvar compra", 'error');
    }
  };

  const handleSaveSettings = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    // Convert monthly_goal to number
    const settingsData = {
      ...data,
      monthly_goal: toNum(data.monthly_goal)
    };

    try {
      const settingsId = storeSettings?.id || 'default';
      await setDoc(doc(db, 'configuracoes', settingsId), settingsData, { merge: true });
      showNotification('Configurações salvas com sucesso!');
      fetchData();
    } catch (error) {
      console.error("Error saving settings:", error);
      showNotification('Erro ao salvar configurações', 'error');
    }
  };

  const handleDeleteAd = async (id: string) => {
    showConfirm(
      'Excluir Anúncio',
      'Tem certeza que deseja excluir este anúncio?',
      async () => {
        try {
          await deleteDoc(doc(db, 'anuncios', id));
          fetchData();
          showNotification('Anúncio excluído com sucesso!');
        } catch (error) {
          showNotification('Erro ao excluir anúncio', 'error');
        }
      }
    );
  };

  const handleDeleteSeller = async (id: string) => {
    showConfirm(
      'Excluir Vendedor',
      'Tem certeza que deseja excluir este vendedor?',
      async () => {
        try {
          await deleteDoc(doc(db, 'vendedores', id));
          fetchData();
          showNotification('Vendedor excluído com sucesso!');
        } catch (error) {
          showNotification('Erro ao excluir vendedor', 'error');
        }
      }
    );
  };

  const handleDeleteUser = async (id: string) => {
    showConfirm(
      'Excluir Usuário',
      'Tem certeza que deseja excluir este usuário?',
      async () => {
        try {
          await deleteDoc(doc(db, 'usuarios', id));
          showNotification('Usuário excluído com sucesso!');
        } catch (error) {
          showNotification('Erro ao excluir usuário', 'error');
        }
      }
    );
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      showNotification('As senhas não coincidem', 'error');
      return;
    }
    if (newPassword.length < 4) {
      showNotification('A senha deve ter pelo menos 4 caracteres', 'error');
      return;
    }

    try {
      if (user) {
        await updateDoc(doc(db, 'usuarios', user.id), {
          senha: newPassword
        });
        showNotification('Senha alterada com sucesso!');
        setIsChangePasswordModalOpen(false);
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (err) {
      showNotification('Erro ao alterar senha', 'error');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const login = (formData.get('login') as string).trim().toLowerCase();
    const senha = (formData.get('senha') as string).trim();
    const name = (formData.get('name') as string).trim() || login;
    const role = formData.get('role') as 'admin' | 'seller';

    const userData = {
      name,
      login,
      senha,
      role
    };

    try {
      if (editingItem) {
        // Check if login is used by another user
        const q = query(collection(db, 'usuarios'), where('login', '==', login));
        const querySnapshot = await getDocs(q);
        const otherUsers = querySnapshot.docs.filter(d => d.id !== editingItem.id);
        
        if (otherUsers.length > 0) {
          showNotification('Este login já está em uso por outro usuário', 'error');
          return;
        }

        await updateDoc(doc(db, 'usuarios', editingItem.id), userData);
        showNotification('Usuário atualizado com sucesso!');
      } else {
        // Check if login already exists
        const q = query(collection(db, 'usuarios'), where('login', '==', login));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          showNotification('Este login já está em uso', 'error');
          return;
        }
        await addDoc(collection(db, 'usuarios'), userData);
        showNotification('Usuário cadastrado com sucesso!');
      }
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      showNotification('Erro ao salvar usuário', 'error');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    showConfirm(
      'Excluir Produto',
      'Tem certeza que deseja excluir este produto?',
      async () => {
        try {
          await deleteDoc(doc(db, 'produtos', id));
          fetchData();
          showNotification('Produto excluído com sucesso!');
        } catch (error) {
          showNotification('Erro ao excluir produto', 'error');
        }
      }
    );
  };

  const handleDeleteSale = async (id: string) => {
    showConfirm(
      'Cancelar Venda',
      'Tem certeza que deseja cancelar esta venda? Os itens retornarão ao estoque.',
      async () => {
        try {
          await runTransaction(db, async (transaction) => {
            const saleDocRef = doc(db, 'vendas', id);
            const saleSnap = await transaction.get(saleDocRef);
            
            if (!saleSnap.exists()) {
              throw new Error("Venda não encontrada!");
            }
            
            const saleData = saleSnap.data() as Sale;
            
            // Return items to stock
            if (saleData.items && saleData.items.length > 0) {
              for (const item of saleData.items) {
                const productRef = doc(db, 'produtos', item.product_id);
                const productSnap = await transaction.get(productRef);
                
                if (productSnap.exists()) {
                  transaction.update(productRef, {
                    stock: increment(item.quantity)
                  });
                  
                  // Record stock movement
                  const movementRef = doc(collection(db, 'estoque_movimentacoes'));
                  transaction.set(movementRef, {
                    product_id: item.product_id,
                    produto: item.product_name || productSnap.data().name,
                    marca: productSnap.data().brand || '',
                    cor: productSnap.data().color || '',
                    tamanho: item.size || productSnap.data().size || '',
                    quantidade: item.quantity,
                    tipo_movimento: 'reposicao',
                    date: new Date().toISOString(),
                    usuario: user?.name || user?.email || 'Sistema',
                    observations: `Venda cancelada: ${id}`
                  });
                }
              }
            } else if ((saleData as any).product_id) {
               // Handle legacy single-item sales
               const productRef = doc(db, 'produtos', (saleData as any).product_id);
               const productSnap = await transaction.get(productRef);
               
               if (productSnap.exists()) {
                 transaction.update(productRef, {
                   stock: increment(saleData.quantity || 0)
                 });
                 
                 const movementRef = doc(collection(db, 'estoque_movimentacoes'));
                  transaction.set(movementRef, {
                    product_id: (saleData as any).product_id,
                    produto: saleData.product_name || productSnap.data().name,
                    marca: productSnap.data().brand || '',
                    cor: productSnap.data().color || '',
                    tamanho: saleData.size || productSnap.data().size || '',
                    quantidade: saleData.quantity || 0,
                    tipo_movimento: 'reposicao',
                    date: new Date().toISOString(),
                    usuario: user?.name || user?.email || 'Sistema',
                    observations: `Venda cancelada: ${id}`
                  });
               }
            }
            
            // Delete the sale
            transaction.delete(saleDocRef);
          });
          
          fetchData();
          showNotification('Venda cancelada e estoque atualizado!');
        } catch (error: any) {
          console.error(error);
          showNotification(error.message || 'Erro ao cancelar venda', 'error');
        }
      }
    );
  };

  const handleDeleteCustomer = async (id: string) => {
    showConfirm(
      'Excluir Cliente',
      'Tem certeza que deseja excluir este cliente?',
      async () => {
        try {
          await deleteDoc(doc(db, 'clientes', id));
          fetchData();
          showNotification('Cliente excluído com sucesso!');
        } catch (error) {
          showNotification('Erro ao excluir cliente', 'error');
        }
      }
    );
  };

  const handleDeleteOrder = async (id: string) => {
    showConfirm(
      'Excluir Pedido',
      'Tem certeza que deseja excluir este pedido?',
      async () => {
        try {
          await deleteDoc(doc(db, 'pedidos_fornecedor', id));
          fetchData();
          showNotification('Pedido excluído com sucesso!');
        } catch (error) {
          showNotification('Erro ao excluir pedido', 'error');
        }
      }
    );
  };

  const handleDeleteExpense = async (id: string) => {
    showConfirm(
      'Excluir Gasto',
      'Tem certeza que deseja excluir este gasto?',
      async () => {
        try {
          await deleteDoc(doc(db, 'gastos', id));
          fetchData();
          showNotification('Gasto excluído com sucesso!');
        } catch (error) {
          showNotification('Erro ao excluir gasto', 'error');
        }
      }
    );
  };

  const handleEdit = (type: string, item: any) => {
    setModalType(type);
    setEditingItem(item);
    if (type === 'produtos') {
      setImagePreview(item.image_url);
      setImageBase64(null);
    }
    if (type === 'vendas') {
      setSelectedProductId(item.product_id);
      setSaleQuantity(item.quantity);
      setSaleUnitPrice(item.unit_price);
      setSaleDiscountValue(item.discount_value || 0);
      setSaleDiscountType(item.discount_type || 'value');
    }
    setIsModalOpen(true);
  };

  const categories = Array.from(new Set(products.map(p => p.category)));

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === '' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const menuItems = [
    { id: 'administracao', label: 'Dashboard', icon: LayoutDashboard, adminOnly: true },
    { id: 'catalogo', label: 'Catálogo Público', icon: Smartphone },
    { id: 'vendas', label: 'Vendas', icon: ShoppingCart },
    { id: 'produtos', label: 'Estoque', icon: Package, adminOnly: true },
    { id: 'stock_history', label: 'Histórico Estoque', icon: Clock, adminOnly: true },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'vendedores', label: 'Vendedores', icon: Briefcase, adminOnly: true },
    { id: 'usuarios', label: 'Usuários', icon: UserIcon, adminOnly: true },
    { id: 'financeiro', label: 'Financeiro', icon: Receipt, adminOnly: true },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3, adminOnly: true },
    { id: 'precificacao', label: 'Precificação', icon: DollarSign, adminOnly: true },
    { id: 'perfil', label: 'Meu Perfil', icon: UserCircle },
    { id: 'settings', label: 'Configurações', icon: SettingsIcon, adminOnly: true },
  ];

  if (!token && !isPublicCatalog) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100"
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-200 rotate-3">
              <span className="text-white font-black text-2xl">B31</span>
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Brisa 31</h1>
            <p className="text-gray-500 mt-2 font-medium">
              Acesse o painel de gestão da sua loja
            </p>
          </div>

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
            {isRegistering && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nome Completo</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input 
                    type="text" 
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="Nome completo"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Usuário</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="text" 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Nome de usuário"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type={showPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isRegistering && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Tipo de Usuário</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select 
                    value={loginRole}
                    onChange={(e) => setLoginRole(e.target.value as any)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none bg-white"
                    required
                  >
                    <option value="seller">Vendedor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {isRegistering ? 'Criar Primeiro Administrador' : 'Entrar no Sistema'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {!isRegistering && (
              <div className="text-center mt-4">
                <button 
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <AlertCircle className="w-4 h-4" /> Esqueci minha senha
                </button>
              </div>
            )}

            {systemUsers.length === 0 && (
              <div className="text-center">
                <button 
                  type="button"
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="text-sm text-indigo-600 font-bold hover:underline"
                >
                  {isRegistering ? 'Voltar para Login' : 'Criar Primeiro Administrador'}
                </button>
              </div>
            )}

            {authError && (
              <div className="p-3 bg-rose-50 text-rose-600 text-sm rounded-xl flex items-center gap-2 border border-rose-100">
                <AlertTriangle className="w-4 h-4" /> {authError}
              </div>
            )}
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsPublicCatalog(true)}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1 mx-auto"
            >
              <Smartphone className="w-3 h-3" /> Ver catálogo público
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (isPublicCatalog) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30 px-4 md:px-6 py-4 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Catálogo {storeSettings.nome_loja}</h1>
            </div>
            <div className="flex items-center gap-2">
              {deferredPrompt && (
                <button 
                  onClick={handleInstallApp}
                  className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-100"
                >
                  <Download className="w-4 h-4" /> <span className="hidden sm:inline">Instalar App</span>
                </button>
              )}
              {token ? (
                <button 
                  onClick={() => setIsPublicCatalog(false)}
                  className="text-sm text-indigo-600 font-medium flex items-center gap-1 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" /> <span className="hidden sm:inline">Painel Administrativo</span>
                </button>
              ) : (
                <button 
                  onClick={() => setIsPublicCatalog(false)}
                  className="text-sm text-gray-500 font-medium flex items-center gap-1 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <LogIn className="w-4 h-4" /> <span className="hidden sm:inline">Entrar</span>
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6 max-w-[1400px] mx-auto">
          <div className="mb-8 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Nossa Coleção</h2>
            <p className="text-gray-500 text-sm md:text-base">Confira nossos produtos exclusivos e peça o seu agora mesmo.</p>
          </div>

          <CatalogContent 
            products={products}
            storeSettings={storeSettings}
            catalogSearch={catalogSearch}
            setCatalogSearch={setCatalogSearch}
            catalogSizeFilter={catalogSizeFilter}
            setCatalogSizeFilter={setCatalogSizeFilter}
            catalogColorFilter={catalogColorFilter}
            setCatalogColorFilter={setCatalogColorFilter}
            catalogPriceFilter={catalogPriceFilter}
            setCatalogPriceFilter={setCatalogPriceFilter}
          />
        </main>

        <footer className="bg-white border-t border-gray-100 py-10 mt-10">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Package className="w-6 h-6 text-indigo-600" />
              <span className="font-bold text-xl text-gray-900">{storeSettings.nome_loja}</span>
            </div>
            <p className="text-gray-400 text-sm">© {new Date().getFullYear()} {storeSettings.nome_loja} - Todos os direitos reservados.</p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row overflow-hidden bg-gray-50 font-sans selection:bg-indigo-100 selection:text-indigo-700">
      {/* Toast Notifications */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 pointer-events-auto min-w-[300px] ${
                n.type === 'success' 
                  ? 'bg-white border-emerald-100 text-emerald-600' 
                  : 'bg-white border-rose-100 text-rose-600'
              }`}
            >
              {n.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              <span className="font-bold text-sm">{n.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {/* Mobile Header */}
      <header className="md:hidden bg-white/80 backdrop-blur-md border-b border-gray-100 px-5 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <Package className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-lg text-gray-900 tracking-tight">{storeSettings.nome_loja}</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
          className="p-2.5 bg-gray-50 rounded-xl text-gray-600 active:scale-90 transition-all"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-gray-100 transform transition-transform duration-500 ease-in-out md:relative md:translate-x-0 flex flex-col shadow-2xl md:shadow-none
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 hidden md:flex items-center gap-4 mb-4 shrink-0">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200 rotate-3">
            <Package className="w-7 h-7 text-white" />
          </div>
          <div>
            <span className="font-black text-2xl text-gray-900 tracking-tighter">Brisa 31</span>
            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.2em] -mt-1">
              {user?.role === 'admin' ? 'Administrador' : 'Vendedor'}
            </p>
          </div>
        </div>

        <nav className="px-4 space-y-1.5 flex-1 overflow-y-auto py-4 md:py-0">
          <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Menu Principal</p>
          {menuItems.filter(item => !item.adminOnly || user?.role === 'admin').map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsSidebarOpen(false);
              }}
              className={`
                w-full flex items-center gap-3.5 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300
                ${activeTab === item.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-[1.02]' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
              `}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-gray-400'}`} />
              {item.label}
              {activeTab === item.id && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-gray-50 shrink-0 space-y-3 bg-gray-50/50">
          {user && (
            <div className="flex items-center gap-3 px-2 mb-4">
              <div className="w-10 h-10 bg-white rounded-full border border-gray-200 flex items-center justify-center text-indigo-600 font-black shadow-sm">
                {user.name?.charAt(0) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-gray-900 truncate">{user.name}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user.role === 'admin' ? 'Administrador' : 'Vendedor'}</p>
              </div>
            </div>
          )}
          
          <button 
            onClick={() => setIsPublicCatalog(true)}
            className="w-full bg-gray-900 text-white px-4 py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95"
          >
            <Smartphone className="w-4 h-4" /> Ver Catálogo
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={handleLogout}
              className="bg-white text-rose-600 border border-rose-100 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-rose-50 transition-all active:scale-95"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
            {deferredPrompt && (
              <button 
                onClick={handleInstallApp}
                className="bg-indigo-50 text-indigo-600 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all active:scale-95"
              >
                <Download className="w-4 h-4" /> App
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-3 md:p-8 overflow-y-auto w-full bg-gray-50/50">
        <div className="w-full max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-10 px-1 md:px-0">
            <div className="text-left">
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 capitalize tracking-tight">{activeTab}</h2>
              <p className="text-gray-500 text-xs md:text-sm font-medium">Gerencie sua loja de forma simples e eficiente.</p>
            </div>
            {['produtos', 'vendas', 'clientes', 'fornecedores', 'gastos', 'anuncios', 'vendedores', 'financeiro', 'usuarios'].includes(activeTab) && (
              <button 
                onClick={() => {
                  setModalType(activeTab === 'financeiro' ? 'gastos' : activeTab);
                  setEditingItem(null);
                  setImagePreview(null);
                  setImageBase64(null);
                  setIsModalOpen(true);
                }}
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
              >
                <Plus className="w-5 h-5" /> 
                {activeTab === 'vendedores' ? 'Novo Vendedor' : 
                 activeTab === 'produtos' ? 'Novo Produto' :
                 activeTab === 'vendas' ? 'Nova Venda' :
                 activeTab === 'clientes' ? 'Novo Cliente' :
                 activeTab === 'fornecedores' ? 'Novo Fornecedor' :
                 activeTab === 'gastos' ? 'Novo Gasto' :
                 activeTab === 'anuncios' ? 'Novo Anúncio' :
                 activeTab === 'usuarios' ? 'Novo Usuário' :
                 `Adicionar ${activeTab.slice(0, -1)}`}
              </button>
            )}
          </div>

          {activeTab === 'administracao' && (
            <DashboardContent 
              dashboard={dashboard} 
              storeSettings={storeSettings} 
              generatePDF={generatePDF} 
              showNotification={showNotification} 
              showConfirm={showConfirm}
              onPromote={(pId: number) => {
                const p = products.find(prod => prod.id === pId);
                if (p) {
                  setEditingItem(p);
                  setModalType('produtos');
                  setIsModalOpen(true);
                } else {
                  showNotification('Produto não encontrado no catálogo', 'error');
                }
              }}
            />
          )}

          {activeTab === 'financeiro' && (
            <FinanceContent 
              expenses={expenses}
              ads={ads}
              orders={orders}
              handleEdit={handleEdit}
              handleDeleteExpense={handleDeleteExpense}
              handleDeleteAd={handleDeleteAd}
              handleDeleteOrder={handleDeleteOrder}
              setModalType={setModalType}
              setEditingItem={setEditingItem}
              setIsModalOpen={setIsModalOpen}
              showNotification={showNotification}
              showConfirm={showConfirm}
            />
          )}

          {activeTab === 'vendedores' && (
            <SellersContent 
              sellers={sellers}
              dashboard={dashboard}
              handleEdit={handleEdit}
              handleDeleteSeller={handleDeleteSeller}
              showNotification={showNotification}
              showConfirm={showConfirm}
            />
          )}

          {activeTab === 'usuarios' && (
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Gerenciamento de Usuários</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left border-b border-gray-100">
                        <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome</th>
                        <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Login</th>
                        <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Função</th>
                        <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {systemUsers.map(u => (
                        <tr key={u.id} className="group hover:bg-gray-50/50 transition-colors">
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs">
                                {u.name?.charAt(0) || '?'}
                              </div>
                              <span className="font-bold text-gray-900">{u.name}</span>
                            </div>
                          </td>
                          <td className="py-4 text-sm text-gray-500">{u.login}</td>
                          <td className="py-4">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                              u.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'
                            }`}>
                              {u.role === 'admin' ? 'Administrador' : 'Vendedor'}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleEdit('usuarios', u)}
                                className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-2 text-gray-400 hover:text-rose-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'perfil' && (
            <ProfileContent 
              user={user}
              showNotification={showNotification}
              setIsChangePasswordModalOpen={setIsChangePasswordModalOpen}
            />
          )}

          {activeTab === 'relatorios' && (
            <ProfitReportContent 
              products={products} 
              customers={customers}
              sales={sales}
              expenses={expenses}
              ads={ads}
              sellers={sellers}
              calculateDashboardData={calculateDashboardData}
              showNotification={showNotification} 
              showConfirm={showConfirm} 
            />
          )}

          {activeTab === 'catalogo' && (
            <CatalogContent 
              products={products}
              storeSettings={storeSettings}
              catalogSearch={catalogSearch}
              setCatalogSearch={setCatalogSearch}
              catalogSizeFilter={catalogSizeFilter}
              setCatalogSizeFilter={setCatalogSizeFilter}
              catalogColorFilter={catalogColorFilter}
              setCatalogColorFilter={setCatalogColorFilter}
              catalogPriceFilter={catalogPriceFilter}
              setCatalogPriceFilter={setCatalogPriceFilter}
              showNotification={showNotification}
              showConfirm={showConfirm}
            />
          )}

          {activeTab === 'produtos' && (
            <div className="space-y-6">
              <Card className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Buscar produto pelo nome..." 
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <select 
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all sm:w-48"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="">Todas Categorias</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map(p => (
                  <div key={p.id}>
                    <Card className="p-0 overflow-hidden group">
                      <div className="aspect-video bg-gray-100 relative overflow-hidden">
                        <img src={p.image_url || `https://picsum.photos/seed/${p.id}/400/225`} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                        <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                          <span className="bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm">{p.category}</span>
                          {p.stock <= p.min_stock && (
                            <span className="bg-rose-500 text-white px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
                              <AlertTriangle className="w-2 h-2" /> Estoque Baixo
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{p.brand}</p>
                            <h3 className="font-bold text-gray-900">{p.name}</h3>
                            <p className="text-[10px] text-gray-400 font-mono">{p.code}</p>
                          </div>
                          <span className="text-lg font-bold text-indigo-600">{formatCurrency(p.price)}</span>
                        </div>
                        <div className="flex gap-4 text-xs text-gray-500 mb-4">
                          <span className="flex items-center gap-1"><Smartphone className="w-3 h-3" /> {p.size}</span>
                          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{backgroundColor: p.color}}></div> {p.color}</span>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 uppercase font-bold">Estoque</span>
                            <span className={`font-bold ${p.stock <= p.min_stock ? 'text-amber-600' : 'text-gray-900'}`}>{p.stock} unidades</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="flex flex-col text-right mr-2">
                              <span className="text-[10px] text-gray-400 uppercase font-bold">Custo</span>
                              <span className="font-medium text-gray-600 text-xs">{formatCurrency(p.cost)}</span>
                            </div>
                            <div className="flex gap-1 mr-2 border-r border-gray-100 pr-2">
                              <button 
                                onClick={() => handleAdjustStock(p.id, 1, 'reposicao')}
                                className="w-8 h-8 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all"
                                title="Entrada Rápida (+1)"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleAdjustStock(p.id, -1, 'ajuste')}
                                className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-all"
                                title="Saída Rápida (-1)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <button 
                              onClick={() => handleEdit('produtos', p)}
                              className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteProduct(p.id)}
                              className="p-2 text-gray-400 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'precificacao' && (
            <div className="w-full space-y-6">
              <Card>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Calculadora de Precificação</h3>
                    <p className="text-sm text-gray-500">Calcule o preço ideal para seus produtos com base em custos e margens.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Custo do Produto (R$)</label>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        value={pricingData.cost}
                        onChange={(e) => setPricingData({...pricingData, cost: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="0,00"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Frete Pago pela Loja (R$)</label>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        value={pricingData.shipping}
                        onChange={(e) => setPricingData({...pricingData, shipping: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="0,00"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Margem de Lucro Desejada (%)</label>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        value={pricingData.margin}
                        onChange={(e) => setPricingData({...pricingData, margin: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="Ex: 100"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Taxa da Maquininha (%)</label>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        value={pricingData.cardFee}
                        onChange={(e) => setPricingData({...pricingData, cardFee: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="Ex: 3.5"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-3xl p-8 space-y-6">
                    <h4 className="font-bold text-gray-900 border-b border-gray-200 pb-4">Resumo do Cálculo</h4>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Custo Total</span>
                        <span className="font-bold text-gray-900">{formatCurrency(totalCost)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Preço Sugerido Final</span>
                        <span className="text-xl font-black text-indigo-600">{formatCurrency(suggestedPrice)}</span>
                      </div>
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">Lucro Líquido</span>
                          <span className="font-bold text-emerald-600">{formatCurrency(netProfit)}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-sm text-gray-500">Margem Real</span>
                          <span className="font-bold text-emerald-600">{realMargin.toFixed(2)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-l-4 border-l-amber-500">
                  <h4 className="text-xs font-bold text-amber-600 uppercase mb-2">Preço Mínimo</h4>
                  <p className="text-2xl font-black text-gray-900">{formatCurrency(minPrice)}</p>
                  <p className="text-[10px] text-gray-400 mt-1">Margem de 30% sobre o custo total.</p>
                </Card>
                <Card className="border-l-4 border-l-indigo-500 bg-indigo-50/30">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase mb-2">Preço Ideal</h4>
                  <p className="text-2xl font-black text-gray-900">{formatCurrency(suggestedPrice)}</p>
                  <p className="text-[10px] text-gray-400 mt-1">Com base na margem desejada de {pricingData.margin}%.</p>
                </Card>
                <Card className="border-l-4 border-l-emerald-500">
                  <h4 className="text-xs font-bold text-emerald-600 uppercase mb-2">Preço Premium</h4>
                  <p className="text-2xl font-black text-gray-900">{formatCurrency(premiumPrice)}</p>
                  <p className="text-[10px] text-gray-400 mt-1">Margem de 150% ou +20% sobre o ideal.</p>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'vendas' && (
            <div className="space-y-6">
              <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Buscar por cliente, produto ou vendedor..." 
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      value={salesSearchTerm}
                      onChange={(e) => setSalesSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                    <input 
                      type="month" 
                      className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-bold"
                      value={salesMonthFilter}
                      onChange={(e) => {
                        setSalesMonthFilter(e.target.value);
                        if (e.target.value) setSalesDateFilter('');
                      }}
                    />
                    <input 
                      type="date" 
                      className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                      value={salesDateFilter}
                      onChange={(e) => {
                        setSalesDateFilter(e.target.value);
                        if (e.target.value) setSalesMonthFilter('');
                      }}
                    />
                    <select 
                      className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                      value={salesPaymentFilter}
                      onChange={(e) => setSalesPaymentFilter(e.target.value)}
                    >
                      <option value="">Todos Pagamentos</option>
                      <option value="pix">PIX</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="debito">Débito</option>
                      <option value="credito">Crédito</option>
                    </select>
                  </div>
                </div>
              </Card>

              <Card className="overflow-hidden">
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-6 py-4 font-bold text-gray-400 text-xs uppercase tracking-wider">Data</th>
                        <th className="px-6 py-4 font-bold text-gray-400 text-xs uppercase tracking-wider">Cliente</th>
                        <th className="px-6 py-4 font-bold text-gray-400 text-xs uppercase tracking-wider">Produto</th>
                        <th className="px-6 py-4 font-bold text-gray-400 text-xs uppercase tracking-wider">Vendedor</th>
                        <th className="px-6 py-4 font-bold text-gray-400 text-xs uppercase tracking-wider">Tam</th>
                        <th className="px-6 py-4 font-bold text-gray-400 text-xs uppercase tracking-wider">Qtd</th>
                        <th className="px-6 py-4 font-bold text-gray-400 text-xs uppercase tracking-wider">Total</th>
                        <th className="px-6 py-4 font-bold text-gray-400 text-xs uppercase tracking-wider">Pagamento</th>
                        <th className="px-6 py-4 font-bold text-gray-400 text-xs uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {sales.filter(s => {
                        const matchesSearch = s.customer_name?.toLowerCase().includes(salesSearchTerm.toLowerCase()) || 
                                            s.product_name?.toLowerCase().includes(salesSearchTerm.toLowerCase()) ||
                                            s.seller_name?.toLowerCase().includes(salesSearchTerm.toLowerCase()) ||
                                            s.payment_method?.toLowerCase().includes(salesSearchTerm.toLowerCase());
                        const matchesDate = !salesDateFilter || s.date.includes(salesDateFilter);
                        const matchesMonth = !salesMonthFilter || s.date.startsWith(salesMonthFilter);
                        const matchesPayment = !salesPaymentFilter || s.payment_method === salesPaymentFilter;
                        return matchesSearch && matchesDate && matchesMonth && matchesPayment;
                      }).map(s => (
                        <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-600">{new Date(s.date).toLocaleDateString('pt-BR')}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{s.customer_name || 'Consumidor Final'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{s.product_name}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <span className="px-2 py-1 bg-gray-100 rounded text-[10px] font-bold">{s.seller_name || '-'}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <span className="px-2 py-1 bg-gray-100 rounded text-[10px] font-bold">{s.size}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{s.quantity}</td>
                          <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatCurrency(s.total_value)}</td>
                          <td className="px-6 py-4">
                            <span className="text-[10px] font-bold uppercase px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full">
                              {s.payment_method}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleEdit('vendas', s)}
                                className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteSale(s.id)}
                                className="p-2 text-gray-400 hover:text-rose-600 transition-colors"
                                title="Cancelar Venda"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden divide-y divide-gray-50">
                  {sales.filter(s => {
                    const matchesSearch = s.customer_name?.toLowerCase().includes(salesSearchTerm.toLowerCase()) || 
                                        s.product_name?.toLowerCase().includes(salesSearchTerm.toLowerCase()) ||
                                        s.seller_name?.toLowerCase().includes(salesSearchTerm.toLowerCase()) ||
                                        s.payment_method?.toLowerCase().includes(salesSearchTerm.toLowerCase());
                    const matchesDate = !salesDateFilter || s.date.includes(salesDateFilter);
                    const matchesPayment = !salesPaymentFilter || s.payment_method === salesPaymentFilter;
                    return matchesSearch && matchesDate && matchesPayment;
                  }).map(s => (
                    <div key={s.id} className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] text-gray-400">{new Date(s.date).toLocaleDateString('pt-BR')}</p>
                          <h4 className="font-bold text-gray-900">{s.customer_name || 'Consumidor Final'}</h4>
                          <p className="text-xs text-indigo-600 font-medium">{s.product_name}</p>
                        </div>
                        <span className="text-sm font-black text-gray-900">{formatCurrency(s.total_value)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-bold">{s.size}</span>
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-bold">{s.quantity} un.</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">
                          {s.payment_method}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Vendedor: {s.seller_name || '-'}</span>
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit('vendas', s)} className="p-2 text-gray-400 hover:text-indigo-600" title="Editar Venda"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteSale(s.id)} className="p-2 text-gray-400 hover:text-rose-600" title="Cancelar Venda"><XCircle className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'stock_history' && (
            <StockHistoryContent stockMovements={stockMovements} showNotification={showNotification} showConfirm={showConfirm} />
          )}

          {activeTab === 'clientes' && (
            <CustomersContent 
              customers={enrichedCustomers}
              handleEdit={handleEdit}
              handleDeleteCustomer={handleDeleteCustomer}
              storeSettings={storeSettings}
              showNotification={showNotification}
              showConfirm={showConfirm}
            />
          )}

          {activeTab === 'fornecedores' && (
            <SuppliersContent 
              suppliers={suppliers}
              purchaseHistory={purchaseHistory}
              handleEdit={handleEdit}
              fetchData={fetchData}
              showNotification={showNotification}
              showConfirm={showConfirm}
            />
          )}

          {activeTab === 'gastos' && (
            <Card className="overflow-hidden">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-6 py-4 font-bold text-gray-400 text-xs uppercase tracking-wider">Data</th>
                      <th className="px-6 py-4 font-bold text-gray-400 text-xs uppercase tracking-wider">Tipo</th>
                      <th className="px-6 py-4 font-bold text-gray-400 text-xs uppercase tracking-wider">Descrição</th>
                      <th className="px-6 py-4 font-bold text-gray-400 text-xs uppercase tracking-wider text-right">Valor</th>
                      <th className="px-6 py-4 font-bold text-gray-400 text-xs uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {expenses.map(e => (
                      <tr key={e.id}>
                        <td className="px-6 py-4 text-sm text-gray-600">{new Date(e.date).toLocaleDateString('pt-BR')}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{e.type}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{e.description}</td>
                        <td className="px-6 py-4 text-sm font-bold text-rose-600 text-right">{formatCurrency(e.value)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleEdit('gastos', e)}
                              className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteExpense(e.id)}
                              className="p-2 text-gray-400 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden divide-y divide-gray-50">
                {expenses.map(e => (
                  <div key={e.id} className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] text-gray-400">{new Date(e.date).toLocaleDateString('pt-BR')}</p>
                        <h4 className="font-bold text-gray-900">{e.description}</h4>
                        <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">{e.type}</p>
                      </div>
                      <span className="text-sm font-black text-rose-600">{formatCurrency(e.value)}</span>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit('gastos', e)} className="p-2 text-gray-400 hover:text-indigo-600"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteExpense(e.id)} className="p-2 text-gray-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'anuncios' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ads.map(a => {
                const roi = a.sales_generated > 0 ? (a.sales_generated * 100) / a.investment : 0;
                return (
                  <div key={a.id}>
                    <Card>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <Megaphone className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">{a.platform}</h3>
                            <p className="text-[10px] text-gray-400">{new Date(a.date).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleEdit('anuncios', a)}
                            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteAd(a.id)}
                            className="p-2 text-gray-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-bold">Investimento</p>
                          <p className="font-bold text-gray-900">{formatCurrency(a.investment)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-bold">Vendas</p>
                          <p className="font-bold text-gray-900">{a.sales_generated}</p>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500 uppercase">ROI</span>
                        <span className={`font-bold ${roi > 200 ? 'text-emerald-600' : 'text-amber-600'}`}>{roi.toFixed(2)}%</span>
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="w-full space-y-6">
              <Card>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
                    <SettingsIcon className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Configurações da Loja</h3>
                    <p className="text-sm text-gray-500">Personalize as informações básicas do seu negócio.</p>
                  </div>
                </div>

                <form key={`${storeSettings.nome_loja}-${storeSettings.telefone_whatsapp}`} onSubmit={handleSaveSettings} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Nome da Loja</label>
                    <input 
                      name="nome_loja"
                      type="text"
                      defaultValue={storeSettings.nome_loja}
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="Ex: Brisa 31"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">WhatsApp da Loja (com DDD)</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        name="telefone_whatsapp"
                        type="text"
                        defaultValue={storeSettings.telefone_whatsapp}
                        required
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="Ex: 5511999999999"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400">Insira apenas números, incluindo o código do país (55) e o DDD.</p>
                  </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Mensagem Padrão WhatsApp</label>
              <textarea 
                name="mensagem_padrao_whatsapp"
                defaultValue={storeSettings.mensagem_padrao_whatsapp}
                required
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                placeholder="Ex: Olá! Tenho interesse no produto: {nome_produto} - R$ {preco_produto}"
              />
              <p className="text-[10px] text-gray-400">Use {'{nome_produto}'} e {'{preco_produto}'} como variáveis.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Meta de Vendas Mensal (R$)</label>
              <input 
                name="monthly_goal"
                type="number"
                defaultValue={storeSettings.monthly_goal}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                placeholder="Ex: 10000"
              />
            </div>

                  <div className="pt-4">
                    <button 
                      type="submit"
                      className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" /> Salvar Alterações
                    </button>
                  </div>
                </form>
              </Card>

              <div className="mt-8 p-6 bg-amber-50 rounded-3xl border border-amber-100 flex gap-4">
                <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                <div>
                  <h4 className="font-bold text-amber-800 text-sm">Dica de Integração</h4>
                  <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                    O número de WhatsApp configurado acima será utilizado para receber os pedidos vindo do catálogo público. Certifique-se de que o número está correto para não perder vendas.
                  </p>
                </div>
              </div>

              <Card className="mt-6">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                    <Database className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Backup e Restauração</h3>
                    <p className="text-sm text-gray-500">Mantenha seus dados seguros exportando ou importando backups.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <Download className="w-5 h-5 text-indigo-600" />
                      </div>
                      <h4 className="font-bold text-gray-900">Exportar Backup</h4>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Gere um arquivo com todos os seus dados (produtos, vendas, clientes, etc) para guardar em local seguro.
                    </p>
                    <button 
                      onClick={handleBackup}
                      className="w-full bg-white text-indigo-600 border border-indigo-100 py-3 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Baixar Backup
                    </button>
                  </div>

                  <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <Upload className="w-5 h-5 text-amber-600" />
                      </div>
                      <h4 className="font-bold text-gray-900">Restaurar Backup</h4>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Importe um arquivo de backup anterior para restaurar seus dados. <span className="text-rose-600 font-bold">Isso substituirá todos os dados atuais!</span>
                    </p>
                    <label className="w-full bg-white text-amber-600 border border-amber-100 py-3 rounded-xl text-sm font-bold hover:bg-amber-50 transition-all flex items-center justify-center gap-2 cursor-pointer">
                      <Upload className="w-4 h-4" /> Selecionar Arquivo
                      <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
                    </label>
                  </div>
                </div>
              </Card>
            </div>
          )}

        </div>
      </main>

      {/* Modals */}
      <ConfirmModal 
        isOpen={isConfirmModalOpen} 
        onClose={() => setIsConfirmModalOpen(false)} 
        config={confirmModalConfig} 
      />
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
          setImagePreview(null);
          setImageBase64(null);
        }} 
        title={`${editingItem ? 'Editar' : 'Adicionar'} ${modalType.slice(0, -1)}`}
      >
        {modalType === 'usuarios' && (
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nome Completo</label>
              <input name="name" defaultValue={editingItem?.name} placeholder="Ex: Michele Rosario" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Login</label>
              <input name="login" defaultValue={editingItem?.login} placeholder="Ex: michelerosario" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Senha</label>
              <div className="relative">
                <input 
                  name="senha" 
                  type={showPassword ? "text" : "password"}
                  defaultValue={editingItem?.senha} 
                  placeholder="••••••••" 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  required 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Função</label>
              <select name="role" defaultValue={editingItem?.role || 'seller'} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required>
                <option value="seller">Vendedor</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
              {editingItem ? 'Salvar Alterações' : 'Cadastrar Usuário'}
            </button>
          </form>
        )}

        {modalType === 'produtos' && (
          <form onSubmit={handleAddProduct} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nome do Produto</label>
              <input name="name" defaultValue={editingItem?.name} placeholder="Ex: Camiseta Slim Fit" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Marca</label>
                <input name="brand" defaultValue={editingItem?.brand} placeholder="Ex: Nike, Adidas" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Código (SKU)</label>
                <input name="code" defaultValue={editingItem?.code} placeholder="Ex: CAM-001" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Categoria</label>
                <input name="category" defaultValue={editingItem?.category} placeholder="Ex: Camisetas" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Cor</label>
                <input name="color" defaultValue={editingItem?.color} placeholder="Ex: Azul Marinho" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Tamanho</label>
                <select name="size" defaultValue={editingItem?.size || 'M'} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required>
                  <option value="P">P</option>
                  <option value="M">M</option>
                  <option value="G">G</option>
                  <option value="GG">GG</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Estoque Atual</label>
                <input name="stock" type="number" defaultValue={editingItem?.stock} placeholder="Quantidade" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Custo (R$)</label>
                <input name="cost" type="text" inputMode="decimal" defaultValue={editingItem?.cost} placeholder="0,00" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Preço Base (R$)</label>
                <input name="price" type="text" inputMode="decimal" defaultValue={editingItem?.price} placeholder="0,00" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">À Vista (R$)</label>
                <input name="cash_price" type="text" inputMode="decimal" defaultValue={editingItem?.cash_price} placeholder="0,00" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">No Cartão (R$)</label>
                <input name="card_price" type="text" inputMode="decimal" defaultValue={editingItem?.card_price} placeholder="0,00" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Promo (R$)</label>
                <input name="promo_price" type="text" inputMode="decimal" defaultValue={editingItem?.promo_price} placeholder="0,00" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Estoque Mínimo para Alerta</label>
                <input name="min_stock" type="number" defaultValue={editingItem?.min_stock || 5} placeholder="Ex: 5" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Imagem do Produto</label>
              <div className="flex flex-col gap-4">
                {imagePreview && (
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-gray-200 bg-gray-50">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setImageBase64(null);
                      }}
                      className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur rounded-full shadow-sm text-rose-500 hover:bg-rose-50 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <label className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group">
                      <Camera className="w-5 h-5 text-gray-400 group-hover:text-indigo-500" />
                      <span className="text-sm font-bold text-gray-500 group-hover:text-indigo-600">
                        {imagePreview ? 'Alterar Imagem' : 'Selecionar Imagem'}
                      </span>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
                <p className="text-[10px] text-gray-400 text-center">Formatos: JPG, PNG, WEBP. Máx: 5MB.</p>
              </div>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
              {editingItem ? 'Salvar Alterações' : 'Cadastrar Produto'}
            </button>
          </form>
        )}

        {modalType === 'vendas' && (
          <div className="space-y-6">
            {/* Seletor de Produto */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Buscar Produto</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select 
                    value={selectedProductGroup || ''}
                    onChange={(e) => {
                      setSelectedProductGroup(e.target.value);
                      setSelectedSize(null);
                      setSelectedProductId(null);
                    }}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white text-sm"
                  >
                    <option value="">Selecione o modelo...</option>
                    {Object.keys(products.reduce((acc: any, p) => {
                      const key = `${p.name} | ${p.brand} | ${p.color}`;
                      acc[key] = true;
                      return acc;
                    }, {})).sort().map(groupKey => (
                      <option key={groupKey} value={groupKey}>{groupKey}</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedProductGroup && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tamanho Disponível</label>
                    <div className="flex flex-wrap gap-2">
                      {['P', 'M', 'G', 'GG'].map(size => {
                        const variation = products.find(p => 
                          `${p.name} | ${p.brand} | ${p.color}` === selectedProductGroup && 
                          p.size === size
                        );
                        const hasStock = variation && variation.stock > 0;
                        const isSelected = selectedSize === size;

                        return (
                          <button
                            key={size}
                            type="button"
                            disabled={!variation || !hasStock}
                            onClick={() => {
                              setSelectedSize(size);
                              if (variation) {
                                setSelectedProductId(variation.id);
                                setSaleUnitPrice(variation.price.toString());
                              }
                            }}
                            className={`
                              min-w-[50px] h-12 rounded-xl font-bold text-sm transition-all border-2
                              ${isSelected 
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                                : variation && hasStock
                                  ? 'bg-white border-gray-100 text-gray-700 hover:border-indigo-200'
                                  : 'bg-gray-50 border-gray-50 text-gray-300 cursor-not-allowed'
                              }
                            `}
                          >
                            {size}
                            {variation && hasStock && (
                              <span className="block text-[8px] opacity-60 font-medium">
                                {variation.stock} un
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Quantidade</label>
                      <input 
                        type="number" 
                        min="1"
                        value={saleQuantity}
                        onChange={(e) => setSaleQuantity(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Preço Unit.</label>
                      <input 
                        type="text" 
                        value={saleUnitPrice}
                        onChange={(e) => setSaleUnitPrice(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-indigo-600"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!selectedProductId}
                    onClick={() => {
                      const p = products.find(prod => prod.id === selectedProductId);
                      if (p) {
                        handleAddToCart(p, saleQuantity, toNum(saleUnitPrice), selectedSize || p.size);
                        setSelectedProductId(null);
                        setSelectedSize(null);
                        setSaleQuantity(1);
                      }
                    }}
                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-5 h-5" /> Adicionar ao Carrinho
                  </button>
                </motion.div>
              )}
            </div>

            {/* Carrinho */}
            {cart.length > 0 && (
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Itens da Venda ({cart.length})</h4>
                  <button 
                    type="button" 
                    onClick={() => setCart([])}
                    className="text-[10px] font-bold text-rose-500 hover:underline"
                  >
                    Limpar Tudo
                  </button>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {cart.map((item, idx) => (
                    <div key={`cart-item-${idx}`} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900 leading-tight">{item.product_name}</p>
                        <p className="text-[10px] text-gray-500 font-medium">{item.brand} • {item.color} • Tam: <span className="text-indigo-600 font-bold">{item.size}</span></p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <p className="text-sm font-black text-gray-900">{formatCurrency(item.unit_price * item.quantity)}</p>
                          <p className="text-[10px] text-gray-400 font-medium">{item.quantity}x {formatCurrency(item.unit_price)}</p>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveFromCart(idx)}
                          className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Finalização */}
            <form onSubmit={handleAddSale} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</label>
                    <button 
                      type="button" 
                      onClick={() => { setModalType('clientes'); setEditingItem(null); }}
                      className="text-[10px] font-bold text-indigo-600 hover:underline"
                    >
                      + Novo
                    </button>
                  </div>
                  <select name="customer_id" defaultValue={editingItem?.customer_id} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white">
                    <option value="">Consumidor Final</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Vendedor</label>
                  <select name="seller_id" defaultValue={editingItem?.seller_id} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white">
                    <option value="">Sem Vendedor</option>
                    {sellers.filter((s: any) => s.status === 'ativo').map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Pagamento</label>
                  <select name="payment_method" defaultValue={editingItem?.payment_method || 'PIX'} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white">
                    <option value="PIX">PIX</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Desconto</label>
                  <div className="flex gap-2">
                    <input 
                      name="discount_value" 
                      type="text" 
                      value={saleDiscountValue}
                      onChange={(e) => setSaleDiscountValue(e.target.value)}
                      placeholder="0,00" 
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm" 
                    />
                    <select 
                      name="discount_type" 
                      value={saleDiscountType}
                      onChange={(e: any) => setSaleDiscountType(e.target.value)}
                      className="w-20 px-2 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                    >
                      <option value="value">R$</option>
                      <option value="percentage">%</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-bold text-gray-500">Total da Venda</span>
                  <span className="text-2xl font-black text-gray-900">
                    {formatCurrency(
                      Math.max(0, 
                        cart.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0) - 
                        (saleDiscountType === 'percentage' 
                          ? (cart.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0) * toNum(saleDiscountValue)) / 100 
                          : toNum(saleDiscountValue))
                      )
                    )}
                  </span>
                </div>
                <button 
                  type="submit" 
                  disabled={cart.length === 0}
                  className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                >
                  <CheckCircle2 className="w-6 h-6" /> Finalizar Venda
                </button>
              </div>
            </form>
          </div>
        )}

        {modalType === 'clientes' && (
          <form onSubmit={handleAddCustomer} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nome Completo</label>
              <input name="name" defaultValue={editingItem?.name} placeholder="Nome do Cliente" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Telefone (WhatsApp)</label>
              <input name="phone" defaultValue={editingItem?.phone} placeholder="(00) 00000-0000" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Instagram</label>
              <input name="instagram" defaultValue={editingItem?.instagram} placeholder="usuario_instagram" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Cidade</label>
              <input name="city" defaultValue={editingItem?.city} placeholder="Cidade" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
              {editingItem ? 'Salvar Alterações' : 'Cadastrar Cliente'}
            </button>
          </form>
        )}

        {modalType === 'fornecedores' && (
          <form onSubmit={handleAddSupplier} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nome do Fornecedor</label>
                <input name="name" defaultValue={editingItem?.name} placeholder="Nome do Fornecedor" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Telefone</label>
                <input name="phone" defaultValue={editingItem?.phone} placeholder="(00) 00000-0000" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">E-mail</label>
              <input name="email" type="email" defaultValue={editingItem?.email} placeholder="email@exemplo.com" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Endereço</label>
              <input name="address" defaultValue={editingItem?.address} placeholder="Endereço completo" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Produtos Fornecidos</label>
              <textarea name="products_supplied" defaultValue={editingItem?.products_supplied} rows={2} placeholder="Ex: Camisetas, Calças" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Preço Médio de Compra (R$)</label>
              <input name="avg_purchase_price" type="text" inputMode="decimal" defaultValue={editingItem?.avg_purchase_price} placeholder="0,00" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
              {editingItem ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
            </button>
          </form>
        )}

        {modalType === 'compras' && (
          <form onSubmit={handleAddPurchase} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Fornecedor</label>
              <select name="supplier_id" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required>
                <option value="">Selecionar Fornecedor</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Produto</label>
              <select name="product_id" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required>
                <option value="">Selecionar Produto</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Quantidade</label>
                <input name="quantity" type="number" placeholder="Quantidade" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Valor Total (R$)</label>
                <input name="value" type="text" inputMode="decimal" placeholder="0,00" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Data da Compra</label>
              <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
              Registrar Compra
            </button>
          </form>
        )}

        {modalType === 'gastos' && (
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Tipo de Gasto</label>
                <select name="type" defaultValue={editingItem?.type || 'Fixo'} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required>
                  <option value="Fixo">Fixo</option>
                  <option value="Anúncio">Anúncio</option>
                  <option value="Estoque">Estoque</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Categoria</label>
                <input name="category" defaultValue={editingItem?.category} placeholder="Ex: Aluguel, Luz, Marketing" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Descrição</label>
              <input name="description" defaultValue={editingItem?.description} placeholder="Descrição detalhada" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Valor (R$)</label>
              <input name="value" type="text" inputMode="decimal" defaultValue={editingItem?.value} placeholder="0,00" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Observações</label>
              <textarea name="observations" defaultValue={editingItem?.observations} rows={2} placeholder="Observações adicionais..." className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
            </div>
            <button type="submit" className="w-full bg-rose-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all">
              {editingItem && editingItem.id ? 'Salvar Alterações' : 'Registrar Gasto'}
            </button>
          </form>
        )}

        {modalType === 'vendedores' && (
          <form onSubmit={handleAddSeller} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nome do Vendedor</label>
              <input name="name" defaultValue={editingItem?.name} placeholder="Nome Completo" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">E-mail</label>
                <input name="email" type="email" defaultValue={editingItem?.email} placeholder="email@exemplo.com" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Telefone</label>
                <input name="phone" defaultValue={editingItem?.phone} placeholder="(00) 00000-0000" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Comissão (%)</label>
                <input name="commission_percentage" type="text" inputMode="decimal" defaultValue={editingItem?.commission_percentage || 5} placeholder="Ex: 5" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Status</label>
                <select name="status" defaultValue={editingItem?.status || 'ativo'} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
              {editingItem && editingItem.id ? 'Salvar Alterações' : 'Cadastrar Vendedor'}
            </button>
          </form>
        )}

        {modalType === 'anuncios' && (
          <form onSubmit={handleAddAd} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Plataforma</label>
              <select name="platform" defaultValue={editingItem?.platform} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required>
                <option value="Instagram Ads">Instagram Ads</option>
                <option value="Facebook Ads">Facebook Ads</option>
                <option value="Google Ads">Google Ads</option>
                <option value="TikTok Ads">TikTok Ads</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Investimento (R$)</label>
              <input name="investment" type="text" inputMode="decimal" defaultValue={editingItem?.investment} placeholder="0,00" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Vendas Geradas</label>
              <input name="sales_generated" type="number" defaultValue={editingItem?.sales_generated} placeholder="Quantidade" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" required />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
              {editingItem && editingItem.id ? 'Salvar Alterações' : 'Salvar Anúncio'}
            </button>
          </form>
        )}
      </Modal>

      <Modal 
        isOpen={isChangePasswordModalOpen} 
        onClose={() => setIsChangePasswordModalOpen(false)} 
        title="Alterar Minha Senha"
      >
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nova Senha</label>
            <div className="relative">
              <input 
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Mínimo 4 caracteres"
                required
              />
              <button 
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Confirmar Nova Senha</label>
            <input 
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Repita a nova senha"
              required
            />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
            Atualizar Senha
          </button>
        </form>
      </Modal>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {isForgotPasswordModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Esqueci minha senha</h3>
                <button 
                  onClick={() => {
                    setIsForgotPasswordModalOpen(false);
                    setFoundUserForReset(null);
                    setForgotPasswordLogin('');
                  }}
                  className="p-2 hover:bg-white rounded-xl transition-colors text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {!foundUserForReset ? (
                  <form onSubmit={handleSearchUserForReset} className="space-y-4">
                    <p className="text-sm text-gray-500 font-medium">
                      Informe seu nome de usuário ou e-mail para buscar sua conta.
                    </p>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase ml-1">Usuário ou E-mail</label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input 
                          type="text" 
                          value={forgotPasswordLogin}
                          onChange={(e) => setForgotPasswordLogin(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          placeholder="Ex: michellerosario.n@gmail.com"
                          required
                        />
                      </div>
                    </div>
                    <button 
                      type="submit"
                      disabled={isSearchingUser}
                      className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isSearchingUser ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>Continuar <ArrowRight className="w-5 h-5" /></>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 mb-4">
                      <p className="text-sm text-indigo-700 font-bold">Usuário encontrado: {foundUserForReset.name || foundUserForReset.login}</p>
                      <p className="text-xs text-indigo-600 mt-1">Defina sua nova senha abaixo.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nova Senha</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input 
                          type={showResetPassword ? "text" : "password"} 
                          value={forgotPasswordNewPass}
                          onChange={(e) => setForgotPasswordNewPass(e.target.value)}
                          className="w-full pl-12 pr-12 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          placeholder="Mínimo 4 caracteres"
                          required
                        />
                        <button 
                          type="button"
                          onClick={() => setShowResetPassword(!showResetPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
                        >
                          {showResetPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase ml-1">Confirmar Nova Senha</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input 
                          type={showResetPassword ? "text" : "password"} 
                          value={forgotPasswordConfirmPass}
                          onChange={(e) => setForgotPasswordConfirmPass(e.target.value)}
                          className="w-full pl-12 pr-12 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          placeholder="Repita a nova senha"
                          required
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={isResettingPassword}
                      className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isResettingPassword ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>Redefinir Senha <Check className="w-5 h-5" /></>
                      )}
                    </button>
                    
                    <button 
                      type="button"
                      onClick={() => setFoundUserForReset(null)}
                      className="w-full text-sm text-gray-500 font-bold hover:underline"
                    >
                      Voltar para busca
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
