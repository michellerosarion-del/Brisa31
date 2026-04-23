import React from 'react';
import { motion } from 'motion/react';
import { Search, Filter, ChevronDown, Package, Plus, Minus, Flame, Edit, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Product } from '../../types';

interface ProductsListProps {
  filteredProducts: Product[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  categoryFilter: string;
  setCategoryFilter: (cat: string) => void;
  categories: string[];
  handleAdjustStock: (id: string, amount: number, type: string, variationId?: string) => void;
  handleDeleteProduct: (id: string) => void;
  handleEdit: (tab: string, item: any) => void;
  formatCurrency: (val: number) => string;
  toNum: (val: any) => number;
  onPromote: (id: string) => void;
  getCssColor: (color: string) => string;
  storeSettings: any;
  loadMore: () => void;
  user: any;
}

export const ProductsList = ({ 
  filteredProducts, 
  searchTerm, 
  setSearchTerm, 
  categoryFilter, 
  setCategoryFilter, 
  categories, 
  handleAdjustStock, 
  handleDeleteProduct, 
  handleEdit, 
  formatCurrency, 
  toNum, 
  onPromote, 
  getCssColor,
  storeSettings,
  loadMore,
  user
}: ProductsListProps) => {
  const [statusFilter, setStatusFilter] = React.useState('');
  const [visibleCount, setVisibleCount] = React.useState(50);

  const displayedProducts = React.useMemo(() => {
    let filtered = filteredProducts;
    if (statusFilter) {
      filtered = filtered.filter(p => (p.status || 'ativo') === statusFilter);
    }
    return filtered.slice(0, visibleCount);
  }, [filteredProducts, visibleCount, statusFilter]);

  React.useEffect(() => {
    setVisibleCount(50);
  }, [searchTerm, categoryFilter, statusFilter]);

  React.useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        if (visibleCount < filteredProducts.length) {
          setVisibleCount(prev => prev + 20);
        } else {
          loadMore();
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [visibleCount, filteredProducts.length]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-slate-900 p-3 sm:p-4 rounded-xl shadow-lg border border-slate-800">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/10 rounded-lg flex items-center justify-center shadow-inner">
            <Package className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h2 className="text-[11px] sm:text-sm font-bold text-white uppercase tracking-widest leading-none">Peças</h2>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5 sm:mt-1">Estoque</p>
          </div>
        </div>

        {user?.role === 'admin' && (
          <button 
            onClick={() => handleEdit('produtos', null)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-900 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Novo Produto
          </button>
        )}
      </div>

      <Card className="p-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar produto..." 
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-base md:text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={searchTerm || ''}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative group w-full md:w-auto md:min-w-[180px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <select 
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-base md:text-[10px] font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer appearance-none"
              value={categoryFilter || ''}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">Todas Categorias</option>
              {categories.map((cat: string) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative group w-full md:w-auto md:min-w-[120px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <select 
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-base md:text-[10px] font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer appearance-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
              <option value="">Todos</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 products-list">
        {displayedProducts.map((p: any) => (
          <motion.div 
            key={p.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group product-card"
          >
            <Card className="p-3 sm:p-4 h-full flex flex-col gap-2 sm:gap-3 hover:border-slate-300 transition-all duration-300 bg-white border-slate-100 rounded-xl">
              <div className="flex gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 shrink-0 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 group-hover:scale-105 transition-transform">
                  <img 
                    src={(p.images && p.images.length > 0) ? p.images[0] : `https://picsum.photos/seed/${p.id}/100/100`} 
                    alt={p.name} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer" 
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-[9px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-widest truncate mb-0.5 sm:mb-1">{p.brand}</p>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className={`text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-wider ${p.status === 'inativo' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>
                          {p.status || 'ativo'}
                        </span>
                        <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">#{p.code}</span>
                      </div>
                      {(() => {
                        const totalStock = p.has_variations && p.variations 
                          ? p.variations.reduce((sum: number, v: any) => sum + toNum(v.estoque), 0)
                          : toNum(p.stock);
                        const threshold = p.min_stock !== undefined ? toNum(p.min_stock) : toNum(storeSettings.low_stock_threshold || 3);
                        
                        if (storeSettings.low_stock_alert_enabled && totalStock > 0 && totalStock <= threshold) {
                          return (
                            <span className="text-[8px] sm:text-[10px] font-bold bg-rose-50 text-rose-600 px-1.5 sm:px-2 py-0.5 rounded-full border border-rose-100 uppercase tracking-wider">
                                Baixo
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight mt-0.5 sm:mt-1 line-clamp-1" title={p.name}>{p.name}</h3>
                  <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-50">
                    <span className="text-xs sm:text-sm font-bold text-slate-900">{formatCurrency(p.price)}</span>
                    <span className="text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider">
                      {p.category}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-100/80 rounded-xl p-3 sm:p-2 space-y-2 sm:space-y-1.5 border border-slate-200">
                {p.has_variations && p.variations ? (
                  <div className="space-y-2">
                    {Object.entries(p.variations.reduce((acc: any, v: any) => {
                      const color = v.cor || 'Única';
                      if (!acc[color]) acc[color] = [];
                      acc[color].push(v);
                      return acc;
                    }, {})).map(([color, variations]: [string, any]) => (
                      <div key={color} className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-[11px] md:text-xs">
                          <div className="w-2.5 h-2.5 rounded-full border border-white shrink-0 shadow-sm" style={{ backgroundColor: getCssColor(color) }} />
                          <span className="font-black text-slate-950 truncate max-w-[100px]">{color}:</span>
                        </div>
                        <div className="flex flex-wrap gap-2 pl-4">
                          {variations
                            .sort((a: any, b: any) => (a.tamanho || '').localeCompare(b.tamanho || ''))
                            .map((v: any) => (
                              <div key={v.id} className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm text-[11px] md:text-xs">
                                <span className="font-black text-slate-700">{v.tamanho || '?'}:</span>
                                <span className="font-black text-slate-950">{toNum(v.estoque)}</span>
                                <div className="flex gap-1 ml-1.5 border-l border-slate-200 pl-1.5">
                                  <button 
                                    onClick={() => handleAdjustStock(p.id, 1, 'reposicao', v.id)}
                                    className="w-4 h-4 flex items-center justify-center text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                  <button 
                                    onClick={() => handleAdjustStock(p.id, -1, 'ajuste', v.id)}
                                    className="w-4 h-4 flex items-center justify-center text-rose-700 hover:bg-rose-50 rounded transition-colors"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px] md:text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full border border-white shrink-0 shadow-sm" style={{ backgroundColor: getCssColor(p.cor) }} />
                      <span className="font-black text-slate-800 truncate max-w-[100px]">{p.cor || 'Única'}:</span>
                      <span className="text-slate-950 font-black">{p.tamanho || 'Único'}:{toNum(p.stock)}</span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAdjustStock(p.id, 1, 'reposicao')}
                        className="w-6 h-6 flex items-center justify-center bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleAdjustStock(p.id, -1, 'ajuste')}
                        className="w-6 h-6 flex items-center justify-center bg-rose-50 text-rose-700 rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-300">
                  <span className="text-[10px] font-black text-slate-950 uppercase tracking-widest">Estoque Total</span>
                  <span className={`text-lg md:text-sm font-black ${(storeSettings.low_stock_alert_enabled && toNum(p.stock) <= (p.min_stock !== undefined ? toNum(p.min_stock) : toNum(storeSettings.low_stock_threshold || 3))) ? 'text-amber-800' : 'text-slate-950'}`}>
                    {p.stock} <span className="text-[10px] font-black uppercase">un</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end mt-auto pt-1">
                <div className="flex gap-0.5">
                  <button 
                    onClick={() => onPromote(p.id)}
                    className={`p-1.5 rounded-md transition-all ${p.is_featured ? 'text-amber-600 bg-amber-50' : 'text-slate-600 hover:text-amber-700 hover:bg-amber-100'}`}
                    title={p.is_featured ? "Remover destaque" : "Promover destaque"}
                  >
                    <Flame className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => handleEdit('produtos', p)}
                    className="p-1.5 text-slate-600 hover:text-blue-800 hover:bg-blue-100 rounded-md transition-all font-black"
                    title="Editar"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => handleDeleteProduct(p.id)}
                    className="p-1.5 text-slate-600 hover:text-rose-800 hover:bg-rose-100 rounded-md transition-all font-black"
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

      {displayedProducts.length > 0 && (visibleCount < filteredProducts.length || filteredProducts.length >= 100) && (
        <div className="flex justify-center pt-8 pb-12">
          <button 
            onClick={() => {
              if (visibleCount < filteredProducts.length) {
                setVisibleCount(prev => prev + 50);
              } else {
                loadMore();
              }
            }}
            className="flex items-center gap-3 px-10 py-4 bg-slate-950 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-black transition-all active:scale-95 shadow-2xl shadow-slate-900/20 group"
          >
            <Package className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            Clique para Ver Mais Produtos
          </button>
        </div>
      )}

      {filteredProducts.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200 shadow-sm">
          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-slate-200" />
          </div>
          <h3 className="text-lg font-black text-slate-950 mb-1 tracking-tight uppercase tracking-widest text-sm">Nenhum produto</h3>
          <p className="text-xs text-slate-800 font-bold">Tente ajustar sua busca ou filtros.</p>
        </div>
      )}
    </div>
  );
};
