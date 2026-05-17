import React from 'react';
import { Edit, Trash2, Phone, Instagram, Users, Plus } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Customer, StoreSettings } from '../../types';

interface CustomersListProps {
  customers: Customer[];
  handleEdit: (tab: string, item: any) => void;
  handleDeleteCustomer: (id: string) => void;
  storeSettings: StoreSettings;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, type?: 'danger' | 'warning') => void;
  user: any;
  formatCurrency: (val: number) => string;
  toNum: (val: any) => number;
  loadMore?: () => void;
}

export const CustomersList = ({ 
  customers, 
  handleEdit, 
  handleDeleteCustomer, 
  storeSettings, 
  showNotification, 
  showConfirm, 
  user,
  formatCurrency,
  toNum,
  loadMore
}: CustomersListProps) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-slate-900 p-3 sm:p-4 rounded-xl shadow-lg border border-slate-800 mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/10 rounded-lg flex items-center justify-center shadow-inner">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h2 className="text-[11px] sm:text-sm font-bold text-white uppercase tracking-widest leading-none">Clientes</h2>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5 sm:mt-1">Base de Clientes</p>
          </div>
        </div>

        {user?.role === 'admin' && (
          <button 
            onClick={() => handleEdit('clientes', null)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-900 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Novo Cliente
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        {customers.map((c: any) => (
          <Card key={c.id} className="relative group hover:shadow-md transition-all duration-300 border-slate-100 rounded-xl overflow-hidden bg-white">
            <div className="p-3 sm:p-5">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center font-bold text-base sm:text-xl ${
                    c.classification === 'VIP' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-600'
                  } border border-slate-100 shadow-sm transition-transform group-hover:scale-105`}>
                    {c.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-lg text-slate-900 leading-tight">{c.name}</h3>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-1 sm:mt-1.5">
                      <span className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full ${
                        c.classification === 'VIP' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {c.classification}
                      </span>
                      <span className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full ${
                        c.status === 'ativo' ? 'bg-emerald-50 text-emerald-700' : 
                        c.status === 'atenção' ? 'bg-amber-50 text-amber-700' : 
                        'bg-rose-50 text-rose-700'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                  </div>
                </div>
                {user?.role === 'admin' && (
                  <div className="flex gap-0.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-0 sm:translate-x-2 sm:group-hover:translate-x-0">
                    <button onClick={() => handleEdit('clientes', c)} className="p-1.5 sm:p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                      <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <button onClick={() => handleDeleteCustomer(c.id)} className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="p-2 sm:p-3 bg-slate-50 rounded-xl border border-slate-100 transition-colors group-hover:bg-white group-hover:border-slate-200">
                  <p className="text-[8px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 sm:mb-1">Total Gasto</p>
                  <p className="text-base sm:text-lg font-black text-slate-900 truncate">{formatCurrency(toNum(c.total_spent))}</p>
                </div>
                <div className="p-2 sm:p-3 bg-slate-50 rounded-xl border border-slate-100 transition-colors group-hover:bg-white group-hover:border-slate-200">
                  <p className="text-[8px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 sm:mb-1">Compras</p>
                  <p className="text-base sm:text-lg font-black text-slate-900">{toNum(c.total_purchases)}</p>
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-5 border-t border-slate-100">
                <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-600 font-medium">
                  <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                  {c.phone}
                </div>
                {c.instagram && (
                  <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                    <Instagram className="w-4 h-4 text-slate-400" />
                    @{c.instagram}
                  </div>
                )}

                <a 
                  href={`https://wa.me/${c.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Olá ${c.name}! Notamos que faz um tempo que você não nos visita na ${storeSettings.nome_loja}. Temos novidades incríveis que você vai adorar!`
                  )}`}
                  target="_blank"
                  className="w-full bg-slate-900 text-white py-3 rounded-xl font-semibold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-sm active:scale-95 mt-4"
                >
                  <Phone className="w-4 h-4" /> 
                  Falar no WhatsApp
                </a>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {loadMore && (
        <div className="flex justify-center pt-8">
          <button 
            onClick={loadMore}
            className="px-8 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            Carregar mais clientes
          </button>
        </div>
      )}
    </div>
  );
};
