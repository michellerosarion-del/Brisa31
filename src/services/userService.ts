import { 
  db, 
  auth,
  usuariosRef,
  createUserWithEmailAndPassword
} from '../firebase';
import { 
  doc, 
  addDoc, 
  updateDoc, 
  setDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';

export const UserService = {
  async saveUser(data: any, editingItem: any) {
    const inputEmail = (data.email as string).trim();
    const inputPassword = (data.password as string || '123456').trim();

    const uData: any = {
      name: data.name,
      email: inputEmail,
      role: data.role || 'vendedor',
      status: data.status || 'ativo',
      updatedAt: new Date().toISOString()
    };

    if (editingItem) {
      return updateDoc(doc(db, 'usuarios', editingItem.id), uData);
    } else {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, inputEmail, inputPassword);
        const newUid = userCredential.user.uid;
        
        return setDoc(doc(db, 'usuarios', newUid), {
          ...uData,
          uid: newUid,
          createdAt: new Date().toISOString()
        });
      } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-in-use') {
          return addDoc(usuariosRef, { ...uData, createdAt: new Date().toISOString() });
        } else {
          throw authErr;
        }
      }
    }
  }
};
