import React from 'react';
import { 
  Search, 
  Plus, 
  Calendar, 
  CreditCard, 
  ChevronDown, 
  User as UserIcon, 
  CheckCircle2, 
  X, 
  Edit, 
  Trash2, 
  ShoppingBag,
  DollarSign,
  TrendingUp,
  ArrowDownRight,
  Wallet
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Sale, Product } from '../../types';
import { getValorVenda } from '../../lib/utils';

import { calcularFinanceiro, getSaleFinancials } from '../../lib/finance';

interface SalesListProps {
  sales: Sale[];
  products: Product[];
  salesSearchTerm: string;
  setSalesSearchTerm: (term: string) => void;
  salesDateFilter: string;
  setSalesDateFilter: (date: string) => void;
  globalMonthFilter: string;
  setGlobalMonthFilter: (month: string) => void;
  salesPaymentFilter: string;
  setSalesPaymentFilter: (method: string) => void;
  salesSellerFilter: string;
  setSalesSellerFilter: (seller: string) => void;
  salesStatusFilter: string;
  setSalesStatusFilter: (status: string) => void;
  handleEdit: (tab: string, item: any) => void;
  handleDeleteSale: (id: string) => void;
  handleCancelItem: (saleId: string, itemIndex: number) => void;
  onNewSale: () => void;
  user: any;
  formatCurrency: (val: number) => string;
  toNum: (val: any) => number;
  storeSettings: any;
  loadMore: () => void;
}

