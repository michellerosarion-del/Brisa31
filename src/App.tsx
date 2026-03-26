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
  Legend,
  Area
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
  ChevronLeft,
  TrendingUp, 
  TrendingDown,
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
  Calendar,
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
  XCircle,
  Copy,
  Filter,
  ChevronDown,
  Minus,
  ShoppingBag,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Trophy,
  Flame,
  Zap
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
  Timestamp,
  DocumentReference
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
              className="w-full bg-midnight text-white py-4 rounded-2xl font-bold hover:bg-midnight/90 transition-all"
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

type ProductVariation = {
  id: string;
  color: string;
  size: string;
  stock: number;
  brand: string;
};

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
  is_featured?: boolean;
  image_url: string;
  images?: string[];
  main_image_index?: number;
  variations?: ProductVariation[];
  has_variations?: boolean;
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
  total_cost?: number;
  profit: number;
  items: {
    product_id: string;
    product_name?: string;
    quantity: number;
    unit_price: number;
    total_item_value: number;
    cost?: number;
    size: string;
    color?: string;
    brand?: string;
    variation_id?: string | null;
  }[];
  // Legacy fields for UI compatibility
  product_name?: string;
  quantity?: number;
  total_value?: number;
  size?: string;
  status?: 'concluida' | 'cancelada';
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
  monthly_goal?: number;
  logo_url?: string;
};

type DashboardData = {
  dailyRevenue: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  totalProfit: number;
  netProfit: number;
  profitMargin: number;
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
  variation_id?: string;
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
    className={`bg-white rounded-2xl p-4 md:p-5 shadow-soft border border-gray-100/30 hover:shadow-elegant transition-all duration-700 ${className}`}
  >
    {children}
  </motion.div>
);

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl', noPadding = false }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: string; noPadding?: boolean }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-midnight/40 backdrop-blur-md pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        className={`bg-white rounded-2xl w-full ${maxWidth} overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] border border-white/20`}
      >
        <div className="px-6 md:px-8 py-5 md:py-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
          <h2 className="font-serif font-bold text-midnight text-xl md:text-2xl tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-3 md:p-2.5 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all active:scale-90">
            <X className="w-5 h-5 md:w-6 md:h-6 text-midnight" />
          </button>
        </div>
        <div className={`${noPadding ? '' : 'p-6 md:p-8'} max-h-[80vh] overflow-y-auto custom-scrollbar`}>
          {children}
        </div>
      </motion.div>
    </div>
  );
};

