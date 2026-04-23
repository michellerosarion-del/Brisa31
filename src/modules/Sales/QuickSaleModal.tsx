import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Package, ShoppingBag, Search, Trash2, Minus, Plus, User as UserIcon, CheckCircle2, ChevronDown, CreditCard, TrendingUp } from 'lucide-react';
import { formatCurrency, toNum, formatPercent } from '../../lib/utils';
import { Product, Sale, Seller, StoreSettings } from '../../types';

interface QuickSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSale: Sale | null;
  setEditingSale: (sale: Sale | null) => void;
  cart: any[];
  setCart: React.Dispatch<React.SetStateAction<any[]>>;
  saleDiscount: number;
  setSaleDiscount: (val: number) => void;
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
    feePercentage?: number
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
  const [paymentMethod, setPaymentMethod] = React.useState<string>(editingSale?.payment_method || 'pix');
  const [installments, setInstallments] = React.useState<number>(editingSale?.installments || 1);
  const [visibleCount, setVisibleCount] = React.useState(30);
  const [manualFinalValue, setManualFinalValue] = React.useState<string>('');
  const [sellerName, setSellerName] = React.useState<string>(editingSale?.seller_name || '');
  const [onlyInStock, setOnlyInStock] = React.useState(true);
  const [selectedCategory, setSelectedCategory] = React.useState<string>('todos');
  const [receivedAmount, setReceivedAmount] = React.useState<string>('');
  const [activeTab, setActiveTab] = React.useState<'products' | 'cart'>('products');
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const categories = React.useMemo(() => {
    const distinct = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return ['todos', ...distinct];
  }, [products]);

  const bestSellers = React.useMemo(() => {
    return products
      .filter(p => p.is_best_seller || p.is_featured)
      .filter(p => p.status !== 'inativo')
      .slice(0, 8);
  }, [products]);

  const filteredProducts = React.useMemo(() => {
    const term = searchTerm.toLowerCase();
    let filtered = products.filter(p => 
      (p.status !== 'inativo') && (
        p.name.toLowerCase().includes(term) || 
        p.brand.toLowerCase().includes(term) ||
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
      setPaymentMethod(editingSale.payment_method || 'pix');
      setInstallments(editingSale.installments || 1);
      setSellerName(editingSale.seller_name || '');
      
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
      setPaymentMethod('pix');
      setInstallments(1);
      setManualFinalValue('');
      setSellerName('');
    }
  }, [editingSale, isOpen]);

  const subtotal = cart.filter(i => i.status !== 'cancelado').reduce((sum, item) => sum + (toNum(item.unit_price) * toNum(item.quantity)), 0);
  const totalCost = cart.filter(i => i.status !== 'cancelado').reduce((sum, item) => sum + ((toNum(item.cost) + toNum(item.frete)) * toNum(item.quantity)), 0);
  const discountAmount = saleDiscountType === 'percentage' ? (subtotal * (toNum(saleDiscount) / 100)) : toNum(saleDiscount);
  const baseFinalValue = Math.max(0, subtotal - discountAmount);

  // Manual override logic
  const effectiveGrossValue = manualFinalValue !== '' ? toNum(manualFinalValue) : baseFinalValue;

  // Fee calculation
  let feePercentage = 0;
  if (paymentMethod === 'debito') {
    feePercentage = toNum(storeSettings?.debit_fee);
  } else if (paymentMethod === 'credito') {
    if (installments === 1) {
      feePercentage = toNum(storeSettings?.card_fee);
    } else {
      const feeConfig = storeSettings?.taxasParcelamento?.find(t => t.installments === installments);
      feePercentage = feeConfig ? toNum(feeConfig.fee) : 0;
    }
  }

  const effectiveFeeValue = effectiveGrossValue * (feePercentage / 100);
  const effectiveNetValue = effectiveGrossValue - effectiveFeeValue;
  const estimatedProfit = effectiveNetValue - totalCost;

  const content = (
    <div className={`bg-white rounded-xl shadow-lg w-full h-full overflow-hidden flex flex-col border border-slate-200`}>
      {/* Header - Compact */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center shrink-0 shadow-md shadow-slate-900/10">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight uppercase leading-none">
              {editingSale ? 'Editar Venda' : 'Sistema PDV - Balcão'}
            </h3>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-1">
              Terminal Operacional #{new Date().getHours()}{new Date().getMinutes()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end mr-4">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Loja Aberta</span>
            <span className="text-xs font-semibold text-slate-900 uppercase">{new Date().toLocaleDateString('pt-BR')}</span>
          </div>
          <button 
            onClick={() => {
              onClose();
              setEditingSale(null);
              setCart([]);
              setSaleDiscount(0);
            }}
            className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-100"
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
          <div className="p-4 space-y-4 bg-white border-b border-slate-100 shadow-sm z-10">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar pelo nome ou código..."
                  className="w-full pl-12 pr-4 h-11 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-slate-900 focus:bg-white transition-all placeholder:text-slate-400"
                  onChange={(e) => setSearchTerm(e.target.value)}
                  value={searchTerm || ''}
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select 
                    value={selectedCustomerId || ''}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full h-11 pl-12 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none appearance-none hover:bg-slate-100 focus:border-slate-900 transition-all uppercase"
                  >
                    <option value="">CONSUMIDOR FINAL</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <button 
                  onClick={() => setOnlyInStock(!onlyInStock)}
                  className={`px-5 h-11 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${onlyInStock ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/10' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                >
                  ESTOQUE
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`whitespace-nowrap px-4 h-8 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${
                    selectedCategory === cat 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
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
            className="flex-1 overflow-y-auto p-4 custom-scrollbar"
            onScroll={handleScroll}
          >
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xxl:grid-cols-5 gap-3">
              {displayedProducts.map(product => {
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
                      className={`group bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-4 transition-all ${totalStock <= 0 ? 'opacity-30 grayscale' : 'hover:border-slate-900 hover:shadow-lg hover:shadow-slate-900/5'}`}
                    >
                      <div className="space-y-1">
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{product.brand || 'ESSENCIAL'}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${totalStock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-400'}`}>
                            {totalStock > 0 ? `${totalStock} UN` : 'SEM STOCK'}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-xs leading-tight uppercase h-8 line-clamp-2">{product.name}</h4>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-[10px] font-semibold text-slate-400">R$</span>
                          <span className={`text-xl font-bold tracking-tight ${priceType === 'pix' ? 'text-emerald-600' : 'text-slate-900'}`}>
                            {formatCurrency(currentPrice).replace('R$', '').trim()}
                          </span>
                        </div>
                      </div>

                      <div className="mt-auto">
                        {product.has_variations && product.variations ? (
                          <div className="grid grid-cols-2 gap-1.5 focus-within:z-10 relative">
                            {product.variations.map((v, idx) => {
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
                                  className={`h-10 rounded-lg border text-[10px] font-bold transition-all flex items-center justify-between px-3 ${
                                    availableStock > 0 ? 'bg-slate-50 border-slate-100 hover:bg-slate-900 hover:text-white hover:border-slate-900 active:scale-95' : 'bg-slate-50 text-slate-200 border-transparent'
                                  }`}
                                >
                                  <span>{v.tamanho}</span>
                                  <span className="opacity-40">({availableStock})</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <button 
                            disabled={totalStock <= 0}
                            onClick={() => {
                              if (totalStock <= 0) return;
                              const existing = cart.find(item => item.product_id === product.id);
                              if (existing) {
                                setCart(prev => prev.map(item => item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
                              } else {
                                setCart(prev => [...prev, {
                                  product_id: product.id, product_name: product.name, quantity: 1, unit_price: currentPrice, cost: toNum(product.cost), frete: toNum(product.frete),
                                  tamanho: product.tamanho || 'Único', cor: product.cor || 'Única', brand: product.brand
                                }]);
                              }
                            }}
                            className="w-full h-11 bg-slate-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all disabled:bg-slate-50 disabled:text-slate-300 shadow-sm active:scale-95"
                          >
                            {totalStock > 0 ? 'ADICIONAR ITEM' : 'ESGOTADO'}
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
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 z-10">
            <div className="flex items-center gap-4">
              <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-md">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm uppercase tracking-widest leading-none mb-1">Conferência</h4>
                <p className="text-[10px] font-medium text-slate-500 uppercase">Itens da venda atual</p>
              </div>
            </div>
            <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-[10px] font-bold border border-blue-200">
              {cart.reduce((sum, i) => sum + i.quantity, 0)} UNIDADES
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
                          <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md uppercase tracking-widest">TAM: {item.tamanho}</span>
                          <span className="text-[9px] font-medium text-slate-400 uppercase">{item.brand}</span>
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
          <div className="shrink-0 bg-white border-t border-slate-200 px-6 py-5 space-y-4 shadow-[0_-10px_40px_rgba(0,0,0,0.04)] z-50">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Atendimento</label>
                <select 
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:border-slate-900 transition-all uppercase"
                >
                  <option value="">BALCÃO PADRÃO</option>
                  {sellers.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Pagamento</label>
                <select 
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:border-slate-900 transition-all uppercase"
                  value={paymentMethod}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                    if (e.target.value !== 'credito') setInstallments(1);
                  }}
                >
                  <option value="pix">PIX</option>
                  <option value="dinheiro">DINHEIRO</option>
                  <option value="debito">DÉBITO</option>
                  <option value="credito">CRÉDITO</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Desconto</label>
                <div className="flex gap-2 h-11">
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={saleDiscount ?? 0}
                    onChange={(e) => setSaleDiscount(toNum(e.target.value))}
                    className="flex-1 px-4 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:border-slate-900 transition-all"
                  />
                  <select 
                    value={saleDiscountType || 'value'}
                    onChange={(e) => setSaleDiscountType(e.target.value as 'value' | 'percentage')}
                    className="w-14 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-center"
                  >
                    <option value="value">R$</option>
                    <option value="percentage">%</option>
                  </select>
                </div>
              </div>
              {paymentMethod === 'credito' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Condição</label>
                  <select 
                    value={installments}
                    onChange={(e) => setInstallments(toNum(e.target.value))}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:border-slate-900 transition-all uppercase"
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                      <option key={n} value={n}>{n}X S/ JUROS</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Financial Summary */}
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">
                <span>Base Bruta</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-rose-500 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100">
                  <span>Desconto aplicado</span>
                  <span className="font-semibold text-rose-600">- {formatCurrency(discountAmount)}</span>
                </div>
              )}
              
              <div className="flex flex-col pt-3 mt-1 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 px-1">Valor Total</span>
                <div className="flex items-baseline gap-1.5 px-1">
                  <span className="text-sm font-bold text-slate-400">R$</span>
                  <span className="text-4xl font-bold text-slate-900 tracking-tight leading-none">
                    {formatCurrency(effectiveGrossValue).replace('R$', '').trim()}
                  </span>
                </div>
              </div>

              {effectiveFeeValue > 0 && (
                <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5">
                  <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-slate-500">
                    <span>Taxa ({feePercentage.toFixed(2)}%)</span>
                    <span className="text-rose-500 font-semibold">{formatCurrency(effectiveFeeValue)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-slate-900 pt-1.5 border-t border-slate-200/50">
                    <span>Líquido a Receber</span>
                    <span className="text-emerald-600 font-bold">{formatCurrency(effectiveNetValue)}</span>
                  </div>
                </div>
              )}

              {paymentMethod === 'dinheiro' && (
                <div className="mt-2 space-y-2.5 p-4 bg-slate-900 rounded-xl shadow-lg">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Valor Recebido</label>
                    <input 
                      type="text"
                      inputMode="decimal"
                      value={receivedAmount}
                      onChange={(e) => setReceivedAmount(e.target.value)}
                      placeholder="0,00"
                      className="w-24 h-9 px-3 bg-white/10 border-none rounded-lg text-right text-sm font-bold text-white outline-none focus:bg-white/20 transition-all"
                    />
                  </div>
                  {toNum(receivedAmount) > 0 && (
                    <div className="flex justify-between items-center pt-2.5 border-t border-white/10">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Troco</span>
                      <div className="flex items-baseline gap-1">
                         <span className="text-xs font-semibold text-emerald-400">R$</span>
                         <span className={`text-2xl font-bold ${toNum(receivedAmount) - effectiveGrossValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatCurrency(Math.max(0, toNum(receivedAmount) - effectiveGrossValue)).replace('R$', '').trim()}
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
                disabled={cart.length === 0}
                onClick={() => {
                  const customer = customers.find(c => c.id === selectedCustomerId);
                  handleCompleteSale(paymentMethod, sellerName || 'Vendedor Padrão', effectiveGrossValue, selectedCustomerId, customer?.name, installments, effectiveGrossValue, effectiveNetValue, effectiveFeeValue, feePercentage);
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
                  setSaleDiscount(0);
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-0 md:p-6 lg:p-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full h-full max-w-[1600px] flex items-center justify-center"
          >
            {content}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
