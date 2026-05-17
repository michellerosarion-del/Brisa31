import React from 'react';
import { Users, Plus, Edit, Trash2, Mail, Percent, CheckCircle2, XCircle, Key } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Seller } from '../../types';

interface SellersListProps {
  sellers: Seller[];
  handleEdit: (type: string, item: any) => void;
  handleDeleteSeller: (id: string) => void;
  setIsModalOpen: (isOpen: boolean) => void;
  setModalType: (type: string) => void;
  setEditingItem: (item: any) => void;
  handleResetPassword: (email: string) => void;
}

export const SellersList = ({ 
  sellers, 
  handleEdit, 
  handleDeleteSeller,
  setIsModalOpen,
  setModalType,
  setEditingItem,
  handleResetPassword
}: SellersListProps) => {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-950 tracking-tight">Usuários</h2>
          <p className="text-slate-800 font-bold text-sm mt-1">Gerencie todos os usuários cadastrados no sistema.</p>
        </div>
        <button 
          onClick={() => {
            setModalType('vendedores');
            setEditingItem(null);
            setIsModalOpen(true);
          }}
          className="bg-midnight text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-midnight/20 hover:bg-black transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" /> Novo Usuário
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sellers?.map((seller) => (
          <Card key={seller.id} className="p-6 border-none shadow-soft group hover:shadow-xl transition-all duration-500">
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-midnight group-hover:bg-midnight group-hover:text-white transition-colors duration-500">
                <Users className="w-7 h-7" />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleEdit('vendedores', seller)}
                  className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                  title="Editar Usuário"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleResetPassword(seller.email || '')}
                  className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                  title="Resetar Senha"
                >
                  <Key className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDeleteSeller(seller.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                  title="Excluir Usuário"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-black text-slate-950 tracking-tight line-clamp-1">{seller.name}</h3>
                <div className="flex items-center gap-2 text-slate-900 font-black text-xs sm:text-[11px] mt-1 uppercase tracking-widest bg-slate-100/50 p-2 rounded-lg border border-slate-200/50">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate">{seller.email}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-900 border border-emerald-200 shadow-sm">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none mb-1">Tipo</p>
                    <p className="text-sm font-black text-slate-950 capitalize">{(seller as any).role || 'Usuário'}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-[10px] font-black uppercase tracking-widest border ${
                  seller.status === 'ativo' ? 'bg-emerald-100 text-emerald-900 border-emerald-300 shadow-sm' : 'bg-rose-100 text-rose-900 border-rose-300 shadow-sm'
                }`}>
                  {seller.status === 'ativo' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {seller.status || 'ativo'}
                </div>
              </div>
            </div>
          </Card>
        ))}

        {sellers.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 shadow-sm">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-800 font-black uppercase tracking-widest text-sm">Nenhum usuário cadastrado ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
};
