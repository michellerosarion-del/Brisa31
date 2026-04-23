import React from 'react';
import { Customer } from '../../types';

interface CustomerFormProps {
  editingItem: Customer | null;
  handleAddCustomer: (e: React.FormEvent) => void;
}

export const CustomerForm = ({ editingItem, handleAddCustomer }: CustomerFormProps) => {
  return (
    <form onSubmit={handleAddCustomer} className="space-y-4">
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nome Completo</label>
        <input name="name" defaultValue={editingItem?.name} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-midnight outline-none text-sm" required />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">WhatsApp</label>
          <input name="phone" defaultValue={editingItem?.phone} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-midnight outline-none text-sm" required />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Instagram</label>
          <input name="instagram" defaultValue={editingItem?.instagram} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-midnight outline-none text-sm" />
        </div>
      </div>
      <button type="submit" className="w-full bg-midnight text-white py-3 rounded-xl font-bold shadow-lg shadow-midnight/10 hover:bg-black transition-all text-sm">
        {editingItem ? 'Salvar Alterações' : 'Cadastrar Cliente'}
      </button>
    </form>
  );
};
