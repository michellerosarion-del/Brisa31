import { 
  db, 
  clientesRef
} from '../firebase';
import { 
  doc, 
  addDoc, 
  updateDoc
} from 'firebase/firestore';

export const CustomerService = {
  async saveCustomer(data: any, editingItem: any) {
    const customerData = {
      name: data.name,
      phone: data.phone,
      instagram: data.instagram || '',
      status: data.status || 'ativo',
      updatedAt: new Date().toISOString()
    };

    if (editingItem) {
      return updateDoc(doc(db, 'clientes', editingItem.id), customerData);
    } else {
      return addDoc(clientesRef, { ...customerData, createdAt: new Date().toISOString() });
    }
  }
};
