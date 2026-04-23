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
  DollarSign
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
import { formatCurrency, toNum, formatPercent, getValorVenda, isSaleCompleted } from '../../lib/utils';
import { Sale, Product, Customer, Expense } from '../../types';
import { calcularFinanceiro, getSaleFinancials } from '../../lib/finance';

interface DashboardProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  expenses: Expense[];
  storeSettings: any;
  monthlyGoal: number;
  user: any;
}

export const Dashboard = ({ sales, products, customers, expenses, storeSettings, monthlyGoal, user }: DashboardProps) => {
  const isAdmin = user?.role === 'admin';
  // Logic for calculations using calcularFinanceiro
  const today = new Date().toISOString().split('T')[0];
  const todayData = calcularFinanceiro(sales, expenses, products, storeSettings, undefined, today, today);
  const todayRevenue = todayData.vendas || 0;
  
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthData = calcularFinanceiro(sales, expenses, products, storeSettings, currentMonth);
  const monthRevenue = monthData.faturamento || 0;
  const monthBruto = monthData.totalBruto || 0;
  const monthLiquido = monthData.totalLiquido || 0;
  const monthProfit = monthData.lucroLiquido || 0;
  const goalProgress = (monthRevenue / (monthlyGoal || 1)) * 100;

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
      
      const cost = toNum(p.cost);
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
      revenue: daySales.reduce((sum, s) => sum + getSaleFinancials(s).valor_bruto, 0),
      count: daySales.length
    };
  }).reverse();

  const paymentMethods = [
    { 
      name: 'PIX', 
      count: monthData.filteredSales.filter(s => s.payment_method === 'pix').length,
      total: monthData.filteredSales.filter(s => s.payment_method === 'pix').reduce((acc, s) => acc + getSaleFinancials(s).valor_bruto, 0),
      icon: <Smartphone className="w-5 h-5 text-emerald-500" />
    },
    { 
      name: 'Dinheiro', 
      count: monthData.filteredSales.filter(s => s.payment_method === 'dinheiro').length,
      total: monthData.filteredSales.filter(s => s.payment_method === 'dinheiro').reduce((acc, s) => acc + getSaleFinancials(s).valor_bruto, 0),
      icon: <Banknote className="w-5 h-5 text-amber-500" />
    },
    { 
      name: 'Débito', 
      count: monthData.filteredSales.filter(s => s.payment_method === 'debito').length,
      total: monthData.filteredSales.filter(s => s.payment_method === 'debito').reduce((acc, s) => acc + getSaleFinancials(s).valor_bruto, 0),
      icon: <CreditCard className="w-5 h-5 text-indigo-500" />
    },
    { 
      name: 'Crédito', 
      count: monthData.filteredSales.filter(s => ['credito', 'cartao_vista', 'cartao_parcelado'].includes(s.payment_method)).length,
      total: monthData.filteredSales.filter(s => ['credito', 'cartao_vista', 'cartao_parcelado'].includes(s.payment_method)).reduce((acc, s) => acc + getSaleFinancials(s).valor_bruto, 0),
      icon: <CreditCard className="w-5 h-5 text-purple-500" />
    },
  ];

  const currentMonthName = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Filter sales for recent activity if not admin
  const recentSales = isAdmin ? sales : sales.filter(s => s.seller_id === user?.uid || s.seller_name === user?.name);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Dashboard</h2>
          <div className="flex items-center gap-2 mt-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <p className="text-xs font-medium text-slate-500">
              Período: <span className="text-slate-900 font-semibold">{currentMonthName}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        <StatCard 
          title={isAdmin ? "Vendas Hoje" : "Minhas Vendas Hoje"} 
          value={formatCurrency(isAdmin ? todayRevenue : sales.filter(s => s.date.startsWith(today) && (s.seller_id === user?.uid || s.seller_name === user?.name)).reduce((sum, s) => sum + getValorVenda(s), 0))} 
          icon={<ShoppingBag className="w-5 h-5" />} 
          colorClass="text-emerald-600"
        />
        {isAdmin && (
          <>
            <StatCard 
              title="Faturamento" 
              value={formatCurrency(monthBruto)} 
              icon={<TrendingUp className="w-5 h-5" />} 
              colorClass="text-blue-600"
            />
            <StatCard 
              title="Total Líquido" 
              value={formatCurrency(monthLiquido)} 
              icon={<DollarSign className="w-5 h-5" />} 
              colorClass="text-indigo-600"
            />
            <StatCard 
              title="Lucro" 
              value={formatCurrency(monthProfit)} 
              icon={<ArrowUpRight className="w-5 h-5" />} 
              colorClass="text-emerald-600"
            />
          </>
        )}
        <StatCard 
          title="Peças" 
          value={inventoryStats.totalQty.toString()} 
          icon={<Package className="w-5 h-5" />} 
          colorClass="text-amber-600"
        />
        {isAdmin && (
          <StatCard 
            title="Investimento" 
            value={formatCurrency(inventoryStats.totalCostVal)} 
            icon={<Banknote className="w-5 h-5" />} 
            colorClass="text-rose-600"
          />
        )}
        <StatCard 
          title="Clientes" 
          value={customers.length.toString()} 
          icon={<Users className="w-5 h-5" />} 
          colorClass="text-slate-600"
        />
        <StatCard 
          title="Modelos" 
          value={products.length.toString()} 
          icon={<Package className="w-5 h-5" />} 
          colorClass="text-slate-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <Card className="lg:col-span-2 p-6 md:p-8 border-none shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-semibold text-slate-900 tracking-tight">{isAdmin ? 'Evolução de Vendas' : 'Minha Evolução'}</h3>
              <p className="text-sm text-slate-500 font-medium">Desempenho dos últimos 7 dias</p>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last7Days}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#000000" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#1e293b', fontSize: 12, fontWeight: 800}}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#1e293b', fontSize: 12, fontWeight: 800}}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [formatCurrency(value), 'Receita']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#000000" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Goal & Payment Methods */}
        <div className="space-y-8">
          {isAdmin && (
            <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-xl">
              <div className="relative z-10 w-full">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Meta Mensal</h3>
                <div className="flex flex-col gap-1 mb-6">
                  <p className="text-3xl font-semibold text-slate-900 leading-tight">
                    {formatCurrency(monthRevenue || 0)}
                  </p>
                  <p className="text-sm font-medium text-slate-500">
                    de {formatCurrency(monthlyGoal || 0)} planejado
                  </p>
                </div>
                
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-6">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(100, goalProgress || 0)}%` }}
                  />
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    {formatPercent(goalProgress || 0)} atingido
                  </p>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${goalProgress >= 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600'}`}>
                    {goalProgress >= 100 ? 'Meta batida! 🎉' : `Faltam ${formatCurrency(Math.max(0, (monthlyGoal || 0) - (monthRevenue || 0)))}`}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {isAdmin && (
            <Card className="p-6 md:p-8 border-none shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-8 pb-4 border-b border-slate-50">Meios de Pagamento</h3>
              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <div key={method.name} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-all group border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-100 group-hover:bg-white shadow-sm transition-all border border-transparent group-hover:border-slate-200">
                        {method.icon}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{method.name}</p>
                        <p className="text-xs text-slate-500 font-medium">{method.count} vendas</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">{formatCurrency(method.total || 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6 md:p-8 border-none shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-semibold text-slate-900 tracking-tight">{isAdmin ? 'Vendas Recentes' : 'Minhas Vendas Recentes'}</h3>
            <button className="text-xs font-semibold text-blue-600 uppercase tracking-widest hover:underline">Ver todas</button>
          </div>
          <div className="space-y-6">
            {recentSales.slice(0, 5).map((sale) => (
              <div key={sale.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center group-hover:bg-slate-100 transition-all border border-slate-100">
                    <ShoppingBag className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{sale.customer_name || 'Consumidor Final'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-medium text-slate-500">{new Date(sale.date).toLocaleDateString()}</span>
                      <span className="w-0.5 h-0.5 bg-slate-300 rounded-full" />
                      <span className="text-xs font-medium text-emerald-600 capitalize">{sale.payment_method}</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm font-semibold text-slate-900">{formatCurrency(getValorVenda(sale) || 0)}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 md:p-8 border-none shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Produtos em Baixa</h3>
            <button className="text-xs font-semibold text-blue-600 uppercase tracking-widest hover:underline">Repor estoque</button>
          </div>
          <div className="space-y-6">
            {products
              .filter(p => toNum(p.stock) <= toNum(p.min_stock))
              .slice(0, 5)
              .map((product) => (
                <div key={product.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center text-rose-500 group-hover:bg-rose-100 transition-all border border-rose-100">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{product.name}</p>
                      <p className="text-xs font-medium text-rose-600 mt-0.5">Apenas {product.stock || 0} em estoque</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-tighter">Mínimo</p>
                    <p className="text-sm font-semibold text-slate-900">{product.min_stock || 0}</p>
                  </div>
                </div>
              ))}
            {products.filter(p => toNum(p.stock) <= toNum(p.min_stock)).length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                  <Package className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-slate-900 font-semibold text-sm">Estoque em dia!</p>
                <p className="text-slate-500 text-xs mt-1">Todos os produtos estão acima do mínimo.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
