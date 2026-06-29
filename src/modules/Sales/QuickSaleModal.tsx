import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Package, ShoppingBag, Search, Trash2, Minus, Plus, User as UserIcon, CheckCircle2, ChevronDown, CreditCard, TrendingUp, UserPlus } from 'lucide-react';
import { formatCurrency, toNum, formatPercent } from '../../lib/utils';
import { Product, Sale, Seller, StoreSettings } from '../../types';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

interface QuickSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSale: Sale | null;
  setEditingSale: (sale: Sale | null) => void;
  cart: any[];
  setCart: React.Dispatch<React.SetStateAction<any[]>>;
  saleDiscount: string | number;
  setSaleDiscount: (val: string) => void;
  saleDiscountType: 'value' | 'percentage';
  setSaleDiscountType: (type: 'value' | 'percentage') => void;
  quickSaleTab: 'products' | 'cart';
  setQuickSaleTab: (tab: 'products' | 'cart') => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  products: Product[];
  customers: any[];
  sellers: Seller[];
  handleCompleteSale: (
    payment: string, 
    seller: string, 
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
  ) => void;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
  isFullPage?: boolean;
  storeSettings?: StoreSettings;
  loadMoreProducts?: () => void;
}

export const QuickSaleModal = ({
  isOpen,
  onClose,
  editingSale,
  setEditingSale,
  cart,
  setCart,
  saleDiscount,
  setSaleDiscount,
  saleDiscountType,
  setSaleDiscountType,
  quickSaleTab,
  setQuickSaleTab,
  searchTerm,
  setSearchTerm,
  products,
  customers,
  sellers,
  handleCompleteSale,
  showNotification,
  isFullPage = false,
  storeSettings,
  loadMoreProducts
}: QuickSaleModalProps) => {
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string>(editingSale?.customer_id || '');
  const [priceType, setPriceType] = React.useState<'normal' | 'pix'>('normal');
  const [payments, setPayments] = React.useState<any[]>([]);
  const [visibleCount, setVisibleCount] = React.useState(30);
  const [manualFinalValue, setManualFinalValue] = React.useState<string>('');
  const [sellerName, setSellerName] = React.useState<string>(editingSale?.seller_name || '');
  const [onlyInStock, setOnlyInStock] = React.useState(true);
  const [selectedCategory, setSelectedCategory] = React.useState<string>('todos');
  const [receivedAmount, setReceivedAmount] = React.useState<string>('');
  const [activeTab, setActiveTab] = React.useState<'products' | 'cart'>('products');
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [quickCustomerData, setQuickCustomerData] = useState({ name: '', phone: '', instagram: '' });
  const [adjustment, setAdjustment] = React.useState<number>(0);
  const [adjustmentDisplay, setAdjustmentDisplay] = React.useState<string>('0');
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Sync adjustment from display
  React.useEffect(() => {
    setAdjustment(toNum(adjustmentDisplay));
  }, [adjustmentDisplay]);

  const handleQuickCustomerSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustomerData.name || !quickCustomerData.phone) {
      showNotification('Nome e WhatsApp são obrigatórios', 'error');
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'clientes'), {
        ...quickCustomerData,
        status: 'ativo',
        classification: 'BRONZE',
        total_spent: 0,
        total_purchases: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      setSelectedCustomerId(docRef.id);
      setShowQuickCustomer(false);
      setQuickCustomerData({ name: '', phone: '', instagram: '' });
      showNotification('Cliente cadastrado e selecionado!');
    } catch (err: any) {
      showNotification('Erro ao cadastrar cliente: ' + err.message, 'error');
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const categories = React.useMemo(() => {
    if (!products) return ['todos'];
    const distinct = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return ['todos', ...distinct];
  }, [products]);

  const bestSellers = React.useMemo(() => {
    if (!products) return [];
    return products
      .filter(p => p.is_best_seller || p.is_featured)
      .filter(p => p.status !== 'inativo')
      .slice(0, 8);
  }, [products]);

  const filteredProducts = React.useMemo(() => {
    if (!products) return [];
    const term = searchTerm.toLowerCase();
    let filtered = products.filter(p => 
      (p.status !== 'inativo') && (
        p.name.toLowerCase().includes(term) || 
        (p.brand && p.brand.toLowerCase().includes(term)) ||
        (p.code && p.code.toLowerCase().includes(term))
      )
    );

    if (selectedCategory !== 'todos') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    if (onlyInStock) {
      filtered = filtered.filter(p => {
        // Estoque no Firestore (já deduzido da venda original se ela foi concluída)
        const firestoreStock = p.has_variations && p.variations
          ? p.variations.reduce((sum, v) => sum + toNum(v.estoque), 0)
          : toNum(p.stock);
          
        // Quantidade que estava na venda original (se estivermos editando)
        const originalSaleItems = editingSale?.items.filter(it => it.product_id === p.id) || [];
        const originalQuantity = originalSaleItems.reduce((sum, it) => sum + toNum(it.quantity), 0);
        
        // Quantidade que está no carrinho ATUAL
        const currentCartItems = cart.filter(it => it.product_id === p.id);
        const currentQuantity = currentCartItems.reduce((sum, it) => sum + toNum(it.quantity), 0);

        // Estoque disponível real = Estoque Firestore + O que já era da venda - O que está no carrinho agora
        const availableToAdd = firestoreStock + originalQuantity - currentQuantity;
        
        // Mostramos se ainda houver estoque para adicionar OU se o produto já estiver no carrinho
        return availableToAdd > 0 || currentQuantity > 0;
      });
    }

    // Sort: Products with stock > 0 first, then by name
    return filtered.sort((a, b) => {
      const aInSale = editingSale?.items.filter(it => it.product_id === a.id) || [];
      const aInSaleQty = aInSale.reduce((sum, it) => sum + toNum(it.quantity), 0);
      const bInSale = editingSale?.items.filter(it => it.product_id === b.id) || [];
      const bInSaleQty = bInSale.reduce((sum, it) => sum + toNum(it.quantity), 0);

      const aStock = (a.has_variations && a.variations 
        ? a.variations.reduce((sum, v) => sum + toNum(v.estoque), 0)
        : toNum(a.stock)) + aInSaleQty;
      const bStock = (b.has_variations && b.variations 
        ? b.variations.reduce((sum, v) => sum + toNum(v.estoque), 0)
        : toNum(b.stock)) + bInSaleQty;
      
      if (aStock > 0 && bStock <= 0) return -1;
      if (aStock <= 0 && bStock > 0) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [products, searchTerm, onlyInStock, editingSale, cart]);

  const displayedProducts = filteredProducts.slice(0, visibleCount);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (visibleCount < filteredProducts.length) {
        setVisibleCount(prev => prev + 30);
      } else if (loadMoreProducts) {
        loadMoreProducts();
      }
    }
  };

  React.useEffect(() => {
    setVisibleCount(30);
  }, [searchTerm]);

  React.useEffect(() => {
    if (editingSale) {
      setSelectedCustomerId(editingSale.customer_id || '');
      setSellerName(editingSale.seller_name || '');
      
      if (editingSale.payments && editingSale.payments.length > 0) {
        setPayments(editingSale.payments);
      } else {
        // Fallback for old sales
        setPayments([{
          method: editingSale.payment_method || 'pix',
          amount: toNum(editingSale.valor_bruto),
          installments: editingSale.installments || 1,
          fee_percentage: editingSale.installment_fee_percentage || 0,
          fee_value: editingSale.installment_fee_value || 0
        }]);
      }
      
      // Check if the total was likely a manual override
      const saleTotal = toNum(editingSale.valor_bruto);
      const calculatedBase = Math.max(0, toNum(editingSale.subtotal) - toNum(editingSale.discount_value));
      if (Math.abs(saleTotal - calculatedBase) > 0.01) {
        setManualFinalValue(saleTotal.toString() || '');
      } else {
        setManualFinalValue('');
      }
    } else {
      setSelectedCustomerId('');
      setManualFinalValue('');
      setSellerName('');
      // Initialize with one PIX payment
      setPayments([]);
    }
  }, [editingSale, isOpen]);

  const subtotal = cart.filter(i => i.status !== 'cancelado').reduce((sum, item) => sum + (toNum(item.unit_price) * toNum(item.quantity)), 0);
  const totalCost = cart.filter(i => i.status !== 'cancelado').reduce((sum, item) => sum + ((toNum(item.cost) + toNum(item.frete)) * toNum(item.quantity)), 0);
  const discountAmount = saleDiscountType === 'percentage' ? (subtotal * (toNum(saleDiscount) / 100)) : toNum(saleDiscount);
  const baseFinalValue = Math.max(0, subtotal - discountAmount);
  const finalWithAdjustment = Math.max(0, baseFinalValue + adjustment);

  // Manual override logic
  const effectiveGrossValue = manualFinalValue !== '' ? toNum(manualFinalValue) : finalWithAdjustment;

  // Initialize first payment if empty and effectiveGrossValue > 0
  React.useEffect(() => {
    if (payments.length === 0 && effectiveGrossValue > 0 && !editingSale) {
      setPayments([{
        method: 'pix',
        amount: effectiveGrossValue,
        installments: 1,
        fee_percentage: 0,
        fee_value: 0
      }]);
    }
  }, [effectiveGrossValue, payments.length, editingSale]);

  const getFeeForPayment = (method: string, inst: number) => {
    if (method === 'debito') return toNum(storeSettings?.debit_fee);
    if (method === 'credito') {
      if (inst === 1) return toNum(storeSettings?.card_fee);
      const config = storeSettings?.taxasParcelamento?.find(t => t.installments === inst);
      return config ? toNum(config.fee) : 0;
    }
    return 0;
  };

  // Sincroniza automaticamente o valor do pagamento único quando o valor total da venda se altera
  React.useEffect(() => {
    if (payments.length === 1) {
      const p = payments[0];
      if (toNum(p.amount) !== effectiveGrossValue) {
        const feePerc = p.fee_percentage !== undefined ? toNum(p.fee_percentage) : getFeeForPayment(p.method, p.installments || 1);
        setPayments([{
          ...p,
          amount: effectiveGrossValue,
          fee_percentage: feePerc,
          fee_value: effectiveGrossValue * (feePerc / 100)
        }]);
      }
    }
  }, [effectiveGrossValue, payments.length]);

  const addPayment = () => {
    const totalPaidSoFar = payments.reduce((sum, p) => sum + toNum(p.amount), 0);
    const remaining = Math.max(0, effectiveGrossValue - totalPaidSoFar);
    
    setPayments([...payments, {
      method: 'pix',
      amount: remaining,
      installments: 1,
      fee_percentage: 0,
      fee_value: 0
    }]);
  };

  const updatePayment = (index: number, updates: any) => {
    setPayments(prev => prev.map((p, i) => {
      if (i !== index) return p;
      const updated = { ...p, ...updates };
      
      // Re-calculate fees if method or installments change
      if (updates.method || updates.installments) {
        const feePerc = getFeeForPayment(updated.method, updated.installments);
        updated.fee_percentage = feePerc;
        updated.fee_value = toNum(updated.amount) * (feePerc / 100);
      } else if (updates.amount) {
        updated.fee_value = toNum(updated.amount) * (toNum(updated.fee_percentage) / 100);
      }
      
      return updated;
    }));
  };

  const removePayment = (index: number) => {
    if (payments.length <= 1) return;
    setPayments(prev => prev.filter((_, i) => i !== index));
  };

  const totalPaid = payments.reduce((sum, p) => sum + toNum(p.amount), 0);
  const totalFees = payments.reduce((sum, p) => sum + toNum(p.fee_value), 0);
  const effectiveNetValue = effectiveGrossValue - totalFees;
  const estimatedProfit = effectiveNetValue - totalCost;

  const content = (
    <div className={`bg-white rounded-[2.5rem] shadow-2xl w-full h-full overflow-hidden flex flex-col border border-slate-200/60`}>
      {/* Header - Refined */}
      <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-slate-900/20">
            <ShoppingBag className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase leading-none">
              {editingSale ? 'Editar Venda' : 'Terminal PDV'}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Operação de Balcão #{new Date().getHours()}{new Date().getMinutes()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end mr-2">
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Data de Emissão</span>
            <span className="text-xs font-bold text-slate-900 uppercase">{new Date().toLocaleDateString('pt-BR')}</span>
          </div>
          <button 
            onClick={() => {
              onClose();
              setEditingSale(null);
              setCart([]);
              setSaleDiscount('0');
            }}
            className="w-11 h-11 flex items-center justify-center hover:bg-slate-50 rounded-2xl transition-all text-slate-400 hover:text-rose-500 border border-slate-100 hover:border-rose-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 relative">
        {/* Tabs Wrapper */}
        <div className="flex border-b border-slate-100 shrink-0 bg-white shadow-sm z-20">
          <button 
            onClick={() => setActiveTab('products')}
            className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'products' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            PRODUTOS ({products.length})
          </button>
          <button 
            onClick={() => setActiveTab('cart')}
            className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'cart' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            CARRINHO ({cart.reduce((sum, i) => sum + i.quantity, 0)})
          </button>
        </div>

        {/* Left Section: Product Catalog */}
        <div className={`flex-1 flex flex-col min-h-0 bg-slate-50/50 ${activeTab === 'products' ? 'flex' : 'hidden'}`}>
          {/* Catalog Controls */}
          <div className="p-6 space-y-5 bg-white border-b border-slate-100 shadow-sm z-10">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                <input 
                  ref={searchInputRef}
                  type="text"
                  placeholder="Pesquisar estoque..."
                  className="w-full pl-14 pr-5 h-12 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-slate-900 focus:bg-white transition-all placeholder:text-slate-400 uppercase tracking-tight"
                  onChange={(e) => setSearchTerm(e.target.value)}
                  value={searchTerm || ''}
                />
              </div>
              <div className="flex gap-3">
                <div className="flex flex-1 gap-2">
                  <div className="flex-1 relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select 
                      value={selectedCustomerId || ''}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full h-12 pl-12 pr-10 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-black text-slate-700 outline-none appearance-none hover:bg-slate-100 focus:border-slate-900 transition-all uppercase tracking-wider"
                    >
                      <option value="">CONSUMIDOR FINAL</option>
                      {(customers || []).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    onClick={() => setShowQuickCustomer(true)}
                    className="w-12 h-12 flex items-center justify-center bg-slate-900 text-white rounded-2xl hover:bg-black transition-all active:scale-95 shadow-lg shadow-slate-900/10 group shrink-0"
                    title="Novo Cliente"
                  >
                    <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
                <button 
                  onClick={() => setOnlyInStock(!onlyInStock)}
                  className={`px-6 h-12 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all ${onlyInStock ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/10' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                >
                  {onlyInStock ? 'EM ESTOQUE' : 'TODOS'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {(categories || []).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`whitespace-nowrap px-5 h-9 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${
                    selectedCategory === cat 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {cat === 'todos' ? 'TODAS AS PEÇAS' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Catalog Grid */}
          <div 
            className="flex-1 overflow-y-auto p-6 custom-scrollbar"
            onScroll={handleScroll}
          >
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xxl:grid-cols-5 gap-4">
              {(displayedProducts || []).map(product => {
                const currentPrice = priceType === 'pix' && product.cash_price ? toNum(product.cash_price) : toNum(product.price);
                const inSaleItems = editingSale?.items.filter(it => it.product_id === product.id) || [];
                const inSaleQty = inSaleItems.reduce((sum, it) => sum + toNum(it.quantity), 0);
                const inCartItems = cart.filter(it => it.product_id === product.id);
                const inCartQty = inCartItems.reduce((sum, it) => sum + toNum(it.quantity), 0);
                const totalStock = (product.has_variations && product.variations
                  ? product.variations.reduce((sum, v) => sum + toNum(v.estoque), 0)
                  : toNum(product.stock)) + inSaleQty - inCartQty;
                  
                  return (
                    <div 
                      key={product.id} 
                      className={`group bg-white border border-slate-200 rounded-3xl p-5 flex flex-col gap-4 transition-all ${totalStock <= 0 ? 'opacity-30 grayscale' : 'hover:border-slate-900 hover:shadow-2xl hover:shadow-slate-900/5'}`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{product.brand || 'ESSENCIAL'}</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${totalStock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-400'}`}>
                            {totalStock > 0 ? `${totalStock} UN` : 'ESGOTADO'}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-xs leading-tight uppercase h-8 line-clamp-2">{product.name}</h4>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-[10px] font-bold text-slate-400">R$</span>
                          <span className={`text-xl font-black tracking-tight ${priceType === 'pix' ? 'text-emerald-600' : 'text-slate-900'}`}>
                            {formatCurrency(currentPrice).replace('R$', '').trim()}
                          </span>
                        </div>
                      </div>

                      <div className="mt-auto">
                        {product.has_variations && product.variations ? (
                          <div className="grid grid-cols-2 gap-2 focus-within:z-10 relative">
                            {(product.variations || []).map((v, idx) => {
                              const inSale = editingSale?.items.find(it => it.product_id === product.id && it.variation_id === v.id);
                              const inCart = cart.find(it => it.product_id === product.id && it.variation_id === v.id);
                              const availableStock = toNum(v.estoque) + (inSale ? toNum(inSale.quantity) : 0) - (inCart ? toNum(inCart.quantity) : 0);
                              
                              return (
                                <button
                                  key={idx}
                                  disabled={availableStock <= 0}
                                  onClick={() => {
                                    if (availableStock <= 0) return;
                                    const existing = cart.find(item => item.product_id === product.id && item.variation_id === v.id);
                                    if (existing) {
                                      setCart(prev => prev.map(item => (item.product_id === product.id && item.variation_id === v.id) ? { ...item, quantity: item.quantity + 1 } : item));
                                    } else {
                                      setCart(prev => [...prev, {
                                        product_id: product.id, product_name: product.name, quantity: 1, unit_price: currentPrice, cost: toNum(product.cost), frete: toNum(product.frete),
                                        tamanho: v.tamanho, cor: v.cor, brand: product.brand, variation_id: v.id
                                      }]);
                                    }
                                  }}
                                  className={`h-11 rounded-xl border text-[10px] font-black tracking-tight transition-all flex items-center justify-between px-3 ${
                                    availableStock > 0 ? 'bg-slate-50 border-slate-100 hover:bg-slate-900 hover:text-white hover:border-slate-900 active:scale-95' : 'bg-slate-50 text-slate-200 border-transparent'
                                  }`}
                                >
                                  <div className="flex flex-col items-start min-w-0 pr-1">
                                    <span className="truncate w-full text-left leading-none mb-1 text-inherit">{(v.cor || 'Padrão').toUpperCase()}</span>
                                    <span className="text-[9px] opacity-60 uppercase text-inherit">{(v.tamanho || 'ÚN').toUpperCase()}</span>
                                  </div>
                                  <span className="shrink-0 opacity-40 text-[9px]">({availableStock})</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <button 
                            disabled={totalStock <= 0}
                            onClick={() => {
                              if (totalStock <= 0) return;
                              const existing = cart.find(item => item.product_id === product.id && !item.variation_id);
                              if (existing) {
                                setCart(prev => prev.map(item => (item.product_id === product.id && !item.variation_id) ? { ...item, quantity: item.quantity + 1 } : item));
                              } else {
                                setCart(prev => [...prev, {
                                  product_id: product.id, product_name: product.name, quantity: 1, unit_price: currentPrice, cost: toNum(product.cost), frete: toNum(product.frete),
                                  tamanho: product.tamanho || 'Único', cor: product.cor || 'Padrão', brand: product.brand
                                }]);
                              }
                            }}
                            className={`w-full h-11 rounded-2xl border text-[10px] font-black tracking-widest transition-all flex items-center justify-between px-4 ${
                              totalStock > 0 ? 'bg-slate-50 border-slate-100 hover:bg-slate-900 hover:text-white hover:border-slate-900 active:scale-95 shadow-sm' : 'bg-slate-50 text-slate-200 border-transparent'
                            }`}
                          >
                            <div className="flex flex-col items-start min-w-0 pr-1 text-inherit">
                              <span className="truncate w-full text-left leading-none mb-1 uppercase">{(product.cor || 'Padrão').toUpperCase()}</span>
                              <span className="text-[9px] opacity-60 uppercase">{(product.tamanho || 'Único').toUpperCase()}</span>
                            </div>
                            <span className="shrink-0 opacity-40 text-[9px] text-inherit">({totalStock > 0 ? totalStock : 'OUT'})</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Right Section: Fixed Transactional Column */}
        <div className={`w-full shrink-0 flex flex-col bg-white border-l border-slate-200 min-h-0 relative ${activeTab === 'cart' ? 'flex' : 'hidden'}`}>
          {/* Cart Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 z-10">
            <div className="flex items-center gap-4">
              <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-lg shadow-slate-900/10">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-[13px] uppercase tracking-[0.2em] leading-none mb-1.5">Conferência</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Painel de Checkout</p>
              </div>
            </div>
            <div className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-xl text-[10px] font-black border border-blue-100 tracking-widest uppercase">
              {cart.reduce((sum, i) => sum + i.quantity, 0)} ITENS
            </div>
          </div>

          {/* Cart List - Independently Scrollable */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/10">
            <div className="p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-white border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center mb-4 opacity-50">
                    <ShoppingBag className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest">CARRINHO VAZIO</h3>
                  <p className="text-slate-400 text-[10px] font-medium uppercase mt-1">Adicione itens para começar</p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-slate-300">
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-slate-900 text-[13px] leading-tight uppercase line-clamp-1">{item.product_name}</h5>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md uppercase tracking-widest max-w-full truncate">
                            {(item.cor || 'Padrão')} • {(item.tamanho || 'Único')}
                          </span>
                          <span className="text-[9px] font-medium text-slate-400 uppercase shrink-0">{item.brand}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setCart(prev => prev.filter((_, i) => i !== idx))}
                        className="text-slate-300 hover:text-rose-500 transition-all p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-100">
                        <button 
                          onClick={() => {
                            if (item.quantity > 1) {
                              setCart(prev => prev.map((it, i) => i === idx ? { ...it, quantity: it.quantity - 1 } : it));
                            } else {
                              setCart(prev => prev.filter((_, i) => i !== idx));
                            }
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-100 rounded-lg text-slate-900 shadow-sm transition-all border border-slate-200"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-sm font-bold w-8 text-center text-slate-900">{item.quantity}</span>
                        <button 
                          onClick={() => {
                            const product = products.find(p => p.id === item.product_id);
                            const inSale = editingSale?.items.find(it => it.product_id === item.product_id && it.variation_id === item.variation_id);
                            let maxAllowed = (product?.has_variations ? toNum(product.variations?.find(v => v.id === item.variation_id)?.estoque) : toNum(product?.stock)) + (inSale ? toNum(inSale.quantity) : 0);
                            if (item.quantity >= maxAllowed) return;
                            setCart(prev => prev.map((it, i) => i === idx ? { ...it, quantity: it.quantity + 1 } : it));
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-100 rounded-lg text-slate-900 shadow-sm transition-all border border-slate-200"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mb-0.5">Subtotal</p>
                        <p className="font-bold text-slate-900 text-sm tracking-tight">
                          {formatCurrency(toNum(item.unit_price) * toNum(item.quantity))}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Checkout Footer - The Financial Engine */}
          <div className="shrink-0 bg-white border-t border-slate-200 px-8 py-6 space-y-5 shadow-[0_-15px_50px_rgba(0,0,0,0.06)] z-50">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1">Meios de Pagamento</label>
                  <button 
                    onClick={addPayment}
                    className="text-[10px] font-black text-blue-600 uppercase tracking-[0.1em] hover:text-blue-800 transition-colors"
                  >
                    + ADICIONAR FORMA
                  </button>
                </div>
                
                <div className="space-y-3">
                  {payments.map((p, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200/60 rounded-[1.5rem] p-4 space-y-3 relative group mt-1">
                      {payments.length > 1 && (
                        <button 
                          onClick={() => removePayment(idx)}
                          className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all z-10"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      
                      <div className="grid grid-cols-2 gap-3">
                        <select 
                          className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-[11px] font-black outline-none focus:border-slate-900 transition-all uppercase tracking-wider"
                          value={p.method}
                          onChange={(e) => updatePayment(idx, { method: e.target.value })}
                        >
                          <option value="pix">PIX</option>
                          <option value="dinheiro">DINHEIRO</option>
                          <option value="debito">DÉBITO</option>
                          <option value="credito">CRÉDITO</option>
                        </select>
                        <input 
                          type="text"
                          inputMode="decimal"
                          placeholder="0,00"
                          className={`h-11 px-4 bg-white border border-slate-200 rounded-xl text-[11px] font-black outline-none focus:border-slate-900 transition-all ${Math.abs(totalPaid - effectiveGrossValue) > 0.01 ? 'border-amber-400' : ''}`}
                          value={p.amount}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^-?\d*[.,]?\d*$/.test(val) || val === '') {
                              updatePayment(idx, { amount: val });
                            }
                          }}
                        />
                      </div>
                      
                      {p.method === 'credito' && (
                        <div className="grid grid-cols-1 gap-2">
                          <select 
                            value={p.installments}
                            onChange={(e) => updatePayment(idx, { installments: toNum(e.target.value) })}
                            className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-[11px] font-black outline-none focus:border-slate-900 transition-all uppercase tracking-widest"
                          >
                            {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                              <option key={n} value={n}>{n}X S/ JUROS</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1">Cupom / Desconto</label>
                <div className="flex gap-2 h-12">
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={saleDiscount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^-?\d*[.,]?\d*$/.test(val) || val === '' || val === '-') {
                        setSaleDiscount(val);
                      }
                    }}
                    className="flex-1 px-5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-black outline-none focus:border-slate-900 transition-all"
                  />
                  <select 
                    value={saleDiscountType || 'value'}
                    onChange={(e) => setSaleDiscountType(e.target.value as 'value' | 'percentage')}
                    className="w-16 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-black text-center outline-none"
                  >
                    <option value="value">R$</option>
                    <option value="percentage">%</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1">Vendedor Responsável</label>
                <select 
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  className="w-full h-12 px-5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-black outline-none focus:border-slate-900 transition-all uppercase tracking-widest"
                >
                  <option value="">BALCÃO PADRÃO</option>
                  {sellers?.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="pt-5 border-t border-slate-100 flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 px-1">
                <span>Total de Itens</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              
              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 px-1">
                  <span>Desconto Aplicado</span>
                  <span>- {formatCurrency(discountAmount)}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5 mt-1">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] ml-1">Ajuste de Saldo (R$)</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={adjustmentDisplay}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^-?\d*[.,]?\d*$/.test(val) || val === '' || val === '-') {
                        setAdjustmentDisplay(val);
                      }
                    }}
                    placeholder="0,00"
                    className="flex-1 h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black outline-none focus:border-slate-900 transition-all"
                  />
                  <button 
                    onClick={() => {
                      const currentTotal = baseFinalValue + adjustment;
                      const rounded = Math.round(currentTotal);
                      const diff = rounded - (baseFinalValue + adjustment);
                      setAdjustmentDisplay(String((adjustment + diff).toFixed(2)).replace('.', ','));
                    }}
                    className="px-4 h-10 bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-slate-200 transition-all active:scale-95"
                  >
                    Arredondar
                  </button>
                </div>
              </div>

              {adjustment !== 0 && (
                <div className={`flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] px-1 ${adjustment > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  <span>{adjustment > 0 ? 'Acréscimo Manual' : 'Abatimento Manual'}</span>
                  <span>{adjustment > 0 ? '+' : ''}{formatCurrency(adjustment)}</span>
                </div>
              )}
              
              <div className="flex flex-col pt-5 mt-2 border-t border-slate-100">
                <div className={`flex justify-between items-center mb-2 px-1 ${Math.abs(totalPaid - effectiveGrossValue) > 0.01 ? 'text-rose-500' : 'text-slate-600'}`}>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Fluxo de Caixa</span>
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {formatCurrency(totalPaid)} / {formatCurrency(effectiveGrossValue)}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 px-1">
                  <span className="text-sm font-black text-slate-600">R$</span>
                  <span className="text-5xl font-black text-slate-900 tracking-tighter leading-none">
                    {formatCurrency(effectiveGrossValue).replace('R$', '').trim()}
                  </span>
                </div>
                {Math.abs(totalPaid - effectiveGrossValue) > 0.01 && (
                  <p className="text-[11px] font-black text-rose-500 uppercase tracking-[0.15em] mt-3 px-1.5 py-2 bg-rose-50 rounded-xl text-center border border-rose-100">
                    O valor pago diverge do total da venda
                  </p>
                )}
              </div>

              {totalFees > 0 && (
                <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5">
                  <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-slate-500">
                    <span>Taxas Acumuladas</span>
                    <span className="text-rose-500 font-semibold">{formatCurrency(totalFees)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-slate-900 pt-1.5 border-t border-slate-200/50">
                    <span>Líquido a Receber</span>
                    <span className="text-emerald-600 font-bold">{formatCurrency(effectiveNetValue)}</span>
                  </div>
                </div>
              )}

              {payments.some(p => p.method === 'dinheiro') && (
                <div className="mt-2 space-y-2.5 p-4 bg-slate-900 rounded-xl shadow-lg">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Valor Recebido (Dinheiro)</label>
                    <input 
                      type="text"
                      inputMode="decimal"
                      value={receivedAmount}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^-?\d*[.,]?\d*$/.test(val) || val === '' || val === '-') {
                          setReceivedAmount(val);
                        }
                      }}
                      placeholder="0,00"
                      className="w-24 h-9 px-3 bg-white/10 border-none rounded-lg text-right text-sm font-bold text-white outline-none focus:bg-white/20 transition-all"
                    />
                  </div>
                  {toNum(receivedAmount) > 0 && (
                    <div className="flex justify-between items-center pt-2.5 border-t border-white/10">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Troco</span>
                      <div className="flex items-baseline gap-1">
                         <span className="text-xs font-semibold text-emerald-400">R$</span>
                         <span className={`text-2xl font-bold ${toNum(receivedAmount) - payments.find(p => p.method === 'dinheiro')?.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatCurrency(Math.max(0, toNum(receivedAmount) - (payments.find(p => p.method === 'dinheiro')?.amount || 0))).replace('R$', '').trim()}
                         </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Final Action */}
            <div className="flex flex-col gap-2 pt-1">
              <button 
                disabled={cart.length === 0 || Math.abs(totalPaid - effectiveGrossValue) > 0.01}
                onClick={() => {
                  const customer = customers.find(c => c.id === selectedCustomerId);
                  // For backward compatibility, send the primary payment method or 'Múltiplos'
                  const primaryMethod = payments.length === 1 ? payments[0].method : 'Múltiplos';
                  const primaryInstallments = payments.length === 1 ? payments[0].installments : 1;
                  
                  handleCompleteSale(primaryMethod, sellerName || 'Vendedor Padrão', effectiveGrossValue, selectedCustomerId, customer?.name, primaryInstallments, effectiveGrossValue, effectiveNetValue, totalFees, 0, adjustment, payments);
                }}
                className="w-full h-14 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-black transition-all disabled:opacity-20 active:scale-95 shadow-lg flex items-center justify-center gap-3"
              >
                {editingSale ? 'ATUALIZAR VENDA' : 'FINALIZAR VENDA'}
              </button>
              
              <button 
                onClick={() => {
                  onClose();
                  setEditingSale(null);
                  setCart([]);
                  setSaleDiscount('0');
                }}
                className="w-full py-2.5 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-rose-500 transition-all"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isFullPage) {
    return content;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[60] flex items-center justify-center p-0 md:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 15 }}
            className="w-full h-full max-w-[1600px] flex items-center justify-center bg-transparent"
          >
            {content}
            {/* Quick Customer Modal */}
      <AnimatePresence>
        {showQuickCustomer && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowQuickCustomer(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Novo Cliente</h3>
                </div>
                <button onClick={() => setShowQuickCustomer(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-900">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleQuickCustomerSave} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nome Completo *</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={quickCustomerData.name}
                    onChange={(e) => setQuickCustomerData({...quickCustomerData, name: e.target.value})}
                    placeholder="Ex: João Silva"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all uppercase"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">WhatsApp *</label>
                  <input 
                    type="text" 
                    value={quickCustomerData.phone}
                    onChange={(e) => setQuickCustomerData({...quickCustomerData, phone: e.target.value})}
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Instagram (Opcional)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">@</span>
                    <input 
                      type="text" 
                      value={quickCustomerData.instagram}
                      onChange={(e) => setQuickCustomerData({...quickCustomerData, instagram: e.target.value})}
                      placeholder="usuario"
                      className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowQuickCustomer(false)}
                    className="flex-1 px-6 py-3.5 border border-slate-200 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-xl shadow-slate-900/20"
                  >
                    Cadastrar e Selecionar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
