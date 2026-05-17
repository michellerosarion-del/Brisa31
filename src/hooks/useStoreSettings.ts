import { useState, useEffect } from 'react';
import { 
  configuracoesRef,
  handleFirestoreError,
  OperationType
} from '../firebase';
import { 
  query, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';
import { StoreSettings as StoreSettingsType } from '../types';

export const useStoreSettings = (isSignedIn: boolean = false) => {
  const [storeSettings, setStoreSettings] = useState<StoreSettingsType>({
    id: '',
    nome_loja: 'Minha Loja',
    logo_url: '',
    telefone_whatsapp: '',
    mensagem_padrao_whatsapp: '',
    monthly_goal: 10000,
    card_fee: 4.99,
    low_stock_threshold: 3,
    low_stock_alert_enabled: true
  });

  useEffect(() => {
    if (!isSignedIn) return;

    const qConfig = query(configuracoesRef, limit(1));
    const unsubConfig = onSnapshot(qConfig, (snap) => {
      if (!snap.empty) {
        setStoreSettings({ id: snap.docs[0].id, ...(snap.docs[0].data() as any) } as any);
      }
    }, err => handleFirestoreError(err, OperationType.LIST, 'configuracoes'));

    return () => unsubConfig();
  }, [isSignedIn]);

  return { storeSettings };
};
