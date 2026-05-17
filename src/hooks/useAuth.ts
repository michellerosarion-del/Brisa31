import { useState, useEffect } from 'react';
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  usuariosRef
} from '../firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        try {
          const docSnap = await getDoc(doc(db, 'usuarios', authUser.uid));
          
          if (docSnap.exists()) {
            setUser({ ...authUser, ...docSnap.data(), id: authUser.uid });
          } else {
            const q = query(usuariosRef, where('email', '==', authUser.email));
            const qSnap = await getDocs(q);
            
            if (!qSnap.empty) {
              const userDoc = qSnap.docs[0];
              const userData = userDoc.data();
              const migratedData = {
                ...userData,
                uid: authUser.uid,
                updatedAt: new Date().toISOString()
              };
              await setDoc(doc(db, 'usuarios', authUser.uid), migratedData);
              if (userDoc.id !== authUser.uid) {
                await deleteDoc(userDoc.ref);
              }
              setUser({ ...authUser, ...migratedData, id: authUser.uid });
            } else {
              const newProfile = {
                uid: authUser.uid,
                name: authUser.displayName || authUser.email?.split('@')[0] || 'Usuário',
                email: authUser.email,
                role: 'admin',
                status: 'ativo',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              await setDoc(doc(db, 'usuarios', authUser.uid), newProfile);
              setUser({ ...authUser, ...newProfile, id: authUser.uid });
            }
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
          setUser({ ...authUser, id: authUser.uid, role: 'vendedor' });
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    return signOut(auth);
  };

  const resetPassword = async (email: string) => {
    return sendPasswordResetEmail(auth, email);
  };

  const changePassword = async (newPass: string) => {
    if (!auth.currentUser) throw new Error('No user logged in');
    return updatePassword(auth.currentUser, newPass);
  };

  return {
    user,
    authLoading,
    login,
    logout,
    resetPassword,
    changePassword
  };
};
