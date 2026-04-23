import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Wallet, AlertCircle, AlertTriangle, Zap, CheckCircle2, Info, ArrowUpRight, ArrowDownRight, PieChart as PieChartIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Product, Customer, Sale, Expense, Ad, Seller, DashboardData } from '../../types';

import { calcularFinanceiro, getSaleFinancials } from '../../lib/finance';

interface CashControlProps {
  sales: Sale[];
  expenses: Expense[];
  products: Product[];
  storeSettings: any;
  formatCurrency: (val: number) => string;
  toNum: (val: any) => number;
  handleEdit: (type: string, item: any) => void;
  handleDeleteExpense: (id: string) => void;
  setIsModalOpen: (isOpen: boolean) => void;
  setModalType: (type: string) => void;
  setEditingItem: (item: any) => void;
  loadMoreExpenses?: () => void;
}

export const CashControl = ({ 
  sales = [], 
  expenses = [], 
  products = [],
  storeSettings = {},
  formatCurrency, 
  toNum,
  handleEdit,
  handleDeleteExpense,
  setIsModalOpen,
  setModalType,
  setEditingItem,
  loadMoreExpenses
}: CashControlProps) => {
  const [filterType, setFilterType] = useState<'day' | 'week' | 'month'>('month');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleNewLaunch = () => {
    setEditingItem(null);
    setModalType('financeiro');
    setIsModalOpen(true);
  };

  const getPreviousMonth = (monthStr: string) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    return date.toISOString().slice(0, 7);
  };

  const dashboard = useMemo(() => {
    let data;
    if (filterType === 'month') {
      data = calcularFinanceiro(sales, expenses, products, storeSettings, filterMonth);
    } else if (filterType === 'day') {
      data = calcularFinanceiro(sales, expenses, products, storeSettings, undefined, filterDate, filterDate);
    } else if (filterType === 'week') {
      const date = new Date(filterDate);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(date.setDate(diff)).toISOString().split('T')[0];
      const end = new Date(date.setDate(diff + 6)).toISOString().split('T')[0];
      data = calcularFinanceiro(sales, expenses, products, storeSettings, undefined, start, end);
    }

    if (!data) return null;

    // Map to the structure expected by CashControl
    const manualInflowsValue = data.filteredExpenses.filter(e => e.flow_type === 'entrada');
    
    return {
      cashFlow: {
        inflow: { 
          pix: data.filteredSales.filter(s => s.payment_method === 'pix').reduce((acc, s) => acc + getSaleFinancials(s).valor_bruto, 0) + 
               manualInflowsValue.filter(e => (e.payment_method || '').toLowerCase() === 'pix').reduce((acc, e) => acc + toNum(e.value), 0),
          card: data.filteredSales.filter(s => ['credito', 'debito', 'cartao_vista', 'cartao_parcelado'].includes(s.payment_method)).reduce((acc, s) => acc + getSaleFinancials(s).valor_bruto, 0) +
                manualInflowsValue.filter(e => ['credito', 'debito', 'cartao_vista', 'cartao_parcelado'].includes((e.payment_method || '').toLowerCase())).reduce((acc, e) => acc + toNum(e.value), 0),
          cash: data.filteredSales.filter(s => s.payment_method === 'dinheiro').reduce((acc, s) => acc + getSaleFinancials(s).valor_bruto, 0) +
                manualInflowsValue.filter(e => (e.payment_method || '').toLowerCase() === 'dinheiro').reduce((acc, e) => acc + toNum(e.value), 0),
          total: data.vendas
        },
        outflow: {
          purchases: data.custo,
          operational: data.despesasLoja,
          ads: data.anuncios,
          fees: data.totalTaxas - data.anuncios - data.despesasLoja, // Simplified
          others: 0,
          total: data.totalDespesas + data.custo
        },
        balance: data.vendas - (data.totalDespesas + data.custo)
      }
    };
  }, [filterType, filterDate, filterMonth, products, sales, expenses, storeSettings, toNum]);

  const prevMonthData = useMemo(() => {
    if (filterType !== 'month') return null;
    const prevMonth = getPreviousMonth(filterMonth);
    const data = calcularFinanceiro(sales, expenses, products, storeSettings, prevMonth);
    
    return {
      cashFlow: {
        inflow: { total: data.vendas },
        outflow: { total: data.totalDespesas + data.custo },
        balance: data.vendas - (data.totalDespesas + data.custo)
      }
    };
  }, [filterType, filterMonth, products, sales, expenses, storeSettings]);

  const cash = dashboard?.cashFlow || {
    inflow: { pix: 0, card: 0, cash: 0, total: 0 },
    outflow: { purchases: 0, operational: 0, ads: 0, others: 0, fees: 0, total: 0 },
    balance: 0
  };

  const prevCash = prevMonthData?.cashFlow || {
    inflow: { total: 0 },
    outflow: { total: 0 },
    balance: 0
  };

  const alerts = useMemo(() => {
    const list = [];
    if (cash && prevCash && filterType === 'month') {
      const balDiff = cash.balance - prevCash.balance;
      if (balDiff < 0 && Math.abs(balDiff) > prevCash.balance * 0.2 && prevCash.balance > 0) {
        list.push({
          type: 'warning',
          title: 'Queda no Saldo',
          message: `Seu saldo final caiu ${((Math.abs(balDiff) / prevCash.balance) * 100).toFixed(1)}% em relação ao mês anterior.`
        });
      }

      if (cash.outflow.total > cash.inflow.total) {
        list.push({
          type: 'danger',
          title: 'Fluxo Negativo',
          message: 'As saídas superaram as entradas neste período. Atenção ao capital de giro.'
        });
      }

      if (cash.inflow.card > cash.inflow.total * 0.7) {
        list.push({
          type: 'info',
          title: 'Dependência de Cartão',
          message: 'Mais de 70% das suas entradas são via cartão. Considere taxas de antecipação.'
        });
      }
    }
    return list;
  }, [cash, prevCash, filterType]);

  const inflowChartData = [
    { name: 'PIX', value: cash.inflow.pix, color: '#10b981' },
    { name: 'Cartão', value: cash.inflow.card, color: '#0f172a' },
    { name: 'Dinheiro', value: cash.inflow.cash, color: '#f59e0b' },
  ];

  const outflowChartData = [
    { name: 'Estoque', value: cash.outflow.purchases, color: '#0f172a' },
    { name: 'Operacional', value: cash.outflow.operational, color: '#4b5563' },
    { name: 'Marketing', value: cash.outflow.ads, color: '#4f46e5' },
    { name: 'Taxas', value: cash.outflow.fees, color: '#f43f5e' },
    { name: 'Outros', value: cash.outflow.others, color: '#d97706' },
  ];

  const openCategoryDetails = (category: string, type: 'inflow' | 'outflow') => {
    let items: any[] = [];
    let title = '';

    if (type === 'inflow') {
      title = `Entradas: ${category}`;
      const methodMap: Record<string, string> = {
        'PIX': 'pix',
        'Cartão': 'cart',
        'Dinheiro': 'din'
      };
      const searchKey = methodMap[category] || category.toLowerCase();
      
      items = sales.filter((s: any) => {
        const matchesMonth = filterType === 'month' ? s.date.startsWith(filterMonth) : true;
        const matchesMethod = (s.payment_method || '').toLowerCase().includes(searchKey);
        return matchesMonth && matchesMethod && s.status !== 'cancelado' && s.status !== 'cancelada';
      }).map(s => {
        const financials = getSaleFinancials(s);
        return {
          id: s.id,
          date: s.date,
          description: `Venda #${s.id.slice(-4)} - ${s.customer_name || 'Cliente'}`,
          value: financials.valor_bruto
        };
      });
    } else {
      title = `Saídas: ${category}`;
      const typeMap: Record<string, string> = {
        'Estoque': 'estoque',
        'Operacional': 'fixo',
        'Marketing': 'anúncio',
        'Taxas': 'taxa',
        'Outros': 'outros'
      };
      const searchType = typeMap[category] || category.toLowerCase();

      items = expenses.filter((e: any) => {
        const matchesMonth = filterType === 'month' ? e.date.startsWith(filterMonth) : true;
        const matchesType = (e.type || '').toLowerCase().includes(searchType);
        return matchesMonth && matchesType;
      }).map(e => ({
        id: e.id,
        date: e.date,
        description: e.description,
        value: toNum(e.value)
      }));
    }

    setSelectedCategory({ title, items });
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-2/3">
          <Card className="p-5 md:p-6 rounded-xl bg-white shadow-sm border border-slate-100 h-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 shadow-sm shrink-0">
                  <Wallet className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Controle de Caixa</h3>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">Gestão de entradas e saídas</p>
                </div>
              </div>
              
              <button
                onClick={handleNewLaunch}
                className="w-full md:w-auto px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-sm active:scale-95"
              >
                Novo Lançamento
              </button>
            </div>

            <div className="mt-6 flex flex-col md:flex-row gap-4 items-center justify-between border-t border-slate-50 pt-6">
              <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 w-full md:w-auto">
                {['day', 'week', 'month'].map((t) => (
                  <button 
                    key={t}
                    onClick={() => setFilterType(t as any)}
                    className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${filterType === t ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    {t === 'day' ? 'Dia' : t === 'week' ? 'Semana' : 'Mês'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 w-full md:w-auto">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Período:</label>
                {filterType === 'month' ? (
                  <input 
                    type="month" 
                    value={filterMonth || ''}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs font-semibold text-slate-900 focus:ring-0 p-0 cursor-pointer"
                  />
                ) : (
                  <input 
                    type="date" 
                    value={filterDate || ''}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs font-semibold text-slate-900 focus:ring-0 p-0 cursor-pointer"
                  />
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:w-1/3 flex flex-col justify-center">
          {alerts.map((alert, idx) => (
            <motion.div 
              key={`${alert.title}-${idx}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-4 rounded-xl border flex items-start gap-4 mb-3 last:mb-0 shadow-sm ${
                alert.type === 'danger' ? 'bg-rose-50/50 border-rose-100 text-rose-700' :
                alert.type === 'warning' ? 'bg-amber-50/50 border-amber-100 text-amber-700' :
                'bg-blue-50/50 border-blue-100 text-blue-700'
              }`}
            >
              <div className={`p-1.5 rounded-lg bg-white shadow-sm shrink-0 ${
                alert.type === 'danger' ? 'text-rose-600' :
                alert.type === 'warning' ? 'text-amber-600' :
                'text-blue-600'
              }`}>
                {alert.type === 'danger' ? <AlertCircle className="w-4 h-4" /> : 
                 alert.type === 'warning' ? <AlertTriangle className="w-4 h-4" /> : 
                 <Zap className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5 truncate">{alert.title}</p>
                <p className="text-[11px] font-medium leading-tight">{alert.message}</p>
              </div>
            </motion.div>
          ))}
          {alerts.length === 0 && (
            <div className="p-5 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center gap-4 shadow-sm h-full">
              <div className="p-2 bg-white rounded-xl shadow-sm text-emerald-600 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5 text-emerald-700">Fluxo Saudável</p>
                <p className="text-[11px] font-medium text-emerald-600 leading-tight">Nenhuma anomalia detectada no seu fluxo de caixa.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="p-6 md:p-8 rounded-xl bg-white shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100">
                <ArrowUpRight className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-slate-900 tracking-tight">Entradas</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Saldo no Período</p>
              </div>
            </div>
            <div className="text-left sm:text-right w-full sm:w-auto">
              <p className="text-2xl font-bold text-slate-900 break-words">{formatCurrency(cash.inflow.total || 0)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-center">
            <div className="h-64 sm:h-72 relative w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inflowChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                    onClick={(data) => openCategoryDetails(String(data.name), 'inflow')}
                    className="cursor-pointer"
                  >
                    {inflowChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <PieChartIcon className="w-6 h-6 text-slate-300 mb-1" />
                <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Entradas</span>
              </div>
            </div>

            <div className="space-y-4">
              {inflowChartData.map((item) => (
                <div 
                  key={item.name} 
                  onClick={() => openCategoryDetails(item.name, 'inflow')}
                  className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs font-bold text-slate-800 group-hover:text-midnight transition-colors">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-950">{formatCurrency(item.value)}</p>
                    <p className="text-[9px] font-bold text-slate-800">{cash.inflow.total > 0 ? ((item.value / cash.inflow.total) * 100).toFixed(1) : 0}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-6 md:p-8 rounded-xl bg-white shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center shrink-0">
                <ArrowDownRight className="w-6 h-6 text-rose-800" />
              </div>
              <div>
                <h4 className="text-xl font-serif font-bold text-slate-950 tracking-tight">Saídas</h4>
                <p className="text-[10px] text-slate-800 font-bold uppercase tracking-widest">Saldo Mensal</p>
              </div>
            </div>
            <div className="text-left sm:text-right w-full sm:w-auto">
              <p className="text-2xl sm:text-3xl font-black text-slate-950 break-words">{formatCurrency(cash.outflow.total || 0)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-center">
            <div className="h-64 sm:h-72 relative w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={outflowChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                    onClick={(data) => openCategoryDetails(String(data.name), 'outflow')}
                    className="cursor-pointer"
                  >
                    {outflowChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <PieChartIcon className="w-6 h-6 text-slate-300 mb-1" />
                <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Saídas</span>
              </div>
            </div>

            <div className="space-y-3">
              {outflowChartData.map((item) => (
                <div 
                  key={item.name} 
                  onClick={() => openCategoryDetails(item.name, 'outflow')}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[11px] font-bold text-slate-800 group-hover:text-midnight transition-colors">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-950">{formatCurrency(item.value)}</p>
                    <p className="text-[8px] font-bold text-slate-800">{cash.outflow.total > 0 ? ((item.value / cash.outflow.total) * 100).toFixed(1) : 0}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] bg-midnight text-white shadow-2xl shadow-midnight/20 relative overflow-visible min-h-fit">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
          <div className="space-y-6 w-full lg:w-auto">
                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Saldo Final do Período</h4>
            <div className="flex flex-col sm:flex-row items-start sm:items-baseline gap-4">
              <span className={`text-5xl sm:text-6xl font-black tracking-tighter break-words ${cash.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrency(cash.balance || 0)}
              </span>
              {filterType === 'month' && prevCash.balance !== 0 && (
                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  cash.balance >= prevCash.balance ? 'bg-emerald-400/20 text-emerald-400' : 'bg-rose-400/20 text-rose-400'
                }`}>
                  {cash.balance >= prevCash.balance ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(((cash.balance - prevCash.balance) / Math.abs(prevCash.balance)) * 100).toFixed(1)}%
                </div>
              )}
            </div>
            <p className="text-xs text-white font-bold max-w-sm leading-relaxed">
              Este é o valor líquido que permaneceu no caixa após todas as entradas e saídas operacionais e de estoque.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-10 w-full lg:w-auto">
            <div className="p-5 bg-white/5 rounded-2xl border border-white/20 space-y-2">
              <p className="text-[10px] font-black text-white uppercase tracking-widest">Entradas Totais</p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tighter break-words">{formatCurrency(cash.inflow.total)}</p>
            </div>
            <div className="p-5 bg-white/5 rounded-2xl border border-white/20 space-y-2">
              <p className="text-[10px] font-black text-white uppercase tracking-widest">Saídas Totais</p>
              <p className="text-2xl sm:text-3xl font-black text-rose-400 tracking-tighter break-words">{formatCurrency(cash.outflow.total)}</p>
            </div>
          </div>
        </div>
      </Card>

      {loadMoreExpenses && (
        <div className="flex justify-center pt-8">
          <button 
            onClick={loadMoreExpenses}
            className="px-8 py-3 bg-white border border-slate-200 text-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 hover:text-midnight transition-all shadow-md active:scale-95"
          >
            Carregar mais lançamentos (Gastos)
          </button>
        </div>
      )}

      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedCategory?.title || 'Detalhes'}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Data</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Descrição</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedCategory?.items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-xs font-black text-slate-700">{new Date(item.date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4 text-xs font-black text-slate-950">{item.description}</td>
                    <td className="px-6 py-4 text-xs font-black text-slate-950 text-right">{formatCurrency(item.value)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-black">
                  <td colSpan={2} className="px-6 py-4 text-xs uppercase tracking-widest text-slate-950">Total</td>
                  <td className="px-6 py-4 text-sm text-midnight text-right">
                    {formatCurrency(selectedCategory?.items.reduce((acc: number, i: any) => acc + i.value, 0) || 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
};
