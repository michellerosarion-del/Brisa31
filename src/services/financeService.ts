import { 
  db, 
  gastosRef
} from '../firebase';
import { 
  doc, 
  addDoc, 
  updateDoc,
  collection
} from 'firebase/firestore';
import { toNum } from '../lib/utils';

export const FinanceService = {
  async saveTransaction(data: any, editingItem: any) {
    const flow_type = data.flow_type || 'saída';
    const tData = {
      type: data.type,
      flow_type,
      payment_method: data.payment_method || 'pix',
      description: data.description,
      value: toNum(data.value),
      date: data.date || new Date().toISOString(),
      observations: data.observations || '',
      updatedAt: new Date().toISOString()
    };

    if (editingItem) {
      return updateDoc(doc(db, 'gastos', editingItem.id), tData);
    } else {
      return addDoc(gastosRef, { ...tData, createdAt: new Date().toISOString() });
    }
  },

  async saveAd(data: any, editingItem: any) {
    const adData = {
      platform: data.platform,
      investment: toNum(data.investment),
      sales_generated: toNum(data.sales_generated),
      date: new Date().toISOString()
    };

    if (editingItem) {
      return updateDoc(doc(db, 'anuncios', editingItem.id), adData);
    } else {
      return addDoc(collection(db, 'anuncios'), { ...adData, createdAt: new Date().toISOString() });
    }
  }
};