const StatCard = ({ title, value, emoji, colorClass, trend }: any) => (
  <Card className="flex items-center justify-between p-5 md:p-6 hover:scale-[1.02] transition-all duration-700 group">
    <div>
      <p className="text-[11px] md:text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 group-hover:text-midnight transition-colors">{title}</p>
      <h3 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tighter">{value}</h3>
      {trend && (
        <p className={`text-[11px] md:text-[10px] mt-2.5 flex items-center font-bold ${trend > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          <div className={`p-1.5 rounded-full mr-2 ${trend > 0 ? 'bg-emerald-100' : 'bg-rose-100'}`}>
            <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
          </div>
          {Math.abs(trend)}% <span className="text-gray-400 ml-1.5 font-medium italic">vs mês anterior</span>
        </p>
      )}
    </div>
    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl shadow-md flex items-center justify-center text-xl md:text-2xl ${colorClass.replace('text-', 'bg-')} bg-opacity-10 group-hover:scale-110 transition-transform duration-700`}>
      {emoji}
    </div>
  </Card>
);

// Helper to get CSS color from name
const getCssColor = (colorName: string) => {
  const mapping: { [key: string]: string } = {
    'preto': '#000000',
    'branco': '#ffffff',
    'vermelho': '#ef4444',
    'azul': '#3b82f6',
    'verde': '#22c55e',
    'amarelo': '#eab308',
    'rosa': '#ec4899',
    'roxo': '#a855f7',
    'laranja': '#f97316',
    'cinza': '#9ca3af',
    'marrom': '#78350f',
    'bege': '#f5f5dc',
    'nude': '#f5f5dc',
    'off white': '#faf9f6',
    'marinho': '#000080',
    'vinho': '#800000',
    'grafite': '#383838',
    'caqui': '#c3b091',
    'caramelo': '#af6f09',
    'dourado': '#ffd700',
    'prata': '#c0c0c0',
    'cobre': '#b87333',
    'menta': '#98ff98',
    'lavanda': '#e6e6fa',
    'coral': '#ff7f50',
    'turquesa': '#40e0d0',
    'fucsia': '#ff00ff',
    'mostarda': '#e1ad01',
    'terracota': '#e2725b',
    'palha': '#eee8aa',
    'creme': '#fffdd0',
    'gelo': '#f0f8ff',
    'chumbo': '#313131'
  };
  const normalized = (colorName || '').toLowerCase().trim();
  return mapping[normalized] || normalized;
};

const ProductsContent = ({ filteredProducts, searchTerm, setSearchTerm, categoryFilter, setCategoryFilter, categories, handleAdjustStock, handleDeleteProduct, handleEdit, formatCurrency, toNum, onPromote, getCssColor }: any) => {
  return (
    <div className="space-y-4">
      <Card className="p-3 shadow-sm border border-gray-100 rounded-xl bg-white">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-focus-within:text-midnight transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar produto..." 
              className="w-full pl-9 pr-3 py-2 bg-gray-50/50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-midnight/5 transition-all"
              value={searchTerm || ''}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative group w-full md:min-w-[180px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-focus-within:text-midnight transition-colors" />
            <select 
              className="w-full pl-9 pr-8 py-2 bg-gray-50/50 border border-gray-100 rounded-lg text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-midnight/5 transition-all cursor-pointer appearance-none"
              value={categoryFilter || ''}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">Todas Categorias</option>
              {categories.map((cat: string) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 products-list">
        {filteredProducts.map((p: any) => (
          <motion.div 
            key={p.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group product-card"
          >
            <Card className="p-3 border border-gray-100 shadow-sm hover:shadow-md transition-all rounded-xl bg-white h-full flex flex-col gap-2">
              <div className="flex gap-3">
                {/* Small Thumbnail */}
                <div className="w-16 h-16 shrink-0 bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                  <img 
                    src={p.image_url || (p.images && p.images[p.main_image_index || 0]) || `https://picsum.photos/seed/${p.id}/100/100`} 
                    alt={p.name} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer" 
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-[8px] font-black text-champagne-dark uppercase tracking-widest truncate">{p.brand}</p>
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">REF: {p.code}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm leading-tight truncate mb-0.5" title={p.name}>{p.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-midnight">{formatCurrency(p.price)}</span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 uppercase tracking-tighter`}>
                      {p.category}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dense Stock Info */}
              <div className="bg-gray-50/50 rounded-lg p-2 space-y-1.5 border border-gray-100/50">
                {p.has_variations && p.variations ? (
                  <div className="space-y-1">
                    {Object.entries(p.variations.reduce((acc: any, v: any) => {
                      const color = v.color || 'Única';
                      if (!acc[color]) acc[color] = [];
                      acc[color].push(v);
                      return acc;
                    }, {})).map(([color, variations]: [string, any]) => (
                      <div key={color} className="flex items-center gap-2 text-[10px]">
                        <div className="w-2 h-2 rounded-full border border-white shrink-0" style={{ backgroundColor: getCssColor(color) }} />
                        <span className="font-bold text-gray-600 truncate max-w-[60px]">{color}:</span>
                        <span className="text-gray-500 font-medium">
                          {variations
                            .sort((a: any, b: any) => (a.size || '').localeCompare(b.size || ''))
                            .map((v: any) => `${v.size || '?'}:${toNum(v.stock)}`)
                            .join(' | ')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[10px]">
                    <div className="w-2 h-2 rounded-full border border-white shrink-0" style={{ backgroundColor: getCssColor(p.color) }} />
                    <span className="font-bold text-gray-600 truncate max-w-[60px]">{p.color || 'Única'}:</span>
                    <span className="text-gray-500 font-medium">{p.size || 'Único'}:{toNum(p.stock)}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-1 border-t border-gray-200/50">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total em Estoque</span>
                  <span className={`text-xs font-black ${toNum(p.stock) <= toNum(p.min_stock) ? 'text-amber-600' : 'text-gray-900'}`}>
                    {p.stock} <span className="text-[8px] font-bold opacity-50">un</span>
                  </span>
                </div>
              </div>

              {/* Small Action Buttons */}
              <div className="flex items-center justify-between mt-auto pt-1">
                <div className="flex gap-1">
                  <button 
                    onClick={() => handleAdjustStock(p.id, 1, 'reposicao')}
                    className="w-6 h-6 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-600 hover:text-white transition-all active:scale-90"
                    title="Adicionar 1"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={() => handleAdjustStock(p.id, -1, 'ajuste')}
                    className="w-6 h-6 flex items-center justify-center bg-rose-50 text-rose-600 rounded-md hover:bg-rose-600 hover:text-white transition-all active:scale-90"
                    title="Remover 1"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                </div>
                
                <div className="flex gap-1">
                  <button 
                    onClick={() => onPromote(p.id)}
                    className={`p-1.5 rounded-md transition-all ${p.is_featured ? 'text-amber-500 bg-amber-50' : 'text-gray-300 hover:text-amber-500 hover:bg-amber-50'}`}
                    title={p.is_featured ? "Remover destaque" : "Promover destaque"}
                  >
                    <Flame className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => handleEdit('produtos', p)}
                    className="p-1.5 text-gray-400 hover:text-midnight hover:bg-gray-100 rounded-md transition-all"
                    title="Editar"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => handleDeleteProduct(p.id)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100 shadow-inner">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Package className="w-12 h-12 text-gray-200" />
          </div>
          <h3 className="text-2xl font-serif font-bold text-gray-900 mb-3 tracking-tight">Nenhum produto</h3>
          <p className="text-gray-400 max-w-xs mx-auto font-medium">Tente ajustar seus filtros ou cadastrar novos produtos no catálogo.</p>
        </div>
      )}
    </div>
  );
};

const SalesContent = ({ sales, salesSearchTerm, setSalesSearchTerm, salesDateFilter, setSalesDateFilter, globalMonthFilter, setGlobalMonthFilter, salesPaymentFilter, setSalesPaymentFilter, handleEdit, handleDeleteSale, user, formatCurrency }: any) => {
  const filteredSales = sales.filter((s: any) => {
    const matchesSearch = s.customer_name?.toLowerCase().includes(salesSearchTerm.toLowerCase()) || 
                        s.product_name?.toLowerCase().includes(salesSearchTerm.toLowerCase()) ||
                        s.seller_name?.toLowerCase().includes(salesSearchTerm.toLowerCase()) ||
                        s.payment_method?.toLowerCase().includes(salesSearchTerm.toLowerCase());
    const matchesDate = !salesDateFilter || s.date.includes(salesDateFilter);
    const matchesMonth = !globalMonthFilter || s.date.startsWith(globalMonthFilter);
    const matchesPayment = !salesPaymentFilter || s.payment_method === salesPaymentFilter;
    return matchesSearch && matchesDate && matchesMonth && matchesPayment;
  }).sort((a: any, b: any) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-8">
      <Card className="p-8 shadow-soft border-none rounded-[2.5rem] bg-white">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-midnight transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por cliente, produto ou vendedor..." 
              className="w-full pl-14 pr-6 py-4 bg-gray-50/50 border border-gray-100 rounded-[1.5rem] text-base font-medium focus:outline-none focus:ring-4 focus:ring-midnight/5 focus:border-midnight/10 transition-all"
              value={salesSearchTerm || ''}
              onChange={(e) => setSalesSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative group w-full md:min-w-[180px]">
              <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-midnight transition-colors" />
              <input 
                type="date" 
                className="w-full pl-14 pr-6 py-4 bg-gray-50/50 border border-gray-100 rounded-[1.5rem] text-base font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-midnight/5 focus:border-midnight/10 transition-all cursor-pointer"
                value={salesDateFilter || ''}
                onChange={(e) => {
                  setSalesDateFilter(e.target.value);
                  if (e.target.value) setGlobalMonthFilter('');
                }}
              />
            </div>
            <div className="relative group w-full md:min-w-[200px]">
              <CreditCard className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-midnight transition-colors" />
              <select 
                className="w-full pl-14 pr-10 py-4 bg-gray-50/50 border border-gray-100 rounded-[1.5rem] text-base font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-midnight/5 focus:border-midnight/10 transition-all cursor-pointer appearance-none"
                value={salesPaymentFilter || ''}
                onChange={(e) => setSalesPaymentFilter(e.target.value)}
              >
                <option value="">Todos Pagamentos</option>
                <option value="pix">PIX</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="debito">Débito</option>
                <option value="credito">Crédito</option>
              </select>
              <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden shadow-soft border-none rounded-[3rem]">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/30 border-b border-gray-100">
                <th className="px-8 py-6 font-black text-gray-400 text-[10px] uppercase tracking-[0.3em]">Data</th>
                <th className="px-8 py-6 font-black text-gray-400 text-[10px] uppercase tracking-[0.3em]">Cliente</th>
                <th className="px-8 py-6 font-black text-gray-400 text-[10px] uppercase tracking-[0.3em]">Produtos</th>
                <th className="px-8 py-6 font-black text-gray-400 text-[10px] uppercase tracking-[0.3em]">Vendedor</th>
                <th className="px-8 py-6 font-black text-gray-400 text-[10px] uppercase tracking-[0.3em]">Total</th>
                <th className="px-8 py-6 font-black text-gray-400 text-[10px] uppercase tracking-[0.3em]">Custo</th>
                <th className="px-8 py-6 font-black text-gray-400 text-[10px] uppercase tracking-[0.3em]">Lucro</th>
                <th className="px-8 py-6 font-black text-gray-400 text-[10px] uppercase tracking-[0.3em]">Pagamento</th>
                <th className="px-8 py-6 font-black text-gray-400 text-[10px] uppercase tracking-[0.3em] text-center">Status</th>
                <th className="px-8 py-6 font-black text-gray-400 text-[10px] uppercase tracking-[0.3em] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredSales.map(s => (
                <tr key={s.id} className={`hover:bg-gray-50/50 transition-all group ${s.status === 'cancelada' ? 'opacity-50 grayscale' : ''}`}>
                  <td className="px-8 py-5 text-sm text-gray-500 font-medium">{new Date(s.date).toLocaleDateString('pt-BR')}</td>
                  <td className="px-8 py-5">
                    <p className={`text-sm font-black tracking-tight ${s.status === 'cancelada' ? 'line-through text-gray-400' : 'text-gray-900 group-hover:text-midnight'}`}>
                      {s.customer_name || 'Consumidor Final'}
                    </p>
                  </td>
                  <td className="px-8 py-5">
                    <div className="space-y-1">
                      {s.items && s.items.length > 0 ? (
                        s.items.map((item: any, idx: number) => (
                          <p key={idx} className={`text-[11px] font-medium leading-tight ${s.status === 'cancelada' ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                            {item.product_name} <span className="text-gray-400">({item.size} x{item.quantity})</span>
                          </p>
                        ))
                      ) : (
                        <p className={`text-sm font-medium ${s.status === 'cancelada' ? 'line-through text-gray-400' : 'text-gray-600'}`}>{s.product_name}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-gray-100/80 rounded-full text-[10px] font-black uppercase tracking-wider text-gray-500">{s.seller_name || '-'}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`text-sm font-black tracking-tighter ${s.status === 'cancelada' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {formatCurrency(s.final_price || s.total_value)}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`text-sm font-bold text-gray-400 ${s.status === 'cancelada' ? 'line-through' : ''}`}>
                      {formatCurrency(s.total_cost || 0)}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`text-sm font-black ${s.status === 'cancelada' ? 'line-through text-gray-400' : 'text-emerald-600'}`}>
                      {formatCurrency(s.profit || 0)}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-champagne/20 text-midnight rounded-full border border-champagne/10">
                      {s.payment_method}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-center">
                    {s.status === 'cancelada' ? (
                      <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-rose-50 text-rose-600 rounded-full border border-rose-100">Cancelada</span>
                    ) : (
                      <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">Concluída</span>
                    )}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      {(!s.status || s.status !== 'cancelada') && user?.role === 'admin' ? (
                        <>
                          <button 
                            onClick={() => handleEdit('vendas', s)}
                            className="p-2.5 text-midnight hover:bg-midnight/5 rounded-xl transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteSale(s.id)}
                            className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                            title="Cancelar Venda"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest italic opacity-50">Restrito</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-gray-50">
          {filteredSales.map(s => (
            <div key={s.id} className={`p-6 space-y-4 hover:bg-gray-50/30 transition-colors ${s.status === 'cancelada' ? 'opacity-60 bg-gray-50' : ''}`}>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase">{new Date(s.date).toLocaleDateString('pt-BR')}</p>
                    {s.status === 'cancelada' && (
                      <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-rose-100 text-rose-600 rounded-full">Cancelada</span>
                    )}
                  </div>
                  <h4 className={`font-serif font-bold text-xl leading-tight tracking-tight ${s.status === 'cancelada' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                    {s.customer_name || 'Consumidor Final'}
                  </h4>
                  <div className="space-y-1">
                    {s.items && s.items.length > 0 ? (
                      s.items.map((item: any, idx: number) => (
                        <p key={idx} className={`text-xs font-medium ${s.status === 'cancelada' ? 'line-through text-gray-400' : 'text-midnight'}`}>
                          {item.product_name} ({item.size} x{item.quantity})
                        </p>
                      ))
                    ) : (
                      <p className={`text-sm font-medium ${s.status === 'cancelada' ? 'line-through text-gray-400' : 'text-midnight'}`}>{s.product_name}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xl font-black tracking-tighter ${s.status === 'cancelada' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                    {formatCurrency(s.final_price || s.total_value)}
                  </div>
                  <div className={`text-[10px] font-bold ${s.status === 'cancelada' ? 'text-gray-300' : 'text-emerald-600'}`}>
                    Lucro: {formatCurrency(s.profit || 0)}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                <div className="flex gap-3">
                  <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-[10px] font-black uppercase tracking-wider text-gray-500">
                    {s.items?.length || 1} {s.items?.length === 1 ? 'item' : 'itens'}
                  </span>
                  <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-[10px] font-black uppercase tracking-wider text-gray-500">
                    Custo: {formatCurrency(s.total_cost || 0)}
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-champagne/20 text-midnight rounded-full">
                  {s.payment_method}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3">
                <span className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Vendedor: {s.seller_name || '-'}</span>
                <div className="flex gap-2">
                  {s.status !== 'cancelada' && user?.role === 'admin' ? (
                    <>
                      <button onClick={() => handleEdit('vendas', s)} className="p-2.5 text-midnight hover:bg-midnight/5 rounded-xl transition-colors"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteSale(s.id)} className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"><XCircle className="w-4 h-4" /></button>
                    </>
                  ) : s.status !== 'cancelada' && (
                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest italic opacity-50">Admin Only</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredSales.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <ShoppingBag className="w-12 h-12 text-gray-200" />
            </div>
            <h3 className="text-2xl font-serif font-bold text-gray-900 mb-3 tracking-tight">Nenhuma venda</h3>
            <p className="text-gray-400 max-w-xs mx-auto font-medium">As vendas realizadas aparecerão aqui para acompanhamento e gestão.</p>
          </div>
        )}
      </Card>
    </div>
  );
};

const PricingContent = ({ pricingData, setPricingData, totalCost, suggestedPrice, netProfit, realMargin, formatCurrency }: any) => {
  return (
    <div className="w-full space-y-10">
      <Card className="p-8 shadow-soft border-none rounded-3xl bg-white">
        <div className="flex items-center gap-6 mb-12">
          <div className="w-16 h-16 bg-emerald-50 rounded-[1.5rem] flex items-center justify-center shadow-inner">
            <DollarSign className="w-8 h-8 text-emerald-600 opacity-60" />
          </div>
          <div>
            <h3 className="text-3xl font-serif font-bold text-gray-900 tracking-tight">Calculadora de Precificação</h3>
            <p className="text-sm text-gray-400 font-medium mt-1">Calcule o preço ideal para seus produtos com base em custos e margens.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-8">
            {[
              { label: 'Custo do Produto (R$)', key: 'cost', placeholder: '0,00', icon: <Package className="w-4 h-4" /> },
              { label: 'Frete Pago pela Loja (R$)', key: 'shipping', placeholder: '0,00', icon: <Truck className="w-4 h-4" /> },
              { label: 'Margem de Lucro Desejada (%)', key: 'margin', placeholder: 'Ex: 100', icon: <TrendingUp className="w-4 h-4" /> },
              { label: 'Taxa da Maquininha (%)', key: 'cardFee', placeholder: 'Ex: 3.5', icon: <CreditCard className="w-4 h-4" /> }
            ].map(field => (
              <div key={field.key} className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">{field.label}</label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-midnight transition-colors">
                    {field.icon}
                  </div>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    value={(pricingData as any)[field.key] || ''}
                    onChange={(e) => setPricingData({...pricingData, [field.key]: e.target.value})}
                    className="w-full pl-14 pr-6 py-4 bg-gray-50/50 border border-gray-100 rounded-[1.5rem] text-sm font-black focus:outline-none focus:ring-4 focus:ring-midnight/5 focus:border-midnight/10 transition-all"
                    placeholder={field.placeholder}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-midnight rounded-3xl p-8 md:p-10 space-y-8 shadow-2xl shadow-midnight/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-white/10 transition-colors duration-1000" />
            
            <div className="relative">
              <h4 className="text-[10px] font-black text-champagne/40 uppercase tracking-[0.3em] mb-8 border-b border-white/10 pb-6">Resumo do Cálculo</h4>
              
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-champagne/60">Custo Total</span>
                  <span className="text-xl font-black text-white tracking-tight">{formatCurrency(totalCost)}</span>
                </div>
                
                <div className="p-8 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-sm">
                  <span className="text-xs font-black text-champagne/40 uppercase tracking-widest block mb-2">Preço Sugerido Final</span>
                  <span className="text-5xl font-black text-champagne tracking-tighter leading-none">
                    {formatCurrency(suggestedPrice)}
                  </span>
                </div>

                <div className="pt-8 border-t border-white/10 grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-champagne/40 uppercase tracking-widest">Lucro Líquido</span>
                    <p className="text-2xl font-black text-emerald-400 tracking-tighter">{formatCurrency(netProfit)}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-[10px] font-black text-champagne/40 uppercase tracking-widest">Margem Real</span>
                    <p className="text-2xl font-black text-emerald-400 tracking-tighter">{realMargin.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative pt-6">
              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                <Info className="w-5 h-5 text-champagne/60" />
                <p className="text-[10px] text-champagne/60 font-medium leading-relaxed">
                  O lucro líquido considera o custo do produto, frete e as taxas da maquininha sobre o valor final.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

const ConfirmModal = ({ isOpen, onClose, config }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
      >
        <div className="p-6 text-center">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 ${
            config.type === 'danger' ? 'bg-rose-100 text-rose-600' : 
            config.type === 'warning' ? 'bg-amber-100 text-amber-600' : 
            'bg-midnight/10 text-midnight'
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-1">{config.title}</h3>
          <p className="text-base md:text-sm text-gray-500 font-medium leading-relaxed">{config.message}</p>
        </div>
        <div className="p-4 bg-gray-50 flex gap-2">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-3 md:py-2.5 rounded-xl md:rounded-lg font-bold text-gray-500 hover:bg-gray-200 transition-all text-base md:text-sm"
          >
            Cancelar
          </button>
          <button 
            onClick={() => { config.onConfirm(); onClose(); }}
            className={`flex-1 px-4 py-3 md:py-2.5 rounded-xl md:rounded-lg font-bold text-white transition-all shadow-lg text-base md:text-sm ${
              config.type === 'danger' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-100' : 
              config.type === 'warning' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-100' : 
              'bg-midnight hover:bg-midnight/90 shadow-midnight/10'
            }`}
          >
            Confirmar
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const CatalogItem = ({ product, storeSettings }: any) => {
  const getImages = (p: any) => {
    if (p.allImages && Array.isArray(p.allImages) && p.allImages.length > 0) return p.allImages;
    if (p.images && Array.isArray(p.images) && p.images.length > 0) return p.images;
    if (p.image_url) return [p.image_url];
    if (p.image) return [p.image];
    return [];
  };

  const images = getImages(product);
  const [currentImageIndex, setCurrentImageIndex] = useState(product.main_image_index || 0);
  const [direction, setDirection] = useState(0);

  const handleNext = () => {
    if (images.length > 1) {
      setDirection(1);
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const handlePrev = () => {
    if (images.length > 1) {
      setDirection(-1);
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  const allAvailableColors = product.availableColors || [];
  const allAvailableSizes = product.availableSizes || [];

  const price = toNum(product.price);
  const brand = product.brand || 'Brisa 31';
  const isMaisVendido = product.is_featured;
  const isUltimasUnidades = toNum(product.totalStock) > 0 && toNum(product.totalStock) <= 3;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl overflow-hidden shadow-soft hover:shadow-elegant transition-all duration-500 border border-gray-100/50 flex flex-col group h-full product-card"
    >
      <div className="aspect-[4/5] bg-gray-50 relative overflow-hidden group/carousel">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.img 
            key={currentImageIndex}
            src={images[currentImageIndex] || `https://picsum.photos/seed/${product.id}/600/750`} 
            custom={direction}
            variants={{
              enter: (direction: number) => ({
                x: direction > 0 ? '100%' : direction < 0 ? '-100%' : 0,
                opacity: 0
              }),
              center: { zIndex: 1, x: 0, opacity: 1 },
              exit: (direction: number) => ({
                zIndex: 0,
                x: direction < 0 ? '100%' : direction > 0 ? '-100%' : 0,
                opacity: 0
              })
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            drag={images.length > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_e, info) => {
              if (images.length <= 1) return;
              const swipeThreshold = 50;
              if (info.offset.x < -swipeThreshold) {
                handleNext();
              } else if (info.offset.x > swipeThreshold) {
                handlePrev();
              }
            }}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover cursor-grab active:cursor-grabbing"
            referrerPolicy="no-referrer"
            onError={(e: any) => {
              e.target.src = `https://picsum.photos/seed/${product.id}/600/750`;
            }}
          />
        </AnimatePresence>

        {images.length > 1 && (
          <>
            <button 
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-white/80 backdrop-blur-md rounded-full text-midnight shadow-md opacity-0 group-hover/carousel:opacity-100 transition-all hover:bg-white active:scale-90"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-white/80 backdrop-blur-md rounded-full text-midnight shadow-md opacity-0 group-hover/carousel:opacity-100 transition-all hover:bg-white active:scale-90"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1 px-1.5 py-0.5 bg-black/20 backdrop-blur-md rounded-full">
              {images.map((_: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => {
                    setDirection(idx > currentImageIndex ? 1 : -1);
                    setCurrentImageIndex(idx);
                  }}
                  className={`w-1 h-1 rounded-full transition-all ${currentImageIndex === idx ? 'bg-white w-2.5' : 'bg-white/40'}`}
                />
              ))}
            </div>
          </>
        )}

        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {isMaisVendido && (
            <span className="bg-amber-400 text-white px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1">
              <Flame className="w-2.5 h-2.5" /> 🔥 Mais vendido
            </span>
          )}
          {isUltimasUnidades && (
            <span className="bg-rose-500 text-white px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1">
              <Zap className="w-2.5 h-2.5" /> Últimas unidades
            </span>
          )}
          {toNum(product.totalStock) === 0 && (
            <span className="bg-gray-800 text-white px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg">
              Esgotado
            </span>
          )}
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="mb-3">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-0.5">{brand}</p>
          <h3 className="font-serif font-bold text-gray-900 text-lg md:text-xl leading-tight mb-1.5 group-hover:text-midnight transition-colors line-clamp-2">
            {product.name}
          </h3>
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-bold text-midnight">R$</span>
            <span className="text-xl font-black text-midnight tracking-tighter">
              {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          {product.availableSizes && product.availableSizes.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-midnight uppercase tracking-widest flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Disponível:
              </span>
              <div className="flex flex-wrap gap-1.5 pl-4.5">
                <span className="text-xs font-black text-gray-700 uppercase tracking-widest">
                  {product.availableSizes.sort().join(' • ')}
                </span>
              </div>
            </div>
          ) : toNum(product.totalStock) > 0 ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-midnight uppercase tracking-widest flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Disponível:
              </span>
              <div className="flex flex-wrap gap-1.5 pl-4.5">
                <span className="text-xs font-black text-gray-700 uppercase tracking-widest">
                  Tamanho Único
                </span>
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-1.5 pt-2 border-t border-gray-50">
            <div className={`w-1.5 h-1.5 rounded-full ${toNum(product.totalStock) > 0 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-rose-500'}`} />
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider">
              Total: {product.totalStock} {toNum(product.totalStock) === 1 ? 'unidade' : 'unidades'}
            </span>
          </div>
        </div>

        <a
          href={`https://wa.me/${(storeSettings.telefone_whatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent(
            `Olá! Gostaria de pedir este produto:\n\n*${product.name}*\nMarca: ${brand}\nPreço: R$ ${price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${allAvailableColors.length > 0 ? `\n\nCores: ${allAvailableColors.join(', ')}` : ''}${allAvailableSizes.length > 0 ? `\nTamanhos: ${allAvailableSizes.join(', ')}` : ''}`
          )}`}
          target="_blank"
          className={`w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-md shadow-emerald-600/10 transition-all flex items-center justify-center gap-2 active:scale-95 ${toNum(product.totalStock) === 0 ? 'opacity-50 grayscale cursor-not-allowed pointer-events-none' : ''}`}
        >
          <MessageCircle className="w-3.5 h-3.5" /> Pedir no WhatsApp
        </a>
      </div>
    </motion.div>
  );
};

const CatalogContent = ({ products, storeSettings, catalogSearch, setCatalogSearch, catalogSizeFilter, setCatalogSizeFilter, catalogColorFilter, setCatalogColorFilter, catalogPriceFilter, setCatalogPriceFilter, showNotification, showConfirm }: any) => {
  // Group products by Name and Brand to show all available colors and sizes in one card
  const groupedProducts = (products || []).reduce((acc: any, p: any) => {
    if (p.has_variations && p.variations) {
      // Products with variations are already grouped by model
      const key = `var-${p.id}`;
      const totalStock = p.variations.reduce((sum: number, v: any) => sum + toNum(v.stock), 0);
      
      acc[key] = {
        ...p,
        availableSizes: Array.from(new Set(p.variations.filter((v: any) => toNum(v.stock) > 0).map((v: any) => v.size))),
        availableColors: Array.from(new Set(p.variations.filter((v: any) => toNum(v.stock) > 0).map((v: any) => v.color))),
        allVariations: p.variations,
        totalStock: totalStock
      };
    } else {
      // Group by Name and Brand for non-variation products
      const key = `${p.name || 'Sem nome'}|${p.brand || 'Brisa 31'}`;
      const pImages = p.images && Array.isArray(p.images) ? p.images : (p.image_url ? [p.image_url] : (p.image ? [p.image] : []));
      
      if (!acc[key]) {
        acc[key] = { 
          ...p, 
          availableSizes: toNum(p.stock) > 0 ? (p.size ? [p.size] : []) : [], 
          availableColors: toNum(p.stock) > 0 ? (p.color ? [p.color] : []) : [],
          totalStock: toNum(p.stock),
          allVariations: [{ size: p.size, color: p.color, stock: p.stock }],
          // Collect all images from all products in this group
          allImages: [...pImages]
        };
      } else {
        if (toNum(p.stock) > 0) {
          if (p.size && !acc[key].availableSizes.includes(p.size)) {
            acc[key].availableSizes.push(p.size);
          }
          if (p.color && !acc[key].availableColors.includes(p.color)) {
            acc[key].availableColors.push(p.color);
          }
        }
        acc[key].totalStock += toNum(p.stock);
        acc[key].allVariations.push({ size: p.size, color: p.color, stock: p.stock });
        // Add images if they are not already in the list
        pImages.forEach((img: string) => {
          if (img && !acc[key].allImages.includes(img)) {
            acc[key].allImages.push(img);
          }
        });
      }
    }
    return acc;
  }, {});

  const catalogItems = Object.values(groupedProducts).sort((a: any, b: any) => {
    if (a.is_featured && !b.is_featured) return -1;
    if (!a.is_featured && b.is_featured) return 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  const availableSizes = Array.from(new Set((products || []).flatMap((p: any) => p.has_variations && p.variations ? p.variations.filter((v: any) => toNum(v.stock) > 0).map((v: any) => v.size) : (toNum(p.stock) > 0 ? [p.size] : [])))).filter(Boolean).sort();
  const availableColors = Array.from(new Set((products || []).flatMap((p: any) => p.has_variations && p.variations ? p.variations.filter((v: any) => toNum(v.stock) > 0).map((v: any) => v.color) : (toNum(p.stock) > 0 ? [p.color] : [])))).filter(Boolean).sort();

  const filteredCatalog = catalogItems.filter((p: any) => {
    const matchesSearch = (p.name || '').toLowerCase().includes((catalogSearch || '').toLowerCase()) || 
                         (p.brand || '').toLowerCase().includes((catalogSearch || '').toLowerCase()) ||
                         (p.has_variations && p.variations && p.variations.some((v: any) => (v.brand || '').toLowerCase().includes((catalogSearch || '').toLowerCase())));
    const matchesSize = catalogSizeFilter === '' || (p.availableSizes || []).includes(catalogSizeFilter);
    const matchesColor = catalogColorFilter === '' || (p.availableColors || []).includes(catalogColorFilter);
    const matchesPrice = catalogPriceFilter === '' || toNum(p.price) <= Number(catalogPriceFilter);
    return matchesSearch && matchesSize && matchesColor && matchesPrice;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-3xl shadow-soft border border-gray-100/50">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Buscar produtos ou marcas..."
            value={catalogSearch || ''}
            onChange={(e) => setCatalogSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl text-base font-medium focus:ring-4 focus:ring-champagne/10 focus:border-champagne outline-none transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <select 
            value={catalogSizeFilter || ''}
            onChange={(e) => setCatalogSizeFilter(e.target.value)}
            className="bg-gray-50/50 border border-gray-100 rounded-xl px-4 py-3 text-base font-bold outline-none focus:ring-4 focus:ring-champagne/10 focus:border-champagne min-w-[110px] cursor-pointer transition-all"
          >
            <option value="">Tamanho</option>
            {availableSizes.map((size: any) => <option key={size} value={size}>{size}</option>)}
          </select>
          <select 
            value={catalogColorFilter || ''}
            onChange={(e) => setCatalogColorFilter(e.target.value)}
            className="bg-gray-50/50 border border-gray-100 rounded-xl px-4 py-3 text-base font-bold outline-none focus:ring-4 focus:ring-champagne/10 focus:border-champagne min-w-[110px] cursor-pointer transition-all"
          >
            <option value="">Cor</option>
            {availableColors.map((color: any) => <option key={color} value={color}>{color}</option>)}
          </select>
          <select 
            value={catalogPriceFilter || ''}
            onChange={(e) => setCatalogPriceFilter(e.target.value === '' ? '' : Number(e.target.value))}
            className="bg-gray-50/50 border border-gray-100 rounded-xl px-4 py-3 text-base font-bold outline-none focus:ring-4 focus:ring-champagne/10 focus:border-champagne min-w-[130px] cursor-pointer transition-all"
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
              className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all shrink-0 active:scale-90"
              title="Limpar filtros"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 products-list">
        {filteredCatalog.map((product: any) => (
          <CatalogItem 
            key={product.id} 
            product={product} 
            storeSettings={storeSettings} 
          />
        ))}
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
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  
  const handleDeleteMovement = async (id: string) => {
    showConfirm(
      'Excluir Registro',
      'Tem certeza que deseja excluir este registro do histórico? Esta ação não pode ser desfeita e não afetará o estoque atual.',
      async () => {
        try {
          await deleteDoc(doc(db, 'estoque_movimentacoes', id));
          showNotification('Registro excluído com sucesso!');
        } catch (error: any) {
          showNotification('Erro ao excluir registro: ' + error.message, 'error');
        }
      },
      'danger'
    );
  };

  const filteredMovements = stockMovements.filter(m => {
    const matchesSearch = (m.produto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.tipo_movimento || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.marca || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.usuario || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const movementDate = new Date(m.date);
    const matchesDate = !dateFilter || movementDate.toISOString().split('T')[0] === dateFilter;
    const matchesMonth = !monthFilter || (movementDate.getMonth() + 1).toString().padStart(2, '0') === monthFilter.split('-')[1] && movementDate.getFullYear().toString() === monthFilter.split('-')[0];

    return matchesSearch && matchesDate && matchesMonth;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'entrada': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'venda': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'ajuste': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'reposicao': return 'bg-blue-50 text-blue-700 border-blue-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  return (
    <div className="space-y-8">
      <Card className="p-6 shadow-soft border-none rounded-[2rem]">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative group flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-midnight transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por produto, marca, usuário ou tipo..." 
              className="w-full pl-14 pr-6 py-4 bg-gray-50/50 border border-gray-100 rounded-[1.5rem] text-sm font-medium focus:outline-none focus:ring-4 focus:ring-midnight/5 focus:border-midnight/10 transition-all"
              value={searchTerm || ''}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative group">
              <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-midnight transition-colors" />
              <input 
                type="date" 
                className="w-full pl-14 pr-6 py-4 bg-gray-50/50 border border-gray-100 rounded-[1.5rem] text-sm font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-midnight/5 focus:border-midnight/10 transition-all cursor-pointer"
                value={dateFilter || ''}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  if (e.target.value) setMonthFilter('');
                }}
              />
            </div>
            <div className="relative group">
              <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-midnight transition-colors" />
              <input 
                type="month" 
                className="w-full pl-14 pr-6 py-4 bg-gray-50/50 border border-gray-100 rounded-[1.5rem] text-sm font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-midnight/5 focus:border-midnight/10 transition-all cursor-pointer"
                value={monthFilter || ''}
                onChange={(e) => {
                  setMonthFilter(e.target.value);
                  if (e.target.value) setDateFilter('');
                }}
              />
            </div>
            {(searchTerm || dateFilter || monthFilter) && (
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setDateFilter('');
                  setMonthFilter('');
                }}
                className="p-4 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all shrink-0 active:scale-90"
                title="Limpar filtros"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden shadow-soft border-none rounded-[3rem]">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/30 border-b border-gray-100">
                <th className="px-8 py-6 font-black text-gray-400 text-[10px] uppercase tracking-[0.3em]">Data</th>
                <th className="px-8 py-6 font-black text-gray-400 text-[10px] uppercase tracking-[0.3em]">Produto</th>
                <th className="px-8 py-6 font-black text-gray-400 text-[10px] uppercase tracking-[0.3em]">Marca</th>
                <th className="px-8 py-6 font-black text-gray-400 text-[10px] uppercase tracking-[0.3em]">Cor/Tam</th>
                <th className="px-8 py-6 font-black text-gray-400 text-[10px] uppercase tracking-[0.3em]">Tipo</th>
                <th className="px-8 py-6 font-black text-gray-400 text-[10px] uppercase tracking-[0.3em]">Qtd</th>
                <th className="px-8 py-6 font-black text-gray-400 text-[10px] uppercase tracking-[0.3em]">Usuário</th>
                <th className="px-8 py-6 font-black text-gray-400 text-[10px] uppercase tracking-[0.3em] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredMovements.map(m => (
                <tr key={m.id} className="hover:bg-gray-50/50 transition-all group">
                  <td className="px-8 py-5 text-sm text-gray-500 whitespace-nowrap">
                    <span className="font-bold text-gray-700">{new Date(m.date).toLocaleDateString('pt-BR')}</span>
                    <span className="block text-[10px] font-black opacity-40 mt-0.5 tracking-wider">{new Date(m.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-black text-gray-900 group-hover:text-midnight transition-colors tracking-tight">{m.produto}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-black text-gray-500 bg-gray-100/80 px-3 py-1 rounded-full uppercase tracking-wider">{m.marca}</span>
                  </td>
                  <td className="px-8 py-5 text-sm font-medium text-gray-500">{m.cor} / {m.tamanho}</td>
                  <td className="px-8 py-5">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] border ${getTypeColor(m.tipo_movimento)}`}>
                      {m.tipo_movimento}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className={`flex items-center gap-2 text-sm font-black ${m.quantidade > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      <div className={`p-1 rounded-lg ${m.quantidade > 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                        {m.quantidade > 0 ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                      </div>
                      {Math.abs(m.quantidade)}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-[10px] font-black text-midnight shadow-sm group-hover:scale-110 transition-transform">
                        {m.usuario?.charAt(0) || '?'}
                      </div>
                      <span className="text-xs text-gray-600 font-bold">{m.usuario || '-'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button 
                      onClick={() => handleDeleteMovement(m.id)}
                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Excluir Registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-gray-50">
          {filteredMovements.map(m => (
            <div key={m.id} className="p-6 space-y-5 hover:bg-gray-50/30 transition-colors">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${getTypeColor(m.tipo_movimento)}`}>
                      {m.tipo_movimento}
                    </span>
                    <p className="text-[10px] text-gray-400 font-black tracking-widest uppercase">{new Date(m.date).toLocaleString('pt-BR')}</p>
                  </div>
                  <h4 className="font-serif font-bold text-gray-900 text-xl leading-tight tracking-tight">{m.produto}</h4>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{m.marca} • {m.cor}/{m.tamanho}</p>
                </div>
                <div className={`flex items-center gap-2 p-3 rounded-2xl ${m.quantidade > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} text-xl font-black shadow-sm`}>
                  {m.quantidade > 0 ? '+' : ''}{m.quantidade}
                </div>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-[10px] font-black text-midnight shadow-sm">
                    {m.usuario?.charAt(0) || '?'}
                  </div>
                  <span className="text-xs text-gray-500 font-bold italic tracking-tight">Por: {m.usuario || '-'}</span>
                </div>
                <button 
                  onClick={() => handleDeleteMovement(m.id)}
                  className="p-2.5 text-rose-600 bg-rose-50 rounded-xl transition-colors active:scale-95"
                  title="Excluir Registro"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredMovements.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Clock className="w-12 h-12 text-gray-200" />
            </div>
            <h3 className="text-2xl font-serif font-bold text-gray-900 mb-3 tracking-tight">Nenhuma movimentação</h3>
            <p className="text-gray-400 max-w-xs mx-auto font-medium">O histórico de estoque aparecerá aqui conforme houver movimentações.</p>
          </div>
        )}
      </Card>
    </div>
  );
};

const FinanceContent = ({ expenses, ads, orders, handleEdit, handleDeleteExpense, handleDeleteAd, handleDeleteOrder, setModalType, setEditingItem, setIsModalOpen, showNotification, showConfirm, financeMonth, setFinanceMonth }: any) => {
  const [financeTab, setFinanceTab] = useState('todos');

  const filteredExpenses = expenses.filter((e: any) => {
    const matchesTab = financeTab === 'todos' || e.type === financeTab;
    const matchesMonth = !financeMonth || e.date.startsWith(financeMonth);
    return matchesTab && matchesMonth;
  });

  return (
    <div className="space-y-10">
      <Card className="p-6 md:p-8 rounded-2xl bg-white shadow-soft border-none">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-midnight/5 rounded-[1.5rem] flex items-center justify-center shadow-inner">
              <DollarSign className="w-8 h-8 text-midnight opacity-40" />
            </div>
            <div>
              <h3 className="text-2xl font-serif font-bold text-gray-900 tracking-tight">Filtro Financeiro</h3>
              <p className="text-sm text-gray-400 font-medium mt-1">Selecione o mês para visualizar os gastos.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-gray-50 px-6 py-4 rounded-2xl border border-gray-100 shadow-sm group hover:border-midnight/20 transition-all duration-500">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Mês:</label>
            <input 
              type="month" 
              value={financeMonth || ''}
              onChange={(e) => setFinanceMonth(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-black text-gray-900 focus:ring-0 p-0 cursor-pointer"
            />
          </div>
        </div>
      </Card>

      <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-2 p-2 bg-gray-100/50 backdrop-blur rounded-[1.5rem] w-full lg:w-fit overflow-x-auto scrollbar-hide shadow-inner border border-gray-100">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'Fixo', label: 'Fixos' },
            { id: 'Anúncio', label: 'Anúncios' },
            { id: 'Estoque', label: 'Estoque' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setFinanceTab(tab.id)}
              className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-500 whitespace-nowrap ${
                financeTab === tab.id 
                ? 'bg-white text-midnight shadow-elegant scale-105' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-4 w-full lg:w-auto">
          {[
            { type: 'Fixo', label: 'Gasto Fixo', icon: <Receipt className="w-4 h-4" /> },
            { type: 'Anúncio', label: 'Gasto Anúncio', icon: <TrendingUp className="w-4 h-4" /> },
            { type: 'Estoque', label: 'Compra Estoque', icon: <Package className="w-4 h-4" /> }
          ].map(btn => (
            <button 
              key={btn.type}
              onClick={() => { setModalType('gastos'); setEditingItem({ type: btn.type }); setIsModalOpen(true); }}
              className="flex-1 lg:flex-none bg-white text-midnight border border-gray-100 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-midnight hover:text-champagne hover:-translate-y-1 transition-all duration-500 shadow-soft active:scale-95 group"
            >
              <div className="p-1.5 bg-gray-50 rounded-lg group-hover:bg-white/10 transition-colors">
                <Plus className="w-4 h-4" />
              </div>
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredExpenses.map((e: any) => (
          <Card key={e.id} className="relative group hover:shadow-2xl transition-all duration-500 border-none rounded-2xl overflow-hidden">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                    e.type === 'Fixo' ? 'bg-midnight/5 text-midnight' : 
                    e.type === 'Anúncio' ? 'bg-champagne/20 text-midnight' : 
                    'bg-emerald-50 text-emerald-600'
                  }`}>
                    <Receipt className="w-7 h-7 opacity-60" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-xl text-gray-900 leading-tight tracking-tight">{e.description}</h3>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1">{e.category || e.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-gray-900 tracking-tighter">{formatCurrency(e.value)}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{new Date(e.date).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              
              {e.observations && (
                <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100/50 mb-8">
                  <p className="text-xs text-gray-500 font-medium italic leading-relaxed">"{e.observations}"</p>
                </div>
              )}
              
              <div className="flex justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 md:translate-y-2 md:group-hover:translate-y-0">
                <button onClick={() => handleEdit('gastos', e)} className="p-3 text-midnight bg-midnight/5 md:bg-transparent hover:bg-midnight/5 rounded-xl transition-colors">
                  <Edit className="w-5 h-5" />
                </button>
                <button onClick={() => handleDeleteExpense(e.id)} className="p-3 text-rose-600 bg-rose-50 md:bg-transparent hover:bg-rose-50 rounded-xl transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredExpenses.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100 shadow-inner">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Receipt className="w-12 h-12 text-gray-200" />
          </div>
          <h3 className="text-2xl font-serif font-bold text-gray-900 mb-3 tracking-tight">Nenhum registro</h3>
          <p className="text-gray-400 max-w-xs mx-auto font-medium">Os registros financeiros aparecerão aqui conforme forem cadastrados.</p>
        </div>
      )}
    </div>
  );
};

const SellersContent = ({ sellers, dashboard, handleEdit, handleDeleteSeller, showNotification, showConfirm }: any) => {
  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {sellers.map((s: any) => {
          const stats = dashboard?.sellerStats?.find((stat: any) => stat.id === s.id);
          return (
            <Card key={s.id} className="relative group hover:shadow-2xl transition-all duration-500 border-none rounded-2xl overflow-hidden">
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-5">
                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-inner transition-transform duration-500 group-hover:scale-110 ${
                      s.status === 'ativo' ? 'bg-midnight/5 text-midnight' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {s.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-2xl text-gray-900 leading-tight tracking-tight">{s.name}</h3>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1">{s.email}</p>
                      <p className="text-[10px] text-gray-400 font-bold mt-0.5">{s.phone}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-sm ${
                    s.status === 'ativo' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}>
                    {s.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50 group-hover:bg-white transition-colors duration-500">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Vendas</p>
                    <p className="text-lg font-black text-gray-900 tracking-tighter">{stats?.sales_count || 0}</p>
                  </div>
                  <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50 group-hover:bg-white transition-colors duration-500">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Total</p>
                    <p className="text-lg font-black text-gray-900 tracking-tighter">{formatCurrency(stats?.total_sold || 0)}</p>
                  </div>
                  <div className="p-4 bg-midnight/5 rounded-2xl border border-midnight/5 group-hover:bg-midnight group-hover:text-champagne transition-all duration-500">
                    <p className="text-[9px] font-black text-midnight/40 group-hover:text-champagne/40 uppercase tracking-widest mb-1.5">Comissão</p>
                    <p className="text-lg font-black tracking-tighter">{formatCurrency(stats?.commission || 0)}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 md:translate-y-2 md:group-hover:translate-y-0">
                  <button onClick={() => handleEdit('vendedores', s)} className="p-3 text-midnight bg-midnight/5 md:bg-transparent hover:bg-midnight/5 rounded-xl transition-colors">
                    <Edit className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleDeleteSeller(s.id)} className="p-3 text-rose-600 bg-rose-50 md:bg-transparent hover:bg-rose-50 rounded-xl transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {sellers.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100 shadow-inner">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Briefcase className="w-12 h-12 text-gray-200" />
          </div>
          <h3 className="text-2xl font-serif font-bold text-gray-900 mb-3 tracking-tight">Nenhum vendedor</h3>
          <p className="text-gray-400 max-w-xs mx-auto font-medium">Os vendedores cadastrados aparecerão aqui para acompanhamento de performance.</p>
        </div>
      )}
    </div>
  );
};

const SuppliersContent = ({ suppliers, purchaseHistory, handleEdit, fetchData, showNotification, showConfirm, purchaseMonth, setPurchaseMonth }: any) => {
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
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {suppliers.map((s: any) => (
          <Card key={s.id} className="relative group hover:shadow-2xl transition-all duration-500 border-none rounded-2xl overflow-hidden">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-midnight/5 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                    <Truck className="w-8 h-8 text-midnight opacity-40" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-2xl text-gray-900 leading-tight">{s.name}</h3>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1">{s.email}</p>
                  </div>
                </div>
                <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 md:translate-x-2 md:group-hover:translate-x-0">
                  <button onClick={() => handleEdit('fornecedores', s)} className="p-2.5 text-midnight bg-midnight/5 md:bg-transparent hover:bg-midnight/5 rounded-xl transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteSupplier(s.id)} className="p-2.5 text-rose-600 bg-rose-50 md:bg-transparent hover:bg-rose-50 rounded-xl transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    <Phone className="w-4 h-4 text-midnight/40" />
                  </div>
                  <span className="text-sm font-bold text-gray-700">{s.phone}</span>
                </div>
                <div className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    <MapPin className="w-4 h-4 text-midnight/40" />
                  </div>
                  <span className="text-sm font-bold text-gray-700 leading-relaxed">{s.address}</span>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-3">Produtos Fornecidos</p>
                <div className="flex flex-wrap gap-2">
                  {s.products_supplied?.split(',').map((tag: string, i: number) => (
                    <span key={i} className="text-[10px] font-bold text-midnight bg-champagne/20 px-3 py-1 rounded-full">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 shadow-soft border-none rounded-[2rem]">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-midnight/5 rounded-2xl flex items-center justify-center shadow-inner">
              <Clock className="w-7 h-7 text-midnight opacity-40" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-xl text-gray-900">Filtro de Compras</h3>
              <p className="text-sm text-gray-500">Selecione o mês para visualizar o histórico.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mês:</label>
            <input 
              type="month" 
              value={purchaseMonth || ''}
              onChange={(e) => setPurchaseMonth(e.target.value)}
              className="px-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:border-midnight/10 focus:ring-4 focus:ring-midnight/5 outline-none transition-all text-sm font-bold"
            />
          </div>
        </div>
      </Card>

      <Card className="shadow-soft border-none rounded-[2rem] overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-serif font-bold text-gray-900 text-2xl flex items-center gap-3">
            <Clock className="w-6 h-6 text-midnight opacity-40" /> Histórico de Compras
          </h3>
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Data</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Fornecedor</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Produto</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Qtd</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {purchaseHistory.filter((ph: any) => !purchaseMonth || ph.date.startsWith(purchaseMonth)).map((ph: any) => (
                <tr key={ph.id} className="hover:bg-gray-50/80 transition-all group">
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-gray-500">{new Date(ph.date).toLocaleDateString('pt-BR')}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-midnight/5 flex items-center justify-center text-[10px] font-black text-midnight">
                        {ph.supplier_name?.charAt(0)}
                      </div>
                      <span className="text-sm font-black text-gray-900">{ph.supplier_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-600">{ph.product_name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-black text-gray-900">{ph.quantity}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-black text-emerald-600">{formatCurrency(ph.value)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-gray-50">
          {purchaseHistory.filter((ph: any) => !purchaseMonth || ph.date.startsWith(purchaseMonth)).map((ph: any) => (
            <div key={ph.id} className="p-6 space-y-4 hover:bg-gray-50/50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{new Date(ph.date).toLocaleDateString('pt-BR')}</p>
                  <h4 className="font-serif font-bold text-gray-900 text-lg leading-tight">{ph.product_name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-5 h-5 rounded-full bg-midnight/5 flex items-center justify-center text-[8px] font-black text-midnight">
                      {ph.supplier_name?.charAt(0)}
                    </div>
                    <p className="text-xs text-midnight font-bold">{ph.supplier_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-emerald-600 block">{formatCurrency(ph.value)}</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{ph.quantity} un.</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const FinancialSummary = ({ dashboard }: { dashboard: any }) => {
  if (!dashboard) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
      <Card className="bg-emerald-50/40 border-emerald-100/50 p-3 md:p-4 shadow-soft hover:shadow-lg transition-all duration-500 group relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-12 h-12 bg-emerald-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200/50 group-hover:rotate-6 transition-transform duration-500">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] md:text-[9px] font-black text-emerald-600 uppercase tracking-[0.1em] mb-1">Faturamento (Vendas)</p>
            <h4 className="text-lg md:text-xl font-black text-gray-900 tracking-tight">{formatCurrency(toNum(dashboard.monthlyRevenue))}</h4>
            <p className="text-[9px] md:text-[8px] font-bold text-gray-400">{dashboard.monthlySalesCount} vendas realizadas</p>
          </div>
        </div>
      </Card>

      <Card className="bg-amber-50/40 border-amber-100/50 p-3 md:p-4 shadow-soft hover:shadow-lg transition-all duration-500 group relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-12 h-12 bg-amber-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-200/50 group-hover:-rotate-6 transition-transform duration-500">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] md:text-[9px] font-black text-amber-600 uppercase tracking-[0.1em] mb-1">Lucro Bruto (Vendas - Custo)</p>
            <h4 className="text-lg md:text-xl font-black text-gray-900 tracking-tight">{formatCurrency(toNum(dashboard.totalProfit))}</h4>
            <p className="text-[9px] md:text-[8px] font-bold text-amber-600">Margem: {toNum(dashboard.profitMargin).toFixed(1)}%</p>
          </div>
        </div>
      </Card>

      <Card className="bg-midnight border-none p-3 md:p-4 shadow-xl shadow-midnight/30 hover:scale-[1.01] transition-all duration-500 group relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-12 h-12 bg-champagne/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-champagne/20 rounded-xl flex items-center justify-center text-champagne shadow-lg shadow-black/20 group-hover:scale-110 transition-transform duration-500">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] md:text-[9px] font-black text-champagne/60 uppercase tracking-[0.1em] mb-1">Lucro Líquido (Real)</p>
            <h4 className="text-lg md:text-xl font-black text-champagne tracking-tight">{formatCurrency(toNum(dashboard.netProfit))}</h4>
            <p className="text-[9px] md:text-[8px] font-bold text-rose-400">Gastos: {formatCurrency(toNum(dashboard.monthlyExpenses))}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

const DashboardContent = ({ dashboard, storeSettings, generatePDF, showNotification, showConfirm, onPromote }: any) => {
  if (!dashboard) return null;

  const goalProgress = (toNum(dashboard.monthlyRevenue) / (toNum(dashboard.monthlyGoal) || 1)) * 100;

  const COLORS = ['#15192b', '#e1c1a0', '#c9a585', '#000000', '#4b5563'];

  return (
    <div className="space-y-4 md:space-y-6 pb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-1">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">Dashboard de Gestão</h2>
          <p className="text-gray-500 text-xs md:text-[10px] font-medium mt-0.5">Visão geral do desempenho do seu negócio.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => generatePDF('dashboard')}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 md:py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm active:scale-95"
          >
            <FileText className="w-3.5 h-3.5" /> Exportar PDF
          </button>
        </div>
      </div>

      {/* Sales Goal */}
      <Card className="bg-midnight text-white border-none p-6 md:p-8 shadow-xl relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-midnight via-midnight to-black opacity-80" />
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-champagne/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-8">
          <div className="flex-1 w-full">
            <div className="flex justify-between items-end mb-6">
              <div>
                <p className="text-champagne/60 text-[11px] md:text-[9px] font-black uppercase tracking-[0.3em] mb-3">Meta Mensal de Vendas</p>
                <h3 className="text-3xl md:text-5xl font-serif font-bold text-champagne tracking-tighter leading-none">
                  {formatCurrency(toNum(dashboard.monthlyRevenue))} 
                  <span className="text-lg md:text-2xl font-normal text-champagne/20 ml-4">/ {formatCurrency(toNum(dashboard.monthlyGoal))}</span>
                </h3>
              </div>
              <div className="text-right">
                <span className="text-3xl md:text-5xl font-bold text-champagne leading-none tracking-tighter">{toNum(goalProgress).toFixed(0)}%</span>
              </div>
            </div>
            <div className="w-full bg-white/5 rounded-full h-4 md:h-6 overflow-hidden p-1 border border-white/5 backdrop-blur-md shadow-inner">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, toNum(goalProgress))}%` }}
                className="bg-gradient-to-r from-champagne-dark to-champagne h-full rounded-full shadow-[0_0_20px_rgba(225,193,160,0.5)] relative"
              >
                <div className="absolute inset-0 bg-white/20 blur-sm rounded-full" />
              </motion.div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="flex-1 lg:flex-none bg-white/5 backdrop-blur-2xl p-5 rounded-xl text-center md:min-w-[170px] border border-white/10 shadow-2xl hover:bg-white/10 transition-all duration-500">
              <p className="text-[12px] md:text-[10px] font-black text-champagne/40 uppercase tracking-[0.2em] mb-2.5">Ticket Médio</p>
              <p className="text-2xl font-black text-champagne tracking-tight">{formatCurrency(toNum(dashboard.ticketMedio))}</p>
            </div>
            <div className="flex-1 lg:flex-none bg-white/5 backdrop-blur-2xl p-5 rounded-xl text-center md:min-w-[170px] border border-white/10 shadow-2xl hover:bg-white/10 transition-all duration-500">
              <p className="text-[12px] md:text-[10px] font-black text-champagne/40 uppercase tracking-[0.2em] mb-2.5">ROI Anúncios</p>
              <p className="text-2xl font-black text-champagne tracking-tight">{toNum(dashboard.roi).toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard title="Faturamento Hoje" value={formatCurrency(toNum(dashboard.dailyRevenue))} emoji="💰" colorClass="text-midnight" />
        <StatCard title="Lucro Bruto Mês" value={formatCurrency(toNum(dashboard.totalProfit))} emoji="📈" colorClass="text-midnight" />
        <StatCard title="Lucro Líquido Mês" value={formatCurrency(toNum(dashboard.netProfit))} emoji="📊" colorClass="text-midnight" />
        <StatCard title="Itens Baixo Estoque" value={(dashboard.lowStock || []).length} emoji="⚠️" colorClass="text-rose-600" />
      </div>

      {/* New Indicators Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="bg-white border-gray-100 shadow-soft hover:shadow-elegant transition-all duration-700 group p-5 rounded-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-midnight shadow-sm group-hover:bg-midnight group-hover:text-champagne transition-all duration-700">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] md:text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Mais Vendido (Mês)</p>
              <h4 className="text-base font-black text-gray-900 truncate max-w-[140px]">{dashboard.bestSellingProductMonth?.name || 'N/A'}</h4>
              <p className="text-sm text-champagne-dark font-bold">{dashboard.bestSellingProductMonth?.total_sold || 0} un.</p>
            </div>
          </div>
        </Card>

        <Card className="bg-white border-gray-100 shadow-soft hover:shadow-elegant transition-all duration-700 group p-5 rounded-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm group-hover:bg-emerald-500 group-hover:text-white transition-all duration-700">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] md:text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Clientes Ativos</p>
              <h4 className="text-base font-black text-gray-900">{dashboard.customerStats?.active || 0} <span className="text-gray-300 font-medium">/ {dashboard.customerStats?.inactive || 0}</span></h4>
              <p className="text-sm text-emerald-600 font-bold">Base: {(dashboard.customerStats?.active || 0) + (dashboard.customerStats?.inactive || 0)}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-white border-gray-100 shadow-soft hover:shadow-elegant transition-all duration-700 group p-5 rounded-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 shadow-sm group-hover:bg-rose-500 group-hover:text-white transition-all duration-700">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] md:text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Produto em Alta</p>
              <h4 className="text-base font-black text-gray-900 truncate max-w-[140px]">{dashboard.trendingProduct?.name || 'N/A'}</h4>
              <p className="text-sm text-rose-600 font-bold">+{toNum(dashboard.trendingProduct?.growth).toFixed(1)}% cresc.</p>
            </div>
          </div>
        </Card>

        <Card className="bg-white border-gray-100 shadow-soft hover:shadow-elegant transition-all duration-700 group p-4 rounded-xl">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-midnight/5 rounded-xl flex items-center justify-center text-midnight shadow-sm group-hover:bg-midnight group-hover:text-white transition-all duration-700">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] md:text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Valor em Estoque</p>
              <h4 className="text-sm font-black text-gray-900">{formatCurrency(dashboard.totalStockValue || 0)}</h4>
              <p className="text-xs text-midnight/60 font-bold">Custo: {formatCurrency(dashboard.totalStockCost || 0)}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seller Ranking */}
        <Card className="p-4 md:p-5 rounded-xl">
          <h3 className="font-serif font-bold text-gray-900 mb-6 text-lg flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-xl">
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>
            Ranking de Vendedores
          </h3>
          <div className="space-y-3">
            {(dashboard.sellerStats || []).map((s: any, i: number) => (
              <div key={`seller-${s.id || i}`} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-sm transition-all duration-500 group">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shadow-sm transition-all duration-500 ${
                    i === 0 ? 'bg-amber-500 text-white shadow-amber-200 scale-105' : 
                    i === 1 ? 'bg-gray-300 text-gray-700' : 
                    i === 2 ? 'bg-orange-300 text-orange-900' : 
                    'bg-white text-gray-400 border border-gray-100'
                  }`}>
                    {i + 1}º
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900 group-hover:text-midnight transition-colors">{s.name}</p>
                    <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">{s.sales_count} vendas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-midnight">{formatCurrency(toNum(s.total_sold))}</p>
                </div>
              </div>
            ))}
            {(dashboard.sellerStats || []).length === 0 && (
              <div className="text-center py-10">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-gray-400 text-xs font-bold italic">Nenhum dado de vendedor.</p>
              </div>
            )}
          </div>
        </Card>

        {/* Stale Products */}
        <Card className="p-4 md:p-5 rounded-xl">
          <h3 className="font-serif font-bold text-gray-900 mb-6 text-lg flex items-center gap-3">
            <div className="p-2 bg-rose-50 rounded-xl">
              <Flame className="w-5 h-5 text-rose-500" />
            </div>
            Produtos Sem Giro (30 dias)
          </h3>
          <div className="space-y-3">
            {(dashboard.staleProducts || []).map((p: any, i: number) => (
              <div key={`stale-${p.id || i}`} className="flex items-center justify-between p-3 bg-rose-50/30 rounded-2xl border border-rose-100 hover:bg-white hover:shadow-sm transition-all duration-500 group">
                <div>
                  <p className="text-sm font-black text-gray-900 group-hover:text-rose-600 transition-colors">{p.name}</p>
                  <p className="text-[8px] text-rose-600 font-black uppercase tracking-widest mt-0.5">
                    Estoque: {p.stock} <span className="mx-1 opacity-30">|</span> Última Venda: {p.last_sale ? new Date(p.last_sale).toLocaleDateString('pt-BR') : 'Nunca'}
                  </p>
                </div>
                <div className="text-right">
                  <button 
                    onClick={() => onPromote(p.id)}
                    className={`${p.is_featured ? 'bg-emerald-600 shadow-emerald-200' : 'bg-rose-600 shadow-rose-200'} text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-md`}
                  >
                    {p.is_featured ? 'Promovido' : 'Promover'}
                  </button>
                </div>
              </div>
            ))}
            {(dashboard.staleProducts || []).length === 0 && (
              <div className="text-center py-10">
                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-6 h-6 text-emerald-300" />
                </div>
                <p className="text-emerald-600 text-xs font-bold italic">Todos os produtos estão girando!</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {dashboard.lowStock && dashboard.lowStock.length > 0 && (
        <Card className="border-rose-200 bg-rose-50/30 p-4 md:p-6 rounded-2xl shadow-soft">
          <h3 className="font-serif font-bold text-rose-900 mb-6 text-lg flex items-center gap-3">
            <div className="p-2 bg-rose-100 rounded-xl animate-pulse">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            Alerta de Estoque Baixo
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboard.lowStock.map((p: any) => (
              <div key={`low-stock-${p.id}`} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-rose-100 shadow-sm hover:shadow-md transition-all duration-500 group">
                <div>
                  <p className="text-sm font-black text-gray-900 group-hover:text-rose-600 transition-colors">{p.name}</p>
                  <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest mt-0.5">{p.brand} <span className="mx-1 opacity-30">•</span> {p.color} <span className="mx-1 opacity-30">•</span> {p.size}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-rose-600">{p.stock}</p>
                  <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">Mín: {p.min_stock}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Last 7 Days Chart */}
        <Card className="p-4 md:p-5 rounded-xl">
          <h3 className="font-serif font-bold text-gray-900 mb-6 text-lg flex items-center gap-3">
            <div className="p-2 bg-gray-50 rounded-xl">
              <TrendingUp className="w-5 h-5 text-midnight" />
            </div>
            Faturamento Últimos 7 Dias
          </h3>
          <div className="h-[200px] md:h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dashboard.revenueLast7Days || []}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#141414" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#141414" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(str) => new Date(str).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  tickFormatter={(val) => `R$ ${toNum(val)}`}
                  dx={-5}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 20px -5px rgba(0,0,0,0.1)', padding: '10px' }}
                  formatter={(val: number) => [formatCurrency(toNum(val)), 'Faturamento']}
                />
                <Area type="monotone" dataKey="revenue" stroke="none" fillOpacity={1} fill="url(#colorRevenue)" />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#141414" 
                  strokeWidth={2} 
                  dot={{ r: 4, fill: '#141414', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#141414' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Sales by Month Chart */}
        <Card className="p-4 md:p-5 rounded-xl">
          <h3 className="font-serif font-bold text-gray-900 mb-6 text-lg flex items-center gap-3">
            <div className="p-2 bg-gray-50 rounded-xl">
              <BarChart3 className="w-5 h-5 text-midnight" />
            </div>
            Vendas por Mês
          </h3>
          <div className="h-[200px] md:h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={dashboard.salesByMonth || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  dx={-5}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 20px -5px rgba(0,0,0,0.1)', padding: '10px' }}
                  formatter={(val: number) => [formatCurrency(val), 'Faturamento']}
                />
                <Bar dataKey="revenue" fill="#141414" radius={[8, 8, 0, 0]} barSize={30} />
              </ReBarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Sales by Payment Method Pie Chart */}
        <Card className="p-4 md:p-5 rounded-xl">
          <h3 className="font-serif font-bold text-gray-900 mb-6 text-lg flex items-center gap-3">
            <div className="p-2 bg-gray-50 rounded-xl">
              <CreditCard className="w-5 h-5 text-midnight" />
            </div>
            Vendas por Forma de Pagamento
          </h3>
          <div className="h-[200px] md:h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dashboard.salesByPaymentMethod || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={window.innerWidth < 768 ? 40 : 60}
                  outerRadius={window.innerWidth < 768 ? 60 : 90}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="method"
                  stroke="none"
                >
                  {(dashboard.salesByPaymentMethod || []).map((entry: any, index: number) => (
                    <Cell key={`cell-payment-${entry.method || index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 20px -5px rgba(0,0,0,0.1)', padding: '10px' }}
                />
                <Legend verticalAlign="bottom" height={30} iconSize={10} wrapperStyle={{ fontSize: '11px', fontWeight: 700, paddingTop: '10px' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Sales by Color Chart */}
        <Card className="p-4 md:p-5 rounded-xl">
          <h3 className="font-serif font-bold text-gray-900 mb-6 text-lg flex items-center gap-3">
            <div className="p-2 bg-gray-50 rounded-xl">
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-rose-500 via-emerald-500 to-midnight" />
            </div>
            Cores Mais Vendidas
          </h3>
          <div className="h-[200px] md:h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={dashboard.salesByColor || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f8fafc" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="color" 
                  type="category" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }}
                  width={80}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 20px -5px rgba(0,0,0,0.1)', padding: '10px' }}
                  cursor={{ fill: 'transparent' }}
                />
                <Bar dataKey="total_sold" fill="#141414" radius={[0, 8, 8, 0]} barSize={20}>
                  {(dashboard.salesByColor || []).map((entry: any, index: number) => (
                    <Cell key={`cell-color-${entry.color || index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </ReBarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Stock Suggestions */}
        <Card className="p-4 md:p-5 rounded-xl">
          <h3 className="font-serif font-bold text-gray-900 mb-6 text-lg flex items-center gap-3">
            <div className="p-2 bg-gray-50 rounded-xl">
              <Package className="w-5 h-5 text-midnight" />
            </div>
            Sugestões de Reposição
          </h3>
          <div className="space-y-3">
            {(dashboard.stockSuggestions || []).map((s: any, i: number) => (
              <div key={`suggestion-${s.id || i}`} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-sm transition-all duration-500 group">
                <div>
                  <h4 className="font-black text-gray-900 text-base group-hover:text-midnight transition-colors">{s.name}</h4>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Vendas 30d: {s.sales_last_30} | Estoque: {s.stock}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-midnight">Repor {s.suggestion} unidades</p>
                  <button className="text-[10px] font-black text-champagne-dark hover:text-champagne uppercase tracking-widest mt-1.5 transition-colors">Pedir Agora</button>
                </div>
              </div>
            ))}
            {(dashboard.stockSuggestions || []).length === 0 && (
              <div className="text-center py-10">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-gray-400 text-xs font-bold italic">Nenhuma sugestão no momento.</p>
              </div>
            )}
          </div>
        </Card>

        {/* Intelligence Stats */}
        <div className="space-y-6">
          <Card className="bg-emerald-50/30 border-emerald-100 p-4 rounded-xl shadow-soft hover:shadow-elegant transition-all duration-700 group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200/50 group-hover:scale-110 transition-transform duration-700">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[8px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-0.5">Produto Mais Lucrativo</p>
                <h4 className="text-sm font-black text-gray-900 group-hover:text-emerald-700 transition-colors">{dashboard.mostProfitableProduct?.name || 'N/A'}</h4>
                <p className="text-[10px] text-emerald-600 font-bold">Lucro: {formatCurrency(toNum(dashboard.mostProfitableProduct?.profit))}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-midnight/5 border-midnight/10 p-4 rounded-xl shadow-soft hover:shadow-elegant transition-all duration-700 group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-midnight rounded-xl flex items-center justify-center text-white shadow-lg shadow-midnight/20 group-hover:scale-110 transition-transform duration-700">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[8px] font-black text-midnight/60 uppercase tracking-[0.2em] mb-0.5">Tamanho Mais Vendido</p>
                <h4 className="text-sm font-black text-gray-900 group-hover:text-midnight transition-colors">{dashboard.bestSellingSize?.size || 'N/A'}</h4>
                <p className="text-[10px] text-midnight/60 font-bold">{dashboard.bestSellingSize?.count || 0} vendas</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 md:p-5 rounded-xl">
            <h3 className="font-serif font-bold text-gray-900 mb-6 text-lg flex items-center gap-3">
              <div className="p-2 bg-gray-50 rounded-xl">
                <Package className="w-5 h-5 text-midnight" />
              </div>
              Ranking de Produtos (Top 10)
            </h3>
            <div className="space-y-4">
              {(dashboard.topProducts || []).map((p: any, i: number) => (
                <div key={`top-prod-${p.id || i}`} className="space-y-1.5 group">
                  <div className="flex justify-between text-xs font-black">
                    <span className="text-gray-600 group-hover:text-midnight transition-colors">{p.name}</span>
                    <span className="text-midnight">{p.total_sold} un.</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden p-0.5 border border-gray-50 shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(toNum(p.total_sold) / (toNum((dashboard.topProducts || [])[0]?.total_sold) || 1)) * 100}%` }}
                      className="bg-gradient-to-r from-midnight via-midnight to-black h-full rounded-full shadow-lg relative"
                    >
                      <div className="absolute inset-0 bg-white/10 blur-sm rounded-full" />
                    </motion.div>
                  </div>
                </div>
              ))}
              {(dashboard.topProducts || []).length === 0 && (
                <div className="text-center py-10">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-gray-400 text-xs font-bold italic">Nenhum dado de produto.</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Profit by Product */}
        <Card className="lg:col-span-2 p-6 md:p-8 rounded-2xl">
          <h3 className="font-serif font-bold text-gray-900 mb-10 text-2xl flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-2xl">
              <TrendingUp className="w-7 h-7 text-emerald-600" />
            </div>
            Lucratividade por Produto
          </h3>
          <div className="hidden md:block overflow-x-auto -mx-10 md:-mx-16">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] bg-gray-50/50 border-b border-gray-100">
                  <th className="py-6 px-10 md:px-16">Produto</th>
                  <th className="py-6 px-6 text-center">Vendidos</th>
                  <th className="py-6 px-6 text-right">Faturamento</th>
                  <th className="py-6 px-6 text-right">Lucro Total</th>
                  <th className="py-6 px-10 md:px-16 text-right">Margem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(dashboard.topProducts || []).map((p: any, i: number) => (
                  <tr key={`profit-prod-${p.id || i}`} className="hover:bg-gray-50/80 transition-all duration-500 group">
                    <td className="py-6 px-10 md:px-16 font-black text-gray-900 group-hover:text-midnight transition-colors">{p.name}</td>
                    <td className="py-6 px-6 text-center font-bold text-gray-600">{toNum(p.total_sold)}</td>
                    <td className="py-6 px-6 text-right font-bold text-gray-600">{formatCurrency(toNum(p.revenue))}</td>
                    <td className="py-6 px-6 text-right font-black text-emerald-600">{formatCurrency(toNum(p.profit))}</td>
                    <td className="py-6 px-10 md:px-16 text-right">
                      <span className="bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-[10px] font-black border border-emerald-100 shadow-sm group-hover:bg-emerald-100 transition-all">
                        {toNum(p.revenue) > 0 ? ((toNum(p.profit) / toNum(p.revenue)) * 100).toFixed(1) : '0'}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-6">
            {(dashboard.topProducts || []).map((p: any, i: number) => (
              <div key={`profit-prod-mobile-${p.id || i}`} className="p-6 bg-gray-50/50 rounded-[2rem] border border-gray-100 space-y-4 hover:bg-white hover:shadow-md transition-all duration-500 group">
                <div className="flex justify-between items-start">
                  <h4 className="font-black text-gray-900 text-base group-hover:text-midnight transition-colors">{p.name}</h4>
                  <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black border border-emerald-100">
                    {toNum(p.revenue) > 0 ? ((toNum(p.profit) / toNum(p.revenue)) * 100).toFixed(1) : '0'}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-6 pt-2">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Vendas</p>
                    <p className="text-sm font-bold text-gray-700">{toNum(p.total_sold)} un.</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Lucro</p>
                    <p className="text-sm font-black text-emerald-600">{formatCurrency(toNum(p.profit))}</p>
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
                  {toNum(p.min_stock) - toNum(p.stock) > 0 && (
                    <p className="text-[10px] text-rose-500 font-black uppercase mt-1">Repor {toNum(p.min_stock) - toNum(p.stock)} unidades</p>
                  )}
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
  showConfirm,
  formatCurrency,
  toNum
}: any) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [useRange, setUseRange] = useState(false);
  
  const dashboard = useMemo(() => {
    if (useRange && startDate && endDate) {
      return calculateDashboardData(products, customers, sales, expenses, ads, sellers, undefined, startDate, endDate);
    }
    return calculateDashboardData(products, customers, sales, expenses, ads, sellers, selectedMonth);
  }, [products, customers, sales, expenses, ads, sellers, selectedMonth, startDate, endDate, useRange, calculateDashboardData]);

  const totals = useMemo(() => {
    if (!dashboard) return { quantity: 0, revenue: 0, cost: 0, profit: 0 };
    return dashboard.profitByProduct.reduce((acc: any, p: any) => ({
      quantity: acc.quantity + toNum(p.quantity),
      revenue: acc.revenue + toNum(p.revenue),
      cost: acc.cost + toNum(p.cost),
      profit: acc.profit + toNum(p.profit)
    }), { quantity: 0, revenue: 0, cost: 0, profit: 0 });
  }, [dashboard, toNum]);

  const exportPDF = () => {
    const doc = new jsPDF();
    const now = new Date().toLocaleString('pt-BR');
    const period = useRange ? `${startDate} até ${endDate}` : selectedMonth;
    
    doc.setFontSize(18);
    doc.text('Brisa 31 - Relatório de Lucratividade por Produto', 14, 20);
    doc.setFontSize(10);
    doc.text(`Período: ${period}`, 14, 28);
    doc.text(`Gerado em: ${now}`, 14, 34);

    const tableData = dashboard.profitByProduct.map((p: any) => [
      p.name,
      `${toNum(p.quantity)} un.`,
      formatCurrency(toNum(p.revenue)),
      formatCurrency(toNum(p.cost)),
      formatCurrency(toNum(p.profit)),
      `${toNum(p.margin).toFixed(1)}%`
    ]);

    // Add total row
    tableData.push([
      'TOTAL',
      `${totals.quantity} un.`,
      formatCurrency(totals.revenue),
      formatCurrency(totals.cost),
      formatCurrency(totals.profit),
      `${totals.revenue > 0 ? (totals.profit / totals.revenue * 100).toFixed(1) : '0.0'}%`
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Produto', 'Qtd', 'Faturamento', 'Custo', 'Lucro', 'Margem']],
      body: tableData,
      headStyles: { fillColor: [21, 25, 43] },
      footStyles: { fillColor: [21, 25, 43], fontStyle: 'bold' },
    });

    doc.save(`brisa31-lucratividade-${period}.pdf`);
    showNotification('Relatório exportado com sucesso!');
  };

  if (!dashboard) return null;

  return (
    <div className="space-y-10">
      <Card className="p-6 md:p-8 rounded-2xl shadow-soft">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-midnight/5 rounded-[1.5rem] flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-midnight" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-gray-900 text-2xl">Filtros do Relatório</h3>
              <p className="text-sm text-gray-500">Selecione o período para análise detalhada.</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
              <button 
                onClick={() => setUseRange(false)}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!useRange ? 'bg-white text-midnight shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Mês
              </button>
              <button 
                onClick={() => setUseRange(true)}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${useRange ? 'bg-white text-midnight shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Período
              </button>
            </div>

            {!useRange ? (
              <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-2xl border border-gray-100 w-full sm:w-auto">
                <input 
                  type="month" 
                  value={selectedMonth || ''}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full sm:w-auto px-6 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-midnight outline-none transition-all text-sm font-black shadow-sm"
                />
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100 w-full sm:w-auto">
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-midnight outline-none transition-all text-xs font-black shadow-sm"
                  />
                  <span className="text-gray-400 font-bold">até</span>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-midnight outline-none transition-all text-xs font-black shadow-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6 md:p-8 rounded-2xl shadow-soft">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
          <h3 className="font-serif font-bold text-gray-900 text-2xl flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-2xl">
              <DollarSign className="w-7 h-7 text-emerald-600" />
            </div>
            Lucratividade por Produto
          </h3>
          <button 
            onClick={exportPDF}
            className="w-full sm:w-auto bg-midnight text-champagne px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-black transition-all shadow-lg shadow-midnight/10 active:scale-95"
          >
            <Download className="w-4 h-4" /> Exportar PDF
          </button>
        </div>

        <div className="hidden md:block overflow-x-auto -mx-10 md:-mx-16">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-10 md:px-16 py-6 text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">Produto</th>
                <th className="px-6 py-6 text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">Qtd Vendida</th>
                <th className="px-6 py-6 text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">Faturamento</th>
                <th className="px-6 py-6 text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">Custo Total</th>
                <th className="px-6 py-6 text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">Lucro Total</th>
                <th className="px-10 md:px-16 py-6 text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">Margem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {dashboard.profitByProduct.map((p: any, i: number) => (
                <tr key={`profit-row-${p.id || i}`} className="hover:bg-gray-50/80 transition-all duration-500 group border-b border-gray-50 last:border-0">
                  <td className="px-10 md:px-16 py-6 text-base font-black text-gray-900 group-hover:text-midnight transition-colors">{p.name}</td>
                  <td className="px-6 py-6 text-base text-gray-600 font-bold">{toNum(p.quantity)} un.</td>
                  <td className="px-6 py-6 text-base text-gray-600 font-bold">{formatCurrency(toNum(p.revenue))}</td>
                  <td className="px-6 py-6 text-base text-gray-600 font-bold">{formatCurrency(toNum(p.cost))}</td>
                  <td className="px-6 py-6 text-base font-black text-emerald-600">{formatCurrency(toNum(p.profit))}</td>
                  <td className="px-10 md:px-16 py-6 text-base font-black text-emerald-600">
                    <span className={`px-4 py-1.5 rounded-full ${toNum(p.margin) >= 30 ? 'bg-emerald-100 text-emerald-700' : toNum(p.margin) >= 15 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                      {toNum(p.margin).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-midnight text-champagne">
                <td className="px-10 md:px-16 py-6 text-base font-black">TOTAL</td>
                <td className="px-6 py-6 text-base font-bold">{totals.quantity} un.</td>
                <td className="px-6 py-6 text-base font-bold">{formatCurrency(totals.revenue)}</td>
                <td className="px-6 py-6 text-base font-bold">{formatCurrency(totals.cost)}</td>
                <td className="px-6 py-6 text-base font-black text-emerald-400">{formatCurrency(totals.profit)}</td>
                <td className="px-10 md:px-16 py-6 text-base font-black">
                  <span className="px-4 py-1.5 rounded-full bg-white/10">
                    {totals.revenue > 0 ? (totals.profit / totals.revenue * 100).toFixed(1) : '0.0'}%
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-6">
          {dashboard.profitByProduct.map((p: any, i: number) => (
            <div key={`profit-card-${p.id || i}`} className="p-6 bg-gray-50/50 rounded-[2rem] border border-gray-100 space-y-4 hover:bg-white hover:shadow-md transition-all duration-500 group">
              <div className="flex justify-between items-start">
                <h4 className="font-black text-gray-900 text-base group-hover:text-midnight transition-colors">{p.name}</h4>
                <span className="text-sm font-black text-emerald-600">{formatCurrency(toNum(p.profit))}</span>
              </div>
              <div className="grid grid-cols-2 gap-6 pt-2">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Vendas</p>
                  <p className="text-sm font-bold text-gray-700">{toNum(p.quantity)} un.</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Margem</p>
                  <p className={`text-sm font-black ${toNum(p.margin) >= 30 ? 'text-emerald-600' : toNum(p.margin) >= 15 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {toNum(p.margin).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Faturamento</p>
                  <p className="text-sm font-bold text-gray-700">{formatCurrency(toNum(p.revenue))}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Custo</p>
                  <p className="text-sm font-bold text-gray-700">{formatCurrency(toNum(p.cost))}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Total Card Mobile */}
          <div className="p-8 bg-midnight rounded-[2rem] border border-midnight shadow-xl space-y-6">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <h4 className="font-black text-champagne text-lg uppercase tracking-widest">Total Geral</h4>
              <span className="text-xl font-black text-emerald-400">{formatCurrency(totals.profit)}</span>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Vendas Totais</p>
                <p className="text-base font-bold text-champagne">{totals.quantity} un.</p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Margem Média</p>
                <p className="text-base font-black text-emerald-400">
                  {totals.revenue > 0 ? (totals.profit / totals.revenue * 100).toFixed(1) : '0.0'}%
                </p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Faturamento</p>
                <p className="text-base font-bold text-champagne">{formatCurrency(totals.revenue)}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Custo Total</p>
                <p className="text-base font-bold text-champagne">{formatCurrency(totals.cost)}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
      
      <Card className="p-6 md:p-8 rounded-2xl shadow-soft">
        <h3 className="font-serif font-bold text-gray-900 mb-10 text-2xl flex items-center gap-4">
          <div className="p-3 bg-midnight/5 rounded-2xl">
            <Package className="w-7 h-7 text-midnight" />
          </div>
          Status do Estoque Atual
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div className="p-8 bg-midnight/5 rounded-2xl border border-midnight/10 hover:bg-midnight/10 transition-all duration-500 group">
            <p className="text-[10px] font-black text-midnight/60 uppercase tracking-widest mb-3">Valor Total em Estoque (Preço Venda)</p>
            <p className="text-3xl font-black text-midnight group-hover:scale-105 transition-transform origin-left">
              {formatCurrency(products.reduce((acc: number, p: any) => acc + (toNum(p.price) * toNum(p.stock)), 0))}
            </p>
          </div>
          <div className="p-8 bg-emerald-50 rounded-2xl border border-emerald-100 hover:bg-emerald-100/50 transition-all duration-500 group">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">Custo Total em Estoque</p>
            <p className="text-3xl font-black text-emerald-700 group-hover:scale-105 transition-transform origin-left">
              {formatCurrency(products.reduce((acc: number, p: any) => acc + (toNum(p.cost) * toNum(p.stock)), 0))}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto -mx-10 md:-mx-16">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-10 md:px-16 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Produto</th>
                <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Estoque Atual</th>
                <th className="px-10 md:px-16 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.sort((a: any, b: any) => toNum(a.stock) - toNum(b.stock)).map((p: any, i: number) => (
                <tr key={`stock-status-${p.id || i}`} className="hover:bg-gray-50/80 transition-all duration-500 group">
                  <td className="px-10 md:px-16 py-6 text-sm font-black text-gray-900 group-hover:text-midnight transition-colors">{p.name}</td>
                  <td className="px-6 py-6 text-sm text-gray-600 font-bold">{toNum(p.stock)} un.</td>
                  <td className="px-10 md:px-16 py-6 text-right">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border shadow-sm transition-all ${
                      toNum(p.stock) <= 0 ? 'bg-rose-100 text-rose-700 border-rose-200' :
                      toNum(p.stock) <= toNum(p.min_stock) ? 'bg-amber-100 text-amber-700 border-amber-200' :
                      'bg-emerald-100 text-emerald-700 border-emerald-200'
                    }`}>
                      {toNum(p.stock) <= 0 ? 'ESGOTADO' :
                       toNum(p.stock) <= toNum(p.min_stock) ? 'BAIXO' : 'OK'}
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

const CustomersContent = ({ customers, handleEdit, handleDeleteCustomer, storeSettings, showNotification, showConfirm, user }: any) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {customers.map((c: any) => (
        <Card key={c.id} className="relative group hover:shadow-xl transition-all duration-500 border-none rounded-2xl overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-inner ${
                  c.classification === 'VIP' ? 'bg-amber-100 text-amber-600' : 'bg-midnight/5 text-midnight'
                }`}>
                  {c.name?.charAt(0) || '?'}
                </div>
                <div>
                  <h3 className="font-serif font-bold text-xl text-gray-900 leading-tight">{c.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                      c.classification === 'VIP' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {c.classification}
                    </span>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                      c.status === 'ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                      c.status === 'atenção' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                      'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                </div>
              </div>
              {user?.role === 'admin' && (
                <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 md:translate-x-2 md:group-hover:translate-x-0">
                  <button onClick={() => handleEdit('clientes', c)} className="p-2.5 text-midnight bg-midnight/5 md:bg-transparent hover:bg-midnight/5 rounded-xl transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteCustomer(c.id)} className="p-2.5 text-rose-600 bg-rose-50 md:bg-transparent hover:bg-rose-50 rounded-xl transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 bg-gray-50/50 rounded-[1.5rem] border border-gray-100/50">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Gasto</p>
                <p className="text-lg font-black text-gray-900">{formatCurrency(toNum(c.total_spent))}</p>
              </div>
              <div className="p-4 bg-gray-50/50 rounded-[1.5rem] border border-gray-100/50">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Compras</p>
                <p className="text-lg font-black text-gray-900">{toNum(c.total_purchases)}</p>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <Phone className="w-4 h-4 text-gray-400" />
                </div>
                {c.phone}
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <Instagram className="w-4 h-4 text-gray-400" />
                </div>
                @{c.instagram}
              </div>
              
              <a 
                href={`https://wa.me/${c.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(
                  `Olá ${c.name}! Notamos que faz um tempo que você não nos visita na ${storeSettings.nome_loja}. Temos novidades incríveis que você vai adorar!`
                )}`}
                target="_blank"
                className="w-full bg-midnight text-champagne py-4 rounded-[1.5rem] font-bold text-sm flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl shadow-midnight/20 group/btn mt-4"
              >
                <Phone className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" /> 
                Falar no WhatsApp
              </a>
            </div>
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
          <div className="w-20 h-20 bg-midnight rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-midnight/10">
            {user?.name?.charAt(0)}
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{user?.name}</h3>
            <p className="text-gray-500">{user?.login}</p>
            <span className="text-[10px] font-black uppercase tracking-widest bg-midnight/5 text-midnight px-2 py-1 rounded-full mt-2 inline-block">
              {user?.role === 'admin' ? 'Administrador' : 'Vendedor'}
            </span>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nome Completo</label>
              <input name="name" defaultValue={user?.name} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-midnight outline-none" required />
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
              className="flex-1 bg-midnight text-white py-4 rounded-2xl font-bold shadow-lg shadow-midnight/10 hover:bg-black transition-all disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
            <button 
              type="button"
              onClick={() => setIsChangePasswordModalOpen(true)}
              className="flex-1 bg-white text-midnight border border-midnight/10 py-4 rounded-2xl font-bold hover:bg-midnight/5 transition-all flex items-center justify-center gap-2"
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

// Safe storage helper to avoid Safari/iPhone blocking issues in iframes
const safeStorage = {
  getItem: (key: string) => {
    try {
      // Try localStorage first, then sessionStorage
      const localValue = localStorage.getItem(key);
      if (localValue !== null) return localValue;
      return sessionStorage.getItem(key);
    } catch (e) {
      console.warn('Storage access blocked:', e);
      return null;
    }
  },
  setItem: (key: string, value: string, persistent: boolean = true) => {
    try {
      if (persistent) {
        localStorage.setItem(key, value);
        // Clean up sessionStorage to avoid conflicting data
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, value);
        // Clean up localStorage to ensure it's not used when we want session-only
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('Storage write blocked:', e);
      // Fallback: if localStorage is blocked, try sessionStorage even if persistent was requested
      if (persistent) {
        try {
          sessionStorage.setItem(key, value);
        } catch (se) {
          console.warn('Session storage also blocked:', se);
        }
      }
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (e) {
      console.warn('Storage remove blocked:', e);
    }
  }
};

function AppContent() {
  const [activeTab, setActiveTab] = useState('administracao');
  const [financeiroTab, setFinanceiroTab] = useState('gastos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPublicCatalog, setIsPublicCatalog] = useState(false);
  
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(safeStorage.getItem('token'));
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isStorageBlocked, setIsStorageBlocked] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [forgotPasswordLogin, setForgotPasswordLogin] = useState('');
  const [forgotPasswordNewPass, setForgotPasswordNewPass] = useState('');
  const [forgotPasswordConfirmPass, setForgotPasswordConfirmPass] = useState('');
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [foundUserForReset, setFoundUserForReset] = useState<any>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if storage is blocked
        try {
          localStorage.setItem('test_storage', '1');
          localStorage.removeItem('test_storage');
        } catch (e) {
          console.warn('Storage is blocked:', e);
          setIsStorageBlocked(true);
        }

        // Check if URL is /catalogo or has public/catalogo params immediately
        // This ensures the catalog is accessible even if storage is blocked
        const params = new URLSearchParams(window.location.search);
        const path = window.location.pathname;
        const savedUser = safeStorage.getItem('user');
        const savedToken = safeStorage.getItem('token');
        const hasToken = !!savedToken;

        // If it's the root path and no token, default to admin (login)
        const isAdminPath = path === '/admin' || path.endsWith('/admin') || path === '/' || path === '';

        if (isAdminPath) {
          setIsPublicCatalog(false);
        }
        
        if (savedUser && savedToken) {
          try {
            const parsedUser = JSON.parse(savedUser);
            
            // Verify if user still exists in database
            const userDoc = await getDocs(query(collection(db, 'usuarios'), where('login', '==', parsedUser.login)));
            
            if (!userDoc.empty) {
              setUser(parsedUser);
              setToken(savedToken);
            } else {
              // User no longer exists, clear storage
              safeStorage.removeItem('user');
              safeStorage.removeItem('token');
              setUser(null);
              setToken(null);
            }
          } catch (e) {
            console.error('Error parsing saved auth:', e);
            safeStorage.removeItem('user');
            safeStorage.removeItem('token');
            setUser(null);
            setToken(null);
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsAuthReady(true);
      }
    };

    checkAuth();

    // Safety timeout: if auth check takes too long, force ready state
    const timeout = setTimeout(() => {
      setIsAuthReady(true);
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  // Force admin role for the owner email
  useEffect(() => {
    if (user && user.login === 'michellerosario.n@gmail.com' && user.role !== 'admin') {
      const updatedUser = { ...user, role: 'admin' as const };
      setUser(updatedUser);
      safeStorage.setItem('user', JSON.stringify(updatedUser), true);
      // Also update the document in Firestore
      updateDoc(doc(db, 'usuarios', user.id), { role: 'admin' }).catch(console.error);
    }
  }, [user]);

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchSizes, setBatchSizes] = useState<Record<string, number>>({ 'P': 0, 'M': 0, 'G': 0, 'GG': 0 });
  const [batchColors, setBatchColors] = useState('');
  const [productVariations, setProductVariations] = useState<ProductVariation[]>([]);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [mainImageIndex, setMainImageIndex] = useState(0);
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
  const [rememberMe, setRememberMe] = useState(true);
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
    monthly_goal: 10000,
    logo_url: ''
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
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);
  const [selectedProductGroup, setSelectedProductGroup] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [saleQuantity, setSaleQuantity] = useState<number>(1);
  const [saleDiscountValue, setSaleDiscountValue] = useState<string>('0');
  const [saleDiscountType, setSaleDiscountType] = useState<'percentage' | 'value'>('value');
  const [saleFinalPrice, setSaleFinalPrice] = useState<string>('');
  const [editingCartIndex, setEditingCartIndex] = useState<number | null>(null);
  const [saleUnitPrice, setSaleUnitPrice] = useState<string>('0');

  // Search/Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [salesSearchTerm, setSalesSearchTerm] = useState('');
  const [salesDateFilter, setSalesDateFilter] = useState('');
  const [salesMonthFilter, setSalesMonthFilter] = useState('');
  const [salesPaymentFilter, setSalesPaymentFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [globalMonthFilter, setGlobalMonthFilter] = useState(new Date().toISOString().slice(0, 7));

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
  const [quickSaleSearch, setQuickSaleSearch] = useState('');
  const [quickSaleCategory, setQuickSaleCategory] = useState('Todos');
  const [catalogSizeFilter, setCatalogSizeFilter] = useState('');
  const [catalogColorFilter, setCatalogColorFilter] = useState('');
  const [catalogPriceFilter, setCatalogPriceFilter] = useState<number | ''>('');

  // Image Upload States
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

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
    console.log(`Iniciando ajuste de estoque: ${productId}, qtd: ${quantity}, tipo: ${type}`);
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
      console.log('Estoque ajustado com sucesso no Firestore');
      showNotification('Estoque ajustado com sucesso!');
      fetchData();
    } catch (err: any) {
      console.error('Erro ao ajustar estoque:', err);
      if (err.message && err.message.includes('permission-denied')) {
        handleFirestoreError(err, OperationType.WRITE, 'produtos/transaction');
      }
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
    targetMonth?: string,
    startDate?: string,
    endDate?: string
  ): DashboardData => {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = targetMonth || new Date().toISOString().slice(0, 7);
    
    // Filter data by month and active status
    const activeSales = sales.filter(s => s.status !== 'cancelada');
    
    let monthlySales = activeSales;
    if (startDate && endDate) {
      monthlySales = activeSales.filter(s => s.date >= startDate && s.date <= endDate);
    } else {
      monthlySales = activeSales.filter(s => s.date.startsWith(currentMonth));
    }

    const monthlyExpensesData = expenses.filter(e => {
      if (startDate && endDate) return e.date >= startDate && e.date <= endDate;
      return e.date.startsWith(currentMonth);
    });

    const monthlyAds = ads.filter(a => {
      if (startDate && endDate) return a.date && a.date >= startDate && a.date <= endDate;
      return a.date?.startsWith(currentMonth);
    });

    const filteredSales = monthlySales; // Use monthly sales for all stats when targetMonth is active

    const dailySales = activeSales.filter(s => s.date.startsWith(today));
    
    const dailyRevenue = dailySales.reduce((acc, s) => acc + toNum(s.final_price || (s as any).total_value), 0);
    const monthlyRevenue = monthlySales.reduce((acc, s) => acc + toNum(s.final_price || (s as any).total_value), 0);
    
    // Calculate total cost for the month to get real profit (Revenue - Cost)
    const totalMonthlyCost = monthlySales.reduce((acc, s) => {
      if (s.total_cost !== undefined && toNum(s.total_cost) > 0) return acc + toNum(s.total_cost);
      
      // Fallback for old sales or sales without total_cost
      const items = (s.items && s.items.length > 0) ? s.items : [{
        product_id: (s as any).product_id,
        quantity: toNum((s as any).quantity),
        cost: (s as any).cost
      }];
      
      const saleCost = items.reduce((itemAcc, item) => {
        const product = products.find(p => String(p.id) === String(item.product_id));
        return itemAcc + (toNum(item.cost || product?.cost) * toNum(item.quantity));
      }, 0);
      return acc + saleCost;
    }, 0);

    const totalProfit = monthlyRevenue - totalMonthlyCost;
    const profitMargin = monthlyRevenue > 0 ? (totalProfit / monthlyRevenue) * 100 : 0;
    const monthlyExpenses = monthlyExpensesData.reduce((acc, e) => acc + toNum(e.value), 0);
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
        size: (s as any).size,
        cost: (s as any).cost
      }];

      const saleSubtotal = items.reduce((acc, item) => acc + (toNum(item.unit_price) * toNum(item.quantity)), 0);
      const saleFinalPrice = toNum(s.final_price || (s as any).total_value || saleSubtotal);
      const discountRatio = saleSubtotal > 0 ? saleFinalPrice / saleSubtotal : 1;

      items.forEach(item => {
        const pName = item.product_name || 'Desconhecido';
        const pId = item.product_id;
        const qty = toNum(item.quantity);
        const revenue = (toNum(item.unit_price) * qty) * discountRatio;
        
        // Get product cost for profit calculation per product
        const product = products.find(p => String(p.id) === String(pId));
        const cost = toNum(item.cost || product?.cost) * qty;
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
    
    const totalInvestment = monthlyAds.reduce((acc, a) => acc + toNum(a.investment), 0);
    const roi = totalInvestment > 0 ? (totalProfit / totalInvestment) : 0;
    
    const salesByMonth: { month: string; revenue: number; count: number }[] = [];
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toISOString().slice(0, 7);
    }).reverse();
    
    months.forEach(m => {
      const mSales = activeSales.filter(s => s.date.startsWith(m));
      salesByMonth.push({
        month: m,
        revenue: mSales.reduce((acc, s) => acc + toNum(s.final_price || (s as any).total_value), 0),
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
      revenue: activeSales.filter(s => s.date.startsWith(date)).reduce((acc, s) => acc + toNum(s.final_price || (s as any).total_value), 0)
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
      const customerSales = activeSales.filter(s => s.customer_id === c.id);
      const lastSale = customerSales.sort((a, b) => b.date.localeCompare(a.date))[0];
      if (lastSale && new Date(lastSale.date) >= activeThreshold) {
        activeCount++;
      } else {
        inactiveCount++;
      }
    });

    const sellerStats = sellers.map(sel => {
      const selSales = activeSales.filter(s => s.seller_id && String(s.seller_id) === String(sel.id));
      const total_sold = selSales.reduce((acc, s) => acc + toNum(s.final_price || (s as any).total_value), 0);
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
    activeSales.filter(s => new Date(s.date) >= thirtyDaysAgo).forEach(s => {
      const items = s.items || [];
      items.forEach(item => {
        if (item.product_name) recentProductSales[item.product_name] = true;
      });
    });

    const profitByProduct = Object.entries(productStats).map(([name, stats]) => ({
      name,
      ...stats,
      margin: stats.revenue > 0 ? (stats.profit / stats.revenue) * 100 : 0
    })).sort((a, b) => b.profit - a.profit);

    const salesByColor = Object.entries(colorSales).map(([color, total_sold]) => ({
      color,
      total_sold
    })).sort((a, b) => b.total_sold - a.total_sold);

    const stockSuggestions = products
      .map(p => {
        const salesLast30 = activeSales
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
        
        const suggestion = Math.max(0, toNum(p.min_stock) - toNum(p.stock));
        
        return {
          id: p.id as any,
          name: p.name,
          stock: p.stock,
          min_stock: p.min_stock,
          sales_last_30: salesLast30,
          suggestion: suggestion
        };
      })
      .filter(s => s.suggestion > 0)
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
      monthlyExpenses,
      totalProfit,
      netProfit,
      profitMargin,
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

      if (!token) return;

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
    const dashData = calculateDashboardData(products, customers, sales, expenses, ads, sellers, globalMonthFilter);
    setDashboard(dashData);
  }, [products, customers, sales, expenses, ads, sellers, storeSettings, globalMonthFilter]);

  const enrichedCustomers = useMemo(() => {
    return customers.map(c => {
      const customerSales = sales.filter(s => s.customer_id === c.id && s.status !== 'cancelada');
      const total_spent = customerSales.reduce((acc, s) => acc + toNum(s.final_price || (s as any).total_value), 0);
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
        
        if (rememberMe) {
          safeStorage.setItem('user', JSON.stringify(loggedUser), true);
          safeStorage.setItem('token', 'custom-token', true);
        } else {
          safeStorage.setItem('user', JSON.stringify(loggedUser), false);
          safeStorage.setItem('token', 'custom-token', false);
        }
        
        setActiveTab(role === 'admin' ? 'administracao' : 'vendas');
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
        
        if (rememberMe) {
          safeStorage.setItem('user', JSON.stringify(loggedUser), true);
          safeStorage.setItem('token', 'custom-token', true);
        } else {
          safeStorage.setItem('user', JSON.stringify(loggedUser), false);
          safeStorage.setItem('token', 'custom-token', false);
        }
        
        setActiveTab('administracao');
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
        safeStorage.setItem('user', JSON.stringify(loggedUser), true);
        safeStorage.setItem('token', 'custom-token', true);
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
    safeStorage.removeItem('token');
    safeStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setLoginEmail('');
    setLoginPassword('');
    setLoginName('');
    setLoginRole('seller');
    setIsRegistering(false);
    setAuthError(null);
    setRememberMe(true);
    setIsPublicCatalog(false);
    setIsForgotPasswordModalOpen(false);
    setForgotPasswordLogin('');
    setForgotPasswordNewPass('');
    setForgotPasswordConfirmPass('');
    setFoundUserForReset(null);
    setIsLoggingIn(false);
    setIsSearchingUser(false);
    setIsResettingPassword(false);
    setShowPassword(false);
    setShowNewPassword(false);
    setShowResetPassword(false);
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

  const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showNotification('O tamanho máximo do arquivo original é 10MB.', 'error');
        return;
      }
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        showNotification('Formatos permitidos: JPG, PNG e WEBP.', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          // Compress image to ensure it stays under Firestore 1MB limit
          const compressed = await compressImage(base64String);
          setImagePreview(compressed);
          setImageBase64(compressed);
          console.log('Imagem comprimida com sucesso');
        } catch (err) {
          console.error('Erro ao comprimir imagem:', err);
          setImagePreview(base64String);
          setImageBase64(base64String);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMultipleImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages = [...productImages];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 10 * 1024 * 1024) {
          showNotification(`O arquivo ${file.name} excede 10MB.`, 'error');
          continue;
        }
        const reader = new FileReader();
        const promise = new Promise<string>((resolve) => {
          reader.onloadend = async () => {
            const base64String = reader.result as string;
            try {
              const compressed = await compressImage(base64String);
              resolve(compressed);
            } catch (err) {
              resolve(base64String);
            }
          };
        });
        reader.readAsDataURL(file);
        const result = await promise;
        newImages.push(result);
      }
      setProductImages(newImages);
      if (newImages.length > 0 && !imagePreview) {
        setImagePreview(newImages[0]);
      }
    }
  };

  const removeProductImage = (index: number) => {
    const newImages = productImages.filter((_, i) => i !== index);
    setProductImages(newImages);
    if (mainImageIndex === index) {
      setMainImageIndex(0);
    } else if (mainImageIndex > index) {
      setMainImageIndex(mainImageIndex - 1);
    }
  };

  const addVariation = () => {
    const newVar: ProductVariation = {
      id: Date.now().toString(),
      color: '',
      size: 'M',
      stock: 0,
      brand: ''
    };
    setProductVariations([...productVariations, newVar]);
  };

  const removeVariation = (id: string) => {
    setProductVariations(productVariations.filter(v => v.id !== id));
  };

  const updateVariation = (id: string, field: keyof ProductVariation, value: any) => {
    setProductVariations(productVariations.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const handleAddProduct = async (e: any) => {
    e.preventDefault();
    if (user?.role !== 'admin') {
      showNotification('Apenas administradores podem gerenciar estoque', 'error');
      return;
    }
    console.log('Iniciando salvamento de produto');
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      
      const hasVariations = productVariations.length > 0;
      const totalStock = hasVariations 
        ? productVariations.reduce((acc, v) => acc + toNum(v.stock), 0)
        : toNum(data.stock);

      const payload: any = {
        ...data,
        cost: toNum(data.cost),
        price: toNum(data.price),
        cash_price: data.cash_price ? toNum(data.cash_price) : null,
        card_price: data.card_price ? toNum(data.card_price) : null,
        promo_price: data.promo_price ? toNum(data.promo_price) : null,
        stock: totalStock,
        min_stock: toNum(data.min_stock),
        is_featured: data.is_featured === 'on',
        image_url: productImages[mainImageIndex] || imageBase64 || (editingItem ? editingItem.image_url : ''),
        images: productImages,
        main_image_index: mainImageIndex,
        variations: productVariations,
        has_variations: hasVariations
      };

      console.log('Payload do produto:', payload);

      if (editingItem && editingItem.id) {
        await updateDoc(doc(db, 'produtos', editingItem.id), payload);
        console.log('Produto atualizado com sucesso');
        showNotification('Produto atualizado com sucesso!');
      } else {
        const docRef = await addDoc(collection(db, 'produtos'), payload);
        console.log(`Produto cadastrado com sucesso. ID: ${docRef.id}`);
        
        if (hasVariations) {
          for (const v of productVariations) {
            if (toNum(v.stock) > 0) {
              await addDoc(collection(db, 'estoque_movimentacoes'), {
                product_id: docRef.id,
                variation_id: v.id,
                produto: payload.name,
                marca: v.brand || payload.brand || '',
                cor: v.color || '',
                tamanho: v.size || '',
                quantidade: toNum(v.stock),
                tipo_movimento: 'entrada',
                date: new Date().toISOString(),
                usuario: user?.name || user?.email || 'Sistema',
                observations: 'Estoque inicial (Variação)'
              });
            }
          }
        } else if (payload.stock > 0) {
          console.log('Registrando movimentação de estoque inicial');
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
      setIsBatchMode(false);
      setProductVariations([]);
      setProductImages([]);
      setMainImageIndex(0);
      fetchData();
    } catch (err: any) {
      console.error('Erro ao salvar produto:', err);
      if (err.message && err.message.includes('permission-denied')) {
        handleFirestoreError(err, OperationType.WRITE, 'produtos');
      }
      showNotification(err.message || "Erro ao salvar produto", 'error');
    }
  };

  const handleBatchAddProduct = async (e: any) => {
    e.preventDefault();
    if (user?.role !== 'admin') {
      showNotification('Apenas administradores podem gerenciar estoque', 'error');
      return;
    }
    console.log('Iniciando salvamento de produtos em lote');
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      
      const colors = batchColors.split(',').map(c => c.trim()).filter(c => c !== '');
      if (colors.length === 0) {
        showNotification('Informe ao menos uma cor', 'error');
        return;
      }

      const sizesToCreate = Object.entries(batchSizes).filter(([_, qty]) => (qty as number) > 0);
      if (sizesToCreate.length === 0) {
        showNotification('Informe a quantidade para ao menos um tamanho', 'error');
        return;
      }

      const basePayload = {
        name: data.name as string,
        brand: data.brand as string,
        category: data.category as string,
        cost: toNum(data.cost),
        price: toNum(data.price),
        cash_price: data.cash_price ? toNum(data.cash_price) : null,
        card_price: data.card_price ? toNum(data.card_price) : null,
        promo_price: data.promo_price ? toNum(data.promo_price) : null,
        min_stock: toNum(data.min_stock),
        image_url: imageBase64 || ''
      };

      let totalCreated = 0;
      for (const color of colors) {
        for (const [size, stock] of sizesToCreate) {
          const stockNum = stock as number;
          const payload = {
            ...basePayload,
            color,
            size,
            stock: stockNum,
            code: `${data.code}-${color.substring(0, 3).toUpperCase()}-${size}`
          };
          
          const docRef = await addDoc(collection(db, 'produtos'), payload);
          
          if (stockNum > 0) {
            await addDoc(collection(db, 'estoque_movimentacoes'), {
              product_id: docRef.id,
              produto: payload.name,
              marca: payload.brand || '',
              cor: payload.color || '',
              tamanho: payload.size || '',
              quantidade: stockNum,
              tipo_movimento: 'entrada',
              date: new Date().toISOString(),
              usuario: user?.name || user?.email || 'Sistema',
              observations: 'Estoque inicial (Lote)'
            });
          }
          totalCreated++;
        }
      }

      showNotification(`${totalCreated} variações cadastradas com sucesso!`);
      setIsModalOpen(false);
      setEditingItem(null);
      setImagePreview(null);
      setImageBase64(null);
      setBatchColors('');
      setBatchSizes({ 'P': 0, 'M': 0, 'G': 0, 'GG': 0 });
      setIsBatchMode(false);
      setProductVariations([]);
      setProductImages([]);
      setMainImageIndex(0);
      fetchData();
    } catch (err: any) {
      console.error('Erro ao salvar produtos em lote:', err);
      showNotification(err.message || "Erro ao salvar produtos em lote", 'error');
    }
  };

  const handleAddToCart = (product: Product, quantity: number, unitPrice: number, size: string, color?: string, variationId?: string) => {
    // Check if product has enough stock
    let availableStock = product.stock;
    if (variationId && product.variations) {
      const variation = product.variations.find(v => v.id === variationId);
      if (variation) {
        availableStock = variation.stock;
      }
    }

    const currentCartQty = cart
      .filter(item => item.product_id === product.id && (variationId ? item.variation_id === variationId : item.size === size && item.color === color))
      .reduce((acc, item) => acc + item.quantity, 0);
    
    if (availableStock < (currentCartQty + quantity)) {
      showNotification(`Estoque insuficiente! Disponível: ${availableStock}`, 'error');
      return;
    }

    const newItem: CartItem = {
      product_id: product.id,
      product_name: product.name,
      quantity,
      unit_price: unitPrice,
      size: size || product.size,
      color: color || product.color,
      brand: product.brand,
      variation_id: variationId
    };
    setCart(prev => [...prev, newItem]);
    showNotification('Produto adicionado ao carrinho!');
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddSale = async (e: any) => {
    e.preventDefault();
    console.log('Iniciando registro de venda...');
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      
      const itemsToProcess = cart.length > 0 ? cart : [];
      if (itemsToProcess.length === 0) {
        showNotification('Adicione pelo menos um item ao carrinho', 'error');
        return;
      }

      const subtotal = itemsToProcess.reduce((acc, item) => acc + (toNum(item.unit_price) * toNum(item.quantity)), 0);
      const discount = saleFinalPrice 
        ? Math.max(0, subtotal - toNum(saleFinalPrice))
        : (saleDiscountType === 'percentage' 
          ? (subtotal * toNum(data.discount_value)) / 100 
          : toNum(data.discount_value));
      const finalPrice = saleFinalPrice ? toNum(saleFinalPrice) : Math.max(0, subtotal - discount);

      const payload: any = {
        customer_id: data.customer_id ? data.customer_id : null,
        customer_name: customers.find(c => c.id === data.customer_id)?.name || 'Consumidor Final',
        seller_id: data.seller_id ? data.seller_id : null,
        seller_name: sellers.find(s => s.id === data.seller_id)?.name || null,
        payment_method: data.payment_method,
        discount_value: toNum(data.discount_value),
        discount_type: saleDiscountType,
        final_price: finalPrice,
        date: editingItem?.date || new Date().toISOString(),
        items: itemsToProcess.map(item => {
          const p = products.find(prod => prod.id === item.product_id);
          return {
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: toNum(item.quantity),
            unit_price: toNum(item.unit_price),
            total_item_value: toNum(item.unit_price) * toNum(item.quantity),
            cost: toNum(p?.cost || 0),
            size: item.size,
            color: item.color,
            brand: item.brand,
            variation_id: item.variation_id || null
          };
        }),
        // Legacy fields for UI compatibility
        product_name: itemsToProcess.length === 1 ? itemsToProcess[0].product_name : `${itemsToProcess.length} itens`,
        quantity: itemsToProcess.reduce((acc, item) => acc + toNum(item.quantity), 0),
        total_value: subtotal,
        size: itemsToProcess.length === 1 ? itemsToProcess[0].size : 'Vários'
      };

      console.log('Payload da venda:', payload);

      await runTransaction(db, async (transaction) => {
        let totalProfit = 0;
        let totalCost = 0;
        const productDocs: Record<string, { ref: DocumentReference, data: Product }> = {};

        // 1. Collect all product IDs that need to be read
        const productIdsToRead = new Set<string>();
        
        // From current items
        payload.items.forEach((item: any) => productIdsToRead.add(item.product_id));
        
        // From old items (if editing)
        const oldItems = editingItem ? (editingItem.items || (editingItem.product_id ? [{
          product_id: editingItem.product_id,
          quantity: editingItem.quantity,
          variation_id: editingItem.variation_id
        }] : [])) : [];
        
        oldItems.forEach((item: any) => productIdsToRead.add(item.product_id));

        // 2. Perform all READS first
        for (const productId of productIdsToRead) {
          const productRef = doc(db, 'produtos', productId);
          const productSnap = await transaction.get(productRef);
          if (productSnap.exists()) {
            productDocs[productId] = {
              ref: productRef,
              data: productSnap.data() as Product
            };
          } else {
            // If it's a new item and doesn't exist, it's an error
            if (payload.items.some((item: any) => item.product_id === productId)) {
              throw new Error(`Produto não encontrado: ${productId}`);
            }
          }
        }

        // 3. Perform all WRITES
        
        // A. Reverse old stock if editing
        if (editingItem) {
          for (const oldItem of oldItems) {
            const productInfo = productDocs[oldItem.product_id];
            if (productInfo) {
              const pData = productInfo.data;
              if (oldItem.variation_id && pData.variations) {
                const variations = [...pData.variations];
                const vIdx = variations.findIndex(v => v.id === oldItem.variation_id);
                if (vIdx > -1) {
                  variations[vIdx].stock += oldItem.quantity;
                  transaction.update(productInfo.ref, { 
                    variations: variations,
                    stock: (pData.stock || 0) + oldItem.quantity
                  });
                  // Update local data for subsequent steps in this transaction
                  pData.stock = (pData.stock || 0) + oldItem.quantity;
                  pData.variations = variations;
                } else {
                  transaction.update(productInfo.ref, { stock: (pData.stock || 0) + oldItem.quantity });
                  pData.stock = (pData.stock || 0) + oldItem.quantity;
                }
              } else {
                transaction.update(productInfo.ref, { stock: (pData.stock || 0) + oldItem.quantity });
                pData.stock = (pData.stock || 0) + oldItem.quantity;
              }
            }
          }
        }

        // B. Process new items (deduct stock and calculate profit)
        for (const item of payload.items) {
          const productInfo = productDocs[item.product_id];
          if (!productInfo) throw new Error(`Produto não encontrado: ${item.product_name}`);
          
          const productData = productInfo.data;
          const productCost = toNum(productData.cost);
          
          if (item.variation_id && productData.variations) {
            const variations = [...productData.variations];
            const vIdx = variations.findIndex(v => v.id === item.variation_id);
            if (vIdx > -1) {
              if (variations[vIdx].stock < item.quantity) {
                throw new Error(`Estoque insuficiente para variação de ${productData.name}`);
              }
              variations[vIdx].stock -= item.quantity;
              transaction.update(productInfo.ref, { 
                variations: variations,
                stock: (productData.stock || 0) - item.quantity
              });
              productData.stock = (productData.stock || 0) - item.quantity;
              productData.variations = variations;
            } else {
              transaction.update(productInfo.ref, { stock: (productData.stock || 0) - item.quantity });
              productData.stock = (productData.stock || 0) - item.quantity;
            }
          } else {
            transaction.update(productInfo.ref, { stock: (productData.stock || 0) - item.quantity });
            productData.stock = (productData.stock || 0) - item.quantity;
          }

          totalProfit += (item.unit_price - productCost) * item.quantity;
          totalCost += productCost * item.quantity;

          // Record movement
          const movementRef = doc(collection(db, 'estoque_movimentacoes'));
          transaction.set(movementRef, {
            product_id: item.product_id,
            variation_id: item.variation_id || null,
            produto: productData.name,
            marca: productData.brand || '',
            cor: item.color || productData.color || '',
            tamanho: item.size || productData.size || '',
            quantidade: -item.quantity,
            tipo_movimento: editingItem ? 'ajuste_venda' : 'venda',
            date: new Date().toISOString(),
            usuario: user?.name || user?.email || 'Sistema',
            observations: `${editingItem ? 'Edição' : 'Venda'} ${payload.customer_name}`
          });
        }

        const saleRef = editingItem ? doc(db, 'vendas', editingItem.id) : doc(collection(db, 'vendas'));
        transaction.set(saleRef, { 
          ...payload, 
          profit: totalProfit - discount,
          total_cost: totalCost,
          status: 'concluida'
        }, { merge: true });
      });

      console.log('Venda salva com sucesso no Firestore');
      showNotification('Venda realizada com sucesso!');
      setIsModalOpen(false);
      setCart([]);
      setSaleDiscountValue('0');
      setSaleFinalPrice('');
      fetchData();
    } catch (err: any) {
      console.error('Erro ao registrar venda:', err);
      if (err.message && err.message.includes('permission-denied')) {
        handleFirestoreError(err, OperationType.WRITE, 'vendas/transaction');
      }
      showNotification(err.message || "Erro ao registrar venda", 'error');
    }
  };

  const handleAddCustomer = async (e: any) => {
    e.preventDefault();
    console.log('Iniciando cadastro de cliente...');
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      console.log('Dados do cliente:', data);

      if (editingItem && editingItem.id) {
        await updateDoc(doc(db, 'clientes', editingItem.id), data);
        console.log('Cliente atualizado com sucesso');
        showNotification('Cliente atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'clientes'), data);
        console.log('Cliente cadastrado com sucesso');
        showNotification('Cliente cadastrado com sucesso!');
      }
      setIsModalOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (err: any) {
      console.error('Erro ao salvar cliente:', err);
      if (err.message && err.message.includes('permission-denied')) {
        handleFirestoreError(err, OperationType.WRITE, 'clientes');
      }
      showNotification(err.message || "Erro ao salvar cliente", 'error');
    }
  };

  const handleAddOrder = async (e: any) => {
    e.preventDefault();
    if (user?.role !== 'admin') {
      showNotification('Apenas administradores podem gerenciar pedidos', 'error');
      return;
    }
    console.log('Iniciando salvamento de pedido ao fornecedor');
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      const payload = {
        ...data,
        product_id: toNum(data.product_id),
        quantity: toNum(data.quantity),
        status: editingItem ? editingItem.status : 'pedido feito'
      };

      console.log('Payload do pedido:', payload);

      if (editingItem && editingItem.id) {
        await updateDoc(doc(db, 'pedidos_fornecedor', editingItem.id), payload);
        console.log('Pedido atualizado com sucesso');
        showNotification('Pedido atualizado!');
      } else {
        await addDoc(collection(db, 'pedidos_fornecedor'), payload);
        console.log('Pedido registrado com sucesso');
        showNotification('Pedido registrado!');
      }
      setIsModalOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (err: any) {
      console.error('Erro ao salvar pedido:', err);
      if (err.message && err.message.includes('permission-denied')) {
        handleFirestoreError(err, OperationType.WRITE, 'pedidos_fornecedor');
      }
      showNotification(err.message || "Erro ao salvar pedido", 'error');
    }
  };

  const handleAddExpense = async (e: any) => {
    e.preventDefault();
    if (user?.role !== 'admin') {
      showNotification('Apenas administradores podem gerenciar financeiro', 'error');
      return;
    }
    console.log('Iniciando salvamento de gasto');
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      const payload = {
        ...data,
        value: toNum(data.value),
        date: new Date().toISOString().replace('T', ' ').split('.')[0]
      };

      console.log('Payload do gasto:', payload);

      if (editingItem && editingItem.id) {
        await updateDoc(doc(db, 'gastos', editingItem.id), payload);
        console.log('Gasto atualizado com sucesso');
        showNotification('Registro financeiro atualizado!');
      } else {
        await addDoc(collection(db, 'gastos'), payload);
        console.log('Gasto salvo com sucesso');
        showNotification('Registro financeiro salvo com sucesso!');
      }
      setIsModalOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (err: any) {
      console.error('Erro ao salvar registro financeiro:', err);
      if (err.message && err.message.includes('permission-denied')) {
        handleFirestoreError(err, OperationType.WRITE, 'gastos');
      }
      showNotification(err.message || "Erro ao salvar registro financeiro", 'error');
    }
  };

  const handleAddAd = async (e: any) => {
    e.preventDefault();
    if (user?.role !== 'admin') {
      showNotification('Apenas administradores podem gerenciar anúncios', 'error');
      return;
    }
    console.log('Iniciando salvamento de anúncio');
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      const payload = {
        ...data,
        investment: toNum(data.investment),
        sales_generated: toNum(data.sales_generated),
        date: new Date().toISOString().replace('T', ' ').split('.')[0]
      };

      console.log('Payload do anúncio:', payload);

      if (editingItem && editingItem.id) {
        await updateDoc(doc(db, 'anuncios', editingItem.id), payload);
        console.log('Anúncio atualizado com sucesso');
        showNotification('Anúncio atualizado!');
      } else {
        await addDoc(collection(db, 'anuncios'), payload);
        console.log('Anúncio salvo com sucesso');
        showNotification('Anúncio e gasto registrados!');
      }
      setIsModalOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (err: any) {
      console.error('Erro ao salvar anúncio:', err);
      if (err.message && err.message.includes('permission-denied')) {
        handleFirestoreError(err, OperationType.WRITE, 'anuncios');
      }
      showNotification(err.message || "Erro ao salvar anúncio", 'error');
    }
  };

  const handleAddSeller = async (e: any) => {
    e.preventDefault();
    if (user?.role !== 'admin') {
      showNotification('Apenas administradores podem gerenciar vendedores', 'error');
      return;
    }
    console.log('Iniciando salvamento de vendedor');
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      const payload = {
        ...data,
        commission_percentage: toNum(data.commission_percentage)
      };

      console.log('Payload do vendedor:', payload);

      if (editingItem && editingItem.id) {
        await updateDoc(doc(db, 'vendedores', editingItem.id), payload);
        console.log('Vendedor atualizado com sucesso');
        showNotification('Vendedor atualizado!');
      } else {
        await addDoc(collection(db, 'vendedores'), payload);
        console.log('Vendedor cadastrado com sucesso');
        showNotification('Vendedor cadastrado com sucesso!');
      }
      setIsModalOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (err: any) {
      console.error('Erro ao salvar vendedor:', err);
      if (err.message && err.message.includes('permission-denied')) {
        handleFirestoreError(err, OperationType.WRITE, 'vendedores');
      }
      showNotification(err.message || "Erro ao salvar vendedor. Verifique se o e-mail já está cadastrado.", 'error');
    }
  };

  const handleAddSupplier = async (e: any) => {
    e.preventDefault();
    if (user?.role !== 'admin') {
      showNotification('Apenas administradores podem gerenciar fornecedores', 'error');
      return;
    }
    console.log('Iniciando salvamento de fornecedor');
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      const payload = {
        ...data,
        avg_purchase_price: toNum(data.avg_purchase_price)
      };

      console.log('Payload do fornecedor:', payload);

      if (editingItem) {
        await updateDoc(doc(db, 'fornecedores', editingItem.id), payload);
        console.log('Fornecedor atualizado com sucesso');
        showNotification('Fornecedor atualizado!');
      } else {
        await addDoc(collection(db, 'fornecedores'), payload);
        console.log('Fornecedor cadastrado com sucesso');
        showNotification('Fornecedor cadastrado!');
      }
      setIsModalOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (err: any) {
      console.error('Erro ao salvar fornecedor:', err);
      if (err.message && err.message.includes('permission-denied')) {
        handleFirestoreError(err, OperationType.WRITE, 'fornecedores');
      }
      showNotification(err.message || "Erro ao salvar fornecedor", 'error');
    }
  };

  const handleAddPurchase = async (e: any) => {
    e.preventDefault();
    if (user?.role !== 'admin') {
      showNotification('Apenas administradores podem gerenciar compras', 'error');
      return;
    }
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
    if (user?.role !== 'admin') {
      showNotification('Apenas administradores podem alterar configurações', 'error');
      return;
    }
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    // Convert monthly_goal to number
    const settingsData = {
      ...data,
      monthly_goal: toNum(data.monthly_goal),
      logo_url: imageBase64 || storeSettings.logo_url
    };

    console.log('Iniciando salvamento de configurações');
    try {
      const settingsId = storeSettings?.id || 'default';
      console.log('Dados de configurações a salvar:', settingsData);
      await setDoc(doc(db, 'configuracoes', settingsId), settingsData, { merge: true });
      console.log('Configurações salvas com sucesso');
      showNotification('Configurações salvas com sucesso!');
      fetchData();
    } catch (error: any) {
      console.error("Error saving settings:", error);
      if (error.message && error.message.includes('permission-denied')) {
        handleFirestoreError(error, OperationType.WRITE, 'configuracoes');
      }
      showNotification('Erro ao salvar configurações', 'error');
    }
  };

  const handleDeleteAd = async (id: string) => {
    if (user?.role !== 'admin') {
      showNotification('Apenas administradores podem excluir anúncios', 'error');
      return;
    }
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
    if (user?.role !== 'admin') {
      showNotification('Apenas administradores podem excluir vendedores', 'error');
      return;
    }
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
    if (user?.role !== 'admin') {
      showNotification('Apenas administradores podem excluir usuários', 'error');
      return;
    }
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
    if (user?.role !== 'admin') {
      showNotification('Apenas administradores podem gerenciar usuários', 'error');
      return;
    }
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
        console.log(`Iniciando exclusão do produto: ${id}`);
        try {
          await deleteDoc(doc(db, 'produtos', id));
          console.log('Produto excluído com sucesso');
          fetchData();
          showNotification('Produto excluído com sucesso!');
        } catch (error: any) {
          console.error('Erro ao excluir produto:', error);
          if (error.message && error.message.includes('permission-denied')) {
            handleFirestoreError(error, OperationType.DELETE, 'produtos');
          }
          showNotification('Erro ao excluir produto', 'error');
        }
      }
    );
  };

  const handleDeleteSale = async (id: string) => {
    if (user?.role !== 'admin') {
      showNotification('Apenas administradores podem cancelar vendas', 'error');
      return;
    }
    showConfirm(
      'Cancelar Venda',
      'Tem certeza que deseja cancelar esta venda? Os itens retornarão ao estoque.',
      async () => {
        console.log(`Iniciando cancelamento da venda: ${id}`);
        try {
          await runTransaction(db, async (transaction) => {
            const saleDocRef = doc(db, 'vendas', id);
            const saleSnap = await transaction.get(saleDocRef);
            
            if (!saleSnap.exists()) {
              throw new Error("Venda não encontrada!");
            }
            
            const saleData = saleSnap.data() as Sale;
            console.log('Dados da venda a cancelar:', saleData);

            // Evitar duplicação: Só devolver ao estoque se a venda ainda não foi cancelada antes
            if (saleData.status === 'cancelada') {
              throw new Error("Esta venda já foi cancelada!");
            }
            
            // 1. Perform all READS first
            const productDocs: Record<string, any> = {};
            const itemsToProcess = saleData.items && saleData.items.length > 0 
              ? saleData.items 
              : ((saleData as any).product_id ? [{
                  product_id: (saleData as any).product_id,
                  quantity: (saleData as any).quantity || 0,
                  variation_id: (saleData as any).variation_id,
                  product_name: saleData.product_name,
                  size: saleData.size,
                  color: (saleData as any).color
                }] : []);

            for (const item of itemsToProcess) {
              if (!productDocs[item.product_id]) {
                const productRef = doc(db, 'produtos', item.product_id);
                const productSnap = await transaction.get(productRef);
                if (productSnap.exists()) {
                  productDocs[item.product_id] = {
                    ref: productRef,
                    data: productSnap.data()
                  };
                }
              }
            }

            // 2. Perform all WRITES after all reads
            for (const item of itemsToProcess) {
              const productInfo = productDocs[item.product_id];
              if (productInfo) {
                const pData = productInfo.data;
                const updateData: any = {
                  stock: (pData.stock || 0) + item.quantity
                };

                if (pData.variations) {
                  const variations = [...pData.variations];
                  let vIdx = -1;
                  
                  if (item.variation_id) {
                    vIdx = variations.findIndex((v: any) => v.id === item.variation_id);
                  }
                  
                  // Se não encontrou por ID, tenta por cor e tamanho
                  if (vIdx === -1 && item.size) {
                    vIdx = variations.findIndex((v: any) => 
                      String(v.size).toLowerCase() === String(item.size).toLowerCase() && 
                      (!item.color || String(v.color).toLowerCase() === String(item.color).toLowerCase())
                    );
                  }

                  if (vIdx > -1) {
                    variations[vIdx].stock = (variations[vIdx].stock || 0) + item.quantity;
                    updateData.variations = variations;
                  }
                }

                console.log(`Retornando ${item.quantity} do produto ${item.product_id} ao estoque`);
                transaction.update(productInfo.ref, updateData);
                
                // Update local data in case the same product is in multiple items
                pData.stock = updateData.stock;
                if (updateData.variations) pData.variations = updateData.variations;
                
                // Record stock movement
                const movementRef = doc(collection(db, 'estoque_movimentacoes'));
                transaction.set(movementRef, {
                  product_id: item.product_id,
                  variation_id: item.variation_id || null,
                  produto: item.product_name || pData.name,
                  marca: pData.brand || '',
                  cor: item.color || pData.color || '',
                  tamanho: item.size || pData.size || '',
                  quantidade: item.quantity,
                  tipo_movimento: 'reposicao',
                  date: new Date().toISOString(),
                  usuario: user?.name || user?.email || 'Sistema',
                  observations: `Venda cancelada: ${id}`
                });
              }
            }
            
            // Update the sale status instead of deleting
            transaction.update(saleDocRef, { status: 'cancelada' });
          });
          console.log('Venda cancelada com sucesso');
          fetchData();
          showNotification('Venda cancelada e estoque atualizado!');
        } catch (error: any) {
          console.error('Erro ao cancelar venda:', error);
          if (error.message && error.message.includes('permission-denied')) {
            handleFirestoreError(error, OperationType.WRITE, 'vendas/transaction');
          }
          showNotification(error.message || 'Erro ao cancelar venda', 'error');
        }
      }
    );
  };

  const handleDeleteCustomer = async (id: string) => {
    if (user?.role !== 'admin') {
      showNotification('Apenas administradores podem excluir clientes', 'error');
      return;
    }
    showConfirm(
      'Excluir Cliente',
      'Tem certeza que deseja excluir este cliente?',
      async () => {
        console.log(`Iniciando exclusão do cliente: ${id}`);
        try {
          await deleteDoc(doc(db, 'clientes', id));
          console.log('Cliente excluído com sucesso');
          fetchData();
          showNotification('Cliente excluído com sucesso!');
        } catch (error: any) {
          console.error('Erro ao excluir cliente:', error);
          if (error.message && error.message.includes('permission-denied')) {
            handleFirestoreError(error, OperationType.DELETE, 'clientes');
          }
          showNotification('Erro ao excluir cliente', 'error');
        }
      }
    );
  };

  const handleDeleteOrder = async (id: string) => {
    if (user?.role !== 'admin') {
      showNotification('Apenas administradores podem excluir pedidos', 'error');
      return;
    }
    showConfirm(
      'Excluir Pedido',
      'Tem certeza que deseja excluir este pedido?',
      async () => {
        console.log(`Iniciando exclusão do pedido: ${id}`);
        try {
          await deleteDoc(doc(db, 'pedidos_fornecedor', id));
          console.log('Pedido excluído com sucesso');
          fetchData();
          showNotification('Pedido excluído com sucesso!');
        } catch (error: any) {
          console.error('Erro ao excluir pedido:', error);
          if (error.message && error.message.includes('permission-denied')) {
            handleFirestoreError(error, OperationType.DELETE, 'pedidos_fornecedor');
          }
          showNotification('Erro ao excluir pedido', 'error');
        }
      }
    );
  };

  const handleDeleteExpense = async (id: string) => {
    if (user?.role !== 'admin') {
      showNotification('Apenas administradores podem excluir gastos', 'error');
      return;
    }
    showConfirm(
      'Excluir Gasto',
      'Tem certeza que deseja excluir este gasto?',
      async () => {
        console.log(`Iniciando exclusão do gasto: ${id}`);
        try {
          await deleteDoc(doc(db, 'gastos', id));
          console.log('Gasto excluído com sucesso');
          fetchData();
          showNotification('Gasto excluído com sucesso!');
        } catch (error: any) {
          console.error('Erro ao excluir gasto:', error);
          if (error.message && error.message.includes('permission-denied')) {
            handleFirestoreError(error, OperationType.DELETE, 'gastos');
          }
          showNotification('Erro ao excluir gasto', 'error');
        }
      }
    );
  };

  const handleEdit = (type: string, item: any) => {
    if (user?.role !== 'admin' && (type === 'vendas' || type === 'clientes')) {
      showNotification('Apenas administradores podem editar ' + (type === 'vendas' ? 'vendas' : 'clientes'), 'error');
      return;
    }
    setModalType(type);
    setEditingItem(item);
    if (type === 'produtos') {
      setImagePreview(item.image_url);
      setImageBase64(null);
      setProductVariations(item.variations || []);
      setProductImages(item.images || (item.image_url ? [item.image_url] : []));
      setMainImageIndex(item.main_image_index || 0);
    }
    if (type === 'vendas') {
      setSelectedProductId(null);
      setSaleQuantity(1);
      setSaleUnitPrice('0');
      setSaleDiscountValue(item.discount_value || 0);
      setSaleDiscountType(item.discount_type || 'value');
      setSaleFinalPrice(item.final_price?.toString() || '');
      
      // Populate cart for editing
      if (item.items && item.items.length > 0) {
        setCart(item.items.map((i: any) => ({
          ...i,
          unit_price: toNum(i.unit_price),
          quantity: toNum(i.quantity)
        })));
      } else {
        // Fallback for legacy sales
        const p = products.find(prod => prod.id === item.product_id);
        setCart([{
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: toNum(item.quantity),
          unit_price: toNum(item.unit_price),
          size: item.size,
          color: item.color || p?.color || '',
          brand: item.brand || p?.brand || '',
          variation_id: item.variation_id || null
        }]);
      }
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

  const renderLoginScreen = () => {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center p-4 relative overflow-hidden">
        {/* Immersive Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-champagne/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-champagne/5 rounded-full blur-[120px] animate-pulse delay-700" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white p-5 rounded-xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] w-full max-w-sm border border-white/20 relative z-10"
        >
          <div className="text-center mb-5">
            <motion.div 
              initial={{ rotate: -10, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-10 h-10 bg-midnight rounded-lg flex items-center justify-center mx-auto mb-3 shadow-xl shadow-black/30 overflow-hidden border border-champagne/20"
            >
              <img src={storeSettings.logo_url || "/logo.png"} alt="Brisa 31 Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.src = 'https://picsum.photos/seed/brisa/200/200'; }} />
            </motion.div>
            <h1 className="text-2xl font-serif font-bold text-midnight tracking-tighter mb-0.5">Brisa 31</h1>
            <p className="text-gray-400 font-medium text-[11px] md:text-[9px] uppercase tracking-widest">
              {isRegistering ? 'Crie sua conta administrativa' : 'Acesse sua conta'}
            </p>
          </div>

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-3">
            {isRegistering && (
              <div className="space-y-1">
                <label className="text-[11px] md:text-[9px] font-black text-gray-400 uppercase tracking-[0.1em] ml-2">Nome Completo</label>
                <div className="relative group">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-champagne transition-colors" />
                  <input 
                    type="text" 
                    value={loginName || ''}
                    onChange={(e) => setLoginName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 md:py-2.5 rounded-lg border border-gray-100 focus:border-champagne focus:ring-2 focus:ring-champagne/10 outline-none transition-all bg-gray-50/50 focus:bg-white text-base md:text-xs font-medium"
                    placeholder="Seu nome"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] md:text-[9px] font-black text-gray-400 uppercase tracking-[0.1em] ml-2">Usuário</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-champagne transition-colors" />
                <input 
                  type="text" 
                  value={loginEmail || ''}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 md:py-2.5 rounded-lg border border-gray-100 focus:border-champagne focus:ring-2 focus:ring-champagne/10 outline-none transition-all bg-gray-50/50 focus:bg-white text-base md:text-xs font-medium"
                  placeholder="Seu login"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center px-2">
                <label className="text-[11px] md:text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Senha</label>
                {!isRegistering && (
                  <span 
                    onClick={handleForgotPassword}
                    className="text-[11px] md:text-[9px] font-black text-champagne-dark uppercase tracking-[0.1em] hover:text-champagne cursor-pointer transition-colors"
                  >
                    Esqueceu?
                  </span>
                )}
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-champagne transition-colors" />
                <input 
                  type={showPassword ? "text" : "password"}
                  value={loginPassword || ''}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 md:py-2.5 rounded-lg border border-gray-100 focus:border-champagne focus:ring-2 focus:ring-champagne/10 outline-none transition-all bg-gray-50/50 focus:bg-white text-base md:text-xs font-medium"
                  placeholder="••••••••"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-champagne transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!isRegistering && (
              <div className="flex items-center gap-2 px-1">
                <input 
                  type="checkbox" 
                  id="rememberMe"
                  checked={rememberMe || false}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 md:w-3.5 md:h-3.5 rounded border-gray-300 text-midnight focus:ring-champagne"
                />
                <label htmlFor="rememberMe" className="text-xs md:text-[10px] font-bold text-gray-500 cursor-pointer">Lembrar de mim</label>
              </div>
            )}

            {isRegistering && (
              <div className="space-y-1">
                <label className="text-[11px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo de Usuário</label>
                <div className="relative group">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-champagne transition-colors" />
                  <select 
                    value={loginRole || 'seller'}
                    onChange={(e) => setLoginRole(e.target.value as any)}
                    className="w-full pl-11 pr-4 py-3 md:py-2.5 rounded-lg border border-gray-200 focus:border-champagne focus:ring-2 focus:ring-champagne/10 outline-none transition-all appearance-none bg-gray-50/50 focus:bg-white font-bold text-base md:text-xs"
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
              className="w-full bg-midnight text-champagne py-3 md:py-2.5 rounded-lg text-[11px] md:text-[9px] font-black uppercase tracking-[0.1em] shadow-lg shadow-midnight/20 hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              {isLoggingIn ? (
                <div className="w-3 h-3 border-2 border-champagne border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {isRegistering ? 'Criar Conta' : 'Entrar'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {systemUsers.length === 0 && (
              <div className="text-center pt-2">
                <button 
                  type="button"
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="text-xs text-champagne-dark font-black uppercase tracking-widest hover:underline"
                >
                  {isRegistering ? 'Já tenho conta' : 'Criar Primeiro Admin'}
                </button>
              </div>
            )}

            {authError && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-rose-50 text-rose-600 text-xs font-bold rounded-2xl flex items-center gap-3 border border-rose-100"
              >
                <AlertTriangle className="w-5 h-5 shrink-0" /> {authError}
              </motion.div>
            )}

            {isStorageBlocked && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-2xl flex flex-col gap-2 border border-amber-100"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> 
                  <span>Armazenamento limitado detectado</span>
                </div>
                <p className="font-medium leading-relaxed">
                  Seu navegador pode estar restringindo o acesso a cookies. Se tiver problemas para entrar, tente abrir em uma nova aba.
                </p>
                <button 
                  type="button"
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="text-amber-700 underline text-left"
                >
                  Abrir em nova aba
                </button>
              </motion.div>
            )}
          </form>
        </motion.div>
      </div>
    );
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-champagne/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-champagne/5 rounded-full blur-[120px] animate-pulse delay-700" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 flex flex-col items-center gap-8 max-w-xs text-center px-6"
        >
          <div className="relative">
            <div className="w-16 h-16 border-4 border-champagne border-t-transparent rounded-full animate-spin shadow-2xl shadow-champagne/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-champagne rounded-full animate-ping" />
            </div>
          </div>
          
          <div className="space-y-3">
            <h2 className="text-champagne font-serif font-bold text-xl tracking-tighter">Brisa 31</h2>
            <p className="text-champagne/40 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Carregando sua experiência...</p>
          </div>

          {isStorageBlocked && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl"
            >
              <p className="text-rose-400 text-[10px] font-bold leading-relaxed">
                Parece que seu navegador está bloqueando o armazenamento local. 
                Para uma melhor experiência no Safari/iOS, abra o aplicativo em uma nova aba.
              </p>
            </motion.div>
          )}

          <button 
            onClick={() => window.open(window.location.href, '_blank')}
            className="w-full bg-champagne text-midnight px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-black/20 hover:bg-white transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <ExternalLink className="w-4 h-4" /> Abrir em Nova Aba
          </button>
        </motion.div>
      </div>
    );
  }

  if (!token) {
    return renderLoginScreen();
  }

  if (isPublicCatalog) {
    return (
      <div className="min-h-screen bg-gray-50 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <header className="bg-midnight border-b border-champagne/20 sticky top-0 z-30 px-4 md:px-6 pt-[calc(2rem+env(safe-area-inset-top))] pb-6 flex flex-col gap-4 shadow-xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden border border-champagne/30">
                <img src={storeSettings.logo_url || "/logo.png"} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.src = 'https://picsum.photos/seed/brisa/100/100'; }} />
              </div>
              <h1 className="text-xl font-serif font-bold text-champagne">Catálogo {storeSettings.nome_loja}</h1>
            </div>
            <div className="flex items-center gap-2">
              {deferredPrompt && (
                <button 
                  onClick={handleInstallApp}
                  className="bg-champagne text-midnight px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-black/10 hover:bg-champagne-dark transition-all"
                >
                  <Download className="w-4 h-4" /> <span className="hidden sm:inline">Instalar App</span>
                </button>
              )}
              {token ? (
                <button 
                  onClick={() => {
                    setIsPublicCatalog(false);
                    window.history.pushState({}, '', '/admin');
                  }}
                  className="text-sm text-champagne font-medium flex items-center gap-1 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" /> <span className="hidden sm:inline">Painel Administrativo</span>
                </button>
              ) : (
                <button 
                  onClick={() => {
                    setIsPublicCatalog(false);
                    window.history.pushState({}, '', '/admin');
                  }}
                  className="text-sm text-champagne/70 font-medium flex items-center gap-1 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <LogIn className="w-4 h-4" /> <span className="hidden sm:inline">Acesso Restrito</span>
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8 w-full max-w-7xl mx-auto mt-8">
          <div className="mb-10 text-center">
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
          <div className="max-w-6xl mx-auto px-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Package className="w-6 h-6 text-midnight" />
              <span className="font-bold text-xl text-gray-900">{storeSettings.nome_loja}</span>
            </div>
            <p className="text-gray-400 text-sm">© {new Date().getFullYear()} {storeSettings.nome_loja} - Todos os direitos reservados.</p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <>
      <div className="h-[100dvh] flex flex-col md:flex-row overflow-hidden bg-gray-50 font-sans selection:bg-champagne/30 selection:text-midnight">
        {/* Mobile Header */}
      <header className="md:hidden bg-midnight border-b border-champagne/20 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-5 flex justify-between items-center sticky top-0 z-30 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden border border-champagne/30">
            <img src={storeSettings.logo_url || "/logo.png"} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.src = 'https://picsum.photos/seed/brisa/100/100'; }} />
          </div>
          <span className="font-serif font-bold text-lg text-champagne tracking-tight">{storeSettings.nome_loja}</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
          className="p-2.5 bg-white/10 rounded-xl text-champagne active:scale-90 transition-all"
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
        fixed inset-y-0 left-0 z-40 w-52 bg-white border-r border-gray-50 transform transition-transform duration-500 ease-in-out md:relative md:translate-x-0 flex flex-col shadow-2xl md:shadow-none
        pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 hidden md:flex items-center gap-3 mb-2 shrink-0 bg-midnight relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-midnight via-midnight to-black opacity-50" />
          <div className="relative z-10 w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-2xl overflow-hidden border border-champagne/30 rotate-3 hover:rotate-0 transition-transform duration-500">
            <img src={storeSettings.logo_url || "/logo.png"} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.src = 'https://picsum.photos/seed/brisa/100/100'; }} />
          </div>
          <div className="relative z-10">
            <span className="font-serif font-bold text-xl md:text-lg text-champagne tracking-tighter leading-none block">Brisa 31</span>
            <p className="text-[10px] md:text-[7px] font-black text-champagne/40 uppercase tracking-[0.3em] mt-1 md:mt-0.5">
              {user?.role === 'admin' ? 'Administrador' : 'Vendedor'}
            </p>
          </div>
        </div>

        <nav className="px-4 md:px-3 space-y-1 md:space-y-0.5 flex-1 overflow-y-auto py-4 md:py-0 custom-scrollbar">
          <p className="px-2 text-[10px] md:text-[8px] font-black text-gray-300 uppercase tracking-[0.3em] mb-3 md:mb-2">Menu Principal</p>
          {menuItems.filter(item => !item.adminOnly || user?.role === 'admin').map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsSidebarOpen(false);
              }}
              className={`
                w-full flex items-center gap-4 md:gap-3 px-4 md:px-3 py-3 md:py-2 rounded-xl md:rounded-lg text-sm md:text-[11px] font-bold transition-all duration-700 group
                ${activeTab === item.id 
                  ? 'bg-midnight text-champagne shadow-elegant scale-[1.02]' 
                  : 'text-gray-400 hover:bg-gray-50/50 hover:text-midnight'}
              `}
            >
              <div className={`p-2 md:p-1.5 rounded-lg md:rounded-md transition-all duration-700 ${activeTab === item.id ? 'bg-white/10' : 'bg-gray-50 group-hover:bg-white shadow-sm'}`}>
                <item.icon className={`w-4 h-4 md:w-3.5 md:h-3.5 ${activeTab === item.id ? 'text-white' : 'text-gray-400 group-hover:text-midnight'}`} />
              </div>
              {item.label}
              {activeTab === item.id && <ChevronRight className="w-3 h-3 md:w-2.5 md:h-2.5 ml-auto opacity-50 animate-pulse" />}
              {item.id === 'administracao' && (dashboard?.lowStock || []).length > 0 && (
                <span className="ml-auto bg-rose-500 text-white text-[10px] md:text-[8px] font-black px-2 py-0.5 rounded-full animate-bounce shadow-lg shadow-rose-200">
                  {(dashboard?.lowStock || []).length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-5 md:p-4 border-t border-gray-50 shrink-0 space-y-3 md:space-y-2 bg-gray-50/30">
          {user && (
            <div className="flex items-center gap-3 md:gap-2 px-1 mb-3 md:mb-2 group cursor-pointer">
              <div className="w-10 h-10 md:w-8 md:h-8 bg-white rounded-xl md:rounded-lg border border-gray-100 flex items-center justify-center text-midnight font-black shadow-soft group-hover:scale-110 transition-transform duration-500 text-sm md:text-xs">
                {user.name?.charAt(0) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm md:text-[11px] font-black text-gray-900 truncate group-hover:text-midnight transition-colors">{user.name}</p>
                <p className="text-[10px] md:text-[8px] font-bold text-gray-400 uppercase tracking-widest">{user.role === 'admin' ? 'Administrador' : 'Vendedor'}</p>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-2 md:gap-1.5">
            <button 
              onClick={() => {
                const url = 'https://gen-lang-client-0238185019.web.app';
                navigator.clipboard.writeText(url);
                showNotification('Link do catálogo copiado!');
              }}
              className="w-full bg-champagne text-midnight px-3 py-3 md:px-2 md:py-2 rounded-xl md:rounded-lg text-[10px] md:text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 md:gap-1 hover:bg-white transition-all shadow-md shadow-black/5 active:scale-95 group min-h-[44px] md:min-h-0"
            >
              <Share2 className="w-4 h-4 md:w-3 md:h-3 group-hover:rotate-12 transition-transform" /> Share
            </button>
            <button 
              onClick={() => setIsPublicCatalog(true)}
              className="w-full bg-midnight text-champagne px-3 py-3 md:px-2 md:py-2 rounded-xl md:rounded-lg text-[10px] md:text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 md:gap-1 hover:bg-black transition-all shadow-md shadow-midnight/5 active:scale-95 group min-h-[44px] md:min-h-0"
            >
              <Smartphone className="w-4 h-4 md:w-3 md:h-3 group-hover:rotate-12 transition-transform" /> Catálogo
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 md:gap-1.5">
            <button 
              onClick={handleLogout}
              className="bg-white text-rose-600 border border-rose-100 px-3 py-3 md:px-2 md:py-2 rounded-xl md:rounded-lg text-[10px] md:text-[8px] font-bold flex items-center justify-center gap-1.5 md:gap-1 hover:bg-rose-50 transition-all active:scale-95 shadow-sm min-h-[44px] md:min-h-0"
            >
              <LogOut className="w-4 h-4 md:w-3 md:h-3" /> Sair
            </button>
            {deferredPrompt && (
              <button 
                onClick={handleInstallApp}
                className="bg-champagne/10 text-midnight px-3 py-3 md:px-2 md:py-2 rounded-xl md:rounded-lg text-[10px] md:text-[8px] font-bold flex items-center justify-center gap-1.5 md:gap-1 hover:bg-champagne/20 transition-all active:scale-95 shadow-sm min-h-[44px] md:min-h-0"
              >
                <Download className="w-4 h-4 md:w-3 md:h-3" /> App
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-3 md:p-6 overflow-y-auto w-full bg-gray-50/50 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 md:pt-6">
        <div className="w-full max-w-[1200px] mx-auto space-y-4 md:space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3 md:mb-4 px-2 md:px-0">
            <div className="text-left">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[7px] font-black text-midnight uppercase tracking-[0.2em] bg-champagne/30 px-1.5 py-0.5 rounded-full shadow-sm">Brisa 31</span>
                <div className="w-0.5 h-0.5 bg-gray-300 rounded-full" />
                <span className="text-[7px] font-black text-gray-400 uppercase tracking-[0.2em]">
                  {menuItems.find(item => item.id === activeTab)?.label || activeTab}
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-900 capitalize tracking-tighter leading-tight">
                {menuItems.find(item => item.id === activeTab)?.label || activeTab}
              </h2>
              <p className="text-gray-400 text-[9px] md:text-[10px] font-medium mt-0.5">Gerencie sua loja com elegância e precisão.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-1.5">
              {['administracao', 'financeiro', 'vendas', 'fornecedores'].includes(activeTab) && (
                <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-gray-100 shadow-soft group hover:border-champagne/50 transition-all duration-500">
                  <Calendar className="w-3 h-3 text-midnight group-hover:scale-110 transition-transform" />
                  <div className="flex flex-col">
                    <label className="text-[5px] font-black text-gray-400 uppercase tracking-[0.1em]">Período</label>
                    <input 
                      type="month" 
                      value={globalMonthFilter || ''}
                      onChange={(e) => setGlobalMonthFilter(e.target.value)}
                      className="bg-transparent border-none outline-none text-[9px] font-bold text-gray-900 focus:ring-0 p-0 cursor-pointer"
                    />
                  </div>
                </div>
              )}
              {['produtos', 'vendas', 'clientes', 'fornecedores', 'gastos', 'anuncios', 'vendedores', 'financeiro', 'usuarios'].includes(activeTab) && (
                <div className="flex gap-2 w-full sm:w-auto">
                  {activeTab === 'vendas' && (
                    <button 
                      onClick={() => {
                        setModalType('venda_rapida');
                        setEditingItem(null);
                        setCart([]);
                        setIsModalOpen(true);
                      }}
                      className="flex-1 sm:flex-none bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all duration-500 active:scale-95 group"
                    >
                      <div className="p-0.5 bg-white/10 rounded-md group-hover:bg-white/20 transition-colors">
                        <Zap className="w-3 h-3" /> 
                      </div>
                      <span className="text-[10px] tracking-tight">Venda Rápida</span>
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setModalType(activeTab === 'financeiro' ? 'gastos' : activeTab);
                      setEditingItem(null);
                      setImagePreview(null);
                      setImageBase64(null);
                      setIsModalOpen(true);
                    }}
                    className="flex-1 sm:flex-none bg-midnight text-champagne px-3 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-midnight/20 hover:bg-black hover:-translate-y-0.5 transition-all duration-500 active:scale-95 group"
                  >
                    <div className="p-0.5 bg-white/10 rounded-md group-hover:bg-white/20 transition-colors">
                      <Plus className="w-3 h-3" /> 
                    </div>
                    <span className="text-[10px] tracking-tight">
                      {activeTab === 'vendedores' ? 'Novo Vendedor' : 
                       activeTab === 'produtos' ? 'Novo Produto' :
                       activeTab === 'vendas' ? 'Nova Venda' :
                       activeTab === 'clientes' ? 'Novo Cliente' :
                       activeTab === 'fornecedores' ? 'Novo Fornecedor' :
                       activeTab === 'gastos' ? 'Novo Gasto' :
                       activeTab === 'anuncios' ? 'Novo Anúncio' :
                       activeTab === 'usuarios' ? 'Novo Usuário' :
                       `Adicionar ${activeTab.slice(0, -1)}`}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {['administracao', 'financeiro', 'vendas'].includes(activeTab) && (
            <FinancialSummary dashboard={dashboard} />
          )}

          {activeTab === 'administracao' && (
            <DashboardContent 
              dashboard={dashboard} 
              storeSettings={storeSettings} 
              generatePDF={generatePDF} 
              showNotification={showNotification} 
              showConfirm={showConfirm}
              onPromote={async (pId: string) => {
                const p = products.find(prod => prod.id === pId);
                if (p) {
                  try {
                    await updateDoc(doc(db, 'produtos', pId), {
                      is_featured: !p.is_featured
                    });
                    showNotification(`Produto ${!p.is_featured ? 'promovido' : 'removido dos destaques'} com sucesso!`);
                    fetchData();
                  } catch (err) {
                    showNotification('Erro ao atualizar status do produto', 'error');
                  }
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
              financeMonth={globalMonthFilter}
              setFinanceMonth={setGlobalMonthFilter}
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
                        <th className="pb-4 text-xs md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome</th>
                        <th className="pb-4 text-xs md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Login</th>
                        <th className="pb-4 text-xs md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Função</th>
                        <th className="pb-4 text-xs md:text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {systemUsers.map(u => (
                        <tr key={u.id} className="group hover:bg-gray-50/50 transition-colors">
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 md:w-8 md:h-8 bg-champagne/20 rounded-full flex items-center justify-center text-midnight font-bold text-sm md:text-xs">
                                {u.name?.charAt(0) || '?'}
                              </div>
                              <span className="font-bold text-gray-900 text-sm md:text-base">{u.name}</span>
                            </div>
                          </td>
                          <td className="py-4 text-sm text-gray-500">{u.login}</td>
                          <td className="py-4">
                            <span className={`px-2 py-1 rounded-lg text-xs md:text-[10px] font-bold uppercase tracking-wider ${
                              u.role === 'admin' ? 'bg-champagne/20 text-midnight' : 'bg-emerald-100 text-emerald-600'
                            }`}>
                              {u.role === 'admin' ? 'Administrador' : 'Vendedor'}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleEdit('usuarios', u)}
                                className="p-2 text-gray-400 hover:text-champagne transition-colors"
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
              formatCurrency={formatCurrency}
              toNum={toNum}
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
             <ProductsContent 
               filteredProducts={filteredProducts}
               searchTerm={searchTerm}
               setSearchTerm={setSearchTerm}
               categoryFilter={categoryFilter}
               setCategoryFilter={setCategoryFilter}
               categories={categories}
               handleAdjustStock={handleAdjustStock}
               handleEdit={handleEdit}
               handleDeleteProduct={handleDeleteProduct}
               formatCurrency={formatCurrency}
               toNum={toNum}
               onPromote={async (pId: string) => {
                 const p = products.find(prod => prod.id === pId);
                 if (p) {
                   try {
                     await updateDoc(doc(db, 'produtos', pId), {
                       is_featured: !p.is_featured
                     });
                     showNotification(`Produto ${!p.is_featured ? 'promovido' : 'removido dos destaques'} com sucesso!`);
                     fetchData();
                   } catch (err) {
                     showNotification('Erro ao atualizar status do produto', 'error');
                   }
                 }
               }}
               getCssColor={getCssColor}
             />
           )}

          {activeTab === 'precificacao' && (
            <PricingContent 
              pricingData={pricingData}
              setPricingData={setPricingData}
              totalCost={totalCost}
              suggestedPrice={suggestedPrice}
              netProfit={netProfit}
              realMargin={realMargin}
              formatCurrency={formatCurrency}
              minPrice={minPrice}
              premiumPrice={premiumPrice}
            />
          )}

          {activeTab === 'vendas' && (
            <SalesContent 
              sales={sales}
              salesSearchTerm={salesSearchTerm}
              setSalesSearchTerm={setSalesSearchTerm}
              salesDateFilter={salesDateFilter}
              setSalesDateFilter={setSalesDateFilter}
              globalMonthFilter={globalMonthFilter}
              setGlobalMonthFilter={setGlobalMonthFilter}
              salesPaymentFilter={salesPaymentFilter}
              setSalesPaymentFilter={setSalesPaymentFilter}
              handleEdit={handleEdit}
              handleDeleteSale={handleDeleteSale}
              user={user}
              formatCurrency={formatCurrency}
            />
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
              user={user}
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
              purchaseMonth={globalMonthFilter}
              setPurchaseMonth={setGlobalMonthFilter}
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
                              className="p-2 text-gray-400 hover:text-midnight transition-colors"
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
                        <p className="text-[10px] text-midnight font-bold uppercase tracking-widest">{e.type}</p>
                      </div>
                      <span className="text-sm font-black text-rose-600">{formatCurrency(e.value)}</span>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit('gastos', e)} className="p-2 text-gray-400 hover:text-midnight"><Edit className="w-4 h-4" /></button>
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
                          <div className="w-8 h-8 bg-champagne/20 rounded-lg flex items-center justify-center">
                            <Megaphone className="w-4 h-4 text-midnight" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">{a.platform}</h3>
                            <p className="text-[10px] text-gray-400">{new Date(a.date).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleEdit('anuncios', a)}
                            className="p-2 text-gray-400 hover:text-midnight transition-colors"
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
                  <div className="w-12 h-12 bg-champagne/20 rounded-2xl flex items-center justify-center">
                    <SettingsIcon className="w-6 h-6 text-midnight" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Configurações da Loja</h3>
                    <p className="text-sm text-gray-500">Personalize as informações básicas do seu negócio.</p>
                  </div>
                </div>

                <form key={`${storeSettings.nome_loja}-${storeSettings.telefone_whatsapp}`} onSubmit={handleSaveSettings} className="space-y-6">
                  <div className="flex flex-col items-center gap-4 mb-8">
                    <div className="relative group">
                      <div className="w-32 h-32 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden group-hover:border-champagne transition-all">
                        {imagePreview || storeSettings.logo_url ? (
                          <img src={imagePreview || storeSettings.logo_url} alt="Logo Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="text-center">
                            <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Logo</span>
                          </div>
                        )}
                        <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-all">
                          <Camera className="w-8 h-8 text-white" />
                          <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                        </label>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-900">Logo da Loja</p>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Clique para alterar</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Nome da Loja</label>
                    <input 
                      name="nome_loja"
                      type="text"
                      defaultValue={storeSettings.nome_loja}
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none transition-all"
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
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none transition-all"
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
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none transition-all text-sm"
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
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none transition-all text-sm"
                placeholder="Ex: 10000"
              />
            </div>

                  <div className="pt-4">
                    <button 
                      type="submit"
                      className="w-full bg-midnight text-white py-4 rounded-2xl font-bold shadow-lg shadow-midnight/10 hover:bg-midnight/90 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" /> Salvar Alterações
                    </button>
                  </div>
                </form>
              </Card>

              <Card className="mt-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-champagne/20 rounded-2xl flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-midnight" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Catálogo Público</h3>
                    <p className="text-sm text-gray-500">Compartilhe o link da sua loja com seus clientes.</p>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col md:flex-row items-center gap-4">
                  <div className="flex-1 w-full overflow-hidden">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Link do Catálogo</p>
                    <code className="block w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-midnight font-mono truncate">
                      {`${window.location.origin}/?public=true`}
                    </code>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/?public=true`);
                      showNotification('Link copiado para a área de transferência!');
                    }}
                    className="w-full md:w-auto bg-midnight text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-midnight/90 transition-all shrink-0"
                  >
                    <Copy className="w-4 h-4" /> Copiar Link
                  </button>
                </div>
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
                        <Download className="w-5 h-5 text-midnight" />
                      </div>
                      <h4 className="font-bold text-gray-900">Exportar Backup</h4>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Gere um arquivo com todos os seus dados (produtos, vendas, clientes, etc) para guardar em local seguro.
                    </p>
                    <button 
                      onClick={handleBackup}
                      className="w-full bg-white text-midnight border border-champagne/30 py-3 rounded-xl text-sm font-bold hover:bg-champagne/10 transition-all flex items-center justify-center gap-2"
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
    </div>

    {/* Toast Notifications */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 pointer-events-auto w-[90%] max-w-[400px] md:min-w-[300px] ${
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
          setIsBatchMode(false);
          setEditingCartIndex(null);
          setCart([]);
          setSaleFinalPrice('');
          setSelectedProductId(null);
          setSaleUnitPrice('0');
        }} 
        title={modalType === 'venda_rapida' ? 'Venda Rápida' : `${editingItem ? 'Editar' : 'Adicionar'} ${modalType.slice(0, -1)}`}
        maxWidth={modalType === 'venda_rapida' ? 'max-w-7xl' : 'max-w-2xl'}
        noPadding={modalType === 'venda_rapida'}
      >
        {modalType === 'usuarios' && (
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Nome Completo</label>
              <input name="name" defaultValue={editingItem?.name} placeholder="Ex: Michele Rosario" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
            </div>
            <div className="space-y-1">
              <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Login</label>
              <input name="login" defaultValue={editingItem?.login} placeholder="Ex: michelerosario" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
            </div>
            <div className="space-y-1">
              <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Senha</label>
              <div className="relative">
                <input 
                  name="senha" 
                  type={showPassword ? "text" : "password"}
                  defaultValue={editingItem?.senha} 
                  placeholder="••••••••" 
                  className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" 
                  required 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-midnight transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Função</label>
              <select name="role" defaultValue={editingItem?.role || 'seller'} className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required>
                <option value="seller">Vendedor</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-midnight text-white py-4 rounded-2xl font-bold shadow-lg shadow-midnight/10 hover:bg-midnight/90 transition-all text-base md:text-sm">
              {editingItem ? 'Salvar Alterações' : 'Cadastrar Usuário'}
            </button>
          </form>
        )}

        {modalType === 'produtos' && (
          <div className="space-y-6">
            {!editingItem && (
              <div className="flex p-1 bg-gray-100 rounded-xl">
                <button 
                  onClick={() => setIsBatchMode(false)}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${!isBatchMode ? 'bg-white text-midnight shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Individual
                </button>
                <button 
                  onClick={() => setIsBatchMode(true)}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${isBatchMode ? 'bg-white text-midnight shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Em Lote (Rápido)
                </button>
              </div>
            )}

            {isBatchMode && !editingItem ? (
              <form onSubmit={handleBatchAddProduct} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Nome Base do Produto</label>
                  <input name="name" placeholder="Ex: Camisa Peruana" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Marca</label>
                    <input name="brand" placeholder="Ex: Nike, Adidas" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Prefixo do Código (SKU)</label>
                    <input name="code" placeholder="Ex: CAM" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Categoria</label>
                  <input name="category" placeholder="Ex: Camisetas" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
                </div>
                <div className="space-y-1">
                  <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Cores (Separe por vírgula)</label>
                  <input 
                    value={batchColors || ''}
                    onChange={(e) => setBatchColors(e.target.value)}
                    placeholder="Ex: Branco, Preto, Azul" 
                    className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" 
                    required 
                  />
                  <p className="text-[10px] text-gray-400 ml-1 italic">O sistema criará uma variação para cada cor informada.</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">Tamanhos e Quantidades</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['P', 'M', 'G', 'GG'].map(size => (
                      <div key={size} className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase ml-1">{size}</label>
                        <input 
                          type="number" 
                          min="0"
                          value={batchSizes[size] ?? 0}
                          onChange={(e) => setBatchSizes(prev => ({ ...prev, [size]: Number(e.target.value) }))}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-midnight outline-none text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Custo Unitário (R$)</label>
                    <input name="cost" type="text" inputMode="decimal" placeholder="0,00" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Preço Base (R$)</label>
                    <input name="price" type="text" inputMode="decimal" placeholder="0,00" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">À Vista (R$)</label>
                    <input name="cash_price" type="text" inputMode="decimal" placeholder="0,00" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">No Cartão (R$)</label>
                    <input name="card_price" type="text" inputMode="decimal" placeholder="0,00" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Promo (R$)</label>
                    <input name="promo_price" type="text" inputMode="decimal" placeholder="0,00" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Estoque Mínimo (Alerta)</label>
                  <input name="min_stock" type="number" defaultValue={5} className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
                </div>

                <div className="space-y-2">
                  <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Imagem Única para o Lote</label>
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
                        <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl hover:border-champagne hover:bg-champagne/10 transition-all group">
                          <Camera className="w-5 h-5 text-gray-400 group-hover:text-midnight" />
                          <span className="text-sm font-bold text-gray-500 group-hover:text-midnight">
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
                  </div>
                </div>

                <button type="submit" className="w-full bg-midnight text-white py-4 rounded-2xl font-bold shadow-lg shadow-midnight/10 hover:bg-midnight/90 transition-all">
                  Gerar e Cadastrar Variações
                </button>
              </form>
            ) : (
              <form onSubmit={handleAddProduct} className="space-y-4">
            <div className="space-y-4">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Imagens do Produto</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {productImages.map((img, idx) => (
                  <div key={idx} className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${mainImageIndex === idx ? 'border-midnight shadow-md' : 'border-gray-100'}`}>
                    <img src={img} alt={`Product ${idx}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button 
                        type="button"
                        onClick={() => setMainImageIndex(idx)}
                        className={`p-1.5 rounded-lg transition-colors ${mainImageIndex === idx ? 'bg-midnight text-champagne' : 'bg-white text-midnight hover:bg-champagne'}`}
                        title="Definir como principal"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => removeProductImage(idx)}
                        className="p-1.5 bg-white text-rose-500 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Remover imagem"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {mainImageIndex === idx && (
                      <div className="absolute top-1 left-1 bg-midnight text-champagne text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md shadow-sm">
                        Principal
                      </div>
                    )}
                  </div>
                ))}
                <label className="aspect-square cursor-pointer flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl hover:border-midnight hover:bg-gray-50 transition-all group">
                  <Plus className="w-6 h-6 text-gray-300 group-hover:text-midnight" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-midnight">Adicionar</span>
                  <input 
                    type="file" 
                    multiple 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleMultipleImagesChange}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Nome do Produto</label>
              <input name="name" defaultValue={editingItem?.name} placeholder="Ex: Camiseta Slim Fit" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Marca</label>
                <input name="brand" defaultValue={editingItem?.brand} placeholder="Ex: Nike, Adidas" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
              </div>
              <div className="space-y-1">
                <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Código (SKU)</label>
                <input name="code" defaultValue={editingItem?.code} placeholder="Ex: CAM-001" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Categoria</label>
                <input name="category" defaultValue={editingItem?.category} placeholder="Ex: Camisetas" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
              </div>
              <div className="space-y-1">
                <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Cor</label>
                <input name="color" defaultValue={editingItem?.color} placeholder="Ex: Azul Marinho" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <label className="text-sm md:text-xs font-bold text-gray-400 uppercase">Variações (Cor, Tamanho, Estoque)</label>
                <button 
                  type="button"
                  onClick={addVariation}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-midnight text-champagne rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95"
                >
                  <Plus className="w-3 h-3" /> Adicionar Variação
                </button>
              </div>
              
              {productVariations.length > 0 ? (
                <div className="space-y-3">
                  {productVariations.map((v) => (
                    <div key={v.id} className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 relative group">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Cor</label>
                        <input 
                          value={v.color || ''}
                          onChange={(e) => updateVariation(v.id, 'color', e.target.value)}
                          placeholder="Ex: Azul"
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-midnight outline-none text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Tamanho</label>
                        <select 
                          value={v.size || 'M'}
                          onChange={(e) => updateVariation(v.id, 'size', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-midnight outline-none text-xs"
                        >
                          <option value="P">P</option>
                          <option value="M">M</option>
                          <option value="G">G</option>
                          <option value="GG">GG</option>
                          <option value="U">Único</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Estoque</label>
                        <input 
                          type="number"
                          value={v.stock ?? 0}
                          onChange={(e) => updateVariation(v.id, 'stock', Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-midnight outline-none text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Marca (Opcional)</label>
                        <input 
                          value={v.brand || ''}
                          onChange={(e) => updateVariation(v.id, 'brand', e.target.value)}
                          placeholder="Ex: Nike"
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-midnight outline-none text-xs"
                        />
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeVariation(v.id)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">Tamanho</label>
                    <select name="size" defaultValue={editingItem?.size || 'M'} className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required>
                      <option value="P">P</option>
                      <option value="M">M</option>
                      <option value="G">G</option>
                      <option value="GG">GG</option>
                      <option value="U">Único</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Estoque Atual</label>
                    <input name="stock" type="number" defaultValue={editingItem?.stock} placeholder="Quantidade" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-sm md:text-xs" required />
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Custo (R$)</label>
                <input name="cost" type="text" inputMode="decimal" defaultValue={editingItem?.cost} placeholder="0,00" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-sm md:text-xs" required />
              </div>
              <div className="space-y-1">
                <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Preço Base (R$)</label>
                <input name="price" type="text" inputMode="decimal" defaultValue={editingItem?.price} placeholder="0,00" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-sm md:text-xs" required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">À Vista (R$)</label>
                <input name="cash_price" type="text" inputMode="decimal" defaultValue={editingItem?.cash_price} placeholder="0,00" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-sm md:text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">No Cartão (R$)</label>
                <input name="card_price" type="text" inputMode="decimal" defaultValue={editingItem?.card_price} placeholder="0,00" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-sm md:text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Promo (R$)</label>
                <input name="promo_price" type="text" inputMode="decimal" defaultValue={editingItem?.promo_price} placeholder="0,00" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-sm md:text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Estoque Mínimo para Alerta</label>
                <input name="min_stock" type="number" defaultValue={editingItem?.min_stock || 5} placeholder="Ex: 5" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-sm md:text-xs" required />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <input 
                  type="checkbox" 
                  name="is_featured" 
                  id="is_featured"
                  defaultChecked={editingItem?.is_featured}
                  className="w-5 h-5 rounded border-gray-300 text-midnight focus:ring-midnight"
                />
                <label htmlFor="is_featured" className="text-sm font-bold text-gray-700 cursor-pointer">
                  Destacar este produto (Promover na Dashboard)
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Imagem do Produto</label>
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
                    <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl hover:border-champagne hover:bg-champagne/10 transition-all group">
                      <Camera className="w-5 h-5 text-gray-400 group-hover:text-midnight" />
                      <span className="text-sm font-bold text-gray-500 group-hover:text-midnight">
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
                <p className="text-[10px] text-gray-400 text-center">Formatos: JPG, PNG, WEBP. As imagens são comprimidas automaticamente.</p>
              </div>
            </div>
            <button type="submit" className="w-full bg-midnight text-white py-4 rounded-2xl font-bold shadow-lg shadow-midnight/10 hover:bg-midnight/90 transition-all">
              {editingItem ? 'Salvar Alterações' : 'Cadastrar Produto'}
            </button>
          </form>
        )}
      </div>
    )}

        {modalType === 'venda_rapida' && (
          <div className="flex flex-col lg:flex-row gap-6 h-[80vh] p-6 md:p-8">
            {/* Seletor de Produtos (Esquerda) */}
            <div className="flex-1 flex flex-col min-h-0 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-50 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-midnight uppercase tracking-widest flex items-center gap-2">
                    <Package className="w-4 h-4 text-champagne-dark" /> Produtos
                  </h3>
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                    {products.length} itens no total
                  </span>
                </div>
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-midnight transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Buscar por nome, marca ou referência..." 
                    className="w-full pl-11 pr-4 py-3.5 md:py-3 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-midnight/5 focus:border-midnight/10 transition-all"
                    value={quickSaleSearch}
                    onChange={(e) => setQuickSaleSearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
                  {['Todos', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setQuickSaleCategory(cat)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                        quickSaleCategory === cat 
                          ? 'bg-midnight text-white border-midnight shadow-lg shadow-midnight/20' 
                          : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  {products.length === 0 ? (
                    <div className="col-span-full py-20 text-center">
                      <Package className="w-16 h-16 mx-auto text-gray-100 mb-4" />
                      <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Nenhum produto cadastrado</p>
                      <p className="text-xs text-gray-400 mt-2">Cadastre produtos na aba de Estoque para começar.</p>
                    </div>
                  ) : (() => {
                    const filtered = products
                      .filter(p => {
                        const search = (quickSaleSearch || '').toLowerCase();
                        const name = (p.name || '').toLowerCase();
                        const brand = (p.brand || '').toLowerCase();
                        const code = (p.code || '').toLowerCase();
                        const matchesSearch = name.includes(search) || brand.includes(search) || code.includes(search);
                        const matchesCategory = quickSaleCategory === 'Todos' || p.category === quickSaleCategory;
                        return matchesSearch && matchesCategory;
                      })
                      .flatMap(p => {
                        if (p.has_variations && p.variations && p.variations.length > 0) {
                          return p.variations.map(v => ({
                            ...p,
                            variation_id: v.id,
                            color: v.color || p.color,
                            size: v.size || p.size,
                            stock: v.stock,
                            display_name: `${p.name} (${v.color || ''} - ${v.size || ''})`
                          }));
                        }
                        return [{
                          ...p,
                          variation_id: null,
                          display_name: p.name
                        }];
                      });

                    if (filtered.length === 0) {
                      return (
                        <div className="col-span-full py-20 text-center">
                          <Search className="w-16 h-16 mx-auto text-gray-100 mb-4" />
                          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Nenhum produto encontrado</p>
                          <p className="text-xs text-gray-400 mt-2">Tente buscar por outro termo.</p>
                        </div>
                      );
                    }

                    return filtered.map((item, idx) => {
                      const isOutOfStock = item.stock <= 0;
                      return (
                        <motion.button
                          key={`${item.id}-${item.variation_id || idx}`}
                          whileHover={!isOutOfStock ? { y: -2 } : {}}
                          whileTap={!isOutOfStock ? { scale: 0.95 } : {}}
                          disabled={isOutOfStock}
                          onClick={() => {
                            handleAddToCart(
                              item, 
                              1, 
                              toNum(item.price), 
                              item.size, 
                              item.color, 
                              item.variation_id || undefined
                            );
                            showNotification(`${item.name} adicionado!`);
                          }}
                          className={`group relative bg-white border rounded-2xl p-4 md:p-3 text-left transition-all flex flex-col h-full ${
                            isOutOfStock 
                              ? 'opacity-50 cursor-not-allowed border-gray-100 grayscale' 
                              : 'border-gray-100 hover:border-midnight hover:shadow-xl hover:shadow-midnight/5'
                          }`}
                        >
                          <div className="aspect-square rounded-xl overflow-hidden bg-gray-50 mb-3 relative">
                            {item.is_featured && (
                              <div className="absolute top-1 left-1 z-10 bg-amber-400 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-sm uppercase tracking-widest flex items-center gap-0.5">
                                <Flame className="w-2 h-2" />
                              </div>
                            )}
                            <img 
                              src={item.image_url || (item.images && item.images[0]) || `https://picsum.photos/seed/${item.id}/200/200`} 
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                            <div className={`absolute bottom-1 right-1 text-white text-[10px] md:text-[8px] font-black px-2 py-1 md:px-1.5 md:py-0.5 rounded-md backdrop-blur-sm ${
                              isOutOfStock ? 'bg-rose-500' : 'bg-midnight/90'
                            }`}>
                              {isOutOfStock ? 'Esgotado' : `${item.stock} un`}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] md:text-[8px] font-black text-champagne-dark uppercase tracking-widest mb-1 md:mb-0.5 truncate">{item.brand}</p>
                            <h4 className="text-sm md:text-[11px] font-bold text-gray-900 leading-tight line-clamp-2 mb-1.5 md:mb-1">{item.display_name}</h4>
                            <p className="text-base md:text-xs font-black text-midnight">{formatCurrency(item.price)}</p>
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-50 flex items-center justify-between">
                            <span className="text-[11px] md:text-[8px] font-black text-gray-400 uppercase">{item.size}</span>
                            <div className="w-3.5 h-3.5 md:w-2 md:h-2 rounded-full border border-gray-100" style={{ backgroundColor: item.color }}></div>
                          </div>
                        </motion.button>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            {/* Carrinho e Finalização (Direita) */}
            <div className="w-full lg:w-[400px] flex flex-col gap-4 min-h-0">
              {/* Lista do Carrinho */}
              <div className="flex-1 flex flex-col bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="text-sm font-black text-midnight uppercase tracking-widest flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-champagne-dark" /> Carrinho
                  </h3>
                  <span className="bg-midnight text-white text-xs md:text-[10px] font-black px-2.5 py-1 md:px-2 md:py-0.5 rounded-full">
                    {cart.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                      <ShoppingBag className="w-12 h-12 mb-4 text-gray-300" />
                      <p className="text-sm md:text-xs font-bold text-gray-400 uppercase tracking-widest">Carrinho Vazio</p>
                      <p className="text-xs md:text-[10px] text-gray-400 mt-1">Clique nos produtos para adicionar</p>
                    </div>
                  ) : (
                    cart.map((item, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={`quick-cart-${idx}`} 
                        className="bg-gray-50/50 p-3 rounded-2xl border border-gray-100 group hover:border-midnight/20 transition-all"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-gray-900 truncate">{item.product_name}</h4>
                            <p className="text-[11px] md:text-[9px] text-gray-400 font-medium uppercase tracking-tighter">
                              {item.brand} • {item.color} • {item.size}
                            </p>
                          </div>
                          <button 
                            onClick={() => handleRemoveFromCart(idx)}
                            className="p-1 text-gray-300 hover:text-rose-500 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-100 p-1">
                            <button 
                              onClick={() => {
                                const newCart = [...cart];
                                if (newCart[idx].quantity > 1) {
                                  newCart[idx].quantity -= 1;
                                  setCart(newCart);
                                }
                              }}
                              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-midnight hover:bg-gray-50 rounded-md transition-all"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-black text-midnight min-w-[20px] text-center">{item.quantity}</span>
                            <button 
                              onClick={() => {
                                const newCart = [...cart];
                                const p = products.find(prod => prod.id === item.product_id);
                                const maxStock = item.variation_id 
                                  ? p?.variations?.find(v => v.id === item.variation_id)?.stock 
                                  : p?.stock;
                                
                                if (newCart[idx].quantity < (maxStock || 999)) {
                                  newCart[idx].quantity += 1;
                                  setCart(newCart);
                                } else {
                                  showNotification('Estoque insuficiente', 'warning');
                                }
                              }}
                              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-midnight hover:bg-gray-50 rounded-md transition-all"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-midnight">{formatCurrency(item.unit_price * item.quantity)}</p>
                            <p className="text-[8px] text-gray-400 font-bold">{formatCurrency(item.unit_price)} un</p>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>

              {/* Formulário de Finalização */}
              <form onSubmit={handleAddSale} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] md:text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Cliente</label>
                    <select name="customer_id" className="w-full px-3 py-3 md:py-2 rounded-xl border border-gray-100 focus:border-midnight outline-none text-sm md:text-xs bg-gray-50/50">
                      <option value="">Consumidor Final</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] md:text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Pagamento</label>
                    <select name="payment_method" className="w-full px-3 py-3 md:py-2 rounded-xl border border-gray-100 focus:border-midnight outline-none text-sm md:text-xs bg-gray-50/50">
                      <option value="PIX">PIX</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Cartão de Crédito">Cartão de Crédito</option>
                      <option value="Cartão de Débito">Cartão de Débito</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</span>
                    <span className="text-2xl md:text-xl font-black text-midnight">
                      {formatCurrency(cart.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0))}
                    </span>
                  </div>
                  <button 
                    type="submit" 
                    disabled={cart.length === 0}
                    className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
                  >
                    <CheckCircle2 className="w-5 h-5" /> Finalizar Rápido
                  </button>
                </div>
                {/* Hidden inputs for handleAddSale compatibility */}
                <input type="hidden" name="discount_value" value="0" />
                <input type="hidden" name="discount_type" value="value" />
                <input type="hidden" name="seller_id" value="" />
              </form>
            </div>
          </div>
        )}

        {modalType === 'vendas' && (
          <div className="space-y-6">
            {/* Seletor de Produto */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="space-y-1">
                <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Buscar Produto</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select 
                    value={selectedProductGroup || ''}
                    onChange={(e) => {
                      setSelectedProductGroup(e.target.value);
                      setSelectedSize(null);
                      setSelectedProductId(null);
                      setSelectedVariationId(null);
                    }}
                    className="w-full pl-12 pr-4 py-4 md:py-3.5 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none appearance-none bg-white text-base md:text-sm"
                  >
                    <option value="">Selecione o modelo...</option>
                    {Array.from(new Set(products.map(p => `${p.name} | ${p.brand}`))).sort().map(groupKey => (
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
                    <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Variações Disponíveis</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {products
                        .filter(p => `${p.name} | ${p.brand}` === selectedProductGroup)
                        .flatMap(p => {
                          if (p.has_variations && p.variations) {
                            return p.variations.map(v => ({
                              id: p.id,
                              variation_id: v.id,
                              label: `${v.color} - ${v.size}`,
                              stock: v.stock,
                              price: p.price,
                              color: v.color,
                              size: v.size
                            }));
                          } else {
                            return [{
                              id: p.id,
                              variation_id: null,
                              label: `${p.color} - ${p.size}`,
                              stock: p.stock,
                              price: p.price,
                              color: p.color,
                              size: p.size
                            }];
                          }
                        })
                        .map((v, idx) => {
                          const isSelected = selectedProductId === v.id && selectedVariationId === v.variation_id;
                          const hasStock = v.stock > 0;

                          return (
                            <button
                              key={`${v.id}-${v.variation_id || idx}`}
                              type="button"
                              disabled={!hasStock}
                              onClick={() => {
                                setSelectedProductId(v.id);
                                setSelectedVariationId(v.variation_id);
                                setSelectedSize(v.size);
                                setSelectedColor(v.color);
                                setSaleUnitPrice(v.price.toString());
                              }}
                              className={`
                                p-3 rounded-xl font-bold text-sm transition-all border-2 text-left flex flex-col justify-between h-full
                                ${isSelected 
                                  ? 'bg-midnight border-midnight text-white shadow-lg shadow-midnight/10' 
                                  : hasStock
                                    ? 'bg-white border-gray-100 text-gray-700 hover:border-champagne/30'
                                    : 'bg-gray-50 border-gray-50 text-gray-300 cursor-not-allowed'
                                }
                              `}
                            >
                              <span className="block truncate">{v.label}</span>
                              <span className={`text-[10px] mt-1 ${isSelected ? 'text-champagne/70' : 'text-gray-400'}`}>
                                {v.stock} un
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Quantidade</label>
                      <input 
                        type="number" 
                        min="1"
                        max={products.find(p => p.id === selectedProductId)?.stock || 1}
                        value={saleQuantity ?? 1}
                        onChange={(e) => setSaleQuantity(Number(e.target.value))}
                        className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Preço Unit.</label>
                      <input 
                        type="text" 
                        value={saleUnitPrice || '0'}
                        onChange={(e) => setSaleUnitPrice(e.target.value)}
                        className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm font-bold text-midnight"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!selectedProductId}
                    onClick={() => {
                      const p = products.find(prod => prod.id === selectedProductId);
                      if (p) {
                        if (editingCartIndex !== null) {
                          // Update existing item
                          const updatedCart = [...cart];
                          updatedCart[editingCartIndex] = {
                            ...updatedCart[editingCartIndex],
                            quantity: saleQuantity,
                            unit_price: toNum(saleUnitPrice),
                            size: selectedSize || p.size,
                            color: selectedColor || p.color,
                            variation_id: selectedVariationId || null
                          };
                          setCart(updatedCart);
                          setEditingCartIndex(null);
                          showNotification('Item atualizado no carrinho!');
                        } else {
                          handleAddToCart(p, saleQuantity, toNum(saleUnitPrice), selectedSize || p.size, selectedColor || p.color, selectedVariationId || undefined);
                        }
                        setSelectedProductId(null);
                        setSelectedVariationId(null);
                        setSelectedSize(null);
                        setSelectedColor(null);
                        setSaleQuantity(1);
                        setSaleUnitPrice('0');
                      }
                    }}
                    className="w-full bg-midnight text-white py-4 rounded-2xl font-bold shadow-lg shadow-midnight/10 hover:bg-midnight/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-5 h-5" /> {editingCartIndex !== null ? 'Atualizar Item' : 'Adicionar ao Carrinho'}
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
                        <p className="text-[10px] text-gray-500 font-medium">{item.brand} • {item.color} • Tam: <span className="text-midnight font-bold">{item.size}</span></p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <p className="text-sm font-black text-gray-900">{formatCurrency(item.unit_price * item.quantity)}</p>
                          <p className="text-[10px] text-gray-400 font-medium">{item.quantity}x {formatCurrency(item.unit_price)}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button 
                            type="button" 
                            onClick={() => {
                              setEditingCartIndex(idx);
                              setSelectedProductId(item.product_id);
                              setSaleQuantity(item.quantity);
                              setSaleUnitPrice(item.unit_price.toString());
                              setSelectedSize(item.size);
                              setSelectedColor(item.color || null);
                              setSelectedVariationId(item.variation_id || null);
                            }}
                            className="p-1.5 text-midnight hover:bg-champagne/20 rounded-lg transition-colors"
                            title="Editar item"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveFromCart(idx)}
                            className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors"
                            title="Remover item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
                      className="text-[10px] font-bold text-midnight hover:underline"
                    >
                      + Novo
                    </button>
                  </div>
                  <select name="customer_id" defaultValue={editingItem?.customer_id} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-sm bg-white">
                    <option value="">Consumidor Final</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Vendedor</label>
                  <select name="seller_id" defaultValue={editingItem?.seller_id} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-sm bg-white">
                    <option value="">Sem Vendedor</option>
                    {sellers.filter((s: any) => s.status === 'ativo').map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Pagamento</label>
                  <select name="payment_method" defaultValue={editingItem?.payment_method || 'PIX'} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-sm bg-white">
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
                      value={saleDiscountValue || '0'}
                      onChange={(e) => {
                        setSaleDiscountValue(e.target.value);
                        setSaleFinalPrice(''); // Clear final price if manual discount is set
                      }}
                      placeholder="0,00" 
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-sm" 
                    />
                    <select 
                      name="discount_type" 
                      value={saleDiscountType || 'value'}
                      onChange={(e: any) => setSaleDiscountType(e.target.value)}
                      className="w-20 px-2 py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-sm bg-white"
                    >
                      <option value="value">R$</option>
                      <option value="percentage">%</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">Valor Final (Opcional)</label>
                  <input 
                    name="final_price_override" 
                    type="text" 
                    value={saleFinalPrice}
                    onChange={(e) => {
                      setSaleFinalPrice(e.target.value);
                      if (e.target.value) setSaleDiscountValue('0'); // Reset discount if final price is set
                    }}
                    placeholder="Fixar valor total" 
                    className="w-full px-4 py-3 rounded-xl border border-rose-200 focus:border-rose-400 focus:ring-4 focus:ring-rose-400/10 outline-none text-sm font-bold text-rose-600" 
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-5">
                    <span className="text-base font-bold text-gray-500">Total da Venda</span>
                    <span className="text-3xl font-black text-gray-900">
                      {formatCurrency(
                        saleFinalPrice ? toNum(saleFinalPrice) :
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
                  className="w-full bg-midnight text-champagne py-5 rounded-2xl font-black text-lg shadow-xl shadow-midnight/20 hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
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
              <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Nome Completo</label>
              <input name="name" defaultValue={editingItem?.name} placeholder="Nome do Cliente" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
            </div>
            <div className="space-y-1">
              <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Telefone (WhatsApp)</label>
              <input name="phone" defaultValue={editingItem?.phone} placeholder="(00) 00000-0000" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
            </div>
            <div className="space-y-1">
              <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Instagram</label>
              <input name="instagram" defaultValue={editingItem?.instagram} placeholder="usuario_instagram" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Cidade</label>
              <input name="city" defaultValue={editingItem?.city} placeholder="Cidade" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" />
            </div>
            <button type="submit" className="w-full bg-midnight text-white py-4 rounded-2xl font-bold shadow-lg shadow-midnight/10 hover:bg-midnight/90 transition-all text-base md:text-sm">
              {editingItem ? 'Salvar Alterações' : 'Cadastrar Cliente'}
            </button>
          </form>
        )}

        {modalType === 'fornecedores' && (
          <form onSubmit={handleAddSupplier} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Nome do Fornecedor</label>
                <input name="name" defaultValue={editingItem?.name} placeholder="Nome do Fornecedor" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
              </div>
              <div className="space-y-1">
                <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Telefone</label>
                <input name="phone" defaultValue={editingItem?.phone} placeholder="(00) 00000-0000" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">E-mail</label>
              <input name="email" type="email" defaultValue={editingItem?.email} placeholder="email@exemplo.com" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
            </div>
            <div className="space-y-1">
              <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Endereço</label>
              <input name="address" defaultValue={editingItem?.address} placeholder="Endereço completo" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Produtos Fornecidos</label>
              <textarea name="products_supplied" defaultValue={editingItem?.products_supplied} rows={2} placeholder="Ex: Camisetas, Calças" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Preço Médio de Compra (R$)</label>
              <input name="avg_purchase_price" type="text" inputMode="decimal" defaultValue={editingItem?.avg_purchase_price} placeholder="0,00" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" />
            </div>
            <button type="submit" className="w-full bg-midnight text-white py-4 rounded-2xl font-bold shadow-lg shadow-midnight/10 hover:bg-midnight/90 transition-all text-base md:text-sm">
              {editingItem ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
            </button>
          </form>
        )}

        {modalType === 'compras' && (
          <form onSubmit={handleAddPurchase} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Fornecedor</label>
              <select name="supplier_id" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required>
                <option value="">Selecionar Fornecedor</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Produto</label>
              <select name="product_id" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required>
                <option value="">Selecionar Produto</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Quantidade</label>
                <input name="quantity" type="number" placeholder="Quantidade" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
              </div>
              <div className="space-y-1">
                <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Valor Total (R$)</label>
                <input name="value" type="text" inputMode="decimal" placeholder="0,00" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Data da Compra</label>
              <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
            </div>
            <button type="submit" className="w-full bg-midnight text-white py-4 rounded-2xl font-bold shadow-lg shadow-midnight/10 hover:bg-midnight/90 transition-all text-base md:text-sm">
              Registrar Compra
            </button>
          </form>
        )}

        {modalType === 'gastos' && (
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Tipo de Gasto</label>
                <select name="type" defaultValue={editingItem?.type || 'Fixo'} className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required>
                  <option value="Fixo">Fixo</option>
                  <option value="Anúncio">Anúncio</option>
                  <option value="Estoque">Estoque</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Categoria</label>
                <input name="category" defaultValue={editingItem?.category} placeholder="Ex: Aluguel, Luz, Marketing" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Descrição</label>
              <input name="description" defaultValue={editingItem?.description} placeholder="Descrição detalhada" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
            </div>
            <div className="space-y-1">
              <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Valor (R$)</label>
              <input name="value" type="text" inputMode="decimal" defaultValue={editingItem?.value} placeholder="0,00" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
            </div>
            <div className="space-y-1">
              <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Observações</label>
              <textarea name="observations" defaultValue={editingItem?.observations} rows={2} placeholder="Observações adicionais..." className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" />
            </div>
            <button type="submit" className="w-full bg-rose-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all text-base md:text-sm">
              {editingItem && editingItem.id ? 'Salvar Alterações' : 'Registrar Gasto'}
            </button>
          </form>
        )}

        {modalType === 'vendedores' && (
          <form onSubmit={handleAddSeller} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Nome do Vendedor</label>
              <input name="name" defaultValue={editingItem?.name} placeholder="Nome Completo" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">E-mail</label>
                <input name="email" type="email" defaultValue={editingItem?.email} placeholder="email@exemplo.com" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
              </div>
              <div className="space-y-1">
                <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Telefone</label>
                <input name="phone" defaultValue={editingItem?.phone} placeholder="(00) 00000-0000" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Comissão (%)</label>
                <input name="commission_percentage" type="text" inputMode="decimal" defaultValue={editingItem?.commission_percentage || 5} placeholder="Ex: 5" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
              </div>
              <div className="space-y-1">
                <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Status</label>
                <select name="status" defaultValue={editingItem?.status || 'ativo'} className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
            </div>
            <button type="submit" className="w-full bg-midnight text-white py-4 rounded-2xl font-bold shadow-lg shadow-midnight/10 hover:bg-midnight/90 transition-all text-base md:text-sm">
              {editingItem && editingItem.id ? 'Salvar Alterações' : 'Cadastrar Vendedor'}
            </button>
          </form>
        )}

        {modalType === 'anuncios' && (
          <form onSubmit={handleAddAd} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Plataforma</label>
              <select name="platform" defaultValue={editingItem?.platform} className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required>
                <option value="Instagram Ads">Instagram Ads</option>
                <option value="Facebook Ads">Facebook Ads</option>
                <option value="Google Ads">Google Ads</option>
                <option value="TikTok Ads">TikTok Ads</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Investimento (R$)</label>
              <input name="investment" type="text" inputMode="decimal" defaultValue={editingItem?.investment} placeholder="0,00" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
            </div>
            <div className="space-y-1">
              <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Vendas Geradas</label>
              <input name="sales_generated" type="number" defaultValue={editingItem?.sales_generated} placeholder="Quantidade" className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none text-base md:text-sm" required />
            </div>
            <button type="submit" className="w-full bg-midnight text-white py-4 rounded-2xl font-bold shadow-lg shadow-midnight/10 hover:bg-midnight/90 transition-all text-base md:text-sm">
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
            <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Nova Senha</label>
            <div className="relative">
              <input 
                type={showNewPassword ? "text" : "password"}
                value={newPassword || ''}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none transition-all bg-gray-50/50 focus:bg-white text-base md:text-sm"
                placeholder="Mínimo 4 caracteres"
                required
              />
              <button 
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-champagne transition-colors"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Confirmar Nova Senha</label>
            <div className="relative">
              <input 
                type={showNewPassword ? "text" : "password"}
                value={confirmNewPassword || ''}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full px-4 py-4 md:py-3 rounded-xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none transition-all bg-gray-50/50 focus:bg-white text-base md:text-sm"
                placeholder="Repita a nova senha"
                required
              />
              <button 
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-champagne transition-colors"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="submit" className="w-full bg-midnight text-champagne py-4 rounded-2xl font-bold shadow-lg shadow-midnight/20 hover:bg-black transition-all text-base md:text-sm">
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
                      <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Usuário ou E-mail</label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input 
                          type="text" 
                          value={forgotPasswordLogin || ''}
                          onChange={(e) => setForgotPasswordLogin(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none transition-all bg-gray-50/50 focus:bg-white text-base md:text-sm"
                          placeholder="Ex: michellerosario.n@gmail.com"
                          required
                        />
                      </div>
                    </div>
                    <button 
                      type="submit"
                      disabled={isSearchingUser}
                      className="w-full bg-midnight text-champagne py-4 rounded-2xl font-bold shadow-lg shadow-midnight/10 hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-50"
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
                    <div className="p-4 bg-champagne/10 rounded-2xl border border-champagne/20 mb-4">
                      <p className="text-sm text-midnight font-bold">Usuário encontrado: {foundUserForReset.name || foundUserForReset.login}</p>
                      <p className="text-xs text-midnight/70 mt-1">Defina sua nova senha abaixo.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Nova Senha</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input 
                          type={showResetPassword ? "text" : "password"} 
                          value={forgotPasswordNewPass || ''}
                          onChange={(e) => setForgotPasswordNewPass(e.target.value)}
                          className="w-full pl-12 pr-12 py-4 rounded-2xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none transition-all bg-gray-50/50 focus:bg-white text-base md:text-sm"
                          placeholder="Mínimo 4 caracteres"
                          required
                        />
                        <button 
                          type="button"
                          onClick={() => setShowResetPassword(!showResetPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-champagne transition-colors"
                        >
                          {showResetPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm md:text-xs font-bold text-gray-400 uppercase ml-1">Confirmar Nova Senha</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input 
                          type={showResetPassword ? "text" : "password"} 
                          value={forgotPasswordConfirmPass || ''}
                          onChange={(e) => setForgotPasswordConfirmPass(e.target.value)}
                          className="w-full pl-12 pr-12 py-4 rounded-2xl border border-gray-200 focus:border-champagne focus:ring-4 focus:ring-champagne/10 outline-none transition-all bg-gray-50/50 focus:bg-white text-base md:text-sm"
                          placeholder="Repita a nova senha"
                          required
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={isResettingPassword}
                      className="w-full bg-midnight text-champagne py-4 rounded-2xl font-bold shadow-lg shadow-midnight/20 hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isResettingPassword ? (
                        <div className="w-5 h-5 border-2 border-champagne border-t-transparent rounded-full animate-spin" />
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
    </>
  );
}
