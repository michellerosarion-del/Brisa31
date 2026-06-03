import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  increment, 
  runTransaction,
  getDocFromServer
} from 'firebase/firestore';
import { 
  getStorage, 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with Persistent Local Cache and Long Polling for stability
// This atomically enables persistence during initialization, avoiding "already started" errors.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);
export const storage = getStorage(app);

// Collection References
export const produtosRef = collection(db, 'produtos');
export const clientesRef = collection(db, 'clientes');
export const vendasRef = collection(db, 'vendas');
export const itensVendaRef = collection(db, 'itens_venda');
export const gastosRef = collection(db, 'gastos');
export const usuariosRef = collection(db, 'usuarios');
export const estoqueMovimentacoesRef = collection(db, 'estoque_movimentacoes');
export const configuracoesRef = collection(db, 'configuracoes');
export const comprasRef = collection(db, 'compras');
export const fornecedoresRef = collection(db, 'fornecedores');

// Auth helpers
export { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
};
export type { User };

// Error handling helper
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }

  const isQuota = errorMessage.toLowerCase().includes('quota') || 
                  errorMessage.toLowerCase().includes('resource-exhausted') ||
                  errorMessage.toLowerCase().includes('resource_exhausted') ||
                  errorMessage.toLowerCase().includes('exhaustive');

  if (isQuota) {
    (window as any).__firestore_quota_exceeded = errInfo;
    const event = new CustomEvent('firestore-quota-exceeded', { detail: errInfo });
    window.dispatchEvent(event);
  }

  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function handleStorageError(error: any) {
  const errDetails = {
    code: error?.code,
    message: error?.message,
    name: error?.name,
    serverResponse: error?.serverResponse,
    authStatus: !!auth.currentUser,
    userId: auth.currentUser?.uid
  };
  console.error('Storage Error Diagnostic:', JSON.stringify(errDetails));
  return `Erro no Firebase Storage (${error?.code || 'unknown'}): ${error?.message || 'Erro desconhecido'}`;
}

// Test connectivity on boot - REMOVED to save read quota
// async function testConnection() { ... }
