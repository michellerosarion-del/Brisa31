import { useState, useEffect, useCallback } from 'react';
import { 
  db,
  gastosRef,
  handleFirestoreError,
  OperationType
} from '../firebase';
import { 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  collection
} from 'firebase/firestore';
import { Expense, Ad } from '../types';
import { FinanceService } from '../services/financeService';

export const useFinance = (isAdmin: boolean) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [expensesLimit, setExpensesLimit] = useState(50);
  const [adsLimit, setAdsLimit] = useState(50);

  useEffect(() => {
    if (!isAdmin) return;

    const qExp = query(gastosRef, orderBy('date', 'desc'), limit(expensesLimit));
    const unsubExp = onSnapshot(qExp, (snap) => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Expense)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'gastos'));

    return () => unsubExp();
  }, [isAdmin, expensesLimit]);

  useEffect(() => {
    if (!isAdmin) return;

    const qAds = query(collection(db, 'anuncios'), orderBy('date', 'desc'), limit(adsLimit));
    const unsubAds = onSnapshot(qAds, (snap) => {
      setAds(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Ad)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'anuncios'));

    return () => unsubAds();
  }, [isAdmin, adsLimit]);

  const loadMoreExpenses = useCallback(() => {
    setExpensesLimit(prev => Math.min(prev + 50, 1000));
  }, []);

  const loadMoreAds = useCallback(() => {
    setAdsLimit(prev => Math.min(prev + 50, 500));
  }, []);

  return {
    expenses,
    ads,
    loadMoreExpenses,
    loadMoreAds,
    saveTransaction: FinanceService.saveTransaction,
    saveAd: FinanceService.saveAd
  };
};
