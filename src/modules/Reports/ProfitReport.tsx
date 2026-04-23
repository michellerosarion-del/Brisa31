import React, { useMemo, useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, CreditCard, Users, Download, ShoppingBag, Package, Calendar, ChevronRight, Info, Edit, Trash2, Plus } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Product, Customer, Sale, Expense, Ad, Seller, DashboardData, StoreSettings } from '../../types';
import { calcularFinanceiro, getSaleFinancials } from '../../lib/finance';
import { formatPercent, formatCurrency } from '../../lib/utils';

interface ProfitReportProps {
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  expenses: Expense[];
  ads: Ad[];
  sellers: Seller[];
  storeSettings: StoreSettings;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, type?: 'danger' | 'warning') => void;
  formatCurrency: (val: number) => string;
  toNum: (val: any) => number;
  handleEdit: (type: string, item: any) => void;
  handleDeleteAd: (id: string) => void;
  setIsModalOpen: (isOpen: boolean) => void;
  setModalType: (type: string) => void;
  setEditingItem: (item: any) => void;
  loadMoreAds?: () => void;
}

export const ProfitReport = ({ 
  products = [], 
  customers = [], 
  sales = [], 
  expenses = [], 
  ads = [], 
  sellers = [], 
  storeSettings,
  showNotification,
  showConfirm,
  formatCurrency, 
  toNum,
  handleEdit,
  handleDeleteAd,
  setIsModalOpen,
  setModalType,
  setEditingItem,
  loadMoreAds
}: ProfitReportProps) => {
  const [periodFilter, setPeriodFilter] = useState('month');
  const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);

  const dashboard = useMemo(() => {
    let start = undefined;
    let end = undefined;
    let month = undefined;

    if (periodFilter === 'today') {
      start = end = new Date().toISOString().split('T')[0];
    } else if (periodFilter === '7days') {
      const d = new Date();
      end = d.toISOString().split('T')[0];
      d.setDate(d.getDate() - 7);
      start = d.toISOString().split('T')[0];
    } else if (periodFilter === 'month') {
      month = new Date().toISOString().slice(0, 7);
    } else if (periodFilter === 'custom') {
      start = customStartDate;
      end = customEndDate;
    }

    const data = calcularFinanceiro(sales, expenses, products, storeSettings, month, start, end);
    
    // Calculate profit by product
    const profitByProductMap = new Map();
    data.filteredSales.forEach(sale => {
      const salesFinancials = getSaleFinancials(sale);
      const subtotal = salesFinancials.subtotal;
      const discountRatio = subtotal > 0 ? (salesFinancials.valor_bruto / subtotal) : 1;

      sale.items.forEach(item => {
        if (item.status === 'cancelado') return;
        const existing = profitByProductMap.get(item.product_id) || { name: item.product_name, quantity: 0, revenue: 0, cost: 0, profit: 0 };
        
        // Apply the sale's effective discount ratio to the item revenue
        const itemRevenue = (toNum(item.unit_price) * toNum(item.quantity)) * discountRatio;
        const itemCost = (toNum(item.cost) + toNum((item as any).frete)) * toNum(item.quantity);
        
        profitByProductMap.set(item.product_id, {
          id: item.product_id,
          name: item.product_name,
          quantity: existing.quantity + toNum(item.quantity),
          revenue: existing.revenue + itemRevenue,
          cost: existing.cost + itemCost,
          profit: existing.profit + (itemRevenue - itemCost)
        });
      });
    });

    const activeSales = sales.filter(s => s.status !== 'cancelada');

    const revenueLast7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = date.toISOString().split('T')[0];
      const daySales = activeSales.filter(s => s.date.startsWith(dateStr));
      return {
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        revenue: daySales.reduce((acc, s) => acc + getSaleFinancials(s).profit, 0)
      };
    });

    const profitByProduct = Array.from(profitByProductMap.values()).sort((a, b) => b.profit - a.profit);

    // Map to DashboardData-like structure for the UI
    return {
      dailyRevenue: data.vendas,
      monthlyRevenue: data.vendas,
      monthlyExpenses: data.totalDespesas,
      totalProfit: data.totalBruto - data.custo, // Gross profit = Bruto - Custo
      netProfit: data.lucroLiquido,
      profitMargin: data.margemLucro,
      totalMonthlyCost: data.custo,
      marketing: (data as any).totalOutrasDespesas || 0,
      totalTax: data.totalTaxasCartao,
      revenueLast7Days, 
      salesByMonth: [], // Could be calculated if needed
      profitByProduct
    } as any;
  }, [sales, expenses, products, storeSettings, periodFilter, customStartDate, customEndDate, toNum]);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Relatório de Lucratividade', 14, 22);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 30);

    autoTable(doc, {
      startY: 40,
      head: [['Métrica', 'Valor']],
      body: [
        ['Faturamento Bruto', formatCurrency(dashboard.monthlyRevenue)],
        ['Taxas de Cartão', formatCurrency(dashboard.totalTax)],
        ['Faturamento Líquido', formatCurrency(dashboard.monthlyRevenue - dashboard.totalTax)],
        ['Custo de Mercadoria', formatCurrency(dashboard.totalMonthlyCost)],
        ['Lucro Bruto', formatCurrency(dashboard.totalProfit)],
        ['Despesas Operacionais', formatCurrency(dashboard.monthlyExpenses - dashboard.totalTax)],
        ['Lucro Líquido', formatCurrency(dashboard.netProfit)],
        ['Margem de Lucro', formatPercent(dashboard.profitMargin)],
      ],
    });

    doc.save('relatorio-lucratividade.pdf');
    showNotification('PDF gerado com sucesso!');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Análise de Resultados</h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">Visão detalhada da saúde financeira do seu negócio.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
            {[
              { id: 'today', label: 'Hoje' },
              { id: '7days', label: '7 Dias' },
              { id: 'month', label: 'Mês' },
              { id: 'all', label: 'Tudo' },
              { id: 'custom', label: 'Personalizado' }
            ].map((p) => (
              <button 
                key={p.id}
                onClick={() => setPeriodFilter(p.id)}
                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${periodFilter === p.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button 
            onClick={exportPDF}
            className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:bg-gray-50 transition-all text-gray-800"
            title="Exportar PDF"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {periodFilter === 'custom' && (
        <Card className="p-6 flex flex-wrap gap-6 items-end animate-in fade-in slide-in-from-top-2">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Data Inicial</label>
            <input 
              type="date" 
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-4 focus:ring-midnight/5 outline-none font-black text-slate-900 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Data Final</label>
            <input 
              type="date" 
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-4 focus:ring-midnight/5 outline-none font-black text-slate-900 text-sm"
            />
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Lucro Líquido" 
          value={formatCurrency(dashboard.netProfit || 0)}
          icon={<TrendingUp />}
          colorClass="text-emerald-600"
          trend={dashboard.profitMargin || 0}
        />

        <StatCard 
          title="Faturamento" 
          value={formatCurrency(dashboard.monthlyRevenue || 0)}
          icon={<DollarSign />}
          colorClass="text-indigo-600"
        />

        <StatCard 
          title="Custos Totais" 
          value={formatCurrency((dashboard.monthlyExpenses || 0) + (dashboard.totalMonthlyCost || 0))}
          icon={<TrendingDown />}
          colorClass="text-rose-600"
        />

        <StatCard 
          title="Taxas de Cartão" 
          value={formatCurrency(dashboard.totalTax || 0)}
          icon={<CreditCard />}
          colorClass="text-amber-600"
        />
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-6 md:p-8 rounded-xl bg-white shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Curva de Lucratividade</h3>
              <p className="text-xs font-medium text-slate-500 mt-1">Desempenho dos últimos 7 dias</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Saldo Positivo</span>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboard.revenueLast7Days}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  formatter={(value: number) => [formatCurrency(value), 'Lucro']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 md:p-8 rounded-xl bg-white shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900 tracking-tight mb-8">Divisão de Custos</h3>
          <div className="h-[250px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Estoque', value: dashboard.totalMonthlyCost },
                    { name: 'Operacional', value: Math.max(0, dashboard.monthlyExpenses - dashboard.marketing - dashboard.totalTax) },
                    { name: 'Marketing', value: dashboard.marketing },
                    { name: 'Taxas', value: dashboard.totalTax }
                  ].filter(d => d.value > 0)}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#0f172a" />
                  <Cell fill="#64748b" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#f43f5e" />
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-6 md:p-8 rounded-xl bg-white shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Investimento em Marketing</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">Acompanhamento de ROI e performance de anúncios</p>
          </div>
          <button 
            onClick={() => {
              setModalType('anuncios');
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> Novo Anúncio
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest leading-none">Plataforma</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest leading-none">Investimento</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest leading-none text-center">Vendas</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest leading-none text-center">ROI</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest leading-none text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {ads.map(ad => (
                <tr key={ad.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-sm text-slate-900">{ad.platform}</td>
                  <td className="px-6 py-4 text-sm text-slate-700 font-medium">{formatCurrency(toNum(ad.investment))}</td>
                  <td className="px-6 py-4 text-sm text-slate-700 font-medium text-center">{ad.sales_generated} vendas</td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-[10px] font-bold">
                      {toNum(ad.investment) > 0 ? (toNum(ad.sales_generated) / toNum(ad.investment)).toFixed(2) : '0.00'}x
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleEdit('anuncios', ad)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"><Edit className="w-4 h-4" /></button>
                      <button 
                        onClick={() => showConfirm('Excluir Anúncio', 'Tem certeza que deseja excluir este anúncio?', () => handleDeleteAd(ad.id), 'danger')}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {ads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium text-sm">
                    Nenhum anúncio registrado para este período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {loadMoreAds && (
          <div className="flex justify-center pt-8">
            <button 
              onClick={loadMoreAds}
              className="px-8 py-3 bg-white border border-slate-200 text-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 hover:text-midnight transition-all shadow-md active:scale-95"
            >
              Carregar mais anúncios
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};
