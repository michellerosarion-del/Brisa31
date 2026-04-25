import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  Trash2, 
  Plus, 
  PlusCircle, 
  History as HistoryIcon, 
  ShoppingCart, 
  Save, 
  X, 
  Calendar, 
  ChevronRight,
  TrendingDown,
  Truck,
  Package,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  db, 
  comprasRef, 
  produtosRef, 
  fornecedoresRef, 
  handleFirestoreError, 
  OperationType 
} from '../../firebase';
import { 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  runTransaction,
  collection
} from 'firebase/firestore';
import { Card } from '../../components/ui/Card';
import { Product, Purchase, PurchaseItem } from '../../types';
import { toNum, formatCurrency } from '../../lib/utils';

export const Purchases = () => {
  const [activeTab, setActiveTab] = useState<'history' | 'new'>('history');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Form state
  const [supplier, setSupplier] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [observations, setObservations] = useState('');
  const [items, setItems] = useState<Partial<PurchaseItem>[]>([
    { product_id: '', product_name: '', quantity: 1, unit_cost: 0, cor: '', tamanho: '' }
  ]);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    // Listen for purchases
    const qPurchases = query(comprasRef, orderBy('date', 'desc'));
    const unsubPurchases = onSnapshot(qPurchases, (snap) => {
      setPurchases(snap.docs.map(d => ({ id: d.id, ...d.data() } as Purchase)));
      setLoading(false);
    }, err => handleFirestoreError(err, OperationType.LIST, 'compras'));

    // Listen for products
    const qProducts = query(produtosRef, orderBy('name', 'asc'));
    const unsubProducts = onSnapshot(qProducts, (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'produtos'));

    return () => {
      unsubPurchases();
      unsubProducts();
    };
  }, []);

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      const matchesSearch = p.supplier_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = !dateFilter || p.date === dateFilter;
      return matchesSearch && matchesDate;
    });
  }, [purchases, searchTerm, dateFilter]);

  const handleAddItem = () => {
    setItems([...items, { product_id: '', product_name: '', quantity: 1, unit_cost: 0, cor: '', tamanho: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      newItems[index] = { 
        ...newItems[index], 
        product_id: value, 
        product_name: product?.name || '',
        cor: product?.cor || '',
        tamanho: product?.tamanho || ''
      };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setItems(newItems);
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSavePurchase = async () => {
    if (!supplier) return showNotification('Fornecedor é obrigatório', 'error');
    if (items.some(it => !it.product_id || !it.quantity || !it.unit_cost || !it.cor || !it.tamanho)) {
      return showNotification('Preencha todos os campos dos itens', 'error');
    }

    setSaving(true);
    try {
      await runTransaction(db, async (transaction) => {
        // 1. COLLECT ALL READS FIRST
        const uniqueProdIds = Array.from(new Set(items.map(it => it.product_id!)));
        const productRefsMap: Record<string, any> = {};
        const productDataMap: Record<string, Product> = {};

        for (const prodId of uniqueProdIds) {
          const prodRef = doc(db, "produtos", prodId);
          productRefsMap[prodId] = prodRef;
          const prodDoc = await transaction.get(prodRef);
          if (!prodDoc.exists()) {
            throw new Error(`Produto com ID ${prodId} não encontrado`);
          }
          productDataMap[prodId] = prodDoc.data() as Product;
        }

        // 2. PREPARE WRITES
        const purchaseItems: PurchaseItem[] = [];
        let totalValue = 0;
        
        // Track accumulated changes for each product (since multiple items can belong to same product)
        const updatedProducts: Record<string, Product> = JSON.parse(JSON.stringify(productDataMap));

        for (const item of items) {
          const prodId = item.product_id!;
          const prodData = updatedProducts[prodId];
          
          let newVariations = prodData.variations ? [...prodData.variations] : [];
          let currentStock = toNum(prodData.stock || 0);

          const variationIndex = newVariations.findIndex(
            v => v.cor === item.cor && v.tamanho === item.tamanho
          );

          if (variationIndex > -1) {
            newVariations[variationIndex] = {
              ...newVariations[variationIndex],
              estoque: toNum(newVariations[variationIndex].estoque) + toNum(item.quantity)
            };
          } else {
            newVariations.push({
              id: Math.random().toString(36).substr(2, 9),
              cor: item.cor!,
              tamanho: item.tamanho!,
              estoque: toNum(item.quantity)
            });
          }

          // Update local copy for further items or final write
          prodData.variations = newVariations;
          prodData.has_variations = true;
          prodData.stock = currentStock + toNum(item.quantity);
          prodData.last_purchase_date = purchaseDate;
          prodData.last_cost = toNum(item.unit_cost);

          const totalCost = toNum(item.quantity) * toNum(item.unit_cost);
          purchaseItems.push({
            product_id: prodId,
            product_name: item.product_name!,
            cor: item.cor!,
            tamanho: item.tamanho!,
            quantity: toNum(item.quantity),
            unit_cost: toNum(item.unit_cost),
            total_cost: totalCost
          });
          totalValue += totalCost;

          // Record movement
          const movementRef = doc(collection(db, 'estoque_movimentacoes'));
          transaction.set(movementRef, {
            product_id: prodId,
            produto: item.product_name,
            cor: item.cor,
            tamanho: item.tamanho,
            quantidade: toNum(item.quantity),
            tipo_movimento: 'reposicao',
            date: new Date().toISOString(),
            usuario: 'Sistema',
            observations: `Compra do fornecedor: ${supplier}`
          });
        }

        // 3. EXECUTE ALL REMAINING WRITES
        // Apply accumulated product updates
        for (const prodId of uniqueProdIds) {
          transaction.update(productRefsMap[prodId], updatedProducts[prodId] as any);
        }

        const newPurchaseRef = doc(collection(db, 'compras'));
        transaction.set(newPurchaseRef, {
          date: purchaseDate,
          supplier_name: supplier,
          observations: observations,
          items: purchaseItems,
          total_value: totalValue,
          status: 'active',
          created_at: new Date().toISOString()
        });
      });

      showNotification('Compra registrada com sucesso!', 'success');
      setActiveTab('history');
      // Reset form
      setSupplier('');
      setObservations('');
      setItems([{ product_id: '', product_name: '', quantity: 1, unit_cost: 0, cor: '', tamanho: '' }]);
    } catch (error) {
      console.error(error);
      showNotification('Erro ao salvar compra', 'error');
    } finally {
      setSaving(false);
    }
  };

  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  const handleCancelPurchase = async (purchase: Purchase) => {
    if (purchase.status === 'cancelled') return;
    
    setCancelling(true);
    try {
      await runTransaction(db, async (transaction) => {
        // 1. COLLECT ALL READS FIRST
        const uniqueProdIds = Array.from(new Set(purchase.items.map(it => it.product_id)));
        const productRefsMap: Record<string, any> = {};
        const productDataMap: Record<string, Product> = {};

        for (const prodId of uniqueProdIds) {
          const prodRef = doc(db, "produtos", prodId);
          productRefsMap[prodId] = prodRef;
          const prodDoc = await transaction.get(prodRef);
          if (prodDoc.exists()) {
            productDataMap[prodId] = prodDoc.data() as Product;
          }
        }

        // 2. PREPARE REVERSAL (Local only)
        const updatedProducts: Record<string, Product> = JSON.parse(JSON.stringify(productDataMap));
        const movements: any[] = [];

        for (const item of purchase.items) {
          const prodId = item.product_id;
          const prodData = updatedProducts[prodId];
          if (!prodData) continue;

          let newVariations = prodData.variations ? [...prodData.variations] : [];
          let currentStock = toNum(prodData.stock || 0);

          const variationIndex = newVariations.findIndex(
            v => v.cor === item.cor && v.tamanho === item.tamanho
          );

          if (variationIndex > -1) {
            const currentVarStock = toNum(newVariations[variationIndex].estoque);
            if (currentVarStock < item.quantity) {
              throw new Error(`Estoque insuficiente para o produto ${item.product_name} (${item.cor}/${item.tamanho}). Estoque atual: ${currentVarStock}, Necessário reverter: ${item.quantity}`);
            }
            newVariations[variationIndex] = {
              ...newVariations[variationIndex],
              estoque: currentVarStock - item.quantity
            };
          } else {
            throw new Error(`Variação ${item.cor}/${item.tamanho} não encontrada para o produto ${item.product_name}`);
          }

          prodData.variations = newVariations;
          prodData.stock = currentStock - item.quantity;
          
          // Prepare movement
          movements.push({
            product_id: prodId,
            produto: item.product_name,
            cor: item.cor,
            tamanho: item.tamanho,
            quantidade: -item.quantity,
            tipo_movimento: 'reversao_compra',
            date: new Date().toISOString(),
            usuario: 'Sistema',
            observations: `Cancelamento de compra ID: ${purchase.id}`
          });
        }

        // 3. EXECUTE ALL WRITES (MUST BE AT THE END)
        for (const prodId of uniqueProdIds) {
          if (productRefsMap[prodId] && updatedProducts[prodId]) {
            transaction.update(productRefsMap[prodId], updatedProducts[prodId] as any);
          }
        }

        for (const mov of movements) {
          const movementRef = doc(collection(db, 'estoque_movimentacoes'));
          transaction.set(movementRef, mov);
        }

        const purchaseRef = doc(db, 'compras', purchase.id);
        transaction.update(purchaseRef, { status: 'cancelled' });
      });

      showNotification('Compra cancelada e estoque revertido!', 'success');
      setSelectedPurchase(null);
      setShowConfirmCancel(false);
    } catch (error: any) {
      console.error(error);
      const errorMessage = error.code === 'permission-denied' 
        ? 'Sem permissão para cancelar compras.' 
        : (error.message || 'Erro ao cancelar compra');
      showNotification(errorMessage, 'error');
    } finally {
      setCancelling(false);
    }
  };

  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  return (
    <div className="space-y-6">
      {/* Header Tabs */}
      <div className="flex gap-2 p-1 bg-slate-900/50 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
            activeTab === 'history' 
            ? 'bg-white text-slate-900 shadow-lg' 
            : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <HistoryIcon className="w-4 h-4" />
          Histórico
        </button>
        <button
          onClick={() => setActiveTab('new')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
            activeTab === 'new' 
            ? 'bg-white text-slate-900 shadow-lg' 
            : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          Nova Compra
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'history' ? (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="BUSCAR POR FORNECEDOR..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white rounded-xl text-xs font-bold border-2 border-slate-100 focus:border-slate-900 transition-all uppercase tracking-widest outline-none"
                />
              </div>
              <div className="w-full md:w-48 relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white rounded-xl text-xs font-bold border-2 border-slate-100 focus:border-slate-900 transition-all outline-none"
                />
              </div>
              { (searchTerm || dateFilter) && (
                <button
                  onClick={() => { setSearchTerm(''); setDateFilter(''); }}
                  className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200"
                >
                  Limpar
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPurchases.map((purchase) => (
                <Card 
                  key={purchase.id} 
                  className="group hover:shadow-xl transition-all cursor-pointer p-0 overflow-hidden border-2 border-transparent hover:border-slate-900"
                  onClick={() => setSelectedPurchase(purchase)}
                >
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Truck className="w-4 h-4 text-slate-600" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fornecedor</p>
                          <h3 className="text-sm font-black text-slate-900 uppercase truncate max-w-[150px]">{purchase.supplier_name}</h3>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-black px-2 py-1 bg-slate-100 rounded-md uppercase">
                          {new Date(purchase.date).toLocaleDateString('pt-BR')}
                        </span>
                        {purchase.status === 'cancelled' ? (
                          <span className="text-[8px] font-black px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded-sm uppercase tracking-tighter">Cancelada</span>
                        ) : (
                          <span className="text-[8px] font-black px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded-sm uppercase tracking-tighter">Ativa</span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-end pt-2 border-t border-slate-50">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Total</p>
                        <p className="text-lg font-black text-slate-900">{formatCurrency(purchase.total_value)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens</p>
                        <p className="text-sm font-black text-slate-900">{purchase.items.length}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {filteredPurchases.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border-2 border-dashed border-slate-100">
                <HistoryIcon className="w-12 h-12 text-slate-200 mb-4" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhuma compra encontrada</p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="new"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <Card className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Fornecedor *</label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="NOME DO FORNECEDOR"
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold border-2 border-transparent focus:border-slate-900 transition-all uppercase tracking-widest outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Data da Compra *</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold border-2 border-transparent focus:border-slate-900 transition-all outline-none"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Observações</label>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="EX: COMPRA DE REPOSIÇÃO PARA O INVERNO"
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold border-2 border-transparent focus:border-slate-900 transition-all uppercase tracking-widest outline-none min-h-[80px]"
                />
              </div>
            </Card>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Produtos da Compra</h3>
                <button
                  onClick={handleAddItem}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                >
                  <Plus className="w-3 h-3" />
                  Adicionar Item
                </button>
              </div>

              {items.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Card className="p-4 relative">
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-4 items-end pr-8">
                      <div className="lg:col-span-4">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Produto *</label>
                        <select
                          value={item.product_id}
                          onChange={(e) => handleUpdateItem(index, 'product_id', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 rounded-lg text-[11px] font-bold border-2 border-transparent focus:border-slate-900 transition-all outline-none"
                        >
                          <option value="">SELECIONE UM PRODUTO</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>

                      <div className="lg:col-span-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Cor *</label>
                        <input
                          type="text"
                          value={item.cor}
                          onChange={(e) => handleUpdateItem(index, 'cor', e.target.value.toUpperCase())}
                          placeholder="COR"
                          className="w-full px-3 py-2 bg-slate-50 rounded-lg text-[11px] font-bold border-2 border-transparent focus:border-slate-900 transition-all outline-none"
                        />
                      </div>

                      <div className="lg:col-span-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tamanho *</label>
                        <input
                          type="text"
                          value={item.tamanho}
                          onChange={(e) => handleUpdateItem(index, 'tamanho', e.target.value.toUpperCase())}
                          placeholder="TAM"
                          className="w-full px-3 py-2 bg-slate-50 rounded-lg text-[11px] font-bold border-2 border-transparent focus:border-slate-900 transition-all outline-none"
                        />
                      </div>

                      <div className="lg:col-span-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Qtd *</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(index, 'quantity', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 rounded-lg text-[11px] font-bold border-2 border-transparent focus:border-slate-900 transition-all outline-none"
                        />
                      </div>

                      <div className="lg:col-span-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Custo Unit *</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">R$</span>
                          <input
                            type="number"
                            value={item.unit_cost}
                            onChange={(e) => handleUpdateItem(index, 'unit_cost', e.target.value)}
                            className="w-full pl-7 pr-3 py-2 bg-slate-50 rounded-lg text-[11px] font-bold border-2 border-transparent focus:border-slate-900 transition-all outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900 p-6 rounded-2xl shadow-xl gap-4">
              <div className="text-center md:text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total da Compra</p>
                <p className="text-3xl font-black text-white">
                  {formatCurrency(items.reduce((sum, it) => sum + (toNum(it.quantity) * toNum(it.unit_cost)), 0))}
                </p>
              </div>
              <button
                onClick={handleSavePurchase}
                disabled={saving}
                className={`flex items-center gap-3 px-8 py-4 bg-white text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none`}
              >
                {saving ? (
                  <>
                    <TrendingDown className="w-4 h-4 animate-bounce" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Finalizar Compra
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Detalhes */}
      {selectedPurchase && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalhes da Compra</p>
                <h3 className="text-lg font-black uppercase">{selectedPurchase.supplier_name}</h3>
              </div>
              <button 
                onClick={() => setSelectedPurchase(null)}
                className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data</p>
                  <p className="text-sm font-bold">{new Date(selectedPurchase.date).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total</p>
                  <p className="text-sm font-bold text-slate-900">{formatCurrency(selectedPurchase.total_value)}</p>
                </div>
                {selectedPurchase.observations && (
                  <div className="w-full">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Observações</p>
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">{selectedPurchase.observations}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Produtos</p>
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 text-slate-400 uppercase font-black">
                      <tr>
                        <th className="p-3">Produto</th>
                        <th className="p-3">Var</th>
                        <th className="p-3 text-center">Qtd</th>
                        <th className="p-3 text-right">Custo</th>
                        <th className="p-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {selectedPurchase.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-slate-900">{item.product_name}</td>
                          <td className="p-3 font-medium text-slate-500">{item.cor} / {item.tamanho}</td>
                          <td className="p-3 text-center font-bold">{item.quantity}</td>
                          <td className="p-3 text-right text-slate-500">{formatCurrency(item.unit_cost)}</td>
                          <td className="p-3 text-right font-black text-slate-900">{formatCurrency(item.total_cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between gap-3">
              {selectedPurchase.status !== 'cancelled' && (
                <div className="flex gap-2 w-full sm:w-auto">
                  {showConfirmCancel ? (
                    <>
                      <button
                        onClick={() => handleCancelPurchase(selectedPurchase)}
                        disabled={cancelling}
                        className="flex-1 sm:flex-none px-6 py-2.5 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
                      >
                        {cancelling ? 'PROCESSANDO...' : 'CONFIRMAR CANCELAMENTO'}
                      </button>
                      <button
                        onClick={() => setShowConfirmCancel(false)}
                        disabled={cancelling}
                        className="flex-1 sm:flex-none px-6 py-2.5 bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-300 transition-all"
                      >
                        VOLTAR
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setShowConfirmCancel(true)}
                      className="w-full sm:w-auto px-6 py-2.5 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-100"
                    >
                      CANCELAR COMPRA
                    </button>
                  )}
                </div>
              )}
              <button
                onClick={() => {
                  setSelectedPurchase(null);
                  setShowConfirmCancel(false);
                }}
                className="ml-auto px-6 py-2.5 bg-white border-2 border-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              notification.type === 'success' 
                ? 'bg-emerald-500 text-white border-emerald-400' 
                : 'bg-rose-500 text-white border-rose-400'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-xs font-black uppercase tracking-widest">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
