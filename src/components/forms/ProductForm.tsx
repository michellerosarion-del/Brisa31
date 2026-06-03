import React from 'react';
import { Trash2, Plus } from 'lucide-react';
import { Product, Variation } from '../../types';
import { toNum, formatCurrency } from '../../lib/utils';

interface ProductFormProps {
  editingItem: Product | null;
  handleAddProduct: (e: React.FormEvent) => void;
  tempVariations: Variation[];
  addVariation: () => void;
  updateVariation: (id: string, field: string, value: any) => void;
  removeVariation: (id: string) => void;
  existingImages: string[];
  removeExistingImage: (url: string) => void;
  selectedFiles: File[];
  removeSelectedFile: (idx: number) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
  storeSettings?: any;
}

export const ProductForm = ({
  editingItem,
  handleAddProduct,
  tempVariations,
  addVariation,
  updateVariation,
  removeVariation,
  existingImages,
  removeExistingImage,
  selectedFiles,
  removeSelectedFile,
  handleFileChange,
  isUploading,
  storeSettings
}: ProductFormProps) => {
  const [calcCost, setCalcCost] = React.useState(editingItem?.cost?.toString()?.replace('.', ',') || '');
  const [calcFrete, setCalcFrete] = React.useState(editingItem?.frete?.toString()?.replace('.', ',') || '');

  const suggestion = React.useMemo(() => {
    const cost = toNum(calcCost);
    const frete = toNum(calcFrete);
    const fee = (toNum(storeSettings?.card_fee) || 16.27) / 100;
    const margin = 1; // 100% margin (multiplier 2x)
    
    const suggested = fee < 1 ? ((cost + frete) / (1 - fee)) * (1 + margin) : 0;
    const profit = suggested - (cost + frete) - (suggested * fee);
    
    return { suggested, profit };
  }, [calcCost, calcFrete, storeSettings]);

  return (
    <form onSubmit={handleAddProduct} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1 md:col-span-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome do Produto</label>
          <input name="name" defaultValue={editingItem?.name} className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white transition-all outline-none text-sm font-bold text-slate-800" required />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Status</label>
          <select 
            name="status" 
            defaultValue={editingItem?.status || 'ativo'} 
            className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white transition-all outline-none text-sm font-black text-slate-800"
          >
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo (Ocultar)</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Categoria</label>
          <input name="category" defaultValue={editingItem?.category} className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white transition-all outline-none text-sm font-bold text-slate-800" required />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Marca</label>
          <input name="brand" defaultValue={editingItem?.brand} className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white transition-all outline-none text-sm font-bold text-slate-800" required />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Código/REF</label>
          <input name="code" defaultValue={editingItem?.code} className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white transition-all outline-none text-sm font-bold text-slate-800" required />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cor (Simples)</label>
          <input name="cor" defaultValue={editingItem?.cor} className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white transition-all outline-none disabled:bg-slate-100 disabled:text-slate-400 text-sm font-bold text-slate-850" disabled={tempVariations.length > 0} placeholder="Ex: Única" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tamanho (Simples)</label>
          <input name="tamanho" defaultValue={editingItem?.tamanho} className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white transition-all outline-none disabled:bg-slate-100 disabled:text-slate-400 text-sm font-bold text-slate-850" disabled={tempVariations.length > 0} placeholder="Ex: Único" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Custo (R$)</label>
          <input 
            name="cost" 
            type="text" 
            inputMode="decimal" 
            value={calcCost}
            onChange={(e) => setCalcCost(e.target.value)}
            className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white transition-all outline-none text-sm font-bold text-slate-800" 
            required 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Frete (R$)</label>
          <input 
            name="frete" 
            type="text" 
            inputMode="decimal" 
            value={calcFrete}
            onChange={(e) => setCalcFrete(e.target.value)}
            className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white transition-all outline-none text-sm text-emerald-600 font-bold" 
          />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-center ml-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Preço Final</label>
            {suggestion.suggested > 0 && (
              <div className="flex flex-col items-end">
                <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-1.5 rounded-full animate-pulse">Sugerido: {formatCurrency(suggestion.suggested)}</span>
                <span className="text-[7px] text-emerald-600 font-bold">Lucro: {formatCurrency(suggestion.profit)}</span>
              </div>
            )}
          </div>
          <input 
            name="price" 
            type="text" 
            inputMode="decimal" 
            defaultValue={editingItem?.price?.toString()?.replace('.', ',')} 
            className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white transition-all outline-none text-sm font-black text-slate-900" 
            required 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Preço PIX</label>
          <input name="cash_price" type="text" inputMode="decimal" defaultValue={editingItem?.cash_price} className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white transition-all outline-none text-sm font-bold text-slate-800" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Preço Promo (R$)</label>
          <input name="promo_price" type="text" inputMode="decimal" defaultValue={editingItem?.promo_price} className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white transition-all outline-none text-sm font-bold text-slate-805" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Estoque Mínimo</label>
          <input name="min_stock" type="number" defaultValue={editingItem?.min_stock || 3} className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white transition-all outline-none text-sm font-bold text-slate-800" required />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Estoque Simples</label>
          <input name="stock" type="number" defaultValue={editingItem?.stock} className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white transition-all outline-none disabled:bg-slate-100 disabled:text-slate-400 text-sm font-bold text-slate-800" disabled={tempVariations.length > 0} />
          {tempVariations.length > 0 && <p className="text-[8px] text-amber-600 font-bold ml-1">Calculado pelas variações</p>}
        </div>
      </div>

      {editingItem && (
        <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-100 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
            <label className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Ajuste de Estoque</label>
          </div>
          <input 
            name="stock_adjustment_reason" 
            placeholder="Motivo do ajuste (ex: Contagem física, Devolução, Perda...)" 
            className="w-full h-10 px-3 rounded-xl border border-amber-200/60 focus:border-amber-500 focus:bg-white outline-none text-xs bg-white/50 font-bold text-slate-800 transition-all"
          />
          <p className="text-[9px] text-amber-600 font-bold italic ml-1">Preencha apenas se estiver alterando as quantidades manualmente.</p>
        </div>
      )}

      <div className="space-y-4">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block">Imagens do Produto</label>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {existingImages.map((url, idx) => (
            <div key={url} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-100 group shadow-sm bg-slate-50">
              <img src={url} alt={`Produto ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <button 
                type="button" 
                onClick={() => removeExistingImage(url)}
                className="absolute top-2 right-2 p-1.5 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {selectedFiles.map((file, idx) => (
            <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-emerald-100 group bg-emerald-50 shadow-sm">
              <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
              <button 
                type="button" 
                onClick={() => removeSelectedFile(idx)}
                className="absolute top-2 right-2 p-1.5 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-emerald-500 text-[8px] text-white text-center py-0.5 font-black uppercase tracking-wider">Novo</div>
            </div>
          ))}

          <label className="relative aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-slate-800 hover:bg-slate-50 transition-all group">
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              onChange={handleFileChange} 
              className="hidden" 
            />
            <div className="p-2.5 bg-slate-100 rounded-full group-hover:bg-slate-900 group-hover:text-white transition-all text-slate-650">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Adicionar</span>
          </label>
        </div>
        <p className="text-[10px] text-slate-400 font-bold italic ml-1">Máximo 2MB por imagem. A primeira imagem será a principal.</p>
      </div>

      <div className="space-y-4 pt-4 border-t border-slate-100">
        <div className="flex justify-between items-center sm:px-1">
          <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Variações do Produto</h4>
          <button 
            type="button" 
            onClick={addVariation}
            className="text-[10px] font-black text-emerald-600 flex items-center gap-1.5 hover:text-emerald-700 transition-all uppercase tracking-widest"
          >
            <Plus className="w-3.5 h-3.5" /> + add Var.
          </button>
        </div>
        
        <div className="space-y-3">
          {tempVariations.map((v, idx) => (
            <div key={v.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-150 relative group">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-450 uppercase tracking-wider">Cor</label>
                <input 
                  value={v.cor || ''} 
                  onChange={(e) => updateVariation(v.id, 'cor', e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-slate-900 transition-all"
                  placeholder="Ex: Preto"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-450 uppercase tracking-wider">Tamanho</label>
                <input 
                  value={v.tamanho || ''} 
                  onChange={(e) => updateVariation(v.id, 'tamanho', e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-slate-900 transition-all"
                  placeholder="Ex: G"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-450 uppercase tracking-wider">Estoque</label>
                <input 
                  type="number"
                  value={v.estoque ?? 0} 
                  onChange={(e) => updateVariation(v.id, 'estoque', toNum(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-slate-900 transition-all"
                />
              </div>
              <div className="flex items-end pb-1 md:justify-center">
                <button 
                  type="button" 
                  onClick={() => removeVariation(v.id)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all hover:text-rose-600 active:scale-90"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {tempVariations.length === 0 && (
            <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl text-slate-450 text-[11px] font-bold tracking-tight bg-slate-50/50">
              Apenas produto simples (Sem grade de variação de cor/tamanho).
            </div>
          )}
        </div>
      </div>

      <button 
        type="submit" 
        disabled={isUploading}
        className="w-full h-12 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-black transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isUploading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Salvando...
          </>
        ) : (
          editingItem ? 'Salvar Alterações' : 'Cadastrar Produto'
        )}
      </button>
    </form>
  );
};
