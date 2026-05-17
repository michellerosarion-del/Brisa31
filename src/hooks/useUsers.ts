import { useState, useEffect } from 'react';
import { 
  usuariosRef,
  handleFirestoreError,
  OperationType
} from '../firebase';
import { 
  query, 
  orderBy, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';
import { UserService } from '../services/userService';

export const useUsers = (isAdmin: boolean) => {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!isAdmin) return;

    const qUsers = query(usuariosRef, orderBy('name', 'asc'), limit(100));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    }, err => handleFirestoreError(err, OperationType.LIST, 'usuarios'));

    return () => unsubUsers();
  }, [isAdmin]);

  return { 
    users, 
    saveUser: UserService.saveUser 
  };
};
