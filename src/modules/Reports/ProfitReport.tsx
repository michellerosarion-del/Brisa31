import React, { useMemo, useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, CreditCard, Users, Download, ShoppingBag, Package, Calendar, ChevronRight, Info, Edit, Trash2, Plus, Loader2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Product, Customer, Sale, Expense, Ad, Seller, DashboardData, StoreSettings, Purchase } from '../../types';
import { calcularFinanceiro, getSaleFinancials } from '../../lib/finance';
import { formatPercent, formatCurrency, getLocalDate, getLocalMonth, toNum, isSaleCompleted } from '../../lib/utils';
import { onSnapshot, query, where } from 'firebase/firestore';
import { 
  vendasRef, 
  gastosRef, 
  produtosRef,
  comprasRef,
  handleFirestoreError,
  OperationType 
} from '../../firebase';

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
  const [customStartDate, setCustomStartDate] = useState(getLocalDate());
  const [customEndDate, setCustomEndDate] = useState(getLocalDate());

  // Independent local state for 100% data accuracy
  const [periodSales, setPeriodSales] = useState<Sale[]>([]);
  const [periodExpenses, setPeriodExpenses] = useState<Expense[]>([]);
  const [periodPurchases, setPeriodPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let start = '';
    let end = '';
    let month = '';

    if (periodFilter === 'today') {
      start = end = getLocalDate();
    } else if (periodFilter === '7days') {
      const d = new Date();
      end = d.toISOString().split('T')[0];
      d.setDate(d.getDate() - 7);
      start = d.toISOString().split('T')[0];
    } else if (periodFilter === 'month') {
      month = getLocalMonth();
      start = `${month}-01`;
      end = `${month}-31`;
    } else if (periodFilter === 'custom') {
      start = customStartDate;
      end = customEndDate;
    } else {
      // 'all' - Fetch everything? Careful with performance.
      start = '2020-01-01';
      end = '2030-12-31';
    }

    if (!start || !end) return;

    setLoading(true);
    let unsubs: (() => void)[] = [];

    try {
      const qSales = query(vendasRef, where('date', '>=', start), where('date', '<=', end));
      unsubs.push(onSnapshot(qSales, (snap) => {
        setPeriodSales(snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale)));
        setLoading(false);
      }));

      const qExpenses = query(gastosRef, where('date', '>=', start), where('date', '<=', end));
      unsubs.push(onSnapshot(qExpenses, (snap) => {
        setPeriodExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
      }));

      const qPurchases = query(comprasRef, where('date', '>=', start), where('date', '<=', end));
      unsubs.push(onSnapshot(qPurchases, (snap) => {
        setPeriodPurchases(snap.docs.map(d => ({ id: d.id, ...d.data() } as Purchase)));
      }));
    } catch (error) {
      console.error("Error fetching report data:", error);
      setLoading(false);
    }

    return () => unsubs.forEach(fn => fn());
  }, [periodFilter, customStartDate, customEndDate]);

  const dashboard = useMemo(() => {
    let start = undefined;
    let end = undefined;
    let month = undefined;

    if (periodFilter === 'today') {
      start = end = getLocalDate();
    } else if (periodFilter === '7days') {
      const d = new Date();
      end = d.toISOString().split('T')[0];
      d.setDate(d.getDate() - 7);
      start = d.toISOString().split('T')[0];
    } else if (periodFilter === 'month') {
      month = getLocalMonth();
    } else if (periodFilter === 'custom') {
      start = customStartDate;
      end = customEndDate;
    }

    const data = calcularFinanceiro(periodSales, periodExpenses, products, storeSettings, month, start, end);
    
    // Purchases Analytics
    const activePurchases = periodPurchases.filter(p => p.status !== 'cancelled');
    const receivedPurchases = activePurchases.filter(p => p.status === 'received' || (p as any).status === 'active');
    const pendingPurchases = activePurchases.filter(p => p.status === 'pending');

    const totalInvestedReceived = receivedPurchases.reduce((acc, p) => acc + toNum(p.total_value), 0);
    const totalFreightReceived = receivedPurchases.reduce((acc, p) => acc + toNum(p.freight_total), 0);
    const totalInvestedPending = pendingPurchases.reduce((acc, p) => acc + toNum(p.total_value), 0);
    const totalFreightPending = pendingPurchases.reduce((acc, p) => acc + toNum(p.freight_total), 0);
    
    // Calculate profit by product
    const profitByProductMap = new Map();
    data.filteredSales.forEach(sale => {
      const salesFinancials = getSaleFinancials(sale, products);
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

    const activeSales = periodSales.filter(s => isSaleCompleted(s));

    const revenueLast7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = date.toISOString().split('T')[0];
      const daySales = activeSales.filter(s => s.date.startsWith(dateStr));
      return {
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        revenue: daySales.reduce((acc, s) => acc + getSaleFinancials(s, products).profit, 0)
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
      marketing: (data as any).totalOutrasDespesas || (data as any).anuncios || 0,
      totalTax: data.totalTaxasCartao,
      revenueLast7Days, 
      salesByMonth: [], // Could be calculated if needed
      profitByProduct,
      purchasesMetrics: {
        received: totalInvestedReceived,
        receivedFreight: totalFreightReceived,
        pending: totalInvestedPending,
        pendingFreight: totalFreightPending,
        countPending: pendingPurchases.length,
        countReceived: receivedPurchases.length
      }
    } as any;
  }, [periodSales, periodExpenses, periodPurchases, products, storeSettings, periodFilter, customStartDate, customEndDate, toNum]);

  const abcData = useMemo(() => {
    const productStats = new Map<string, { revenue: number, name: string }>();
    let totalRevenue = 0;

    periodSales.filter(s => isSaleCompleted(s)).forEach(sale => {
      sale.items?.forEach(item => {
        const itemRevenue = toNum(item.quantity) * toNum(item.unit_price);
        const current = productStats.get(item.product_name) || { revenue: 0, name: item.product_name };
        current.revenue += itemRevenue;
        totalRevenue += itemRevenue;
        productStats.set(item.product_name, current);
      });
    });

    // Sort by revenue descending
    const sorted = Array.from(productStats.values()).sort((a, b) => b.revenue - a.revenue);

    let cumulativeRevenue = 0;
    return sorted.map(p => {
      cumulativeRevenue += p.revenue;
      const participation = totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0;
      const cumulativePercent = totalRevenue > 0 ? (cumulativeRevenue / totalRevenue) * 100 : 0;
      
      let classification: 'A' | 'B' | 'C' = 'C';
      if (cumulativePercent <= 70.1) classification = 'A';
      else if (cumulativePercent <= 90.1) classification = 'B';

      return {
        ...p,
        participation,
        cumulativePercent,
        classification
      };
    });
  }, [periodSales]);

  const exportPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(30, 41, 59); // Slate-900
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO DE LUCRATIVIDADE', 14, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Brisa 31 Moda Masculina - Gerado em: ${new Date().toLocaleString()}`, 14, 33);
    doc.text(`Período: ${periodFilter === 'custom' ? `${customStartDate} até ${customEndDate}` : periodFilter}`, pageWidth - 14, 33, { align: 'right' });

    // Summary Section
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Financeiro', 14, 55);

    autoTable(doc, {
      startY: 60,
      head: [['Métrica', 'Valor', 'Impacto']],
      body: [
        ['Faturamento Bruto', formatCurrency(dashboard.monthlyRevenue), 'Venda total'],
        ['Taxas de Cartão', formatCurrency(dashboard.totalTax), 'Custo financeiro'],
        ['Custo de Mercadoria', formatCurrency(dashboard.totalMonthlyCost), 'Custo direto'],
        ['Despesas Operacionais', formatCurrency(dashboard.monthlyExpenses - dashboard.totalTax), 'Custo fixo'],
        ['LUCRO LÍQUIDO', formatCurrency(dashboard.netProfit), 'Resultado final'],
        ['Margem de Lucro', formatPercent(dashboard.profitMargin), 'Performance'],
      ],
      theme: 'striped',
      headStyles: { fillColor: [47, 54, 64], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: {
        1: { fontStyle: 'bold', halign: 'right' },
        2: { fontStyle: 'italic', font: 'helvetica' }
      }
    });

    // ABC Analysis Header
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Análise Curva ABC de Produtos', 14, finalY);

    autoTable(doc, {
      startY: finalY + 5,
      head: [['Produto', 'Faturamento', 'Part. %', 'Acum. %', 'Classe']],
      body: abcData.map(item => [
        item.name,
        formatCurrency(item.revenue),
        `${item.participation.toFixed(1)}%`,
        `${item.cumulativePercent.toFixed(1)}%`,
        `Classe ${item.classification}`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [75, 101, 132] },
      styles: { fontSize: 8 },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'center', fontStyle: 'bold' }
      }
    });

    doc.save(`relatorio-financeiro-${getLocalDate()}.pdf`);
    showNotification('PDF profissional gerado com sucesso!');
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 w-full relative">
      {loading && (
        <div className="absolute inset-0 bg-white/40 backdrop-blur-sm z-50 flex items-center justify-center rounded-[2rem]">
          <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-3xl shadow-2xl border border-slate-100">
            <Loader2 className="w-10 h-10 text-slate-900 animate-spin" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sincronizando dados...</p>
          </div>
        </div>
      )}
      
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-100 shadow-sm w-full">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BarChart3 className="w-6 h-6 text-slate-400" />
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter">Análise de Performance</h2>
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-9">Relatório consolidado de lucratividade e estoque</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          <div className="flex flex-1 sm:flex-none bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
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
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${periodFilter === p.id ? 'bg-white text-slate-950 shadow-md border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button 
            onClick={exportPDF}
            className="p-3 bg-slate-950 text-white rounded-2xl shadow-xl hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2 group"
            title="Exportar PDF Profissional"
          >
            <Download className="w-5 h-5 group-hover:bounce" />
            <span className="text-[10px] font-black uppercase tracking-widest pr-2 hidden sm:inline">Exportar PDF</span>
          </button>
        </div>
      </div>

      {periodFilter === 'custom' && (
        <Card className="p-8 flex flex-wrap gap-8 items-end animate-in fade-in slide-in-from-top-4 rounded-[2rem]">
          <div className="flex-1 min-w-[200px] space-y-2">
            <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Data Inicial
            </label>
            <input 
              type="date" 
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-4 focus:ring-slate-900/5 outline-none font-black text-slate-900 text-sm"
            />
          </div>
          <div className="flex-1 min-w-[200px] space-y-2">
            <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Data Final
            </label>
            <input 
              type="date" 
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-4 focus:ring-slate-900/5 outline-none font-black text-slate-900 text-sm"
            />
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard 
          title="Lucro Líquido" 
          value={formatCurrency(dashboard.netProfit || 0)}
          icon={<TrendingUp />}
          colorClass="text-emerald-600"
          trend={dashboard.profitMargin || 0}
        />

        <StatCard 
          title="Faturamento Bruto" 
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
          title="Taxas Adquirente" 
          value={formatCurrency(dashboard.totalTax || 0)}
          icon={<CreditCard />}
          colorClass="text-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
        <Card className="p-8 border-slate-100 shadow-xl rounded-[2.5rem] bg-white flex flex-col justify-between">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">Investimento em Mercadorias</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fluxo de caixa aplicado em estoque</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Recebido</p>
                <p className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(dashboard.purchasesMetrics.received)}</p>
              </div>
              <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-widest">{dashboard.purchasesMetrics.countReceived} pedidos em estoque</p>
            </div>

            <div className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Pendente</p>
                <p className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(dashboard.purchasesMetrics.pending)}</p>
              </div>
              <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-widest">{dashboard.purchasesMetrics.countPending} aguardando</p>
            </div>
          </div>
          
          <div className="mt-8 grid grid-cols-2 gap-4 pt-6 border-t border-slate-50">
             <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Logística total</p>
                <p className="text-lg font-black text-slate-900">{formatCurrency(dashboard.purchasesMetrics.receivedFreight + dashboard.purchasesMetrics.pendingFreight)}</p>
             </div>
             <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Eficiência Logística</p>
                <p className="text-lg font-black text-emerald-600">
                  {((dashboard.purchasesMetrics.receivedFreight / (dashboard.purchasesMetrics.received || 1)) * 100).toFixed(1)}%
                </p>
             </div>
          </div>
        </Card>

        <Card className="p-8 border-slate-100 shadow-xl rounded-[2.5rem] bg-white">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">Composição Financeira</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Distribuição de custos e lucratividade</p>
            </div>
          </div>
          
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Lucro Líquido', value: dashboard.netProfit, color: '#10b981' },
                    { name: 'Estoque', value: dashboard.totalMonthlyCost, color: '#0f172a' },
                    { name: 'Operacional', value: Math.max(0, dashboard.monthlyExpenses - dashboard.marketing - dashboard.totalTax), color: '#64748b' },
                    { name: 'Marketing', value: dashboard.marketing, color: '#f59e0b' },
                    { name: 'Taxas', value: dashboard.totalTax, color: '#f43f5e' }
                  ].filter(d => d.value > 0)}
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {[
                    { color: '#10b981' }, { color: '#0f172a' }, { color: '#64748b' }, { color: '#f59e0b' }, { color: '#f43f5e' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 40px -5px rgba(0,0,0,0.1)' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-8 border border-slate-100 shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-[1.5rem]">
              <TrendingUp className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tighter">Curva ABC de Faturamento</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Escaneamento estratégico de rentabilidade da grade</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-2xl">
              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Classe A: Top 70%</p>
            </div>
            <div className="px-4 py-2 bg-amber-50 border border-amber-100 rounded-2xl">
              <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Classe B: 70% a 90%</p>
            </div>
            <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Classe C: Restante</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto -mx-6 sm:-mx-8">
          <div className="inline-block min-w-full align-middle p-1">
            <h3 className="sr-only">Tabela Curva ABC</h3>
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="pl-12 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Produto</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none text-right">Faturamento</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none text-right">Participação</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none text-right">Acumulado</th>
                  <th className="pr-12 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none text-center">Classificação</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-slate-50">
              {abcData.length > 0 ? abcData.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="pl-12 py-6">
                     <p className="font-black text-slate-900 text-base leading-tight">{item.name}</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Ranking #{idx + 1}</p>
                  </td>
                  <td className="px-6 py-6 text-right font-black text-slate-900 text-base">{formatCurrency(item.revenue)}</td>
                  <td className="px-6 py-6 text-right font-black text-slate-500 text-sm italic">{item.participation.toFixed(1)}%</td>
                  <td className="px-6 py-6 text-right font-bold text-slate-400 text-xs tracking-widest">{item.cumulativePercent.toFixed(1)}%</td>
                  <td className="pr-12 py-6 text-center">
                    <span className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${
                      item.classification === 'A' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' :
                      item.classification === 'B' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-400'
                    }`}>
                      Classe {item.classification}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Package className="w-16 h-16 text-slate-100" />
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Nenhuma métrica disponível para este critério</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <Card className="lg:col-span-2 p-8 rounded-[2.5rem] bg-white shadow-xl border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Curva de Lucratividade</h3>
              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Performance dos últimos 7 dias</p>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-inner">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.2em]">Saldo Positivo</span>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboard.revenueLast7Days}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} 
                  tickFormatter={(val) => `R$ ${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 40px -5px rgba(0,0,0,0.1)', padding: '1.5rem' }}
                  formatter={(value: number) => [formatCurrency(value), 'Lucro']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={5} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-8 rounded-[2.5rem] bg-slate-900 border-none shadow-2xl relative overflow-hidden flex flex-col justify-between">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
           
           <div className="relative z-10">
              <div className="p-3 bg-white/10 rounded-2xl w-fit mb-6">
                <Info className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight uppercase mb-2">Insight de Performance</h3>
              <p className="text-sm text-slate-300 font-medium leading-relaxed">
                {(dashboard.profitMargin || 0) > 30 ? 
                  'Sua operação está com uma margem excelente! Continue monitorando o giro de estoque para manter o caixa saudável.' :
                  'Atenção às taxas adquirentes e descontos. Pequenos ajustes na precificação podem aumentar significativamente seu lucro líquido.'
                }
              </p>
           </div>

           <div className="relative z-10 pt-10 border-t border-white/10 mt-10">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4">Meta Mensal</p>
              <div className="flex items-baseline gap-3 mb-4">
                 <span className="text-5xl font-black text-white tracking-tighter">
                   {((dashboard.monthlyRevenue / (toNum(storeSettings.monthly_goal) || 1)) * 100).toFixed(0)}%
                 </span>
                 <span className="text-xs font-bold text-slate-400">da meta atingida</span>
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                 <div 
                   className="h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.5)]" 
                   style={{ width: `${Math.min(100, (dashboard.monthlyRevenue / (toNum(storeSettings.monthly_goal) || 1)) * 100)}%` }}
                 />
              </div>
           </div>
        </Card>
      </div>

      <Card className="p-8 rounded-[2.5rem] bg-white shadow-xl border border-slate-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">Investimento em Marketing</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">ROI e Performance por Plataforma</p>
            </div>
          </div>
          <button 
            onClick={() => {
              setModalType('anuncios');
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-3 px-6 py-3 bg-slate-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl active:scale-95 group"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> Novo Anúncio
          </button>
        </div>

        <div className="overflow-x-auto -mx-6 sm:-mx-8">
          <div className="inline-block min-w-full align-middle p-1">
            <h3 className="sr-only">Tabela Marketing</h3>
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="pl-12 py-5 font-black text-slate-400 text-[10px] uppercase tracking-[0.3em] leading-none">Plataforma</th>
                  <th className="px-6 py-5 font-black text-slate-400 text-[10px] uppercase tracking-[0.3em] leading-none">Investimento</th>
                  <th className="px-6 py-5 font-black text-slate-400 text-[10px] uppercase tracking-[0.3em] leading-none text-center">Conversão</th>
                  <th className="px-6 py-5 font-black text-slate-400 text-[10px] uppercase tracking-[0.3em] leading-none text-center">ROI</th>
                  <th className="pr-12 py-5 font-black text-slate-400 text-[10px] uppercase tracking-[0.3em] leading-none text-right">Ações</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-slate-50">
              {ads.map(ad => (
                <tr key={ad.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="pl-12 py-6 font-black text-base text-slate-900">{ad.platform}</td>
                  <td className="px-6 py-6 text-base text-slate-800 font-bold">{formatCurrency(toNum(ad.investment))}</td>
                  <td className="px-6 py-6 text-sm text-slate-600 font-black text-center">{ad.sales_generated} vendas</td>
                  <td className="px-6 py-6 text-center">
                    <span className="inline-flex px-4 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                      {toNum(ad.investment) > 0 ? (toNum(ad.sales_generated) / toNum(ad.investment)).toFixed(2) : '0.00'}x <span className="ml-1 opacity-50">ROI</span>
                    </span>
                  </td>
                  <td className="pr-12 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit('anuncios', ad)} className="p-3 text-slate-400 hover:text-slate-950 hover:bg-white rounded-xl shadow-none hover:shadow-md transition-all active:scale-90"><Edit className="w-4 h-4" /></button>
                      <button 
                        onClick={() => showConfirm('Excluir Anúncio', 'Tem certeza que deseja excluir este anúncio?', () => handleDeleteAd(ad.id), 'danger')}
                        className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-90"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {ads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-12 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Info className="w-10 h-10 text-slate-100" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Nenhum anúncio registrado para este período</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
        {loadMoreAds && (
          <div className="flex justify-center pt-10">
            <button 
              onClick={loadMoreAds}
              className="px-10 py-4 bg-white border border-slate-200 text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xl active:scale-95"
            >
              Carregar Histórico
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};
