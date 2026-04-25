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
  LogIn,
  LayoutDashboard,
  Truck,
  CreditCard,
  Wallet,
  MapPin,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toNum, formatCurrency } from '../lib/utils';
import { db } from '../firebase';
import { collection, getDocs, orderBy, query, limit, where } from 'firebase/firestore';

// --- Types ---

export type ProductVariation = {
  id: string;
  cor: string;
  tamanho: string;
  estoque: number;
  brand?: string;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  brand: string;
  code: string;
  cor: string;
  tamanho: string;
  cost: number;
  price: number;
  cash_price?: number;
  card_price?: number;
  promo_price?: number;
  status?: 'ativo' | 'inativo';
  stock: number;
  min_stock: number;
  is_featured?: boolean;
  is_best_seller?: boolean;
  is_new?: boolean;
  is_low_stock_manual?: boolean;
  is_promo_manual?: boolean;
  rating?: number;
  short_description?: string;
  images: string[];
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
  low_stock_alert_enabled?: boolean;
  low_stock_threshold?: number;
};

export type CartItem = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  cost: number;
  tamanho: string;
  cor: string;
  brand: string;
  variation_id?: string;
  cash_price?: number;
  card_price?: number;
};

// --- Components ---

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl', noPadding = false }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: string; noPadding?: boolean }) => {
  if (!isOpen) return null;
  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/50 backdrop-blur-sm pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
    >
      <motion.div 
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`bg-white rounded-xl w-full ${maxWidth} overflow-hidden shadow-2xl border border-slate-200`}
      >
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="font-sans font-bold text-slate-800 text-base sm:text-lg tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-all active:scale-90">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className={`${noPadding ? '' : 'p-4 sm:p-6'} max-h-[85vh] overflow-y-auto custom-scrollbar`}>
          {children}
        </div>
      </motion.div>
    </div>
  );
};

