import React, { useState } from 'react';
import { Lock, User as UserIcon } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { db, auth } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile as updateAuthProfile } from 'firebase/auth';

interface UserProfileProps {
  user: any;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
  setIsChangePasswordModalOpen: (isOpen: boolean) => void;
  onRefresh?: () => void;
}

export const UserProfile = ({ user, showNotification, setIsChangePasswordModalOpen, onRefresh }: UserProfileProps) => {
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
      if (user && auth.currentUser) {
        const newName = data.name as string;
        
        // Update Auth profile
        await updateAuthProfile(auth.currentUser, { displayName: newName });
        
        // Update Firestore user doc
        await updateDoc(doc(db, 'usuarios', user.id), {
          name: newName,
          email: data.email as string,
          updatedAt: new Date().toISOString()
        });

        showNotification('Perfil atualizado com sucesso!');
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      showNotification(err.message || 'Erro ao atualizar perfil', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-20 h-20 bg-midnight rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-midnight/10">
            {user?.name?.charAt(0)}
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{user?.name}</h3>
            <p className="text-gray-500">{user?.email}</p>
            <span className="text-[10px] font-black uppercase tracking-widest bg-midnight/5 text-midnight px-2 py-1 rounded-full mt-2 inline-block">
              {user?.role === 'admin' ? 'Administrador' : 'Vendedor'}
            </span>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nome Completo</label>
              <input name="name" defaultValue={user?.name} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-midnight outline-none" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">E-mail / Login</label>
              <input name="email" defaultValue={user?.email} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-midnight outline-none font-medium" />
              <p className="text-[10px] text-amber-600 mt-1 ml-1 font-bold">Nota: Alterar o e-mail aqui não muda suas credenciais de acesso.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 bg-midnight text-white py-4 rounded-2xl font-bold shadow-lg shadow-midnight/10 hover:bg-black transition-all disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
            <button 
              type="button"
              onClick={() => setIsChangePasswordModalOpen(true)}
              className="flex-1 bg-white text-midnight border border-midnight/10 py-4 rounded-2xl font-bold hover:bg-midnight/5 transition-all flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" /> Alterar Senha
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};
