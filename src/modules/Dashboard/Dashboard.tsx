import React from 'react';
import { 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  Package, 
  ArrowUpRight, 
  ArrowDownRight,
  CreditCard,
  Smartphone,
  Banknote,
  Clock,
  DollarSign,
  Percent
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { formatCurrency, toNum, formatPercent, getValorVenda, isSaleCompleted, getLocalDate, getLocalMonth } from '../../lib/utils';
import { Sale, Product, Customer, Expense, Purchase } from '../../types';
import { calcularFinanceiro, getSaleFinancials } from '../../lib/finance';

interface DashboardProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  expenses: Expense[];
  purchases: Purchase[];
  storeSettings: any;
  monthlyGoal: number;
  user: any;
  activeTab?: string;
}

export const Dashboard = ({ sales, products, customers, expenses, purchases = [], storeSettings, monthlyGoal, user }: DashboardProps) => {
  const isAdmin = user?.role === 'admin';
  // ... rest of logic stays identical ...
  // Logic for calculations using calcularFinanceiro
  const today = getLocalDate();
  const todayData = calcularFinanceiro(sales, expenses, products, storeSettings, undefined, today, today);
  const todayRevenue = todayData.vendas || 0;
  
  const currentMonth = getLocalMonth();
  const monthData = calcularFinanceiro(sales, expenses, products, storeSettings, currentMonth);
  const monthRevenue = monthData.faturamento || 0;
  const monthBruto = monthData.totalBruto || 0;
  const monthLiquido = monthData.totalLiquido || 0;
  const monthProfit = monthData.lucroLiquido || 0;
  const goalProgress = monthlyGoal > 0 ? (monthRevenue / monthlyGoal) * 100 : 0;
  
  // Custom formulas for Special Monthly Sales Goal Percentage
  const percentualMeta = monthlyGoal > 0 ? (monthRevenue / monthlyGoal) * 100 : 0;
  const formattedPercent = new Intl.NumberFormat('pt-BR', { 
    style: 'decimal', 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 1 
  }).format(percentualMeta) + '%';

  const totalInvestment = React.useMemo(() => {
    return purchases
      .filter(p => !p.status || p.status !== 'cancelled')
      .reduce((acc, p) => acc + toNum(p.total_value), 0);
  }, [purchases]);

  // 1. Calculate overall monthly Contribution Margin statistics
  const contributionMarginStats = React.useMemo(() => {
    const completedSales = monthData.filteredSales || [];
    
    let totalRevenue = 0;
    let totalCost = 0;

    completedSales.forEach(s => {
      const financials = getSaleFinancials(s, products);
      totalRevenue += financials.valor_bruto;
      totalCost += financials.total_cost;
    });

    const marginR$ = totalRevenue - totalCost;
    const marginPercent = totalRevenue > 0 ? (marginR$ / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCost,
      marginR$,
      marginPercent
    };
  }, [monthData.filteredSales, products]);

  // 2. Calculate Top Products by Margin ranking
  const topProductsMargem = React.useMemo(() => {
    const completedSales = monthData.filteredSales || [];
    const productStats = new Map<string, {
      id: string;
      name: string;
      revenue: number;
      cost: number;
      qty: number;
    }>();

    completedSales.forEach(s => {
      const items = s.items || [];
      const activeItems = items.filter(i => i.status !== 'cancelado');
      
      const subtotalFromItems = activeItems.reduce((acc, i) => acc + (toNum(i.unit_price) * toNum(i.quantity)), 0);
      const subtotal = toNum(s.subtotal) || subtotalFromItems;
      
      const discountValue = s.discount_type === 'percentage' 
        ? (subtotal * (toNum(s.discount_value) / 100)) 
        : toNum(s.discount_value);
        
      const adjustment = toNum((s as any).adjustment);
      const valorBruto = Math.max(0, (toNum(s.valor_bruto) > 0 ? toNum(s.valor_bruto) : (subtotal - (toNum(discountValue) || 0) + adjustment)));
      
      const ratio = subtotal > 0 ? valorBruto / subtotal : 1;

      activeItems.forEach(i => {
        let itemCost = toNum(i.cost);
        let itemFrete = toNum((i as any).frete);

        if (itemCost === 0 && products.length > 0) {
          const p = products.find(prod => prod.id === i.product_id);
          if (p) {
            itemCost = toNum(p.cost);
            itemFrete = toNum(p.frete);
          }
        }

        const qty = toNum(i.quantity);
        const itemTotalCost = (itemCost + itemFrete) * qty;
        const itemTotalRevenue = (toNum(i.unit_price) * qty) * ratio;

        const current = productStats.get(i.product_id) || {
          id: i.product_id,
          name: i.product_name || 'Produto sem nome',
          revenue: 0,
          cost: 0,
          qty: 0
        };

        current.revenue += itemTotalRevenue;
        current.cost += itemTotalCost;
        current.qty += qty;
        productStats.set(i.product_id, current);
      });
    });

    return Array.from(productStats.values())
      .map(p => {
        const marginR$ = p.revenue - p.cost;
        const marginPercent = p.revenue > 0 ? (marginR$ / p.revenue) * 100 : 0;
        return {
          ...p,
          marginR$,
          marginPercent
        };
      })
      .sort((a, b) => b.marginR$ - a.marginR$);
  }, [monthData.filteredSales, products]);

  // Inventory Totals
  const inventoryStats = React.useMemo(() => {
    let totalQty = 0;
    let totalCostVal = 0;
    let totalRevenueVal = 0;

    products.forEach(p => {
      if (p.status === 'inativo') return;
      
      const qty = p.has_variations && p.variations
        ? p.variations.reduce((sum, v) => sum + toNum(v.estoque), 0)
        : toNum(p.stock);
      
      const cost = toNum(p.cost) + toNum(p.frete);
      const price = toNum(p.price);

      totalQty += qty;
      totalCostVal += (qty * cost);
      totalRevenueVal += (qty * price);
    });

    return { totalQty, totalCostVal, totalRevenueVal };
  }, [products]);

  // Chart data preparation
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const daySales = sales.filter(s => {
      const isOwner = s.seller_id === user?.uid || s.seller_name === user?.name;
      return s.date.startsWith(dateStr) && isSaleCompleted(s) && (isAdmin || isOwner);
    });
    return {
      name: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
      revenue: daySales.reduce((sum, s) => sum + getSaleFinancials(s, products).valor_bruto, 0),
      count: daySales.length
    };
  }).reverse();

  const paymentMethods = [
    { 
      name: 'PIX', 
      count: monthData.paymentTotals.countPix,
      total: monthData.paymentTotals.pix,
      icon: <Smartphone className="w-5 h-5 text-emerald-500" />
    },
    { 
      name: 'Dinheiro', 
      count: monthData.paymentTotals.countCash,
      total: monthData.paymentTotals.cash,
      icon: <Banknote className="w-5 h-5 text-amber-500" />
    },
    { 
      name: 'Débito', 
      count: monthData.paymentTotals.countDebito,
      total: monthData.paymentTotals.debito,
      icon: <CreditCard className="w-5 h-5 text-indigo-500" />
    },
    { 
      name: 'Crédito', 
      count: monthData.paymentTotals.countCredito,
      total: monthData.paymentTotals.credito,
      icon: <CreditCard className="w-5 h-5 text-purple-500" />
    },
  ];

  const currentMonthName = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Filter sales for recent activity if not admin
  const recentSales = isAdmin ? sales : sales.filter(s => s.seller_id === user?.uid || s.seller_name === user?.name);

  return (
    <div className="space-y-6 sm:space-y-10 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-2 leading-none">Visão Geral do Sistema</p>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none">Painel de Controle</h2>
          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg border border-slate-200/50">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                Competência: <span className="text-slate-900">{currentMonthName}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-lg border border-emerald-100">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Tempo Real</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Action buttons could go here */}
        </div>
      </div>

      {/* Stats Grid - Responsive optimization */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard 
          title={isAdmin ? "Vendas Hoje" : "Minhas Vendas"} 
          value={formatCurrency(isAdmin ? todayRevenue : sales.filter(s => s.date.startsWith(today) && (s.seller_id === user?.uid || s.seller_name === user?.name) && isSaleCompleted(s)).reduce((sum, s) => sum + getValorVenda(s), 0))} 
          icon={<ShoppingBag className="w-5 h-5" />} 
          colorClass="text-emerald-600"
          trend={12.5}
        />
        {isAdmin && (
          <>
            <StatCard 
              title="Faturamento Bruto" 
              value={formatCurrency(monthBruto)} 
              icon={<TrendingUp className="w-5 h-5" />} 
              colorClass="text-blue-600"
              trend={8.2}
            />
            <StatCard 
              title="Lucratividade Bruta" 
              value={formatCurrency(monthProfit)} 
              icon={<ArrowUpRight className="w-5 h-5" />} 
              colorClass="text-indigo-600"
              trend={5.4}
            />
            <StatCard 
              title="Clientes Ativos" 
              value={customers.length.toString()} 
              icon={<Users className="w-5 h-5" />} 
              colorClass="text-slate-600"
            />
          </>
        )}
      </div>

      {/* Seção de Margem de Contribuição */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-8">
          {/* Card: Margem de Contribuição do Mês */}
          <Card className="p-6 sm:p-8 border-none shadow-sm flex flex-col justify-between bg-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">Margem de Contribuição</h3>
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">Indicadores do Mês</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <Percent className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-6">
                {/* Margem % e R$ */}
                <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-1 font-mono">Margem (%)</span>
                    <p className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tighter">
                      {formatPercent(contributionMarginStats.marginPercent)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-1 font-mono">Margem (R$)</span>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter">
                      {formatCurrency(contributionMarginStats.marginR$)}
                    </p>
                  </div>
                </div>

                {/* Receita e Custo */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider">
                    <span className="text-slate-600">Receita de Vendas</span>
                    <span className="text-slate-900 font-black">{formatCurrency(contributionMarginStats.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider">
                    <span className="text-slate-600">Custo dos Produtos (CPV)</span>
                    <span className="text-rose-600 font-black">-{formatCurrency(contributionMarginStats.totalCost)}</span>
                  </div>
                </div>

                {/* Progress Bar of Margin */}
                <div className="space-y-2 pt-2">
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.max(0, Math.min(100, contributionMarginStats.marginPercent))}%` }}
                    />
                  </div>
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest text-right font-mono">
                    {formatPercent(contributionMarginStats.marginPercent)} da receita é margem livre
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Card: Top Produtos por Margem */}
          <Card className="lg:col-span-2 p-6 sm:p-8 border-none shadow-sm bg-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">Top Produtos por Margem</h3>
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">Produtos que mais trazem resultado financeiro</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest">Produto</th>
                    <th className="py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Receita Gerada</th>
                    <th className="py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Custo</th>
                    <th className="py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Margem (R$)</th>
                    <th className="py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Margem (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topProductsMargem.slice(0, 5).map((prod, idx) => (
                    <tr key={prod.id || idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-slate-400 w-4 font-mono">#{idx + 1}</span>
                          <div>
                            <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{prod.name}</p>
                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-0.5 font-mono">{prod.qty} un. vendidas</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 text-right text-xs font-bold text-slate-700 font-mono">
                        {formatCurrency(prod.revenue)}
                      </td>
                      <td className="py-3.5 text-right text-xs font-bold text-slate-600 font-mono">
                        {formatCurrency(prod.cost)}
                      </td>
                      <td className="py-3.5 text-right text-xs font-black text-slate-900 font-mono">
                        {formatCurrency(prod.marginR$)}
                      </td>
                      <td className="py-3.5 text-right">
                        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono ${prod.marginPercent >= 50 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : prod.marginPercent >= 20 ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                          {formatPercent(prod.marginPercent)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {topProductsMargem.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <Package className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Nenhuma venda registrada neste período.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 sm:gap-8">
        {/* Main Chart */}
        <Card className="xl:col-span-2 p-6 sm:p-8 border-none shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 sm:mb-10">
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight uppercase">Saúde Financeira</h3>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mt-1.5">Variação de Receita (7 Dias)</p>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-slate-900" />
               <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Receita Bruta</span>
            </div>
          </div>
          <div className="h-[300px] sm:h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last7Days}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.08}/>
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#475569', fontSize: 10, fontWeight: 900}}
                  dy={15}
                  tickFormatter={(val) => val.toUpperCase()}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#475569', fontSize: 10, fontWeight: 900}}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '24px', 
                    border: '1px solid rgba(0,0,0,0.05)', 
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)',
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(8px)',
                    padding: '16px'
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  labelStyle={{ fontSize: '10px', color: '#475569', fontWeight: 900, marginBottom: '8px', textTransform: 'uppercase' }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#0f172a" strokeWidth={5} fillOpacity={1} fill="url(#colorRev)" animationDuration={2000} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Goal & Payment Methods */}
        <div className="space-y-6 sm:space-y-10">
          {isAdmin && (
            <Card className="p-6 sm:p-10 bg-slate-900 border-none shadow-2xl shadow-slate-900/20 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-125 transition-transform duration-1000" />
              
              <div className="relative z-10 w-full">
                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em] mb-6">Meta de Vendas</h3>
                
                {/* 1. Valor vendido */}
                <div className="flex flex-col gap-1.5 mb-6">
                  <p className="text-[10px] font-black text-slate-200 uppercase tracking-widest leading-none">Valor vendido</p>
                  <p className="text-4xl sm:text-5xl font-black text-white tracking-tighter leading-none">
                    {formatCurrency(monthRevenue || 0)}
                  </p>
                </div>

                {/* 2. Meta do mês & 3. Valor restante / Falta */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5 mb-6">
                  <div>
                    <p className="text-[9px] font-black text-slate-200 uppercase tracking-widest leading-none mb-1">Meta do mês</p>
                    <p className="text-sm font-bold text-white">
                      {formatCurrency(monthlyGoal || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-200 uppercase tracking-widest leading-none mb-1">Valor restante</p>
                    <p className={`text-sm font-bold ${Math.max(0, (monthlyGoal || 0) - (monthRevenue || 0)) === 0 ? 'text-emerald-400' : 'text-white'}`}>
                      {formatCurrency(Math.max(0, (monthlyGoal || 0) - (monthRevenue || 0)))}
                    </p>
                  </div>
                </div>

                {/* 4. Percentual atingido & Progress Bar */}
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between items-end text-[10px] uppercase font-black tracking-widest">
                    <span className="text-slate-200">Progresso</span>
                    <span className="text-emerald-400 font-black">Meta atingida: {formattedPercent}</span>
                  </div>
                  <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="h-full bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)] transition-all duration-2000 ease-out"
                      style={{ width: `${Math.min(100, percentualMeta || 0)}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-xs font-black text-white uppercase tracking-[0.2em]">
                    {formattedPercent} <span className="text-slate-200 ml-1">ATINGIDO</span>
                  </p>
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${percentualMeta >= 100 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-slate-200'}`}>
                    {percentualMeta >= 100 ? 'META BATIDA!' : `FALTA RESIDUAL`}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {isAdmin && (
            <Card className="p-6 sm:p-10 border-none shadow-sm">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.3em] mb-8">Composição de Caixa</h3>
              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <div key={method.name} className="flex items-center justify-between p-4 rounded-[1.5rem] hover:bg-slate-50 transition-all group border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-50 group-hover:bg-white shadow-sm transition-all border border-slate-100/50 group-hover:border-slate-200/50 group-hover:scale-110 duration-300">
                        {method.icon}
                      </div>
                      <div>
                        <p className="text-[13px] font-black text-slate-800 uppercase tracking-tight">{method.name}</p>
                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-1">{method.count} OPERAÇÕES</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900 tracking-tight">{formatCurrency(method.total || 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10">
        <Card className="p-8 sm:p-10 border-none shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Fluxo de Vendas</h3>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">Últimas transações no balcão</p>
            </div>
            <button className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] hover:text-blue-800 transition-colors bg-blue-50 px-4 py-2 rounded-xl">Histórico Completo</button>
          </div>
          <div className="space-y-8">
            {recentSales.slice(0, 5).map((sale) => (
              <div key={sale.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all duration-500 border border-slate-100 group-hover:shadow-xl group-hover:shadow-slate-900/20 group-hover:-translate-y-1">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none mb-2">{sale.customer_name || 'Consumidor Final'}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{new Date(sale.date).toLocaleDateString()}</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">{sale.payment_method}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base font-black text-slate-900 tracking-tight">{formatCurrency(getValorVenda(sale) || 0)}</p>
                  <p className="text-[10px] font-bold text-slate-600 uppercase mt-0.5">{sale.items?.length || 0} ITENS</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-8 sm:p-10 border-none shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase text-rose-600">Alerta de Ruptura</h3>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">Produtos abaixo do estoque crítico</p>
            </div>
            <button className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em] hover:text-rose-800 transition-colors bg-rose-50 px-4 py-2 rounded-xl">Gerar Compra</button>
          </div>
          <div className="space-y-8">
            {products
              .filter(p => toNum(p.stock) <= toNum(p.min_stock))
              .slice(0, 5)
              .map((product) => (
                <div key={product.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-all duration-500 border border-rose-100 group-hover:shadow-xl group-hover:shadow-rose-500/20 group-hover:-translate-y-1">
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none mb-2">{product.name}</p>
                      <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">CRÍTICO: {product.stock || 0} UNIDADES</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-1">MÍNIMO</span>
                    <p className="text-sm font-black text-slate-900">{product.min_stock || 0}</p>
                  </div>
                </div>
              ))}
            {products.filter(p => toNum(p.stock) <= toNum(p.min_stock)).length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center py-16">
                <div className="w-20 h-20 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-sm border border-emerald-100 transition-transform hover:rotate-12 duration-500">
                  <Package className="w-10 h-10 text-emerald-500" />
                </div>
                <h4 className="text-slate-800 font-black text-lg uppercase tracking-tight">Estoque Monitorado</h4>
                <p className="text-slate-600 text-xs font-bold uppercase tracking-widest mt-2">Nenhuma ruptura detectada no momento.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
