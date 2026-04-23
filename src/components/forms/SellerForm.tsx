import React from 'react';
import { Seller } from '../../types';

interface SellerFormProps {
  editingItem: Seller | null;
  handleAddSeller: (e: React.FormEvent) => void;
}

export const SellerForm = ({ editingItem, handleAddSeller }: SellerFormProps) => {
  return (
    <form onSubmit={handleAddSeller} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nome Completo</label>
          <input name="name" defaultValue={editingItem?.name} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-midnight outline-none font-medium" placeholder="Nome do usuário" required />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">E-mail / Login</label>
          <input name="email" type="email" defaultValue={editingItem?.email} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-midnight outline-none font-medium" placeholder="exemplo@loja.com" required />
          {editingItem && <p className="text-[10px] text-amber-600 mt-1 ml-1 font-bold">Atenção: Mudar o e-mail aqui altera apenas o cadastro. O acesso (login) continuará sendo o e-mail original.</p>}
        </div>
      </div>
      
      {!editingItem && (
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Senha Inicial</label>
          <input name="password" type="password" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-midnight outline-none font-medium" placeholder="Mínimo 6 caracteres" required />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Tipo de Usuário</label>
          <select name="role" defaultValue={(editingItem as any)?.role || 'vendedor'} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-midnight outline-none font-medium" required>
            <option value="admin">Administrador</option>
            <option value="vendedor">Vendedor</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Status</label>
          <select name="status" defaultValue={editingItem?.status || 'ativo'} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-midnight outline-none font-medium" required>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>
      </div>
      <button type="submit" className="w-full bg-midnight text-white py-4 rounded-2xl font-bold shadow-lg shadow-midnight/10 hover:bg-black transition-all active:scale-95">
        {editingItem ? 'Salvar Alterações' : 'Cadastrar Usuário'}
      </button>
    </form>
  );
};
