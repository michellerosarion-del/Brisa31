import { useState, useEffect, useCallback } from 'react';
import { 
  clientesRef,
  handleFirestoreError,
  OperationType
} from '../firebase';
import { 
  query, 
  orderBy, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';
import { Customer } from '../types';
import { CustomerService } from '../services/customerService';

export const useCustomers = (isSignedIn: boolean = false, initialLimit: number = 50) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLimit, setCustomersLimit] = useState(initialLimit);

  useEffect(() => {
    if (!isSignedIn) return;

    const qCust = query(clientesRef, orderBy('name', 'asc'), limit(customersLimit));
    const unsubCust = onSnapshot(qCust, (snap) => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Customer)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'clientes'));

    return () => unsubCust();
  }, [isSignedIn, customersLimit]);

  const loadMoreCustomers = useCallback(() => {
    setCustomersLimit(prev => Math.min(prev + 50, 1000));
  }, []);

  return {
    customers,
    loadMoreCustomers,
    saveCustomer: CustomerService.saveCustomer
  };
};
