import React, { useState } from 'react';
import { CatalogContent } from '../../components/Catalog';
import { Product, StoreSettings } from '../../types';
import { ExternalLink, Copy } from 'lucide-react';

interface CatalogTabProps {
  products: Product[];
  storeSettings: StoreSettings;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
}

export const CatalogTab = ({ products, storeSettings, showNotification }: CatalogTabProps) => {
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('');
  const [catalogSizeFilter, setCatalogSizeFilter] = useState('');
  const [catalogColorFilter, setCatalogColorFilter] = useState('');
  const [catalogPriceFilter, setCatalogPriceFilter] = useState<number | ''>('');

  const catalogUrl = `https://brisa31.vercel.app/catalogo`;
  const catalogHashUrl = `https://brisa31.vercel.app/#catalog`;

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    showNotification('Link copiado com sucesso!');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-[28px] font-serif font-black text-slate-900 tracking-tight leading-none mb-2">Página da Loja</h2>
          <p className="text-slate-500 text-sm font-medium">Link público para seus clientes fazerem pedidos.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-mono text-[10px] min-w-[200px] truncate">
                {catalogUrl}
              </div>
              <button 
                onClick={() => copyLink(catalogUrl)}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 border border-slate-200"
                title="Copiar Link Principal"
              >
                <Copy className="w-3 h-3" /> Copiar
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-mono text-[10px] min-w-[200px] truncate">
                {catalogHashUrl}
              </div>
              <button 
                onClick={() => copyLink(catalogHashUrl)}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 border border-slate-200"
                title="Link Alternativo (caso o principal não abra)"
              >
                <Copy className="w-3 h-3" /> Alternativo
              </button>
            </div>
          </div>
          <a 
            href="https://brisa31.vercel.app/catalogo" 
            target="_blank" 
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-bold shadow-lg hover:shadow-xl transition-all active:scale-95 border border-slate-900 self-center"
          >
            <ExternalLink className="w-4 h-4" /> Acessar Minha Loja
          </a>
        </div>
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
    </div>
  );
};
