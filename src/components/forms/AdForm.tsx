import React from 'react';
import { Ad } from '../../types';

interface AdFormProps {
  editingItem: Ad | null;
  handleAddAd: (e: React.FormEvent) => void;
}

export const AdForm = ({ editingItem, handleAddAd }: AdFormProps) => {
  return (
    <form onSubmit={handleAddAd} className="space-y-6">
      <div className="space-y-1">
        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Plataforma</label>
        <select name="platform" defaultValue={editingItem?.platform} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-midnight outline-none" required>
          <option value="Instagram Ads">Instagram Ads</option>
          <option value="Facebook Ads">Facebook Ads</option>
          <option value="Google Ads">Google Ads</option>
          <option value="TikTok Ads">TikTok Ads</option>
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Investimento (R$)</label>
          <input name="investment" type="text" inputMode="decimal" defaultValue={editingItem?.investment} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-midnight outline-none" required />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Vendas Geradas</label>
          <input name="sales_generated" type="number" defaultValue={editingItem?.sales_generated} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-midnight outline-none" required />
        </div>
      </div>
      <button type="submit" className="w-full bg-midnight text-white py-4 rounded-2xl font-bold shadow-lg shadow-midnight/10 hover:bg-black transition-all">
        {editingItem ? 'Salvar Alterações' : 'Salvar Anúncio'}
      </button>
    </form>
  );
};
