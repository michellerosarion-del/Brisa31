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
import { getValorVenda, getLocalDate, isSaleCompleted, formatCurrency } from '../../lib/utils';

import { calcularFinanceiro, getSaleFinancials } from '../../lib/finance';

interface SalesListProps {
  sales: Sale[];
  products: Product[];
  salesSearchTerm: string;
  setSalesSearchTerm: (term: string) => void;
  salesDateFilter: string;
  setSalesDateFilter: (date: string) => void;
  salesStartDate: string;
  setSalesStartDate: (date: string) => void;
  salesEndDate: string;
  setSalesEndDate: (date: string) => void;
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
  handleCancelSale: (id: string) => void;
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
  salesStartDate,
  setSalesStartDate,
  salesEndDate,
  setSalesEndDate,
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
  handleCancelSale,
  handleCancelItem,
  onNewSale,
  user, 
  formatCurrency,
  toNum,
  storeSettings,
  loadMore
}: SalesListProps) => {
  const [datePreset, setDatePreset] = React.useState('custom');

  const formatSaleDateTime = (s: any) => {
    if (s.createdAt) {
      try {
        const dt = new Date(s.createdAt);
        if (!isNaN(dt.getTime())) {
          return {
            date: dt.toLocaleDateString('pt-BR'),
            time: dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            hasTime: true
          };
        }
      } catch (e) {
        console.error("Error parsing createdAt:", e);
      }
    }
    
    if (s.date && typeof s.date === 'string' && s.date.includes('-')) {
      const parts = s.date.split('T')[0].split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        return {
          date: `${day}/${month}/${year}`,
          time: '',
          hasTime: false
        };
      }
    }

    try {
      const dt = new Date(s.date);
      if (!isNaN(dt.getTime())) {
        return {
          date: dt.toLocaleDateString('pt-BR'),
          time: '',
          hasTime: false
        };
      }
    } catch (e) {}

    return {
      date: s.date || '',
      time: '',
      hasTime: false
    };
  };

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    const today = new Date();
    // No setHours(0,0,0,0) here to keep it simple, but let's use the helper
    const dateStr = getLocalDate();

    if (preset === 'hoje') {
      setSalesStartDate(dateStr);
      setSalesEndDate(dateStr);
    } else if (preset === 'semana') {
      const d = new Date();
      const first = d.getDate() - d.getDay();
      const firstDay = new Date(d.setDate(first));
      const lastDay = new Date(d.setDate(first + 6));
      
      const fYear = firstDay.getFullYear();
      const fMonth = String(firstDay.getMonth() + 1).padStart(2, '0');
      const fDay = String(firstDay.getDate()).padStart(2, '0');
      
      const lYear = lastDay.getFullYear();
      const lMonth = String(lastDay.getMonth() + 1).padStart(2, '0');
      const lDay = String(lastDay.getDate()).padStart(2, '0');

      setSalesStartDate(`${fYear}-${fMonth}-${fDay}`);
      setSalesEndDate(`${lYear}-${lMonth}-${lDay}`);
    } else if (preset === 'mes') {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(year, d.getMonth() + 1, 0).getDate();
      
      setSalesStartDate(`${year}-${month}-01`);
      setSalesEndDate(`${year}-${month}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'todos') {
      setSalesStartDate('');
      setSalesEndDate('');
    }
    
    // Clear the individual date/month filters if using range
    if (preset !== 'custom') {
      setSalesDateFilter('');
      setGlobalMonthFilter('');
    }
  };

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
    const matchesRange = (!salesStartDate || (s.date && s.date >= salesStartDate)) && 
                        (!salesEndDate || (s.date && s.date <= salesEndDate + 'T23:59:59'));
    const matchesMonth = !globalMonthFilter || (s.date && s.date.startsWith(globalMonthFilter));
    const matchesPayment = !salesPaymentFilter || s.payment_method === salesPaymentFilter;
    const matchesSeller = !salesSellerFilter || s.seller_name === salesSellerFilter;
    
    let matchesStatus = true;
    if (salesStatusFilter === 'concluida') {
      matchesStatus = isSaleCompleted(s);
    } else if (salesStatusFilter === 'cancelada') {
      matchesStatus = !isSaleCompleted(s);
    }

    return matchesSearch && matchesDate && matchesRange && matchesMonth && matchesPayment && matchesSeller && matchesStatus;
  }).sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));

  // Calculate summary based on filtered sales
  const summary = filteredSales.reduce((acc, s) => {
    if (!isSaleCompleted(s)) return acc;
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">Vendas</h2>
          <p className="text-[10px] sm:text-sm font-medium text-slate-500 mt-0.5">Histórico em tempo real.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button 
            onClick={() => onNewSale()}
            className="w-full sm:w-auto bg-slate-100 text-slate-900 border border-slate-200 px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nova Venda
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-4">
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
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-50">
            <select 
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all cursor-pointer appearance-none min-w-[120px]"
              value={datePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
            >
              <option value="custom">Data Customizada</option>
              <option value="hoje">Hoje</option>
              <option value="semana">Esta Semana</option>
              <option value="mes">Este Mês</option>
              <option value="todos">Tudo</option>
            </select>

            {datePreset === 'custom' && (
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 focus:border-slate-900 outline-none"
                  value={salesStartDate}
                  onChange={(e) => setSalesStartDate(e.target.value)}
                />
                <span className="text-[10px] font-bold text-slate-400">até</span>
                <input 
                  type="date" 
                  className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 focus:border-slate-900 outline-none"
                  value={salesEndDate}
                  onChange={(e) => setSalesEndDate(e.target.value)}
                />
              </div>
            )}

            <div className="flex-1" />
            
            <div className="flex items-center gap-2">
              <select 
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all cursor-pointer appearance-none min-w-[120px]"
                value={salesPaymentFilter || ''}
                onChange={(e) => setSalesPaymentFilter(e.target.value)}
              >
                <option value="">Forma de Pgto</option>
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
        </div>
      </Card>

      <Card className="overflow-hidden border border-slate-100 rounded-xl bg-white shadow-sm">
        <div className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100/60">
                <th className="px-6 py-5 font-black text-slate-300 text-[10px] uppercase tracking-[0.2em] leading-none">Data</th>
                <th className="px-6 py-5 font-black text-slate-300 text-[10px] uppercase tracking-[0.2em] leading-none">Cliente / Itens</th>
                <th className="px-6 py-5 font-black text-slate-300 text-[10px] uppercase tracking-[0.2em] leading-none">Vendedor</th>
                <th className="px-6 py-5 font-black text-slate-300 text-[10px] uppercase tracking-[0.2em] leading-none">Financeiro</th>
                <th className="px-6 py-5 font-black text-slate-300 text-[10px] uppercase tracking-[0.2em] leading-none">Forma</th>
                <th className="px-6 py-5 font-black text-slate-300 text-[10px] uppercase tracking-[0.2em] leading-none text-center">Status</th>
                <th className="px-6 py-5 font-black text-slate-300 text-[10px] uppercase tracking-[0.2em] leading-none text-right">Controles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {filteredSales.map(s => {
                const financials = getSaleFinancials(s);
                return (
                  <tr key={s.id} className={`hover:bg-slate-50/30 transition-all group ${!isSaleCompleted(s) ? 'opacity-70 grayscale' : ''}`}>
                    <td className="px-6 py-5 whitespace-nowrap">
                      {(() => {
                        const { date, time, hasTime } = formatSaleDateTime(s);
                        return (
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-900 leading-none mb-1.5 uppercase">
                              {date}
                            </span>
                            {hasTime && (
                              <span className="text-[10px] text-slate-400 font-bold lowercase tracking-wider">
                                {time}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col min-w-[200px]">
                        <span className={`text-sm font-black tracking-tight leading-tight uppercase ${!isSaleCompleted(s) ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {s.customer_name || 'Consumidor Final'}
                        </span>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {s.items?.slice(0, 3).map((it: any, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 bg-slate-50 rounded-lg text-[9px] font-black text-slate-500 border border-slate-200/60 uppercase">
                              {it.quantity}x {it.product_name}
                            </span>
                          ))}
                          {s.items && s.items.length > 3 && (
                            <span className="text-[10px] font-black text-slate-400 ml-1">+{s.items.length - 3}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="px-3 py-1 bg-slate-100/50 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-200/50">
                        {s.seller_name || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex flex-col items-start">
                        <span className={`text-sm font-black tracking-tight ${!isSaleCompleted(s) ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {formatCurrency(financials.valor_bruto)}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-black uppercase tracking-tighter mt-0.5">
                          LUCRATIV.: {formatCurrency(financials.profit)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-800 bg-slate-100/30 px-2 py-1 rounded-lg">
                        {formatPaymentMethod(s.payment_method)}
                        {s.payment_method === 'credito' && s.installments > 1 && ` [${s.installments}X]`}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center whitespace-nowrap">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border transition-all ${
                        !isSaleCompleted(s) 
                          ? 'bg-rose-50 text-rose-700 border-rose-100' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm shadow-emerald-500/5'
                      }`}>
                        {!isSaleCompleted(s) ? 'CANCELADA' : 'CONCLUÍDA'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1.5">
                        {isSaleCompleted(s) && (
                          <>
                            <button 
                              onClick={() => handleCancelSale(s.id)}
                              className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100 shadow-sm hover:shadow-rose-500/5 group/btn"
                              title="Cancelar Venda"
                            >
                              <X className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                            </button>
                            <button 
                              onClick={() => handleEdit('vendas', s)}
                              className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all border border-transparent hover:border-slate-200 shadow-sm hover:shadow-slate-900/5 group/btn"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                            </button>
                          </>
                        )}
                        {user?.role === 'admin' && (
                          <button 
                            onClick={() => handleDeleteSale(s.id)}
                            className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100 shadow-sm hover:shadow-rose-500/5 group/btn"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
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
      <div className="md:hidden space-y-3 p-1">
        {filteredSales.map(s => {
          const financials = getSaleFinancials(s);
          return (
            <div key={s.id} className={`bg-white rounded-xl p-3 shadow-sm border border-slate-100 space-y-3 transition-all active:scale-[0.98] ${!isSaleCompleted(s) ? 'opacity-80 grayscale' : ''}`}>
              <div className="flex justify-between items-start">
                <div>
                  {(() => {
                    const { date, time, hasTime } = formatSaleDateTime(s);
                    return (
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                        {hasTime ? `${date} • ${time}` : date}
                      </p>
                    );
                  })()}
                  <h4 className="text-sm font-bold text-slate-900 tracking-tight leading-tight">{s.customer_name || 'Consumidor Final'}</h4>
                </div>
                <span className={`px-1.5 py-0.5 rounded-lg text-[8px] font-bold uppercase tracking-widest border ${
                  !isSaleCompleted(s) ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                }`}>
                  {!isSaleCompleted(s) ? 'Cancelada' : 'OK'}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-1 opacity-80">
                {s.items?.map((it: any, idx: number) => (
                  <span key={idx} className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-[8px] font-medium text-slate-600 truncate max-w-[120px]">
                    {it.quantity}x {it.product_name}
                  </span>
                ))}
              </div>

              <div className="flex justify-between items-end pt-2 border-t border-slate-50">
                <div className="space-y-0.5">
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Total</p>
                  <p className="text-base font-black text-slate-900 tracking-tighter">
                    {formatCurrency(financials.valor_bruto)}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {isSaleCompleted(s) && (
                    <>
                      <button 
                        onClick={() => handleCancelSale(s.id)}
                        className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-400 hover:text-rose-600 rounded-lg border border-rose-100 active:scale-95 transition-all"
                        title="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEdit('vendas', s)}
                        className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-slate-900 rounded-lg border border-slate-200 active:scale-95 transition-all"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {user?.role === 'admin' && (
                    <button 
                      onClick={() => handleDeleteSale(s.id)}
                      className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-400 hover:text-rose-600 rounded-lg border border-rose-100 active:scale-95 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
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
