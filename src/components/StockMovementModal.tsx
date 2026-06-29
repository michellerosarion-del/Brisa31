import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Product, Variation } from '../types';
import { Package, ShieldAlert, CheckCircle2, User, Calendar, MessageSquare } from 'lucide-react';

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currentUser: any;
  preSelectedProduct?: Product | null;
  onSave: (data: {
    productId: string;
    variationId?: string | null;
    type: 'avaria' | 'uso_interno' | 'ajuste_positivo' | 'ajuste_negativo';
    quantity: number;
    observation: string;
    user: any;
  }) => Promise<void>;
}

export const StockMovementModal = ({
  isOpen,
  onClose,
  products,
  currentUser,
  preSelectedProduct = null,
  onSave
}: StockMovementModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariationId, setSelectedVariationId] = useState('');
  const [movementType, setMovementType] = useState<'avaria' | 'uso_interno' | 'ajuste_positivo' | 'ajuste_negativo'>('avaria');
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Filter only active products
  const activeProducts = useMemo(() => {
    return products.filter(p => (p.status || 'ativo') === 'ativo');
  }, [products]);

  // Handle pre-selected product
  useEffect(() => {
    if (isOpen) {
      if (preSelectedProduct) {
        setSelectedProductId(preSelectedProduct.id);
        const vars = preSelectedProduct.variations || [];
        if (vars.length > 0) {
          setSelectedVariationId(vars[0].id);
        } else {
          setSelectedVariationId('');
        }
      } else {
        setSelectedProductId('');
        setSelectedVariationId('');
      }
      // Reset form fields
      setSearchTerm('');
      setMovementType('avaria');
      setQuantity(1);
      setObservation('');
      setErrorMsg('');
      setLoading(false);
    }
  }, [isOpen, preSelectedProduct]);

  // Find currently selected product object
  const selectedProduct = useMemo(() => {
    return activeProducts.find(p => p.id === selectedProductId) || null;
  }, [activeProducts, selectedProductId]);

  // Update selected variation if product changes
  useEffect(() => {
    if (selectedProduct && !preSelectedProduct) {
      const vars = selectedProduct.variations || [];
      if (vars.length > 0) {
        setSelectedVariationId(vars[0].id);
      } else {
        setSelectedVariationId('');
      }
    }
  }, [selectedProduct, preSelectedProduct]);

  // Filter products by search term for the product selection dropdown
  const filteredProductOptions = useMemo(() => {
    if (!searchTerm) return activeProducts;
    return activeProducts.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (p.brand || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.code || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [activeProducts, searchTerm]);

  // Get current stock available of selected item
  const currentAvailableStock = useMemo(() => {
    if (!selectedProduct) return 0;
    if (selectedProduct.variations && selectedProduct.variations.length > 0) {
      const v = selectedProduct.variations.find((varItem: any) => varItem.id === selectedVariationId);
      return v ? v.estoque : 0;
    }
    return selectedProduct.stock || 0;
  }, [selectedProduct, selectedVariationId]);

  // Validate and submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedProductId) {
      setErrorMsg('Por favor, selecione um produto.');
      return;
    }

    if (selectedProduct && selectedProduct.variations && selectedProduct.variations.length > 0 && !selectedVariationId) {
      setErrorMsg('Por favor, selecione uma variação (cor/tamanho).');
      return;
    }

    if (quantity <= 0) {
      setErrorMsg('A quantidade deve ser maior que zero.');
      return;
    }

    // Check if enough stock for reduction movements
    const isReduction = movementType === 'avaria' || movementType === 'uso_interno' || movementType === 'ajuste_negativo';
    if (isReduction && currentAvailableStock < quantity) {
      setErrorMsg(`Saldo insuficiente! Estoque disponível no momento: ${currentAvailableStock} un. Você tentou retirar: ${quantity} un.`);
      return;
    }

    if (!observation.trim()) {
      setErrorMsg('A observação/motivo é obrigatória para registrar a movimentação especial.');
      return;
    }

    try {
      setLoading(true);
      await onSave({
        productId: selectedProductId,
        variationId: selectedVariationId || null,
        type: movementType,
        quantity,
        observation: observation.trim(),
        user: currentUser
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao registrar a movimentação de estoque.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Movimentar Estoque"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Error notification */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold flex items-start gap-2.5 shadow-sm animate-shake">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Product Selection */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
            Produto
          </label>
          
          {preSelectedProduct ? (
            <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-800">{preSelectedProduct.name}</span>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-200/50 text-slate-600 px-2 py-0.5 rounded">
                Selecionado
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <input 
                type="text"
                placeholder="🔍 Filtrar produto por nome, marca ou código..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-500/10 focus:border-slate-800 transition-all outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-800 transition-all cursor-pointer"
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  setErrorMsg('');
                }}
              >
                <option value="">-- Selecione o Produto --</option>
                {filteredProductOptions.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.brand ? `[${p.brand}]` : ''} ({p.variations && p.variations.length > 0 ? `${p.variations.length} v.` : `${p.stock} un.`})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Variation Selection (Conditional) */}
        {selectedProduct && selectedProduct.variations && selectedProduct.variations.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Variação (Cor / Tamanho)
            </label>
            <select
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-800 transition-all cursor-pointer"
              value={selectedVariationId}
              onChange={(e) => {
                setSelectedVariationId(e.target.value);
                setErrorMsg('');
              }}
            >
              {selectedProduct.variations.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.cor} / {v.tamanho} (Estoque: {v.estoque} un)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Available Stock Indicator */}
        {selectedProduct && (
          <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Estoque Atual Disponível:
            </span>
            <span className={`text-sm font-black ${currentAvailableStock > 0 ? 'text-slate-800' : 'text-rose-600'}`}>
              {currentAvailableStock} un
            </span>
          </div>
        )}

        {/* Movement Type */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
            Tipo de Movimentação
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setMovementType('avaria');
                setErrorMsg('');
              }}
              className={`py-2 px-3 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 ${
                movementType === 'avaria'
                  ? 'border-rose-300 bg-rose-50 text-rose-700 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>Avaria</span>
              <span className="text-[8px] font-medium opacity-75">Saída</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMovementType('uso_interno');
                setErrorMsg('');
              }}
              className={`py-2 px-3 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 ${
                movementType === 'uso_interno'
                  ? 'border-rose-300 bg-rose-50 text-rose-700 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>Uso Interno</span>
              <span className="text-[8px] font-medium opacity-75">Saída</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMovementType('ajuste_negativo');
                setErrorMsg('');
              }}
              className={`py-2 px-3 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 ${
                movementType === 'ajuste_negativo'
                  ? 'border-rose-300 bg-rose-50 text-rose-700 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>Ajuste Negativo</span>
              <span className="text-[8px] font-medium opacity-75">Saída</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMovementType('ajuste_positivo');
                setErrorMsg('');
              }}
              className={`py-2 px-3 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 ${
                movementType === 'ajuste_positivo'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>Ajuste Positivo</span>
              <span className="text-[8px] font-medium opacity-75">Entrada</span>
            </button>
          </div>
        </div>

        {/* Quantity */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
            Quantidade
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={quantity <= 1}
              onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
              className="w-10 h-10 border border-slate-200 rounded-lg flex items-center justify-center font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all active:scale-95"
            >
              -
            </button>
            <input
              type="number"
              min="1"
              required
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-center text-sm font-bold focus:ring-2 focus:ring-slate-500/10 focus:border-slate-800 transition-all outline-none"
              value={quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) {
                  setQuantity(val);
                } else {
                  setQuantity(1);
                }
                setErrorMsg('');
              }}
            />
            <button
              type="button"
              onClick={() => setQuantity(prev => prev + 1)}
              className="w-10 h-10 border border-slate-200 rounded-lg flex items-center justify-center font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
            >
              +
            </button>
          </div>
        </div>

        {/* Observation / Motivo */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block flex justify-between">
            <span>Observação / Motivo</span>
            <span className="text-rose-500 text-[9px] font-bold normal-case">Obrigatória</span>
          </label>
          <textarea
            required
            rows={3}
            placeholder="Diga o motivo detalhado desta movimentação especial de estoque..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-500/10 focus:border-slate-800 transition-all outline-none resize-none"
            value={observation}
            onChange={(e) => {
              setObservation(e.target.value);
              setErrorMsg('');
            }}
          />
        </div>

        {/* Automatically Managed Metadata */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-2.5">
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Data:
            </span>
            <span className="text-slate-700">Automática (Agora)</span>
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" /> Responsável:
            </span>
            <span className="text-slate-700">{currentUser?.name || 'Sistema'}</span>
          </div>
        </div>

        {/* Actions Button */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200/70 transition-all active:scale-95 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/10 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>

      </form>
    </Modal>
  );
};
