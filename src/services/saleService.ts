import { 
  db, 
  vendasRef,
  estoqueMovimentacoesRef,
  OperationType,
  handleFirestoreError
} from '../firebase';
import { 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  runTransaction
} from 'firebase/firestore';
import { toNum, getLocalDate, isSaleCompleted } from '../lib/utils';
import { Sale, Product } from '../types';

export const SaleService = {
  async completeSale(params: {
    cart: any[],
    editingSale: Sale | null,
    user: any,
    saleDiscount: string,
    saleDiscountType: 'value' | 'percentage',
    paymentMethod: string,
    sellerName: string,
    finalValue: number,
    customerId?: string,
    customerName?: string,
    installments?: number,
    grossValue?: number,
    netValue?: number,
    feeValue?: number,
    feePercentage?: number,
    adjustment?: number,
    payments?: any[]
  }) {
    const { cart, editingSale, user, saleDiscount, saleDiscountType, sellerName, customerId, customerName, installments, grossValue, netValue, feeValue, feePercentage, adjustment, payments } = params;
    
    if (cart.length === 0) return;

    const saleDate = editingSale ? editingSale.date : getLocalDate();
    const totalCostItems = cart.reduce((sum, item) => sum + ((toNum(item.cost) + toNum(item.frete)) * toNum(item.quantity)), 0);

    const saleData: any = {
      customer_id: customerId || 'consumidor-final',
      customer_name: customerName || 'Consumidor Final',
      date: saleDate,
      payment_method: params.paymentMethod,
      payments: payments || [],
      seller_id: user?.id || 'manual',
      seller_name: sellerName || 'Sistema',
      status: 'concluida',
      items: cart.map(item => ({
        ...item,
        status: 'concluido',
        cost: toNum(item.cost) || 0,
        frete: toNum(item.frete) || 0
      })),
      subtotal: toNum(cart.reduce((sum, i) => sum + (toNum(i.unit_price) * toNum(i.quantity)), 0)),
      discount_value: toNum(saleDiscount) || 0,
      discount_type: saleDiscountType,
      valor_bruto: toNum(grossValue) || 0,
      adjustment: toNum(adjustment) || 0,
      valor_liquido: toNum(netValue) || 0,
      tax_value: toNum(feeValue) || 0,
      installment_fee_value: toNum(feeValue) || 0,
      installment_fee_percentage: toNum(feePercentage) || 0,
      total_cost: toNum(totalCostItems) || 0,
      profit: (toNum(netValue) || 0) - (toNum(totalCostItems) || 0),
      installments: toNum(installments) || 1,
      createdAt: new Date().toISOString()
    };

    return runTransaction(db, async (transaction) => {
      const productIds = new Set<string>();
      if (editingSale) {
        editingSale.items.forEach(i => productIds.add(i.product_id));
      }
      cart.forEach(i => productIds.add(i.product_id));

      const productSnaps = new Map<string, any>();
      for (const pid of productIds) {
        const snap = await transaction.get(doc(db, 'produtos', pid));
        if (snap.exists()) {
          productSnaps.set(pid, snap.data());
        }
      }

      if (editingSale) {
        for (const oldItem of editingSale.items) {
          if (oldItem.status === 'cancelado') continue;
          const pData = productSnaps.get(oldItem.product_id);
          if (pData) {
            const newStock = toNum(pData.stock) + toNum(oldItem.quantity);
            pData.stock = newStock;
            
            const updateObj: any = { stock: newStock };
            if (pData.variations && oldItem.variation_id) {
              pData.variations = pData.variations.map((v: any) => 
                v.id === oldItem.variation_id ? { ...v, estoque: toNum(v.estoque) + toNum(oldItem.quantity) } : v
              );
              updateObj.variations = pData.variations;
            }
            transaction.update(doc(db, 'produtos', oldItem.product_id), updateObj);
          }
        }
      }

      for (const item of cart) {
        const pData = productSnaps.get(item.product_id);
        if (pData) {
          const newStock = toNum(pData.stock) - toNum(item.quantity);
          pData.stock = newStock;
          
          const updateObj: any = { stock: newStock };
          if (pData.variations && item.variation_id) {
            pData.variations = pData.variations.map((v: any) => 
              v.id === item.variation_id ? { ...v, estoque: toNum(v.estoque) - toNum(item.quantity) } : v
            );
            updateObj.variations = pData.variations;
          }
          transaction.update(doc(db, 'produtos', item.product_id), updateObj);

          transaction.set(doc(estoqueMovimentacoesRef), {
            product_id: item.product_id,
            produto: item.product_name,
            marca: pData.brand || '',
            cor: item.cor,
            tamanho: item.tamanho,
            quantidade: item.quantity,
            tipo: 'saída',
            origem: 'venda',
            usuario: user?.name || sellerName || 'Sistema',
            date: saleDate,
            createdAt: new Date().toISOString(),
            variation_id: item.variation_id || null,
            reference_id: editingSale ? editingSale.id : null
          });
        }
      }

      // 7. Update Customer Statistics
      if (customerId && customerId !== 'consumidor-final') {
        const customerRef = doc(db, 'clientes', customerId);
        const customerDoc = await transaction.get(customerRef);
        
        if (customerDoc.exists()) {
          const customerData = customerDoc.data();
          const currentSpent = toNum(customerData.total_spent || 0);
          const currentPurchases = toNum(customerData.total_purchases || 0);
          
          let spentIncrement = toNum(grossValue);
          let purchaseIncrement = 1;

          if (editingSale) {
            const oldGross = toNum(editingSale.valor_bruto);
            spentIncrement = toNum(grossValue) - oldGross;
            purchaseIncrement = 0; // Don't count as new purchase on edit
          }

          transaction.update(customerRef, {
            total_spent: Math.max(0, currentSpent + spentIncrement),
            total_purchases: Math.max(0, currentPurchases + purchaseIncrement),
            last_purchase: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }

      if (editingSale) {
        transaction.set(doc(db, 'vendas', editingSale.id), saleData);
      } else {
        transaction.set(doc(vendasRef), saleData);
      }
    });
  },

  async deleteSale(id: string, user: any) {
    return runTransaction(db, async (transaction) => {
      const saleRef = doc(db, 'vendas', id);
      const saleDoc = await transaction.get(saleRef);
      if (!saleDoc.exists()) return;
      const sale = saleDoc.data() as Sale;

      const productIds = new Set<string>();
      if (isSaleCompleted(sale)) {
        sale.items.forEach(i => {
          if (i.status !== 'cancelado') productIds.add(i.product_id);
        });
      }

      const productSnaps = new Map<string, any>();
      for (const pid of productIds) {
        const snap = await transaction.get(doc(db, 'produtos', pid));
        if (snap.exists()) {
          productSnaps.set(pid, snap.data());
        }
      }

      if (isSaleCompleted(sale)) {
        for (const item of sale.items) {
          if (item.status === 'cancelado') continue;
          const pData = productSnaps.get(item.product_id);
          if (pData) {
            const newStock = toNum(pData.stock) + toNum(item.quantity);
            const updateObj: any = { stock: newStock };
            if (pData.variations && item.variation_id) {
              const updatedVars = pData.variations.map((v: any) => 
                v.id === item.variation_id ? { ...v, estoque: toNum(v.estoque) + toNum(item.quantity) } : v
              );
              updateObj.variations = updatedVars;
            }
            transaction.update(doc(db, 'produtos', item.product_id), updateObj);

            transaction.set(doc(estoqueMovimentacoesRef), {
              product_id: item.product_id,
              produto: item.product_name,
              marca: pData.brand || '',
              cor: item.cor || '',
              tamanho: item.tamanho || '',
              quantidade: toNum(item.quantity),
              tipo: 'cancelamento',
              origem: 'exclusão',
              usuario: user?.name || 'Sistema',
              observacao: `Venda excluída (${id.slice(-6)})`,
              venda_id: id,
              date: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              variation_id: item.variation_id || null,
              reference_id: id
            });
          }
        }
      }
      transaction.delete(saleRef);
    });
  },

  async cancelSale(id: string, user: any) {
    return runTransaction(db, async (transaction) => {
      const saleRef = doc(db, 'vendas', id);
      const saleDoc = await transaction.get(saleRef);
      if (!saleDoc.exists()) return;
      const sale = saleDoc.data() as Sale;

      if (!isSaleCompleted(sale)) {
        throw new Error('Esta venda já está cancelada ou não foi concluída');
      }

      const productIds = new Set<string>();
      sale.items.forEach(i => {
        if (i.status !== 'cancelado') productIds.add(i.product_id);
      });

      const productSnaps = new Map<string, any>();
      for (const pid of productIds) {
        const snap = await transaction.get(doc(db, 'produtos', pid));
        if (snap.exists()) {
          productSnaps.set(pid, snap.data());
        }
      }

      for (const item of sale.items) {
        if (item.status === 'cancelado') continue;
        const pData = productSnaps.get(item.product_id);
        if (pData) {
          const newTotalStock = toNum(pData.stock) + toNum(item.quantity);
          const updateObj: any = { 
            stock: newTotalStock, 
            updatedAt: new Date().toISOString() 
          };
          if (pData.variations && item.variation_id) {
            updateObj.variations = pData.variations.map((v: any) => 
              v.id === item.variation_id ? { ...v, estoque: toNum(v.estoque) + toNum(item.quantity) } : v
            );
          }
          transaction.update(doc(db, 'produtos', item.product_id), updateObj);

          transaction.set(doc(estoqueMovimentacoesRef), {
            product_id: item.product_id,
            produto: item.product_name,
            marca: pData.brand || '',
            cor: item.cor || '',
            tamanho: item.tamanho || '',
            quantidade: toNum(item.quantity),
            tipo: 'cancelamento',
            origem: 'devolução',
            usuario: user?.name || 'Sistema',
            observacao: `Venda cancelada (${id.slice(-6)})`,
            venda_id: id,
            date: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            variation_id: item.variation_id || null,
            reference_id: id
          });
        }
      }

      const updatedItems = sale.items.map(item => ({ ...item, status: 'cancelado' }));
      transaction.update(saleRef, { 
        status: 'cancelada', 
        items: updatedItems,
        updatedAt: new Date().toISOString() 
      });
    });
  },

  async cancelItem(saleId: string, itemIndex: number, user: any) {
    return runTransaction(db, async (transaction) => {
      const saleRef = doc(db, 'vendas', saleId);
      const saleDoc = await transaction.get(saleRef);
      if (!saleDoc.exists()) return;
      const sale = saleDoc.data() as Sale;

      if (!isSaleCompleted(sale)) {
        throw new Error('Apenas vendas concluídas podem ter itens cancelados/estornados');
      }
      
      const item = sale.items[itemIndex];
      if (!item) return;
      
      const itemStatus = (item.status || '').toLowerCase();
      if (itemStatus.includes('cancel') || itemStatus.includes('estorn')) {
        return;
      }

      const prodRef = doc(db, 'produtos', item.product_id);
      const prodDoc = await transaction.get(prodRef);
      if (prodDoc.exists()) {
        const pData = prodDoc.data();
        const newStock = toNum(pData.stock) + toNum(item.quantity);
        transaction.update(prodRef, { stock: newStock });
        
        if (pData.variations && item.variation_id) {
          const updatedVars = pData.variations.map((v: any) => 
            v.id === item.variation_id ? { ...v, estoque: toNum(v.estoque) + toNum(item.quantity) } : v
          );
          transaction.update(prodRef, { variations: updatedVars });
        }

        transaction.set(doc(estoqueMovimentacoesRef), {
          product_id: item.product_id,
          produto: item.product_name,
          marca: pData.brand || '',
          cor: item.cor || '',
          tamanho: item.tamanho || '',
          quantidade: toNum(item.quantity),
          tipo: 'cancelamento',
          origem: 'devolução',
          usuario: user?.name || 'Sistema',
          observacao: `Item cancelado na venda ${saleId.slice(-6)}`,
          venda_id: saleId,
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          variation_id: item.variation_id || null,
          reference_id: saleId
        });
      }

      const updatedItems = sale.items.map((it, idx) => 
        idx === itemIndex ? { ...it, status: 'cancelado' } : it
      );

      const activeItems = updatedItems.filter(it => it.status !== 'cancelado');
      
      if (activeItems.length === 0) {
        transaction.update(saleRef, { 
          items: updatedItems,
          status: 'cancelada',
          valor_bruto: 0,
          valor_liquido: 0,
          profit: 0,
          total_cost: 0,
          tax_value: 0
        });
      } else {
        const subtotal = activeItems.reduce((sum, i) => sum + (toNum(i.unit_price) * toNum(i.quantity)), 0);
        const totalCostItems = activeItems.reduce((sum, item) => sum + (toNum(item.cost) * toNum(item.quantity)), 0);
        const discount = sale.discount_type === 'percentage' 
          ? (subtotal * (toNum(sale.discount_value) / 100)) 
          : toNum(sale.discount_value);
        const bruto = Math.max(0, subtotal - discount);
        const feePercent = toNum(sale.installment_fee_percentage);
        const fee = bruto * (feePercent / 100);
        const liquido = bruto - fee;

        transaction.update(saleRef, {
          items: updatedItems,
          subtotal,
          valor_bruto: bruto,
          valor_liquido: liquido,
          tax_value: fee,
          installment_fee_value: fee,
          total_cost: totalCostItems,
          profit: liquido - totalCostItems
        });
      }
    });
  }
};
