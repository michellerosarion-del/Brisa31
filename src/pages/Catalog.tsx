import React, { useState, useEffect } from 'react';
import { 
  Package,
  LogIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  CatalogContent, 
  Product, 
  StoreSettings 
} from '../components/Catalog';

export const CatalogPage = () => {
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
          <div className="flex items-center gap-2">
            <button 
              onClick={() => window.history.pushState({}, '', '/admin')}
              className="text-sm text-champagne/70 font-medium flex items-center gap-1 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors"
            >
              <LogIn className="w-4 h-4" /> <span className="hidden sm:inline">Acesso Restrito</span>
            </button>
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

export default CatalogPage;