export const CatalogItem = ({ product, storeSettings, onAddToCart, onClick }: any) => {
  const getImages = (p: any) => {
    if (p.allImages && Array.isArray(p.allImages) && p.allImages.length > 0) return p.allImages;
    if (p.images && Array.isArray(p.images) && p.images.length > 0) return p.images;
    return [`https://picsum.photos/seed/${p.id}/400/400`];
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
  const brand = product.brand || 'Brisa 31 | Moda Masculina';

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
        .filter((v: any) => (v.tamanho || 'Único') === selectedSize && toNum(v.estoque) > 0)
        .map((v: any) => v.cor || 'Única')));
      
      if (selectedColor && !availableColors.includes(selectedColor)) {
        setSelectedColor('');
      }
      
      if (availableColors.length === 1 && !selectedColor) {
        setSelectedColor(availableColors[0] as string);
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
      tamanho: selectedSize,
      cor: selectedColor,
      brand: brand,
      variation_id: (product.allVariations || []).find((v: any) => (v.tamanho || 'Único') === selectedSize && (v.cor || 'Única') === selectedColor)?.id
    });
  };

  const isMaisVendido = product.is_featured || product.is_best_seller;
  const isNovidade = product.is_new;
  const isUltimasUnidades = product.is_low_stock_manual || (storeSettings.low_stock_alert_enabled && 
    toNum(product.totalStock) > 0 && 
    toNum(product.totalStock) <= (product.min_stock !== undefined ? toNum(product.min_stock) : toNum(storeSettings.low_stock_threshold || 3)));
  const isPromo = product.is_promo_manual || toNum(product.promo_price) > 0;
  const isEsgotado = toNum(product.totalStock) <= 0;
  const rating = toNum(product.rating);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onClick(product)}
      className={`bg-white rounded-2xl overflow-hidden shadow-soft hover:shadow-elegant transition-all duration-500 border border-gray-100/50 flex flex-col h-full product-card cursor-pointer ${isEsgotado ? 'opacity-75 grayscale-[0.5]' : ''}`}
    >
      <div className="w-full aspect-square bg-gray-50 relative overflow-hidden flex items-center justify-center group/carousel">
        <AnimatePresence initial={false} custom={direction} mode="wait">
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
            className="absolute inset-0 w-full h-full object-contain cursor-grab active:cursor-grabbing"
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
              {images.map((img: string, i: number) => (
                <div 
                  key={`${img}-${i}`} 
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === currentImageIndex ? 'bg-champagne w-4' : 'bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}

        <div className="absolute top-2 left-2 sm:top-4 sm:left-4 flex flex-col gap-1.5 sm:gap-2 z-10">
          {isEsgotado ? (
            <span className="bg-gray-900 text-white text-[8px] sm:text-[10px] font-black px-2 py-1 sm:px-3 sm:py-1.5 rounded-full uppercase tracking-widest shadow-xl">
              Esgotado
            </span>
          ) : (
            <>
              {isMaisVendido && (
                <span className="bg-midnight text-champagne text-[8px] sm:text-[10px] font-black px-2 py-1 sm:px-3 sm:py-1.5 rounded-full uppercase tracking-widest shadow-xl flex items-center gap-1 sm:gap-1.5">
                  <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-champagne" /> Mais Vendido
                </span>
              )}
              {isNovidade && (
                <span className="bg-emerald-500 text-white text-[8px] sm:text-[10px] font-black px-2 py-1 sm:px-3 sm:py-1.5 rounded-full uppercase tracking-widest shadow-xl">
                  Novidade
                </span>
              )}
              {isUltimasUnidades && (
                <span className="bg-rose-500 text-white text-[8px] sm:text-[10px] font-black px-2 py-1 sm:px-3 sm:py-1.5 rounded-full uppercase tracking-widest shadow-xl">
                  Últimas Unidades
                </span>
              )}
              {isPromo && (
                <span className="bg-amber-500 text-white text-[8px] sm:text-[10px] font-black px-2 py-1 sm:px-3 sm:py-1.5 rounded-full uppercase tracking-widest shadow-xl flex items-center gap-1">
                  <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Promoção
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <div className="p-3 sm:p-6 flex flex-col flex-1">
        <div className="mb-2 sm:mb-4">
          <div className="flex justify-between items-start gap-1 mb-1">
            <span className="text-[8px] sm:text-[10px] font-black text-slate-700 uppercase tracking-widest">{brand}</span>
            <div className="flex items-center gap-1">
              <Star className="w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 text-amber-500 fill-amber-500" />
              <span className="text-[8px] sm:text-[10px] font-black text-slate-950">{rating > 0 ? rating.toFixed(1) : '5.0'}</span>
            </div>
          </div>
          <h3 className="text-xs sm:text-lg font-bold text-slate-900 leading-tight group-hover:text-midnight transition-colors line-clamp-2">{product.name}</h3>
          <p className="text-base sm:text-2xl font-black text-slate-950 mt-1 sm:mt-2 tracking-tighter">{formatCurrency(price)}</p>
        </div>

        <div className="space-y-3 sm:space-y-4 mt-auto">
          <div className="flex flex-col gap-2 sm:gap-3">
            <div>
              <span className="text-[8px] sm:text-[10px] font-black text-slate-800 uppercase tracking-widest block mb-1 sm:mb-2 text-left">Tam.</span>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                {sizes.map((size: string) => {
                  const hasRegistration = (product.allVariations || []).some((v: any) => (v.tamanho || 'Único') === size);
                  const isSizeAvailable = (product.allVariations || []).some((v: any) => 
                    (v.tamanho || 'Único') === size && toNum(v.estoque) > 0
                  );
                  return (
                    <button
                      key={size}
                      disabled={!hasRegistration}
                      onClick={() => setSelectedSize(size)}
                      className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-[11px] font-black transition-all border-2 ${
                        selectedSize === size 
                          ? 'bg-midnight text-white border-midnight shadow-lg shadow-midnight/20' 
                          : isSizeAvailable || isEsgotado
                            ? 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'
                            : 'bg-slate-50 text-slate-400 border-transparent cursor-not-allowed opacity-50'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest block mb-2">Cor</span>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {colors.map((color: string) => {
                  const hasRegistration = !selectedSize || (product.allVariations || []).some((v: any) => 
                    (v.tamanho || 'Único') === selectedSize && (v.cor || 'Única') === color
                  );
                  const isAvailable = !selectedSize || (product.allVariations || []).some((v: any) => 
                    (v.tamanho || 'Único') === selectedSize && (v.cor || 'Única') === color && toNum(v.estoque) > 0
                  );
                  
                  return (
                    <button
                      key={color}
                      disabled={!hasRegistration}
                      onClick={() => setSelectedColor(color)}
                      className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-[11px] font-black transition-all border-2 ${
                        selectedColor === color 
                          ? 'bg-midnight text-white border-midnight shadow-lg shadow-midnight/20' 
                          : isAvailable || isEsgotado
                            ? 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'
                            : 'bg-slate-50 text-slate-400 border-transparent cursor-not-allowed opacity-50'
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
            <p className="text-rose-500 text-[9px] sm:text-[10px] font-bold animate-pulse">
              Selecione tamanho e cor para continuar
            </p>
          )}

          <div className="flex gap-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleAddToCart();
              }}
              disabled={isEsgotado}
              className={`flex-1 py-3 sm:py-4 rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-1 sm:gap-2 ${
                isEsgotado 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                  : 'bg-midnight text-champagne hover:bg-black shadow-midnight/20'
              }`}
            >
              <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4" /> 
              {isEsgotado ? 'Esgotado' : 'Carrinho'}
            </button>
            {!isEsgotado && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (!selectedSize || !selectedColor) {
                    setShowWarning(true);
                    return;
                  }
                  const whatsappNumber = storeSettings.telefone_whatsapp?.replace(/\D/g, '') || '5511999999999';
                  let text = storeSettings.mensagem_padrao_whatsapp || 'Olá! Tenho interesse neste produto: {nome_produto} - R$ {preco_produto}';
                  text = text.replace('{nome_produto}', product.name)
                             .replace('{preco_produto}', formatCurrency(price))
                             .replace('{marca}', brand)
                             .replace('{tamanho}', selectedSize)
                             .replace('{cor}', selectedColor);
                  
                  if (!text.includes(selectedSize)) {
                    text += `\n\n*Tamanho:* ${selectedSize}\n*Cor:* ${selectedColor}`;
                  }

                  window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="flex-1 py-3 sm:py-4 rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-1 sm:gap-2 bg-champagne text-midnight hover:brightness-110 shadow-champagne/20"
              >
                <Zap className="w-3 h-3 sm:w-4 sm:h-4 fill-midnight" /> Comprar
              </button>
            )}
          </div>
        </div>
      </div>

    </motion.div>
  );
};

export const ProductDetailsModal = ({ product, isOpen, onClose, onAddToCart, storeSettings }: any) => {
  const getImages = (p: any) => {
    if (p.allImages && Array.isArray(p.allImages) && p.allImages.length > 0) return p.allImages;
    if (p.images && Array.isArray(p.images) && p.images.length > 0) return p.images;
    return [`https://picsum.photos/seed/${p.id}/400/400`];
  };

  const images = getImages(product || {});
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (product) {
      setCurrentImageIndex(product?.main_image_index || 0);
      setSelectedSize('');
      setSelectedColor('');
      setShowWarning(false);
    }
  }, [product]);

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

  const allAvailableColors = product?.availableColors || [];
  const allAvailableSizes = product?.availableSizes || [];

  const price = toNum(product?.price);
  const brand = product?.brand || 'Brisa 31 | Moda Masculina';

  const sizes = useMemo(() => allAvailableSizes.length > 0 ? allAvailableSizes : ['Único'], [allAvailableSizes]);
  const colors = useMemo(() => allAvailableColors.length > 0 ? allAvailableColors : ['Única'], [allAvailableColors]);

  useEffect(() => {
    if (sizes.length === 1 && !selectedSize) {
      setSelectedSize(sizes[0]);
    }
  }, [sizes, selectedSize]);

  useEffect(() => {
    if (selectedSize && product) {
      const allColors = Array.from(new Set((product?.allVariations || [])
        .filter((v: any) => (v.tamanho || 'Único') === selectedSize)
        .map((v: any) => v.cor || 'Única')));
      
      const availableColors = Array.from(new Set((product?.allVariations || [])
        .filter((v: any) => (v.tamanho || 'Único') === selectedSize && toNum(v.estoque) > 0)
        .map((v: any) => v.cor || 'Única')));
      
      if (selectedColor && !allColors.includes(selectedColor)) {
        setSelectedColor('');
      }
      
      if (availableColors.length === 1 && !selectedColor) {
        setSelectedColor(availableColors[0] as string);
      }
    }
  }, [selectedSize, product, selectedColor]);

  const handleAddToCart = (buyNow = false) => {
    if (!selectedSize || !selectedColor) {
      setShowWarning(true);
      return;
    }
    
    onAddToCart({
      product_id: product?.id,
      product_name: product?.name,
      quantity: 1,
      unit_price: price,
      cost: toNum(product?.cost),
      tamanho: selectedSize,
      cor: selectedColor,
      brand: brand,
      variation_id: (product?.allVariations || []).find((v: any) => (v.tamanho || 'Único') === selectedSize && (v.cor || 'Única') === selectedColor)?.id
    });

    if (buyNow) {
      const whatsappNumber = storeSettings?.telefone_whatsapp?.replace(/\D/g, '') || '5511999999999';
      let text = storeSettings?.mensagem_padrao_whatsapp || 'Olá! Tenho interesse neste produto: {nome_produto} - R$ {preco_produto}';
      text = text.replace('{nome_produto}', product?.name || '')
                 .replace('{preco_produto}', formatCurrency(price))
                 .replace('{marca}', brand)
                 .replace('{tamanho}', selectedSize)
                 .replace('{cor}', selectedColor);
      
      if (!text.includes(selectedSize)) {
        text += `\n\n*Tamanho:* ${selectedSize}\n*Cor:* ${selectedColor}`;
      }

      window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`, '_blank');
      onClose();
    } else {
      onClose();
    }
  };

  // if (!product) return null; // Removed to force rendering as per request

  const isEsgotado = toNum(product?.totalStock) <= 0;
  const isMaisVendido = product?.is_featured || product?.is_best_seller;
  const isNovidade = product?.is_new;
  const isUltimasUnidades = product?.is_low_stock_manual || (storeSettings?.low_stock_alert_enabled && 
    toNum(product?.totalStock) > 0 && 
    toNum(product?.totalStock) <= (product?.min_stock !== undefined ? toNum(product?.min_stock) : toNum(storeSettings?.low_stock_threshold || 3)));
  const isPromo = product?.is_promo_manual || toNum(product?.promo_price) > 0;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4 bg-slate-900/90 backdrop-blur-md pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="bg-white w-full max-w-5xl sm:rounded-3xl shadow-2xl flex flex-col md:grid md:grid-cols-2 relative h-[100dvh] sm:h-[90vh] md:h-[85vh] max-h-screen sm:max-h-[90vh] overflow-hidden"
          >
            {/* Close Button / Back */}
            <button 
              onClick={onClose}
              className="absolute top-4 left-4 z-50 bg-white/80 backdrop-blur-md p-3 rounded-full shadow-lg hover:bg-white transition-all active:scale-90 md:hidden"
            >
              <ArrowLeft className="w-6 h-6 text-midnight" />
            </button>

            <button 
              onClick={onClose}
              className="absolute top-6 right-6 z-50 bg-white/80 backdrop-blur-md p-2 rounded-xl shadow-lg hover:bg-white transition-all active:scale-90 hidden md:flex"
            >
              <X className="w-6 h-6 text-midnight" />
            </button>

            {/* Image Section */}
            <div className="w-full bg-gray-50 relative overflow-hidden flex items-center justify-center h-[35vh] sm:h-[45vh] md:h-full shrink-0">
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.img 
                  key={currentImageIndex}
                  src={images[currentImageIndex] || `https://picsum.photos/seed/${product?.id}/800/1000`} 
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
                  alt={product?.name}
                  className="w-full h-full object-contain cursor-grab active:cursor-grabbing"
                  referrerPolicy="no-referrer"
                />
              </AnimatePresence>

              {images.length > 1 && (
                <>
                  <button 
                    onClick={handlePrev}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all z-10 hidden md:flex"
                  >
                    <ChevronLeft className="w-6 h-6 text-midnight" />
                  </button>
                  <button 
                    onClick={handleNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all z-10 hidden md:flex"
                  >
                    <ChevronRight className="w-6 h-6 text-midnight" />
                  </button>
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {images.map((img: string, i: number) => (
                      <div 
                        key={`${img}-${i}`} 
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === currentImageIndex ? 'bg-champagne w-5' : 'bg-white/50'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Info Section */}
            <div className="w-full flex flex-col bg-white h-full min-h-0 relative">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 custom-scrollbar">
                <div className="mb-4 sm:mb-6">
                  <div className="flex items-center gap-2 mb-2 sm:mb-3">
                    <span className="text-[8px] sm:text-[10px] font-black text-slate-800 uppercase tracking-widest">{brand}</span>
                    <div className="h-1 w-1 bg-slate-300 rounded-full" />
                    <span className="text-[8px] sm:text-[10px] font-black text-slate-800 uppercase tracking-widest">{product?.category}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-black text-slate-950 mb-1 sm:mb-2 leading-tight">{product?.name}</h2>
                  <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <p className="text-xl sm:text-2xl font-black text-slate-950 tracking-tighter">{formatCurrency(price)}</p>
                    <div className="flex items-center gap-1 bg-amber-100 px-2 py-0.5 sm:py-1 rounded-lg">
                      <Star className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-amber-600 fill-amber-600" />
                      <span className="text-[10px] sm:text-xs font-black text-amber-900">{toNum(product?.rating) > 0 ? toNum(product?.rating).toFixed(1) : '5.0'}</span>
                    </div>
                  </div>
                  {product?.short_description && (
                    <p className="text-slate-700 leading-relaxed text-xs sm:text-sm font-medium">{product?.short_description}</p>
                  )}
                </div>

                <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
                  {/* Size Selection */}
                  <div>
                    <div className="flex justify-between items-center mb-2 sm:mb-3">
                      <span className="text-[9px] sm:text-[10px] font-black text-gray-900 uppercase tracking-widest">Tamanho</span>
                      <button className="text-[8px] sm:text-[9px] font-bold text-midnight uppercase tracking-widest underline decoration-champagne underline-offset-4">Guia de Medidas</button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {sizes.map((size: string) => {
                        const hasRegistration = (product?.allVariations || []).some((v: any) => (v.tamanho || 'Único') === size);
                        const isSizeAvailable = (product?.allVariations || []).some((v: any) => 
                          (v.tamanho || 'Único') === size && toNum(v.estoque) > 0
                        );
                        return (
                          <button
                            key={size}
                            disabled={!hasRegistration}
                            onClick={() => setSelectedSize(size)}
                            className={`min-w-[40px] sm:min-w-[48px] h-10 sm:h-12 rounded-xl text-[10px] sm:text-xs font-black transition-all border-2 flex items-center justify-center ${
                              selectedSize === size 
                                ? 'bg-midnight text-white border-midnight shadow-lg shadow-midnight/20' 
                                : isSizeAvailable || isEsgotado
                                  ? 'bg-white text-gray-900 border-gray-100 hover:border-gray-300'
                                  : 'bg-gray-50 text-gray-300 border-transparent cursor-not-allowed opacity-50'
                            }`}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Color Selection */}
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-black text-gray-900 uppercase tracking-widest block mb-2 sm:mb-3">Cor</span>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {colors.map((color: string) => {
                        const hasRegistration = !selectedSize || (product?.allVariations || []).some((v: any) => 
                          (v.tamanho || 'Único') === selectedSize && (v.cor || 'Única') === color
                        );
                        const isAvailable = !selectedSize || (product?.allVariations || []).some((v: any) => 
                          (v.tamanho || 'Único') === selectedSize && (v.cor || 'Única') === color && toNum(v.estoque) > 0
                        );
                        
                        return (
                          <button
                            key={color}
                            disabled={!hasRegistration}
                            onClick={() => setSelectedColor(color)}
                            className={`px-3 sm:px-4 h-10 sm:h-12 rounded-xl text-[10px] sm:text-xs font-black transition-all border-2 flex items-center justify-center ${
                              selectedColor === color 
                                ? 'bg-midnight text-white border-midnight shadow-lg shadow-midnight/20' 
                                : isAvailable || isEsgotado
                                  ? 'bg-white text-gray-900 border-gray-100 hover:border-gray-300'
                                  : 'bg-gray-50 text-gray-300 border-transparent cursor-not-allowed opacity-50'
                            }`}
                          >
                            {color}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Delivery & Payment Info */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-6">
                  <div className="p-2 sm:p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-1.5 sm:gap-2">
                    <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-midnight shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[8px] sm:text-[9px] font-black text-gray-900 uppercase tracking-widest mb-0.5">Entrega</h4>
                      <p className="text-[8px] text-gray-500 font-medium leading-tight">Receba hoje.</p>
                    </div>
                  </div>
                  <div className="p-2 sm:p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-1.5 sm:gap-2">
                    <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-midnight shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[8px] sm:text-[9px] font-black text-gray-900 uppercase tracking-widest mb-0.5">Pagamento</h4>
                      <p className="text-[8px] text-gray-500 font-medium leading-tight">Cartão ou PIX.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Purchase Buttons - ALWAYS VISIBLE AT BOTTOM */}
              <div className="p-3 sm:p-4 md:p-6 bg-white border-t border-gray-100 shrink-0 z-10">
                <div className="max-w-full sm:max-w-[90%] mx-auto flex flex-col sm:flex-row gap-2 sm:gap-3">
                  {showWarning && (!selectedSize || !selectedColor) && (
                    <p className="text-rose-500 text-[8px] sm:text-[9px] font-bold text-center animate-pulse absolute -top-5 left-0 right-0">
                      Selecione tamanho e cor para continuar.
                    </p>
                  )}
                  <button 
                    onClick={() => handleAddToCart(false)}
                    className="flex-1 h-10 sm:h-12 border-2 border-midnight rounded-xl font-black text-[9px] sm:text-[11px] uppercase tracking-wider sm:tracking-widest hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Carrinho
                  </button>
                  <button 
                    onClick={() => handleAddToCart(true)}
                    className="flex-1 h-10 sm:h-12 bg-midnight text-white rounded-xl font-black text-[9px] sm:text-[11px] uppercase tracking-wider sm:tracking-widest hover:brightness-110 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white" />
                    Comprar
                  </button>
                </div>
              </div>

              {/* Back button for mobile */}
              <div className="px-6 pb-4 md:hidden text-center">
                <button 
                  onClick={onClose}
                  className="text-gray-400 font-bold text-[8px] uppercase tracking-widest hover:text-gray-600 transition-colors"
                >
                  Voltar para o Catálogo
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const CatalogContent = ({ products, storeSettings, catalogSearch, setCatalogSearch, catalogCategoryFilter, setCatalogCategoryFilter, catalogSizeFilter, setCatalogSizeFilter, catalogColorFilter, setCatalogColorFilter, catalogPriceFilter, setCatalogPriceFilter, showNotification, showConfirm }: any) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const handleAddToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => 
        i.product_id === item.product_id && 
        i.tamanho === item.tamanho && 
        i.cor === item.cor
      );
      
      if (existing) {
        return prev.map(i => 
          (i.product_id === item.product_id && i.tamanho === item.tamanho && i.cor === item.cor)
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, item];
    });
    showNotification(`${item.product_name} adicionado ao pedido!`);
  };

  const handleRemoveFromCart = (productId: string, tamanho: string, cor: string) => {
    setCart(prev => prev.filter(i => !(i.product_id === productId && i.tamanho === tamanho && i.cor === cor)));
  };

  const handleUpdateQuantity = (productId: string, tamanho: string, cor: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product_id === productId && item.tamanho === tamanho && item.cor === cor) {
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
      message += `- ${item.product_name} | Tam: ${item.tamanho} | Cor: ${item.cor} | Qtd: ${item.quantity} | R$ ${(item.unit_price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    });
    message += `\n*Total: R$ ${cartTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*`;

    const whatsappUrl = `https://wa.me/${(storeSettings.telefone_whatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Group products by Name and Brand to show all available colors and sizes in one card
  const groupedProducts = (products || []).reduce((acc: any, p: any) => {
    // Normalization: Ensure p.variations is available even if it's named differently (p.variacoes, p.options)
    const variations = p.variations || p.variacoes || p.options || [];
    const hasVariations = p.has_variations === true || variations.length > 0;

    if (hasVariations) {
      // Products with variations are already grouped by model
      const key = `var-${p.id}`;
      const totalStock = variations.reduce((sum: number, v: any) => sum + toNum(v.estoque || v.stock || 0), 0);
      
      acc[key] = {
        ...p,
        groupKey: key,
        // Include ALL variations in availableSizes/Colors, not just those with stock > 0
        availableSizes: Array.from(new Set(variations.map((v: any) => v.tamanho || v.size || 'Único'))),
        availableColors: Array.from(new Set(variations.map((v: any) => v.cor || v.color || 'Única'))),
        allVariations: variations.map((v: any) => ({
          ...v,
          tamanho: v.tamanho || v.size || 'Único',
          cor: v.cor || v.color || 'Única',
          estoque: toNum(v.estoque || v.stock || 0)
        })),
        totalStock: totalStock
      };
    } else {
      // Group by Name, Brand and Category for non-variation products
      const key = `${p.name || 'Sem nome'}|${p.brand || 'Brisa 31 | Moda Masculina'}|${p.category || 'Geral'}`;
      const pImages = p.images && Array.isArray(p.images) ? p.images : (p.image ? [p.image] : []);
      
      if (!acc[key]) {
        acc[key] = { 
          ...p, 
          groupKey: key,
          // For non-variation products, we still check overall stock for "available" lists
          // But to be consistent with variation products, we should probably show them even if 0 stock?
          // Let's include them if they have a value, so they appear but might show as empty/grey.
          availableSizes: p.tamanho ? [p.tamanho] : ['Único'], 
          availableColors: p.cor ? [p.cor] : ['Única'],
          totalStock: toNum(p.stock),
          allVariations: [{ tamanho: p.tamanho || 'Único', cor: p.cor || 'Única', estoque: p.stock || 0 }],
          // Collect all images from all products in this group
          allImages: [...pImages]
        };
      } else {
        const size = p.tamanho || 'Único';
        const color = p.cor || 'Única';
        
        if (!acc[key].availableSizes.includes(size)) {
          acc[key].availableSizes.push(size);
        }
        if (!acc[key].availableColors.includes(color)) {
          acc[key].availableColors.push(color);
        }
        
        acc[key].totalStock += toNum(p.stock);
        acc[key].allVariations.push({ tamanho: size, cor: color, estoque: p.stock || 0 });
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

  const availableSizes = Array.from(new Set((products || []).flatMap((p: any) => (p.variations || p.variacoes || p.options || []).length > 0 ? (p.variations || p.variacoes || p.options).map((v: any) => v.tamanho || v.size || 'Único') : [p.tamanho || 'Único']))).filter(Boolean).sort();
  const availableColors = Array.from(new Set((products || []).flatMap((p: any) => (p.variations || p.variacoes || p.options || []).length > 0 ? (p.variations || p.variacoes || p.options).map((v: any) => v.cor || v.color || 'Única') : [p.cor || 'Única']))).filter(Boolean).sort();
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

  const [visibleCount, setVisibleCount] = useState(24);

  const displayedCatalog = useMemo(() => {
    return filteredCatalog.slice(0, visibleCount);
  }, [filteredCatalog, visibleCount]);

  useEffect(() => {
    setVisibleCount(24);
  }, [catalogSearch, catalogCategoryFilter, catalogSizeFilter, catalogColorFilter, catalogPriceFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-3 sm:gap-4 bg-white p-3 sm:p-4 rounded-3xl shadow-soft border border-slate-200">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text"
            placeholder="Buscar..."
            value={catalogSearch || ''}
            onChange={(e) => setCatalogSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm sm:text-base font-bold text-slate-900 focus:ring-4 focus:ring-slate-500/10 focus:border-slate-400 outline-none transition-all placeholder:text-slate-400"
          />
        </div>
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          <select 
            value={catalogCategoryFilter || ''}
            onChange={(e) => setCatalogCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 sm:px-4 sm:py-3 text-[10px] sm:text-[11px] font-black text-slate-800 outline-none focus:ring-4 focus:ring-slate-500/10 focus:border-slate-400 min-w-[100px] sm:min-w-[130px] cursor-pointer transition-all uppercase tracking-widest"
          >
            <option value="">Categoria</option>
            {availableCategories.map((cat: any) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select 
            value={catalogSizeFilter || ''}
            onChange={(e) => setCatalogSizeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-base font-black text-slate-800 outline-none focus:ring-4 focus:ring-slate-500/10 focus:border-slate-400 min-w-[110px] cursor-pointer transition-all uppercase tracking-widest text-[11px]"
          >
            <option value="">Tamanho</option>
            {availableSizes.map((size: any) => <option key={size} value={size}>{size}</option>)}
          </select>
          <select 
            value={catalogColorFilter || ''}
            onChange={(e) => setCatalogColorFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-base font-black text-slate-800 outline-none focus:ring-4 focus:ring-slate-500/10 focus:border-slate-400 min-w-[110px] cursor-pointer transition-all uppercase tracking-widest text-[11px]"
          >
            <option value="">Cor</option>
            {availableColors.map((color: any) => <option key={color} value={color}>{color}</option>)}
          </select>
          <select 
            value={catalogPriceFilter || ''}
            onChange={(e) => setCatalogPriceFilter(e.target.value === '' ? '' : Number(e.target.value))}
            className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-base font-black text-slate-800 outline-none focus:ring-4 focus:ring-slate-500/10 focus:border-slate-400 min-w-[130px] cursor-pointer transition-all uppercase tracking-widest text-[11px]"
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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-8 products-list">
        {displayedCatalog.map((product: any) => (
          <CatalogItem 
            key={product.groupKey} 
            product={product} 
            storeSettings={storeSettings} 
            onAddToCart={handleAddToCart}
            onClick={setSelectedProduct}
          />
        ))}
      </div>

      {visibleCount < filteredCatalog.length && (
        <div className="flex flex-col items-center justify-center pt-8 pb-12 gap-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Mostrando {displayedCatalog.length} de {filteredCatalog.length} modelos
          </p>
          <button 
            onClick={() => setVisibleCount(prev => prev + 24)}
            className="px-8 py-4 bg-white border-2 border-midnight text-midnight rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-midnight hover:text-white transition-all active:scale-95 shadow-lg shadow-midnight/5"
          >
            Carregar mais produtos
          </button>
        </div>
      )}

      {/* Product Details Modal */}
      {selectedProduct && (
        <ProductDetailsModal
          isOpen={true}
          onClose={() => setSelectedProduct(null)}
          product={selectedProduct}
          onAddToCart={handleAddToCart}
          storeSettings={storeSettings}
        />
      )}

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
                {cart.map((item) => (
                  <div key={`${item.product_id}-${item.tamanho}-${item.cor}`} className="flex gap-4 p-3 bg-gray-50 rounded-2xl border border-gray-100 group">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 text-sm truncate">{item.product_name}</h4>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                        {item.brand} • {item.tamanho} • {item.cor}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
                          <button 
                            onClick={() => handleUpdateQuantity(item.product_id, item.tamanho, item.cor, -1)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-black w-6 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => handleUpdateQuantity(item.product_id, item.tamanho, item.cor, 1)}
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
                      onClick={() => handleRemoveFromCart(item.product_id, item.tamanho, item.cor)}
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


