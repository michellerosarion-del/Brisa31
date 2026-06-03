import React from 'react';
import { Expense as Transaction } from '../../types';

interface TransactionFormProps {
  editingItem: Transaction | null;
  handleAddTransaction: (e: React.FormEvent) => void;
}

export const TransactionForm = ({ editingItem, handleAddTransaction }: TransactionFormProps) => {
  return (
    <form onSubmit={handleAddTransaction} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-black text-slate-500 uppercase ml-1">Tipo de Fluxo</label>
          <select name="flow_type" defaultValue={editingItem?.flow_type || 'saída'} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-midnight outline-none font-bold" required>
            <option value="entrada">Entrada (+)</option>
            <option value="saída">Saída (-)</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-black text-slate-500 uppercase ml-1">Data</label>
          <input name="date" type="date" defaultValue={editingItem?.date || new Date().toISOString().split('T')[0]} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-midnight outline-none font-bold" required />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-black text-slate-500 uppercase ml-1">Categoria / Tipo</label>
          <select name="type" defaultValue={editingItem?.type || 'operacional'} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-midnight outline-none font-bold" required>
            <option value="operacional">Operacional</option>
            <option value="marketing">Marketing</option>
            <option value="estoque">Estoque</option>
            <option value="taxa">Taxa</option>
            <option value="equipamentos">Equipamentos</option>
            <option value="estrutura">Estrutura</option>
            <option value="embalagens">Embalagens</option>
            <option value="transporte">Transporte</option>
            <option value="outros">Outros</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-black text-slate-500 uppercase ml-1">Forma de Pagamento</label>
          <select name="payment_method" defaultValue={editingItem?.payment_method || 'pix'} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-midnight outline-none font-bold" required>
            <option value="pix">PIX</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="debito">Cartão de Débito</option>
            <option value="credito">Cartão de Crédito</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-black text-slate-500 uppercase ml-1">Descrição</label>
        <input name="description" defaultValue={editingItem?.description} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-midnight outline-none font-bold" placeholder="Ex: Aluguel, Venda manual, etc" required />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-black text-slate-500 uppercase ml-1">Valor (R$)</label>
        <input name="value" type="text" inputMode="decimal" defaultValue={editingItem?.value} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-midnight outline-none font-black text-lg" placeholder="0,00" required />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-black text-slate-500 uppercase ml-1">Observação (Opcional)</label>
        <textarea name="observations" defaultValue={editingItem?.observations} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-midnight outline-none font-medium text-sm min-h-[100px]" placeholder="Mais detalhes sobre o lançamento..." />
      </div>

      <button type="submit" className="w-full bg-midnight text-white py-4 rounded-2xl font-black shadow-lg shadow-midnight/10 hover:bg-black transition-all uppercase tracking-widest text-xs">
        {editingItem ? 'Salvar Alterações' : 'Confirmar Lançamento'}
      </button>
    </form>
  );
};
