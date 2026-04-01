import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  X, 
  ShoppingBag, 
  Minus, 
  Plus, 
  Trash2, 
  MessageCircle, 
  Package,
  ChevronLeft,
  ChevronRight,
  Star,
  Flame,
  Zap,
  CheckCircle2,
  AlertCircle,
  Phone,
  AlertTriangle,
  LogIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toNum, formatCurrency } from '../lib/utils';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

// --- Types ---

export type ProductVariation = {
  id: string;
  color: string;
  size: string;
  stock: number;
  brand: string;
};

export type Product = {
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
  is_best_seller?: boolean;
  is_new?: boolean;
  rating?: number;
  short_description?: string;
  image_url: string;
  images?: string[];
  main_image_index?: number;
  variations?: ProductVariation[];
  has_variations?: boolean;
};

export type StoreSettings = {
  id: string;
  nome_loja: string;
  telefone_whatsapp: string;
  mensagem_padrao_whatsapp: string;
  monthly_goal?: number;
  logo_url?: string;
  card_fee?: number;
};

export type CartItem = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  cost: number;
  size: string;
  color: string;
  brand: string;
  variation_id?: string;
  cash_price?: number;
  card_price?: number;
};

// --- Components ---

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl', noPadding = false }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: string; noPadding?: boolean }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`bg-white rounded-xl w-full ${maxWidth} overflow-hidden shadow-2xl border border-slate-200`}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="font-sans font-bold text-slate-800 text-lg tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-all active:scale-90">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className={`${noPadding ? '' : 'p-6'} max-h-[80vh] overflow-y-auto custom-scrollbar`}>
          {children}
        </div>
      </motion.div>
    </div>
  );
};

