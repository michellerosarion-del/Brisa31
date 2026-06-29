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
  gastosRef,
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
  collection,
  deleteDoc
} from 'firebase/firestore';
import { Card } from '../../components/ui/Card';
import { Product, Purchase, PurchaseItem, Expense } from '../../types';
import { toNum, formatCurrency } from '../../lib/utils';

export const Purchases = () => {
  const [activeTab, setActiveTab] = useState<'history' | 'new'>('history');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Form state
  const [supplier, setSupplier] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [freightTotal, setFreightTotal] = useState<number>(0);
  const [observations, setObservations] = useState('');
  const [items, setItems] = useState<Partial<PurchaseItem>[]>([
    { product_id: '', product_name: '', quantity: 1, unit_cost: 0, cor: '', tamanho: '' }
  ]);
  const [saving, setSaving] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    // Listen for purchases
    const qPurchases = query(comprasRef, orderBy('date', 'desc'));
    const unsubPurchases = onSnapshot(qPurchases, (snap) => {
      setPurchases(snap.docs.map(d => ({ id: d.id, ...d.data() } as Purchase)));
      setLoading(false);
    }, err => handleFirestoreError(err, OperationType.LIST, 'compras'));

    // Listen for expenses (to find old stock entries)
    const unsubExpenses = onSnapshot(gastosRef, (snap) => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'gastos'));

    // Listen for products
    const qProducts = query(produtosRef, orderBy('name', 'asc'));
    const unsubProducts = onSnapshot(qProducts, (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'produtos'));

    return () => {
      unsubPurchases();
      unsubExpenses();
      unsubProducts();
    };
  }, []);

  // Unified list of purchases and "stock expenses"
  const unifiedPurchases = useMemo(() => {
    // 1. Regular purchases
    const regular = purchases.map(p => ({ ...p, _type: 'purchase' as const }));

    // 2. Old stock expenses (where category or description suggests it is a purchase)
    const stockExpenses = expenses
      .filter(e => {
        const cat = (e.category || '').toLowerCase();
        const desc = (e.description || '').toLowerCase();
        const type = (e.type || '').toLowerCase();
        return (cat.includes('estoque') || desc.includes('compra') || type.includes('estoque')) && e.flow_type !== 'entrada';
      })
      .map(e => ({
        id: e.id,
        date: e.date,
        supplier_name: e.description,
        total_value: e.value,
        items: [],
        observations: e.observations || `Lançamento antigo (Categoria: ${e.category || 'N/A'})`,
        status: 'active' as const,
        created_at: e.date,
        _type: 'expense_migration' as const,
        _original: e
      } as any));

    // Combine and sort
    return [...regular, ...stockExpenses].sort((a, b) => b.date.localeCompare(a.date));
  }, [purchases, expenses]);

  const filteredPurchases = useMemo(() => {
    return unifiedPurchases.filter((p: any) => {
      const matchesSearch = p.supplier_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = !dateFilter || p.date === dateFilter;
      return matchesSearch && matchesDate;
    });
  }, [unifiedPurchases, searchTerm, dateFilter]);

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
      const totalQuantity = items.reduce((sum, it) => sum + toNum(it.quantity), 0);
      const propFreightPerPiece = totalQuantity > 0 ? toNum(freightTotal) / totalQuantity : 0;

      let totalValue = 0;
      const purchaseItems: PurchaseItem[] = items.map(item => {
        const itemTotalCost = toNum(item.quantity) * toNum(item.unit_cost);
        totalValue += itemTotalCost;
        
        const itemFreight = toNum(item.quantity) * propFreightPerPiece;
        
        return {
          product_id: item.product_id!,
          product_name: item.product_name!,
          cor: item.cor!,
          tamanho: item.tamanho!,
          quantity: toNum(item.quantity),
          unit_cost: toNum(item.unit_cost),
          total_cost: itemTotalCost,
          proportional_freight: itemFreight,
          effective_unit_cost: toNum(item.unit_cost) + propFreightPerPiece
        };
      });

      const purchaseData: Partial<Purchase> = {
        date: purchaseDate,
        supplier_name: supplier,
        observations: observations,
        items: purchaseItems,
        total_value: totalValue,
        freight_total: toNum(freightTotal),
        estimated_delivery: estimatedDelivery,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      await addDoc(comprasRef, purchaseData);

      showNotification('Pedido de compra criado como PENDENTE!', 'success');
      setActiveTab('history');
      // Reset form
      setSupplier('');
      setObservations('');
      setFreightTotal(0);
      setEstimatedDelivery('');
      setItems([{ product_id: '', product_name: '', quantity: 1, unit_cost: 0, cor: '', tamanho: '' }]);
    } catch (error) {
      console.error(error);
      showNotification('Erro ao salvar pedido de compra', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReceivePurchase = async (purchase: Purchase) => {
    if (purchase.status !== 'pending') return;
    
    setReceiving(true);
    try {
      await runTransaction(db, async (transaction) => {
        // 1. READ TARGET PURCHASE FIRST TO PREVENT CONCURRENT DOUBLE PROCESSES
        const purchaseRef = doc(db, 'compras', purchase.id);
        const purchaseDoc = await transaction.get(purchaseRef);
        if (!purchaseDoc.exists()) {
          throw new Error('purchase_not_found');
        }
        
        const purchaseCurrentData = purchaseDoc.data();
        if (purchaseCurrentData?.status !== 'pending') {
          throw new Error('already_received');
        }

        // 2. COLLECT ALL PRODUCT READS (Firestore requires all reads first)
        const uniqueProdIds = Array.from(new Set(purchase.items.map(it => it.product_id)));
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

        // 3. PREPARE WRITES
        const updatedProducts: Record<string, Product> = JSON.parse(JSON.stringify(productDataMap));

        for (const item of purchase.items) {
          const prodId = item.product_id;
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
              cor: item.cor,
              tamanho: item.tamanho,
              estoque: toNum(item.quantity)
            });
          }

          // Update local copy
          prodData.variations = newVariations;
          prodData.has_variations = true;
          prodData.stock = currentStock + toNum(item.quantity);
          prodData.last_purchase_date = purchase.date;
          // IMPORTANT: Update cost with effective cost (unit + freight)
          prodData.last_cost = toNum(item.effective_unit_cost || item.unit_cost);
          prodData.cost = toNum(item.effective_unit_cost || item.unit_cost);

          // Record movement
          const movementRef = doc(collection(db, 'estoque_movimentacoes'));
          transaction.set(movementRef, {
            product_id: prodId,
            produto: item.product_name,
            marca: prodData.brand || '',
            cor: item.cor,
            tamanho: item.tamanho,
            quantidade: toNum(item.quantity),
            tipo: 'entrada',
            origem: 'compra',
            date: new Date().toISOString(),
            usuario: 'Sistema',
            observacao: `Recebimento de compra: ${purchase.supplier_name}`,
            reference_id: purchase.id
          });
        }

        // 4. EXECUTE UPDATES
        for (const prodId of uniqueProdIds) {
          transaction.update(productRefsMap[prodId], updatedProducts[prodId] as any);
        }

        transaction.update(purchaseRef, { 
          status: 'received',
          received_at: new Date().toISOString()
        });
      });

      showNotification('Mercadoria recebida e estoque atualizado!', 'success');
      setSelectedPurchase(prev => prev ? { ...prev, status: 'received' } as Purchase : null);
    } catch (error: any) {
      console.error(error);
      if (error.message === 'already_received') {
        showNotification('Esta compra já foi recebida!', 'error');
      } else if (error.message === 'purchase_not_found') {
        showNotification('Compra não encontrada no banco de dados', 'error');
      } else {
        showNotification('Erro ao receber mercadoria', 'error');
      }
    } finally {
      setReceiving(false);
    }
  };

  // Modal state for quick product creation
  const [showQuickProduct, setShowQuickProduct] = useState(false);
  const [quickProductIndex, setQuickProductIndex] = useState<number | null>(null);
  const [quickProductData, setQuickProductData] = useState({ name: '', category: '', price: '' as any });

  const handleQuickProductSave = async () => {
    if (!quickProductData.name) return showNotification('Nome é obrigatório', 'error');
    
    try {
      const docRef = await addDoc(produtosRef, {
        ...quickProductData,
        price: toNum(quickProductData.price),
        stock: 0,
        variations: [],
        has_variations: false,
        created_at: new Date().toISOString()
      });
      
      if (quickProductIndex !== null) {
        handleUpdateItem(quickProductIndex, 'product_id', docRef.id);
      }
      
      setShowQuickProduct(false);
      setQuickProductData({ name: '', category: '', price: 0 });
      showNotification('Produto criado!', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'produtos');
    }
  };

  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  const handleCancelPurchase = async (purchase: Purchase) => {
    if (purchase.status === 'cancelled') return;
    
    setCancelling(true);
    try {
      if (purchase.status === 'pending') {
        // Just cancel the order, no stock to reverse
        const purchaseRef = doc(db, 'compras', purchase.id);
        await updateDoc(purchaseRef, { status: 'cancelled' });
        showNotification('Pedido de compra cancelado!', 'success');
      } else {
        // Reverse stock for received or active (legacy) purchases
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
            const movementRef = doc(collection(db, 'estoque_movimentacoes'));
            movements.push({
              ref: movementRef,
              data: {
                product_id: prodId,
                produto: item.product_name,
                marca: prodData.brand || '',
                cor: item.cor,
                tamanho: item.tamanho,
                quantidade: item.quantity,
                tipo: 'saída',
                origem: 'ajuste manual',
                date: new Date().toISOString(),
                usuario: 'Sistema',
                observacao: `Cancelamento de compra ID: ${purchase.id}`,
                reference_id: purchase.id
              }
            });
          }

          // 3. EXECUTE ALL WRITES
          for (const prodId of uniqueProdIds) {
            if (productRefsMap[prodId] && updatedProducts[prodId]) {
              transaction.update(productRefsMap[prodId], updatedProducts[prodId] as any);
            }
          }

          for (const mov of movements) {
            transaction.set(mov.ref, mov.data);
          }

          const purchaseRef = doc(db, 'compras', purchase.id);
          transaction.update(purchaseRef, { status: 'cancelled' });
        });
        showNotification('Compra cancelada e estoque revertido!', 'success');
      }
      
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
                          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Fornecedor</p>
                          <h3 className="text-sm font-black text-slate-900 uppercase truncate max-w-[150px]">{purchase.supplier_name}</h3>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-black px-2 py-1 bg-slate-100 rounded-md uppercase">
                          {new Date((purchase as any).date).toLocaleDateString('pt-BR')}
                        </span>
                        <div className="flex gap-1">
                          {(purchase as any)._type === 'expense_migration' && (
                            <span className="text-[8px] font-black px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded-sm uppercase tracking-tighter">Lançamento Antigo</span>
                          )}
                          {purchase.status === 'cancelled' && (
                            <span className="text-[8px] font-black px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded-sm uppercase tracking-tighter">Cancelada</span>
                          )}
                          {(purchase.status === 'received' || (purchase as any).status === 'active') && (
                            <span className="text-[8px] font-black px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded-sm uppercase tracking-tighter">Recebida</span>
                          )}
                          {purchase.status === 'pending' && (
                            <span className="text-[8px] font-black px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded-sm uppercase tracking-tighter">Pendente</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-end pt-2 border-t border-slate-50">
                      <div>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Valor Total</p>
                        <p className="text-lg font-black text-slate-900">{formatCurrency(purchase.total_value)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Itens</p>
                        <p className="text-sm font-black text-slate-900">{purchase.items.length}</p>
                      </div>
                    </div>
                    
                    {purchase.status === 'pending' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReceivePurchase(purchase);
                        }}
                        disabled={receiving}
                        className="w-full mt-2 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {receiving ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            RECEBENDO...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Receber Mercadoria
                          </>
                        )}
                      </button>
                    )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Data do Pedido *</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold border-2 border-transparent focus:border-slate-900 transition-all outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Previsão Entrega</label>
                <input
                  type="date"
                  value={estimatedDelivery}
                  onChange={(e) => setEstimatedDelivery(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold border-2 border-transparent focus:border-slate-900 transition-all outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Frete Total (Pedido)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">R$</span>
                  <input
                    type="number"
                    value={freightTotal}
                    onChange={(e) => setFreightTotal(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-xl text-xs font-bold border-2 border-transparent focus:border-slate-900 transition-all outline-none"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Observações</label>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="EX: COMPRA DE REPOSIÇÃO PARA O INVERNO"
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold border-2 border-transparent focus:border-slate-900 transition-all uppercase tracking-widest outline-none min-h-[80px]"
                />
              </div>
              <div className="bg-emerald-50 rounded-2xl p-4 flex flex-col justify-center border border-emerald-100">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 text-center">Impacto Logístico</p>
                <div className="flex justify-between items-end">
                   <div>
                      <p className="text-[9px] font-bold text-emerald-400 uppercase">Qtd Total</p>
                      <p className="text-xl font-black text-emerald-700">{items.reduce((sum, it) => sum + toNum(it.quantity), 0)} pçs</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[9px] font-bold text-emerald-400 uppercase">Frete/Peça</p>
                      <p className="text-xl font-black text-emerald-700">
                        {formatCurrency(items.reduce((sum, it) => sum + toNum(it.quantity), 0) > 0 
                          ? toNum(freightTotal) / items.reduce((sum, it) => sum + toNum(it.quantity), 0) 
                          : 0)}
                      </p>
                   </div>
                </div>
                <p className="text-[9px] text-emerald-500 font-medium italic mt-2 text-center">* Custo real = valor prod + frete proporcional</p>
              </div>
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
                        <div className="flex gap-2">
                          <select
                            value={item.product_id}
                            onChange={(e) => handleUpdateItem(index, 'product_id', e.target.value)}
                            className="flex-1 px-3 py-2 bg-slate-50 rounded-lg text-[11px] font-bold border-2 border-transparent focus:border-slate-900 transition-all outline-none"
                          >
                            <option value="">SELECIONE UM PRODUTO</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickProductIndex(index);
                              setShowQuickProduct(true);
                            }}
                            className="px-2 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all"
                            title="Novo Produto"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                        </div>
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
      <AnimatePresence>
        {selectedPurchase && (
          <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4 sm:p-6"
            onClick={() => setSelectedPurchase(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl max-h-[95vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-slate-900 p-6 sm:p-8 text-white flex justify-between items-center shrink-0">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {(selectedPurchase as any)._type === 'expense_migration' ? 'Lançamento Antigo de Estoque' : 'Detalhes da Compra'}
                </p>
                <h3 className="text-lg font-black uppercase">{selectedPurchase.supplier_name}</h3>
              </div>
              <button 
                onClick={() => setSelectedPurchase(null)}
                className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
              <div className="p-6 sm:p-8 space-y-8 overflow-y-auto custom-scrollbar">
                {/* Order Flow Indicator */}
              <div className="flex items-center justify-between px-4 mb-8">
                <div className="flex flex-col items-center gap-2 relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 ${selectedPurchase.status !== 'cancelled' ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-tighter text-slate-900">Pedido Feito</span>
                  <div className={`absolute left-full top-5 w-[calc(100%+32px)] h-0.5 -translate-x-1/2 ${selectedPurchase.status === 'received' ? 'bg-emerald-500' : 'bg-slate-100'}`} style={{ width: '400%' }} />
                </div>
                
                <div className="flex flex-col items-center gap-2 relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 transition-all ${
                    selectedPurchase.status === 'received' 
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200' 
                    : selectedPurchase.status === 'pending'
                    ? 'bg-white border-amber-500 text-amber-500 animate-pulse'
                    : 'bg-slate-100 border-slate-200 text-slate-400'
                  }`}>
                    <Truck className="w-5 h-5" />
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-tighter ${selectedPurchase.status === 'pending' ? 'text-amber-600' : 'text-slate-900'}`}>Em Trânsito</span>
                </div>

                <div className="flex flex-col items-center gap-2 relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 transition-all ${
                    selectedPurchase.status === 'received' 
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200' 
                    : 'bg-slate-100 border-slate-200 text-slate-400'
                  }`}>
                    <Package className="w-5 h-5" />
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-tighter ${selectedPurchase.status === 'received' ? 'text-emerald-700' : 'text-slate-900'}`}>Recebido</span>
                </div>
              </div>

              {(selectedPurchase as any)._type === 'expense_migration' && (
                <div className="bg-amber-50 border-2 border-amber-100 p-4 rounded-2xl flex gap-4 items-center">
                  <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-0.5">Nota de Histórico</p>
                    <p className="text-xs text-amber-800 leading-relaxed font-medium">Este é um registro antigo do módulo de Despesas. Para adicionar itens e ter controle total de estoque, utilize a função de migração.</p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-6 border-b border-slate-50 pb-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data Pedido</p>
                  <p className="text-sm font-bold">{new Date(selectedPurchase.date).toLocaleDateString('pt-BR')}</p>
                </div>
                {selectedPurchase.status === 'received' && selectedPurchase.received_at && (
                  <div>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Data Recebimento</p>
                    <p className="text-sm font-bold text-emerald-600">{new Date(selectedPurchase.received_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                )}
                {selectedPurchase.status === 'pending' && selectedPurchase.estimated_delivery && (
                  <div>
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Previsão Entrega</p>
                    <p className="text-sm font-bold text-amber-600">{new Date(selectedPurchase.estimated_delivery).toLocaleDateString('pt-BR')}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mercadoria (Subtotal)</p>
                  <p className="text-sm font-bold text-slate-900">{formatCurrency(selectedPurchase.total_value)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Frete Total</p>
                  <p className="text-sm font-bold text-slate-900">{formatCurrency(selectedPurchase.freight_total || 0)}</p>
                </div>
                <div className="bg-slate-900 text-white px-4 py-2 rounded-xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Pedido</p>
                  <p className="text-base font-black">{formatCurrency(selectedPurchase.total_value + (selectedPurchase.freight_total || 0))}</p>
                </div>
                {selectedPurchase.observations && (
                  <div className="w-full">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Observações</p>
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">{selectedPurchase.observations}</p>
                  </div>
                )}
              </div>

              {selectedPurchase.items && selectedPurchase.items.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Detalhamento dos Itens</p>
                  <div className="border border-slate-100 rounded-[2rem] overflow-hidden bg-slate-50/30">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[11px] min-w-[700px]">
                        <thead className="bg-slate-100/50 text-slate-500 uppercase font-black border-b border-white">
                          <tr>
                            <th className="p-4 pl-6">Produto / Especificação</th>
                            <th className="p-4 text-center">Qtd</th>
                            <th className="p-4 text-right">Custo Un</th>
                            <th className="p-4 text-right text-emerald-600">Frete/Un</th>
                            <th className="p-4 pr-6 text-right text-slate-900">Custo Final</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white">
                          {selectedPurchase.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-white transition-colors">
                              <td className="p-4 pl-6">
                                <p className="font-black text-slate-900 text-xs">{item.product_name}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">{item.cor} • {item.tamanho}</p>
                              </td>
                              <td className="p-4 text-center">
                                <span className="inline-flex px-2 py-1 bg-slate-200/50 rounded-lg font-black text-slate-700">{item.quantity}</span>
                              </td>
                              <td className="p-4 text-right font-bold text-slate-500">{formatCurrency(item.unit_cost)}</td>
                              <td className="p-4 text-right text-emerald-600 font-bold">
                                {formatCurrency((item.proportional_freight || 0) / item.quantity)}
                              </td>
                              <td className="p-4 pr-6 text-right font-black text-slate-900 text-xs">
                                {formatCurrency((item.effective_unit_cost || item.unit_cost) * item.quantity)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                  <Package className="w-8 h-8 text-slate-200 mb-2" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sem detalhamento de itens</p>
                </div>
              )}
            </div>

            <div className="p-6 sm:p-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between gap-4 shrink-0">
              <div className="flex gap-2 w-full sm:w-auto">
                {selectedPurchase.status === 'pending' && (
                  <button
                    onClick={() => handleReceivePurchase(selectedPurchase)}
                    disabled={receiving}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {receiving ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        RECEBENDO...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        RECEBER MERCADORIA
                      </>
                    )}
                  </button>
                )}
                
                {(selectedPurchase as any)._type === 'expense_migration' ? (
                  <button
                    onClick={() => {
                      setSupplier(selectedPurchase.supplier_name);
                      setPurchaseDate(selectedPurchase.date);
                      setObservations(`Migrado de: ${selectedPurchase.observations}`);
                      setItems([{ 
                        product_id: '', 
                        product_name: '', 
                        quantity: 1, 
                        unit_cost: selectedPurchase.total_value, 
                        cor: '', 
                        tamanho: '' 
                      }]);
                      
                      // Custom flag to delete old expense after successful save
                      (window as any)._migratingExpenseId = selectedPurchase.id;
                      
                      setActiveTab('new');
                      setSelectedPurchase(null);
                    }}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                  >
                    Converter para Nova Compra
                  </button>
                ) : selectedPurchase.status !== 'cancelled' && (
                  <>
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
                  </>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedPurchase(null);
                  setShowConfirmCancel(false);
                }}
                className="ml-auto px-10 py-3.5 bg-white border-2 border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
        )}
      </AnimatePresence>

      {/* Modal Quick Product */}
      {showQuickProduct && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl"
          >
            <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cadastro Rápido</p>
                <h3 className="text-sm font-black uppercase">Novo Produto</h3>
              </div>
              <button 
                onClick={() => setShowQuickProduct(false)}
                className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nome</label>
                <input
                  type="text"
                  placeholder="NOME DO PRODUTO"
                  value={quickProductData.name}
                  onChange={e => setQuickProductData({ ...quickProductData, name: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold border-2 border-transparent focus:border-slate-900 transition-all outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Categoria</label>
                <input
                  type="text"
                  placeholder="EX: VESTIDO, CALÇA"
                  value={quickProductData.category}
                  onChange={e => setQuickProductData({ ...quickProductData, category: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold border-2 border-transparent focus:border-slate-900 transition-all outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Preço de Venda</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={quickProductData.price || ''}
                  onChange={e => {
                    const val = e.target.value;
                    if (/^-?\d*[.,]?\d*$/.test(val) || val === '') {
                      setQuickProductData({ ...quickProductData, price: val as any });
                    }
                  }}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold border-2 border-transparent focus:border-slate-900 transition-all outline-none"
                />
              </div>
            </div>

            <div className="p-5 bg-slate-50 flex gap-2">
              <button
                onClick={() => setShowQuickProduct(false)}
                className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                onClick={handleQuickProductSave}
                className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                Salvar
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
