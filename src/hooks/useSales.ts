import { useState, useEffect, useCallback } from 'react';
import { 
  vendasRef,
  handleFirestoreError,
  OperationType
} from '../firebase';
import { 
  query, 
  orderBy, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';
import { Sale } from '../types';
import { SaleService } from '../services/saleService';

export const useSales = (isSignedIn: boolean = false, initialLimit: number = 50) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesLimit, setSalesLimit] = useState(initialLimit);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    const qSales = query(vendasRef, orderBy('date', 'desc'), limit(salesLimit));
    const unsubSales = onSnapshot(qSales, (snap) => {
      setSales(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Sale)));
      setLoading(false);
    }, err => handleFirestoreError(err, OperationType.LIST, 'vendas'));

    return () => unsubSales();
  }, [isSignedIn, salesLimit]);

  const loadMoreSales = useCallback(() => {
    setSalesLimit(prev => Math.min(prev + 50, 1000));
  }, []);

  return {
    sales,
    loading,
    loadMoreSales,
    completeSale: SaleService.completeSale,
    deleteSale: SaleService.deleteSale,
    cancelSale: SaleService.cancelSale,
    cancelItem: SaleService.cancelItem
  };
};
