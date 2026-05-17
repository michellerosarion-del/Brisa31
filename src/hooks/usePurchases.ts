import { useState, useEffect } from 'react';
import { 
  comprasRef,
  handleFirestoreError,
  OperationType
} from '../firebase';
import { 
  query, 
  orderBy, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';
import { Purchase } from '../types';

export const usePurchases = (isAdmin: boolean) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  useEffect(() => {
    if (!isAdmin) return;

    const qPurchases = query(comprasRef, orderBy('date', 'desc'), limit(100));
    const unsubPurchases = onSnapshot(qPurchases, (snap) => {
      setPurchases(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Purchase)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'compras'));

    return () => unsubPurchases();
  }, [isAdmin]);

  return { purchases };
};