export const SalesList = ({ 
  sales, 
  products,
  salesSearchTerm, 
  setSalesSearchTerm, 
  salesDateFilter, 
  setSalesDateFilter, 
  globalMonthFilter, 
  setGlobalMonthFilter, 
  salesPaymentFilter, 
  setSalesPaymentFilter, 
  salesSellerFilter,
  setSalesSellerFilter,
  salesStatusFilter,
  setSalesStatusFilter,
  handleEdit, 
  handleDeleteSale, 
  handleCancelItem,
  onNewSale,
  user, 
  formatCurrency,
  toNum,
  storeSettings,
  loadMore
}: SalesListProps) => {
  const formatPaymentMethod = (method: string) => {
    const methods: Record<string, string> = {
      'pix': 'PIX',
      'dinheiro': 'Dinheiro',
      'debito': 'Débito',
      'credito': 'Crédito',
      'cartao_vista': 'Cartão à Vista',
      'cartao_parcelado': 'Cartão Parcelado'
    };
    return methods[method] || method;
  };

  const filteredSales = (sales || []).filter((s: any) => {
    const term = (salesSearchTerm || '').toLowerCase();
    const matchesSearch = (s.customer_name || '').toLowerCase().includes(term) || 
                        (s.seller_name || '').toLowerCase().includes(term) ||
                        (s.payment_method || '').toLowerCase().includes(term);
    const matchesDate = !salesDateFilter || (s.date && s.date.includes(salesDateFilter));
    const matchesMonth = !globalMonthFilter || (s.date && s.date.startsWith(globalMonthFilter));
    const matchesPayment = !salesPaymentFilter || s.payment_method === salesPaymentFilter;
    const matchesSeller = !salesSellerFilter || s.seller_name === salesSellerFilter;
    const matchesStatus = !salesStatusFilter || s.status === salesStatusFilter;
    return matchesSearch && matchesDate && matchesMonth && matchesPayment && matchesSeller && matchesStatus;
  }).sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));

  // Calculate summary based on filtered sales
  const summary = filteredSales.reduce((acc, s) => {
    if (s.status === 'cancelada') return acc;
    const financials = getSaleFinancials(s);

    return {
      revenue: acc.revenue + financials.valor_bruto,
      bruto: acc.bruto + financials.valor_bruto,
      liquido: acc.liquido + financials.valor_liquido,
      cost: acc.cost + financials.total_cost,
      profit: acc.profit + financials.profit,
      count: acc.count + 1
    };
  }, { revenue: 0, bruto: 0, liquido: 0, cost: 0, profit: 0, count: 0 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Gestão de Vendas</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Acompanhamento e controle de transações em tempo real.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => onNewSale()}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nova Venda
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard 
          title="Faturamento Bruto" 
          value={formatCurrency(summary.bruto)} 
          icon={<ShoppingBag />} 
          colorClass="text-emerald-600"
        />
        <StatCard 
          title="Total Líquido" 
          value={formatCurrency(summary.liquido)} 
          icon={<DollarSign />} 
          colorClass="text-indigo-600"
        />
        <StatCard 
          title="Custo Total" 
          value={formatCurrency(summary.cost)} 
          icon={<ArrowDownRight />} 
          colorClass="text-rose-600"
        />
        <StatCard 
          title="Lucro Real" 
          value={formatCurrency(summary.profit)} 
          icon={<TrendingUp />} 
          colorClass="text-emerald-600"
          trend={summary.bruto > 0 ? Number(((summary.profit / summary.bruto) * 100).toFixed(1)) : 0}
        />
        <StatCard 
          title="Ticket Médio" 
          value={formatCurrency(summary.count > 0 ? summary.bruto / summary.count : 0)} 
          icon={<Wallet />} 
          colorClass="text-blue-600"
        />
      </div>

      <Card className="p-4 bg-white shadow-sm border border-slate-100 rounded-xl">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por cliente, produto ou vendedor..." 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all placeholder:text-slate-400"
              value={salesSearchTerm || ''}
              onChange={(e) => setSalesSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative group">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="date" 
                className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all cursor-pointer"
                value={salesDateFilter || ''}
                onChange={(e) => {
                  setSalesDateFilter(e.target.value);
                  if (e.target.value) setGlobalMonthFilter('');
                }}
              />
            </div>
            <select 
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all cursor-pointer appearance-none min-w-[120px]"
              value={salesPaymentFilter || ''}
              onChange={(e) => setSalesPaymentFilter(e.target.value)}
            >
              <option value="">Forma</option>
              <option value="pix">PIX</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="debito">Débito</option>
              <option value="credito">Crédito</option>
            </select>
            <select 
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all cursor-pointer appearance-none min-w-[120px]"
              value={salesStatusFilter || ''}
              onChange={(e) => setSalesStatusFilter(e.target.value)}
            >
              <option value="">Status</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden border border-slate-100 rounded-xl bg-white shadow-sm">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest leading-none">Data</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest leading-none">Cliente</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest leading-none">Vendedor</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest leading-none">Total</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest leading-none">Forma</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest leading-none text-center">Status</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest leading-none text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSales.map(s => {
                const financials = getSaleFinancials(s);
                return (
                 <tr key={s.id} className={`hover:bg-slate-50/50 transition-all group ${s.status === 'cancelada' ? 'opacity-80 grayscale' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-900 leading-none mb-1">
                          {new Date(s.date).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium lowercase tracking-wider">
                          {new Date(s.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className={`text-sm font-semibold tracking-tight leading-tight ${s.status === 'cancelada' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {s.customer_name || 'Consumidor Final'}
                        </span>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {s.items?.slice(0, 2).map((it: any, idx: number) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-medium text-slate-600 border border-slate-200">
                              {it.product_name}
                            </span>
                          ))}
                          {s.items && s.items.length > 2 && (
                            <span className="text-[9px] font-bold text-slate-400">+{s.items.length - 2}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-slate-50 rounded-lg text-[9px] font-bold uppercase tracking-widest text-slate-600 border border-slate-200">
                        {s.seller_name || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className={`text-sm font-bold tracking-tight ${s.status === 'cancelada' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {formatCurrency(financials.valor_bruto)}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-bold">
                          lucro: {formatCurrency(financials.profit)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-700">
                        {formatPaymentMethod(s.payment_method)}
                        {s.payment_method === 'credito' && s.installments > 1 && ` ${s.installments}x`}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border ${
                        s.status === 'cancelada' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}>
                        {s.status === 'cancelada' ? 'Cancelada' : 'Concluída'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        {s.status !== 'cancelada' && (
                          <button 
                            onClick={() => handleEdit('vendas', s)}
                            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {user?.role === 'admin' && (
                          <button 
                            onClick={() => handleDeleteSale(s.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium text-sm">
                    Nenhuma venda registrada para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-4 p-4">
          {filteredSales.map(s => {
            const financials = getSaleFinancials(s);
            return (
              <div key={s.id} className={`bg-white rounded-xl p-5 shadow-sm border border-slate-100 space-y-4 transition-all active:scale-[0.98] ${s.status === 'cancelada' ? 'opacity-80 grayscale' : ''}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                      {new Date(s.date).toLocaleDateString('pt-BR')} • {new Date(s.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <h4 className="text-base font-semibold text-slate-900 tracking-tight leading-tight">{s.customer_name || 'Consumidor Final'}</h4>
                  </div>
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border ${
                    s.status === 'cancelada' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  }`}>
                    {s.status === 'cancelada' ? 'Cancelada' : 'Concluída'}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-1.5 opacity-80">
                  {s.items?.map((it: any, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[9px] font-medium text-slate-600">
                      {it.quantity}x {it.product_name}
                    </span>
                  ))}
                </div>

                <div className="flex justify-between items-end pt-4 border-t border-slate-50">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Valor Total</p>
                    <p className="text-xl font-bold text-slate-900 tracking-tight">
                      {formatCurrency(financials.valor_bruto)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {s.status !== 'cancelada' && (
                      <button 
                        onClick={() => handleEdit('vendas', s)}
                        className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-600 rounded-xl border border-slate-200 shadow-sm active:scale-95 transition-all"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                    )}
                    {user?.role === 'admin' && (
                      <button 
                        onClick={() => handleDeleteSale(s.id)}
                        className="w-10 h-10 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl border border-rose-100 shadow-sm active:scale-95 transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex justify-center pt-2">
        <button 
          onClick={loadMore}
          className="px-8 py-3 bg-white border border-slate-200 text-slate-800 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm active:scale-95"
        >
          Carregar mais vendas
        </button>
      </div>
    </div>
  );
};
