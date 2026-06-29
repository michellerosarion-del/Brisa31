import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Activity, 
  ShoppingBag, 
  TrendingUp, 
  TrendingDown,
  Package, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Tag, 
  CreditCard, 
  Calendar,
  Wallet,
  Layers,
  Percent,
  SearchCode,
  Loader2
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Sale, Product, Expense, StoreSettings, Purchase } from '../../types';
import { formatCurrency, toNum, isSaleCompleted } from '../../lib/utils';
import { calcularFinanceiro, getSaleFinancials } from '../../lib/finance';
import { onSnapshot, query, where } from 'firebase/firestore';
import { 
  vendasRef, 
  produtosRef, 
  gastosRef, 
  comprasRef,
  handleFirestoreError,
  OperationType 
} from '../../firebase';

interface StoreXRayProps {
  sales: Sale[]; // Keep for compatibility if needed elsewhere
  products: Product[];
  expenses: Expense[];
  purchases: Purchase[];
  storeSettings: StoreSettings;
}

export const StoreXRay = ({ 
  storeSettings 
}: StoreXRayProps) => {
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allPurchases, setAllPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const monthsList = useMemo(() => {
    const list = [];
    const date = new Date();
    for (let i = 0; i < 12; i++) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const value = `${year}-${month}`;
      
      const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
      
      list.push({ value, label: capitalizedLabel });
      date.setMonth(date.getMonth() - 1);
    }
    return list;
  }, []);

  // 1. Independent Fetching for Full History Stats
  useEffect(() => {
    let unsubs: (() => void)[] = [];
    setLoading(true);

    try {
      // Fetch ALL valid sales (no limit)
      const qSales = query(vendasRef);
      unsubs.push(onSnapshot(qSales, (snap) => {
        setAllSales(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Sale)));
        setLoading(false);
      }, err => handleFirestoreError(err, OperationType.LIST, 'vendas_raiox')));

      // Fetch ALL products (no limit)
      const qProd = query(produtosRef);
      unsubs.push(onSnapshot(qProd, (snap) => {
        setAllProducts(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Product)));
      }, err => handleFirestoreError(err, OperationType.LIST, 'produtos_raiox')));

      // Fetch ALL expenses (no limit)
      const qExp = query(gastosRef);
      unsubs.push(onSnapshot(qExp, (snap) => {
        setAllExpenses(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Expense)));
      }, err => handleFirestoreError(err, OperationType.LIST, 'gastos_raiox')));

      // Fetch ALL purchases (no limit)
      const qPurch = query(comprasRef);
      unsubs.push(onSnapshot(qPurch, (snap) => {
        setAllPurchases(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Purchase)));
      }, err => handleFirestoreError(err, OperationType.LIST, 'compras_raiox')));

    } catch (error) {
      console.error("Error in Raio-X stats fetch:", error);
      const timer = setTimeout(() => setLoading(false), 2000);
      return () => clearTimeout(timer);
    }

    return () => unsubs.forEach(fn => fn());
  }, []);

  const stats = useMemo(() => {
    // 1. GLOBAL HISTORY STATS (No date filter)
    const globalData = calcularFinanceiro(allSales, allExpenses, allProducts, storeSettings);
    
    // 2. MONTHLY STATS
    const mesData = calcularFinanceiro(allSales, allExpenses, allProducts, storeSettings, selectedMonth);

    const activeSales = allSales.filter(s => isSaleCompleted(s));
    const activePurchases = allPurchases.filter(p => !p.status || p.status !== 'cancelled');
    
    // Stock Value
    const activeProductsForStock = allProducts.filter(p => p.status !== 'inativo');
    const stockValue = activeProductsForStock.reduce((acc, p) => {
      const pCost = toNum(p.cost) + toNum((p as any).frete || 0);
      const pStock = toNum(p.stock);
      return acc + (pCost * pStock);
    }, 0);
    const stockPieces = activeProductsForStock.reduce((acc, p) => acc + toNum(p.stock), 0);

    const pecasVendidasTotal = activeSales.reduce((acc, s) => {
      const itemsCount = s.items.reduce((sum, i) => sum + (i.status !== 'cancelado' ? toNum(i.quantity) : 0), 0);
      return acc + itemsCount;
    }, 0);

    // Investment
    const receivedPurchases = allPurchases.filter(p => p.status === 'received' || (p as any).status === 'active');
    const pendingPurchases = allPurchases.filter(p => p.status === 'pending');

    const totalInvestido = receivedPurchases.reduce((acc, p) => acc + toNum(p.total_value) + (toNum(p.freight_total) || 0), 0);
    const mercadoriaInvestido = receivedPurchases.reduce((acc, p) => acc + toNum(p.total_value), 0);
    const logisticaInvestido = receivedPurchases.reduce((acc, p) => acc + (toNum(p.freight_total) || 0), 0);
    
    const totalPendente = pendingPurchases.reduce((acc, p) => acc + toNum(p.total_value) + (toNum(p.freight_total) || 0), 0);

    const comprasMes = receivedPurchases
      .filter(p => p.date && p.date.startsWith(selectedMonth))
      .reduce((acc, p) => acc + toNum(p.total_value) + (toNum(p.freight_total) || 0), 0);

    // Ticket Médio
    const ticketMedio = activeSales.length > 0 ? globalData.totalBruto / activeSales.length : 0;

    const totalDescontosAll = activeSales.reduce((acc, s) => {
      const fin = getSaleFinancials(s, allProducts);
      const discount = fin.subtotal - fin.valor_bruto + (toNum((s as any).adjustment) || 0);
      return acc + (discount > 0 ? discount : 0);
    }, 0);

    const activeSalesMonth = allSales.filter(s => isSaleCompleted(s) && (s.date || '').startsWith(selectedMonth));
    const pecasVendidasMes = activeSalesMonth.reduce((acc, s) => {
      const itemsCount = s.items.reduce((sum, i) => sum + (i.status !== 'cancelado' ? toNum(i.quantity) : 0), 0);
      return acc + itemsCount;
    }, 0);
    const ticketMedioMes = activeSalesMonth.length > 0 ? mesData.totalBruto / activeSalesMonth.length : 0;

    return {
      stockValue: isNaN(stockValue) ? 0 : stockValue,
      stockPieces: isNaN(stockPieces) ? 0 : stockPieces,
      faturamentoTotal: globalData.totalBruto,
      pecasVendidasTotal,
      totalInvestido,
      mercadoriaInvestido,
      logisticaInvestido,
      totalPendente,
      totalDescontos: totalDescontosAll,
      totalTaxas: globalData.totalTaxasCartao,
      lucroReal: globalData.lucroLiquido,
      ticketMedio: isNaN(ticketMedio) ? 0 : ticketMedio,
      
      // Monthly
      faturamentoMes: mesData.totalBruto,
      mesData,
      comprasMes: isNaN(comprasMes) ? 0 : comprasMes,
      activeSalesMonth,
      pecasVendidasMes,
      ticketMedioMes
    };
  }, [allSales, allProducts, allExpenses, allPurchases, storeSettings, selectedMonth]);

  const StatCard = ({ title, value, subValue, icon: Icon, colorClass, prefix = "" }: any) => (
    <Card className="p-6 relative overflow-hidden group hover:shadow-xl transition-all bg-white border-slate-200">
      <div className={`absolute top-0 right-0 w-24 h-24 ${colorClass} opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform`} />
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-2">{title}</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter">
            {prefix}{value}
          </h3>
          {subValue && (
            <p className="text-[10px] font-bold text-slate-600 mt-1 uppercase tracking-wider">{subValue}</p>
          )}
        </div>
        <div className={`p-3 rounded-2xl ${colorClass.replace('bg-', 'bg-opacity-10 text-')} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 text-slate-400 animate-spin" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Calculando indicadores globais...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center gap-4 mb-2">
        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Raio-X da Loja</h2>
          <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Visão Geral de Performance e Saúde do Negócio</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Estoque Atual (Valor)"
          value={formatCurrency(stats.stockValue)}
          subValue={`${stats.stockPieces} peças em estoque`}
          icon={Layers}
          colorClass="bg-slate-900"
        />
        <StatCard 
          title="Faturamento Total"
          value={formatCurrency(stats.faturamentoTotal)}
          subValue={`${stats.pecasVendidasTotal} peças vendidas (geral)`}
          icon={ShoppingBag}
          colorClass="bg-emerald-600"
        />
        <StatCard 
          title="Investimento (Recebido)"
          value={formatCurrency(stats.totalInvestido)}
          subValue={`${formatCurrency(stats.logisticaInvestido)} em fretes`}
          icon={Wallet}
          colorClass="bg-blue-600"
        />
        <StatCard 
          title="Pedidos em Trânsito"
          value={formatCurrency(stats.totalPendente)}
          subValue="Aguardando recebimento"
          icon={Package}
          colorClass="bg-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Card className="p-10 border-slate-100 bg-white text-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.05)] relative overflow-hidden rounded-[2.5rem]">
            <div className="absolute top-0 right-0 w-96 h-96 bg-slate-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50" />
            <div className="relative z-10 flex flex-col h-full border-b border-slate-50 pb-10 mb-10">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-4 text-slate-600">Patrimônio Líquido Acumulado</p>
              <h2 className={`text-6xl sm:text-8xl font-black tracking-tighter mb-4 ${stats.lucroReal >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatCurrency(stats.lucroReal)}
              </h2>
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${stats.lucroReal >= 0 ? 'bg-emerald-50 text-emerald-700border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                   {stats.lucroReal >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                   {stats.faturamentoTotal > 0 ? ((stats.lucroReal / stats.faturamentoTotal) * 100).toFixed(1) : 0}% de Margem Geral
                </div>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                  Performance histórica da loja
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 relative z-10">
              <div className="group">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 mb-2 group-hover:text-slate-950 transition-colors">Total Taxas</p>
                <p className="text-2xl font-black text-rose-600 tracking-tighter">{formatCurrency(stats.totalTaxas)}</p>
              </div>
              <div className="group">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 mb-2 group-hover:text-slate-950 transition-colors">Markup Médio</p>
                <p className="text-2xl font-black text-amber-600 tracking-tighter">
                  {(stats.faturamentoTotal - stats.lucroReal) > 0 ? (stats.faturamentoTotal / (stats.faturamentoTotal - stats.lucroReal)).toFixed(2) : 0}x
                </p>
              </div>
              <div className="group">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 mb-2 group-hover:text-slate-950 transition-colors">Ticket Médio</p>
                <p className="text-2xl font-black text-blue-600 tracking-tighter">{formatCurrency(stats.ticketMedio)}</p>
              </div>
              <div className="group">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 mb-2 group-hover:text-slate-950 transition-colors">Descontos</p>
                <p className="text-2xl font-black text-slate-900 tracking-tighter">{formatCurrency(stats.totalDescontos)}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-8 bg-white border-slate-100 shadow-xl rounded-[2.5rem]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-950 text-white rounded-2xl shadow-lg shadow-slate-950/20">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">Desempenho Mensal</h4>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Analise o mês desejado</p>
                </div>
              </div>
              <div className="relative">
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full sm:w-auto px-6 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black text-slate-800 outline-none focus:ring-2 focus:ring-slate-950/5 focus:bg-white transition-all cursor-pointer uppercase tracking-widest leading-none appearance-none"
                >
                  {monthsList.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 group hover:border-slate-300 transition-all">
                <div>
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Faturamento Bruto</p>
                  <p className="text-xl font-black text-slate-900">{formatCurrency(stats.faturamentoMes)}</p>
                </div>
                <ArrowUpRight className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="flex justify-between items-center bg-emerald-50/50 p-5 rounded-[1.5rem] border border-emerald-100 group hover:border-emerald-300 transition-all">
                <div>
                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">Lucro Líquido</p>
                  <p className="text-xl font-black text-emerald-800">{formatCurrency(stats.mesData.lucroLiquido)}</p>
                </div>
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50/50 p-5 rounded-[1.5rem] border border-blue-100">
                  <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-1">Compras</p>
                  <p className="text-sm font-black text-blue-900">{formatCurrency(stats.comprasMes)}</p>
                </div>
                <div className="bg-rose-50/50 p-5 rounded-[1.5rem] border border-rose-100">
                  <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest mb-1">Descontos</p>
                  <p className="text-sm font-black text-rose-900">
                    {formatCurrency(stats.activeSalesMonth.reduce((acc, s) => acc + toNum(s.discount_value), 0))}
                  </p>
                </div>
                <div className="bg-[#f0fdf4] p-5 rounded-[1.5rem] border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">Peças Vendidas</p>
                  <p className="text-sm font-black text-emerald-900">
                    {stats.pecasVendidasMes} unid
                  </p>
                </div>
                <div className="bg-[#f5f3ff] p-5 rounded-[1.5rem] border border-purple-100">
                  <p className="text-[10px] font-black text-purple-700 uppercase tracking-widest mb-1 font-black leading-none">Fat. Médio / Venda</p>
                  <p className="text-sm font-black text-purple-900 mt-1">
                    {formatCurrency(stats.ticketMedioMes)}
                  </p>
                </div>
                <div className="bg-amber-50/50 p-5 rounded-[1.5rem] border border-amber-100">
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Custo do Estoque Vendido</p>
                  <p className="text-sm font-black text-amber-900 mt-1">
                    {formatCurrency(stats.mesData.custo)}
                  </p>
                </div>
                <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-200">
                  <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1">Taxas de Cartão</p>
                  <p className="text-sm font-black text-slate-900 mt-1">
                    {formatCurrency(stats.mesData.totalTaxasCartao)}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-slate-950 border-none shadow-2xl rounded-[2rem] text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/10 rounded-xl">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-[10px] font-black text-slate-200 uppercase tracking-[0.2em]">Insights Mensais</p>
            </div>
            <p className="text-xs font-bold text-white leading-relaxed uppercase tracking-tighter">
              Sua margem de contribuição no mês selecionado está em <span className="text-emerald-400">{stats.mesData.margemLucro.toFixed(1)}%</span>.
              <br />
              <span className="text-[10px] text-slate-300 font-medium mt-2 block">
                {stats.mesData.margemLucro > 30 ? 'Desempenho acima da média do mercado!' : 'Considere revisar suas taxas e custos fixos.'}
              </span>
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

const CheckCircle2 = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
);
