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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nome do Produto</label>
          <input name="name" defaultValue={editingItem?.name} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-midnight outline-none text-sm" required />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Categoria</label>
          <input name="category" defaultValue={editingItem?.category} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-midnight outline-none text-sm" required />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Status</label>
          <select 
            name="status" 
            defaultValue={editingItem?.status || 'ativo'} 
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-midnight outline-none text-sm font-bold"
          >
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo (Ocultar)</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Marca</label>
          <input name="brand" defaultValue={editingItem?.brand} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-midnight outline-none text-sm" required />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Código/REF</label>
          <input name="code" defaultValue={editingItem?.code} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-midnight outline-none text-sm" required />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Cor (Simples)</label>
          <input name="cor" defaultValue={editingItem?.cor} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-midnight outline-none disabled:bg-gray-50 disabled:text-gray-400 text-sm" disabled={tempVariations.length > 0} placeholder="Ex: Única" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Tamanho (Simples)</label>
          <input name="tamanho" defaultValue={editingItem?.tamanho} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-midnight outline-none disabled:bg-gray-50 disabled:text-gray-400 text-sm" disabled={tempVariations.length > 0} placeholder="Ex: Único" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Custo (R$)</label>
          <input 
            name="cost" 
            type="text" 
            inputMode="decimal" 
            value={calcCost}
            onChange={(e) => setCalcCost(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-midnight outline-none text-sm" 
            required 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Frete (R$)</label>
          <input 
            name="frete" 
            type="text" 
            inputMode="decimal" 
            value={calcFrete}
            onChange={(e) => setCalcFrete(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-midnight outline-none text-sm text-emerald-600 font-bold" 
          />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-center ml-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Preço Final</label>
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
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-midnight outline-none text-sm font-bold text-midnight" 
            required 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Preço PIX</label>
          <input name="cash_price" type="text" inputMode="decimal" defaultValue={editingItem?.cash_price} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-midnight outline-none text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Preço Promo (R$)</label>
          <input name="promo_price" type="text" inputMode="decimal" defaultValue={editingItem?.promo_price} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-midnight outline-none text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Estoque Mínimo</label>
          <input name="min_stock" type="number" defaultValue={editingItem?.min_stock || 3} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-midnight outline-none text-sm" required />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Estoque Simples</label>
          <input name="stock" type="number" defaultValue={editingItem?.stock} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-midnight outline-none disabled:bg-gray-50 disabled:text-gray-400 text-sm" disabled={tempVariations.length > 0} />
          {tempVariations.length > 0 && <p className="text-[8px] text-amber-600 font-bold">Calculado pelas variações</p>}
        </div>
      </div>

      {editingItem && (
        <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
            <label className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Ajuste de Estoque</label>
          </div>
          <input 
            name="stock_adjustment_reason" 
            placeholder="Motivo do ajuste (ex: Contagem física, Devolução, Perda...)" 
            className="w-full px-3 py-2 rounded-lg border border-amber-200 focus:ring-2 focus:ring-amber-500 outline-none text-xs bg-white/50"
          />
          <p className="text-[9px] text-amber-600 italic">Preencha apenas se estiver alterando as quantidades manualmente.</p>
        </div>
      )}

      <div className="space-y-4">
        <label className="text-xs font-bold text-gray-400 uppercase ml-1 block">Imagens do Produto</label>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {existingImages.map((url, idx) => (
            <div key={url} className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 group">
              <img src={url} alt={`Produto ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <button 
                type="button" 
                onClick={() => removeExistingImage(url)}
                className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {selectedFiles.map((file, idx) => (
            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-emerald-100 group bg-emerald-50">
              <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
              <button 
                type="button" 
                onClick={() => removeSelectedFile(idx)}
                className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-emerald-500 text-[8px] text-white text-center py-0.5 font-bold uppercase">Novo</div>
            </div>
          ))}

          <label className="relative aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-midnight hover:bg-gray-50 transition-all group">
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              onChange={handleFileChange} 
              className="hidden" 
            />
            <div className="p-3 bg-gray-100 rounded-full group-hover:bg-midnight group-hover:text-white transition-colors">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Adicionar</span>
          </label>
        </div>
        <p className="text-[10px] text-gray-400 italic">Máximo 2MB por imagem. A primeira imagem será a principal.</p>
      </div>

      <div className="space-y-4 pt-4 border-t border-gray-100">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Variações</h4>
          <button 
            type="button" 
            onClick={addVariation}
            className="text-xs font-black text-emerald-600 flex items-center gap-1 hover:text-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> + Variação
          </button>
        </div>
        
        <div className="space-y-3">
          {tempVariations.map((v, idx) => (
            <div key={v.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 relative group">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Cor</label>
                <input 
                  value={v.cor || ''} 
                  onChange={(e) => updateVariation(v.id, 'cor', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-midnight"
                  placeholder="Ex: Preto"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Tamanho</label>
                <input 
                  value={v.tamanho || ''} 
                  onChange={(e) => updateVariation(v.id, 'tamanho', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-midnight"
                  placeholder="Ex: G"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Estoque</label>
                <input 
                  type="number"
                  value={v.estoque ?? 0} 
                  onChange={(e) => updateVariation(v.id, 'estoque', toNum(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-midnight"
                />
              </div>
              <div className="flex items-end pb-1">
                <button 
                  type="button" 
                  onClick={() => removeVariation(v.id)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {tempVariations.length === 0 && (
            <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 text-xs italic">
              Nenhuma variação adicionada. O produto será tratado como simples.
            </div>
          )}
        </div>
      </div>

      <button 
        type="submit" 
        disabled={isUploading}
        className="w-full bg-midnight text-white py-3 rounded-xl font-bold shadow-lg shadow-midnight/10 hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
      >
        {isUploading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Salvando...
          </>
        ) : (
          editingItem ? 'Salvar Alterações' : 'Cadastrar Produto'
        )}
      </button>
    </form>
  );
};