export const CatalogItem = ({ product, storeSettings, onAddToCart }: any) => {
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
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [showWarning, setShowWarning] = useState(false);

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

  const sizes = useMemo(() => allAvailableSizes.length > 0 ? allAvailableSizes : ['Único'], [allAvailableSizes]);
  const colors = useMemo(() => allAvailableColors.length > 0 ? allAvailableColors : ['Única'], [allAvailableColors]);

  useEffect(() => {
    if (sizes.length === 1 && !selectedSize) {
      setSelectedSize(sizes[0]);
    }
  }, [sizes, selectedSize]);

  useEffect(() => {
    if (selectedSize) {
      const availableColors = Array.from(new Set((product.allVariations || [])
        .filter((v: any) => (v.size || 'Único') === selectedSize && toNum(v.stock) > 0)
        .map((v: any) => v.color || 'Única')));
      
      if (selectedColor && !availableColors.includes(selectedColor)) {
        setSelectedColor('');
      }
      
      if (availableColors.length === 1 && !selectedColor) {
        setSelectedColor(availableColors[0]);
      }
    }
  }, [selectedSize, product.allVariations, selectedColor]);

  const handleAddToCart = () => {
    if (!selectedSize || !selectedColor) {
      setShowWarning(true);
      return;
    }
    
    onAddToCart({
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      unit_price: price,
      cost: toNum(product.cost),
      size: selectedSize,
      color: selectedColor,
      brand: brand,
      variation_id: (product.allVariations || []).find((v: any) => (v.size || 'Único') === selectedSize && (v.color || 'Única') === selectedColor)?.id
    });
  };

  const isMaisVendido = product.is_featured || product.is_best_seller;
  const isNovidade = product.is_new;
  const isUltimasUnidades = toNum(product.totalStock) > 0 && toNum(product.totalStock) <= 3;
  const rating = toNum(product.rating);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl overflow-hidden shadow-soft hover:shadow-elegant transition-all duration-500 border border-gray-100/50 flex flex-col h-full product-card"
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
            whileHover={{ scale: 1.1 }}
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
            className="absolute inset-0 w-full h-full object-cover cursor-grab active:cursor-grabbing transition-transform duration-700"
            referrerPolicy="no-referrer"
          />
        </AnimatePresence>

        {images.length > 1 && (
          <>
            <button 
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover/carousel:opacity-100 transition-all z-10"
            >
              <ChevronLeft className="w-4 h-4 text-midnight" />
            </button>
            <button 
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover/carousel:opacity-100 transition-all z-10"
            >
              <ChevronRight className="w-4 h-4 text-midnight" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {images.map((_: any, i: number) => (
                <div 
                  key={i} 
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === currentImageIndex ? 'bg-champagne w-4' : 'bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}

        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          {isMaisVendido && (
            <span className="bg-midnight text-champagne text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-xl flex items-center gap-1.5">
              <Star className="w-3 h-3 fill-champagne" /> Mais Vendido
            </span>
          )}
          {isNovidade && (
            <span className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-xl">
              Novidade
            </span>
          )}
          {isUltimasUnidades && (
            <span className="bg-rose-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-xl">
              Últimas Unidades
            </span>
          )}
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <div className="mb-4">
          <div className="flex justify-between items-start gap-2 mb-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{brand}</span>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-[10px] font-black text-gray-900">{rating > 0 ? rating.toFixed(1) : '5.0'}</span>
            </div>
          </div>
          <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-midnight transition-colors">{product.name}</h3>
          <p className="text-2xl font-black text-midnight mt-2 tracking-tighter">{formatCurrency(price)}</p>
        </div>

        <div className="space-y-4 mt-auto">
          <div className="flex flex-col gap-3">
            <div>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Tamanho</span>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size: string) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border-2 ${
                      selectedSize === size 
                        ? 'bg-midnight text-white border-midnight shadow-lg shadow-midnight/20' 
                        : 'bg-gray-50 text-gray-500 border-transparent hover:border-gray-200'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Cor</span>
              <div className="flex flex-wrap gap-2">
                {colors.map((color: string) => {
                  const isAvailable = !selectedSize || (product.allVariations || []).some((v: any) => 
                    (v.size || 'Único') === selectedSize && (v.color || 'Única') === color && toNum(v.stock) > 0
                  );
                  
                  return (
                    <button
                      key={color}
                      disabled={!isAvailable}
                      onClick={() => setSelectedColor(color)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border-2 ${
                        selectedColor === color 
                          ? 'bg-midnight text-white border-midnight shadow-lg shadow-midnight/20' 
                          : isAvailable 
                            ? 'bg-gray-50 text-gray-500 border-transparent hover:border-gray-200'
                            : 'bg-gray-100 text-gray-300 border-transparent cursor-not-allowed opacity-50'
                      }`}
                    >
                      {color}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {showWarning && (!selectedSize || !selectedColor) && (
            <p className="text-rose-500 text-[10px] font-bold animate-pulse">
              Selecione tamanho e cor para continuar
            </p>
          )}

          <button 
            onClick={handleAddToCart}
            className="w-full bg-midnight text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-midnight/10 hover:bg-black hover:shadow-midnight/20 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" /> Adicionar ao Pedido
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export const CatalogContent = ({ products, storeSettings, catalogSearch, setCatalogSearch, catalogCategoryFilter, setCatalogCategoryFilter, catalogSizeFilter, setCatalogSizeFilter, catalogColorFilter, setCatalogColorFilter, catalogPriceFilter, setCatalogPriceFilter, showNotification, showConfirm }: any) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const handleAddToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => 
        i.product_id === item.product_id && 
        i.size === item.size && 
        i.color === item.color
      );
      
      if (existing) {
        return prev.map(i => 
          (i.product_id === item.product_id && i.size === item.size && i.color === item.color)
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, item];
    });
    showNotification(`${item.product_name} adicionado ao pedido!`);
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateQuantity = (index: number, delta: number) => {
    setCart(prev => prev.map((item, i) => {
      if (i === index) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

  const handleFinalizeOrder = () => {
    if (cart.length === 0) return;

    let message = `*Novo Pedido*\n\n`;
    cart.forEach(item => {
      message += `- ${item.product_name} | Tam: ${item.size} | Cor: ${item.color} | Qtd: ${item.quantity} | R$ ${(item.unit_price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    });
    message += `\n*Total: R$ ${cartTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*`;

    const whatsappUrl = `https://wa.me/${(storeSettings.telefone_whatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

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
  const availableCategories = Array.from(new Set((products || []).map((p: any) => p.category))).filter(Boolean).sort();

  const filteredCatalog = catalogItems.filter((p: any) => {
    const matchesSearch = (p.name || '').toLowerCase().includes((catalogSearch || '').toLowerCase()) || 
                         (p.brand || '').toLowerCase().includes((catalogSearch || '').toLowerCase()) ||
                         (p.has_variations && p.variations && p.variations.some((v: any) => (v.brand || '').toLowerCase().includes((catalogSearch || '').toLowerCase())));
    const matchesCategory = catalogCategoryFilter === '' || p.category === catalogCategoryFilter;
    const matchesSize = catalogSizeFilter === '' || (p.availableSizes || []).includes(catalogSizeFilter);
    const matchesColor = catalogColorFilter === '' || (p.availableColors || []).includes(catalogColorFilter);
    const matchesPrice = catalogPriceFilter === '' || toNum(p.price) <= Number(catalogPriceFilter);
    return matchesSearch && matchesCategory && matchesSize && matchesColor && matchesPrice;
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
            value={catalogCategoryFilter || ''}
            onChange={(e) => setCatalogCategoryFilter(e.target.value)}
            className="bg-gray-50/50 border border-gray-100 rounded-xl px-4 py-3 text-base font-bold outline-none focus:ring-4 focus:ring-champagne/10 focus:border-champagne min-w-[130px] cursor-pointer transition-all"
          >
            <option value="">Categoria</option>
            {availableCategories.map((cat: any) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
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
          {(catalogSearch || catalogCategoryFilter || catalogSizeFilter || catalogColorFilter || catalogPriceFilter) && (
            <button 
              onClick={() => {
                setCatalogSearch('');
                setCatalogCategoryFilter('');
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
            onAddToCart={handleAddToCart}
          />
        ))}
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-8 right-8 z-40 bg-midnight text-white p-4 rounded-full shadow-2xl flex items-center gap-3 group"
        >
          <div className="relative">
            <ShoppingBag className="w-6 h-6" />
            <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-midnight">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>
          <span className="font-bold text-sm pr-2 hidden group-hover:block transition-all">Ver Pedido</span>
        </motion.button>
      )}

      {/* Cart Modal */}
      <Modal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        title="Seu Pedido"
        maxWidth="max-w-md"
      >
        <div className="space-y-6">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-bold">Seu pedido está vazio.</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                {cart.map((item, index) => (
                  <div key={index} className="flex gap-4 p-3 bg-gray-50 rounded-2xl border border-gray-100 group">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 text-sm truncate">{item.product_name}</h4>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                        {item.brand} • {item.size} • {item.color}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
                          <button 
                            onClick={() => handleUpdateQuantity(index, -1)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-black w-6 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => handleUpdateQuantity(index, 1)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-sm font-black text-midnight">
                          {formatCurrency(item.unit_price * item.quantity)}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveFromCart(index)}
                      className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all self-start"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-gray-100 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Total do Pedido</span>
                  <span className="text-2xl font-black text-midnight tracking-tighter">
                    {formatCurrency(cartTotal)}
                  </span>
                </div>
                
                <button
                  onClick={handleFinalizeOrder}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <MessageCircle className="w-5 h-5" /> Finalizar no WhatsApp
                </button>
                
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-full text-gray-400 font-bold text-[10px] uppercase tracking-widest hover:text-gray-600 transition-colors"
                >
                  Continuar Escolhendo
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
      
      {filteredCatalog.length === 0 && (
        <div className="text-center py-32 bg-white rounded-3xl border border-dashed border-gray-200">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-gray-200" />
          </div>
          <p className="text-gray-500 font-bold">Nenhum produto encontrado.</p>
          <p className="text-gray-400 text-sm mt-1">Tente ajustar seus filtros para encontrar o que procura.</p>
        </div>
      )}
    </div>
  );
};

export const CatalogPage = ({ hideAdminLink = false }: { hideAdminLink?: boolean }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({ 
    id: 'default', 
    nome_loja: 'Brisa 31', 
    telefone_whatsapp: '',
    mensagem_padrao_whatsapp: 'Olá! Tenho interesse neste produto: {nome_produto} - R$ {preco_produto}',
    monthly_goal: 10000,
    logo_url: '',
    card_fee: 3.5
  });
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('');
  const [catalogSizeFilter, setCatalogSizeFilter] = useState('');
  const [catalogColorFilter, setCatalogColorFilter] = useState('');
  const [catalogPriceFilter, setCatalogPriceFilter] = useState<number | ''>('');
  const [notifications, setNotifications] = useState<{ id: number; message: string; type: string }[]>([]);

  const showNotification = (message: string, type: string = 'success') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'produtos'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setProducts(data);
    });

    const unsubConfig = onSnapshot(collection(db, 'configuracoes'), (snap) => {
      if (!snap.empty) {
        setStoreSettings({ id: snap.docs[0].id, ...snap.docs[0].data() } as any);
      }
    });

    return () => {
      unsubProducts();
      unsubConfig();
    };
  }, []);

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
          {!hideAdminLink && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  window.history.pushState({}, '', '/sistema');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="text-sm text-champagne/70 font-medium flex items-center gap-1 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors"
              >
                <LogIn className="w-4 h-4" /> <span className="hidden sm:inline">Acesso Restrito</span>
              </button>
            </div>
          )}
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
          catalogCategoryFilter={catalogCategoryFilter}
          setCatalogCategoryFilter={setCatalogCategoryFilter}
          catalogSizeFilter={catalogSizeFilter}
          setCatalogSizeFilter={setCatalogSizeFilter}
          catalogColorFilter={catalogColorFilter}
          setCatalogColorFilter={setCatalogColorFilter}
          catalogPriceFilter={catalogPriceFilter}
          setCatalogPriceFilter={setCatalogPriceFilter}
          showNotification={showNotification}
        />
      </main>

      <AnimatePresence>
        {notifications.map(n => (
          <motion.div key={n.id} initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-midnight text-white px-6 py-3 rounded-full shadow-2xl text-xs font-bold">
            {n.message}
          </motion.div>
        ))}
      </AnimatePresence>

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
};
