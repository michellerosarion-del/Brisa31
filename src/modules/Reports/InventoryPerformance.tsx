import React, { useMemo, useState } from 'react';
import { Package, ShoppingBag, BarChart3, TrendingUp, Download, Search, Filter, Hash, Palette, Maximize2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, PieChart, Pie } from 'recharts';
import { Card } from '../../components/ui/Card';
import { Product, Sale, Variation } from '../../types';
import { formatCurrency, toNum, isSaleCompleted } from '../../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InventoryPerformanceProps {
  products: Product[];
  sales: Sale[];
  formatCurrency: (val: number) => string;
}

export const InventoryPerformance = ({ products, sales, formatCurrency }: InventoryPerformanceProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [products]);

  // Inventory Data per Variation
  const inventoryData = useMemo(() => {
    const data: any[] = [];
    
    products.forEach(p => {
      if (p.status === 'inativo') return;
      
      const pName = searchTerm.toLowerCase();
      if (searchTerm && !p.name.toLowerCase().includes(pName) && !p.code?.toLowerCase().includes(pName)) {
        return;
      }
      
      if (categoryFilter && p.category !== categoryFilter) {
        return;
      }

      const cost = toNum(p.cost);
      const freight = toNum(p.frete);
      const totalUnitCost = cost + freight;
      const price = toNum(p.price);
      const unitProfit = price - totalUnitCost;

      if (p.variations && p.variations.length > 0) {
        p.variations.forEach(v => {
          const stock = toNum(v.estoque);
          data.push({
            id: `${p.id}-${v.id}`,
            productName: p.name,
            code: p.code || '---',
            category: p.category || 'Geral',
            color: v.cor || '---',
            size: v.tamanho || '---',
            stock,
            cost,
            freight,
            totalUnitCost,
            price,
            unitProfit,
            totalStockValue: stock * price
          });
        });
      } else {
        const stock = toNum(p.stock);
        data.push({
          id: p.id,
          productName: p.name,
          code: p.code || '---',
          category: p.category || 'Geral',
          color: p.cor || '---',
          size: p.tamanho || '---',
          stock,
          cost,
          freight,
          totalUnitCost,
          price,
          unitProfit,
          totalStockValue: stock * price
        });
      }
    });

    return data.sort((a, b) => b.stock - a.stock);
  }, [products, searchTerm, categoryFilter]);

  // Aggregate totals for the financial summary fixed at the bottom of the page
  const totals = useMemo(() => {
    let qtdeTotal = 0;
    let valorInvestido = 0;
    let freteInvestido = 0;
    let custoTotalEstoque = 0;
    let valorPotencialVenda = 0;

    inventoryData.forEach(item => {
      qtdeTotal += item.stock;
      valorInvestido += item.stock * item.cost;
      freteInvestido += item.stock * item.freight;
      custoTotalEstoque += item.stock * item.totalUnitCost;
      valorPotencialVenda += item.stock * item.price;
    });

    const lucroPotencial = valorPotencialVenda - custoTotalEstoque;

    return {
      qtdeTotal,
      valorInvestido,
      freteInvestido,
      custoTotalEstoque,
      valorPotencialVenda,
      lucroPotencial
    };
  }, [inventoryData]);

  // Performance Data (Best Selling Sizes and Colors)
  const performanceStats = useMemo(() => {
    const colorsMap: Record<string, number> = {};
    const sizesMap: Record<string, number> = {};
    const productsPerfMap: Record<string, { total: number, name: string }> = {};

    sales.forEach(sale => {
      if (!isSaleCompleted(sale)) return;
      
      sale.items.forEach(item => {
        if (item.status === 'cancelado') return;
        
        const qty = toNum(item.quantity);
        
        // Colors
        if (item.cor) {
          const color = item.cor.trim().toUpperCase();
          colorsMap[color] = (colorsMap[color] || 0) + qty;
        }
        
        // Sizes
        if (item.tamanho) {
          const size = item.tamanho.trim().toUpperCase();
          sizesMap[size] = (sizesMap[size] || 0) + qty;
        }

        // Product performance
        if (item.product_name) {
          const name = item.product_name;
          if (!productsPerfMap[name]) {
            productsPerfMap[name] = { total: 0, name };
          }
          productsPerfMap[name].total += qty;
        }
      });
    });

    const topColors = Object.entries(colorsMap)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const topSizes = Object.entries(sizesMap)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const topProducts = Object.values(productsPerfMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return { topColors, topSizes, topProducts };
  }, [sales]);

  const COLORS = ['#1E293B', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#64748B'];

  const exportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    doc.setFontSize(18);
    doc.text('Relatório de Estoque por Variação', 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 22);

    autoTable(doc, {
      startY: 25,
      head: [['Produto', 'Cód', 'Cor', 'Tam', 'Estoque', 'Custo', 'Frete', 'Custo Total', 'Preço Venda', 'Lucro Unit.', 'Total Estoque']],
      body: inventoryData.map(item => [
        item.productName,
        item.code,
        item.color,
        item.size,
        item.stock,
        formatCurrency(item.cost),
        formatCurrency(item.freight),
        formatCurrency(item.totalUnitCost),
        formatCurrency(item.price),
        formatCurrency(item.unitProfit),
        formatCurrency(item.totalStockValue)
      ]),
      headStyles: { fillColor: [30, 41, 59] },
      margin: { top: 25 },
      styles: { fontSize: 7 }
    });

    // Add summary to PDF
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Financeiro do Estoque:', 14, finalY);
    
    autoTable(doc, {
      startY: finalY + 5,
      head: [['Peças em Estoque', 'Valor Investido', 'Frete Investido', 'Custo Total', 'Valor Potencial Venda', 'Lucro Potencial Bruto']],
      body: [[
        totals.qtdeTotal,
        formatCurrency(totals.valorInvestido),
        formatCurrency(totals.freteInvestido),
        formatCurrency(totals.custoTotalEstoque),
        formatCurrency(totals.valorPotencialVenda),
        formatCurrency(totals.lucroPotencial)
      ]],
      headStyles: { fillColor: [16, 185, 129] },
      margin: { left: 14 },
      tableWidth: 'wrap',
      styles: { fontSize: 8, fontStyle: 'bold' }
    });

    doc.addPage();
    doc.setFontSize(18);
    doc.text('Desempenho de Vendas (Cores e Tamanhos)', 14, 15);

    doc.setFontSize(12);
    doc.text('Tamanhos Mais Vendidos:', 14, 25);
    autoTable(doc, {
      startY: 30,
      head: [['Tamanho', 'Quantidade Vendida']],
      body: performanceStats.topSizes.map(s => [s.name, s.total]),
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14 },
      tableWidth: 80
    });

    doc.text('Cores Mais Vendidas:', 110, 25);
    autoTable(doc, {
      startY: 30,
      head: [['Cor', 'Quantidade Vendida']],
      body: performanceStats.topColors.map(c => [c.name, c.total]),
      headStyles: { fillColor: [16, 185, 129] },
      margin: { left: 110 },
      tableWidth: 80
    });

    doc.save(`Relatorio_Estoque_Vendas_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Filters & Export */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-slate-400" />
            Estoque & Performance
          </h2>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Análise detalhada de produtos e variações</p>
        </div>
        
        <button 
          onClick={exportPDF}
          className="bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar PDF
        </button>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 border-none shadow-sm bg-white">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Maximize2 className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-800">Tamanhos Populares</h3>
            </div>
          </div>
          <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceStats.topSizes}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  style={{ fontSize: '10px', fontWeight: 'bold' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  style={{ fontSize: '10px' }} 
                />
                <Tooltip 
                  cursor={{ fill: '#F1F5F9' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {performanceStats.topSizes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 border-none shadow-sm bg-white">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 p-2 rounded-lg">
                <Palette className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-800">Cores Favoritas</h3>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={performanceStats.topColors}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="total"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {performanceStats.topColors.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="p-0 rounded-[2.5rem] overflow-hidden border-none shadow-2xl bg-white">
        <div className="p-10 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight uppercase">Análise de Estoque</h3>
              <span className="bg-slate-950 text-white text-[10px] px-3 py-1 rounded-full font-black tracking-widest leading-none">
                {inventoryData.length} ITENS
              </span>
            </div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Detalhamento por variação de produto</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-slate-950 transition-colors" />
              <input 
                type="text"
                placeholder="Buscar produto ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-slate-950/5 focus:bg-white transition-all w-64 shadow-inner text-slate-800"
              />
            </div>
            
            <div className="relative group">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-slate-950 transition-colors" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="pl-12 pr-10 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-slate-950/5 focus:bg-white transition-all appearance-none cursor-pointer shadow-inner min-w-[200px] text-slate-800"
              >
                <option value="">Todas Categorias</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle p-1">
            <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="pl-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] leading-none mb-0">Produto</th>
                <th className="px-4 py-5 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] leading-none text-center">Cor</th>
                <th className="px-4 py-5 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] leading-none text-center">Tamanho</th>
                <th className="px-4 py-5 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] leading-none text-center">Estoque</th>
                <th className="px-4 py-5 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] leading-none text-right">Custo Unit.</th>
                <th className="px-4 py-5 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] leading-none text-right">Frete Unit.</th>
                <th className="px-4 py-5 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] leading-none text-right">Custo Total</th>
                <th className="px-4 py-5 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] leading-none text-right">Pr. Venda</th>
                <th className="px-4 py-5 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] leading-none text-right">Lucro Unit.</th>
                <th className="pr-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] leading-none text-right">Val. Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {inventoryData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="pl-8 py-6">
                    <div>
                      <p className="text-sm font-black text-slate-800 leading-tight uppercase tracking-tight">{item.productName}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Ref: {item.code} | {item.category}</p>
                    </div>
                  </td>
                  <td className="px-4 py-6 text-center">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                      {item.color}
                    </span>
                  </td>
                  <td className="px-4 py-6 text-center">
                    <span className="inline-flex px-3 py-1 bg-slate-100 text-slate-900 rounded-lg text-[10px] font-black uppercase tracking-widest">
                      {item.size}
                    </span>
                  </td>
                  <td className="px-4 py-6 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`text-base font-black ${item.stock <= 2 ? 'text-rose-600' : 'text-slate-900'}`}>
                        {item.stock}
                      </span>
                      {item.stock <= 2 && (
                        <span className="text-[8px] font-black text-rose-500 uppercase tracking-tighter">Baixo</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-6 text-right">
                    <span className="text-xs font-semibold text-slate-600">{formatCurrency(item.cost)}</span>
                  </td>
                  <td className="px-4 py-6 text-right">
                    <span className="text-xs font-semibold text-slate-600">{formatCurrency(item.freight)}</span>
                  </td>
                  <td className="px-4 py-6 text-right">
                    <span className="text-xs font-bold text-slate-700">{formatCurrency(item.totalUnitCost)}</span>
                  </td>
                  <td className="px-4 py-6 text-right">
                    <span className="text-xs font-semibold text-slate-700">{formatCurrency(item.price)}</span>
                  </td>
                  <td className="px-4 py-6 text-right">
                    <span className={`text-xs font-bold ${item.unitProfit < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {formatCurrency(item.unitProfit)}
                    </span>
                  </td>
                  <td className="pr-8 py-6 text-right">
                    <span className="text-sm font-black text-slate-950">{formatCurrency(item.totalStockValue)}</span>
                  </td>
                </tr>
              ))}
              {inventoryData.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-slate-50 rounded-full">
                        <Search className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-xs text-slate-600 font-medium">Nenhum item encontrado com os filtros aplicados</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </Card>

      {/* Resumo Financeiro Fixo */}
      <Card className="p-8 border-none shadow-2xl bg-slate-900 text-white rounded-[2.5rem]">
        <div className="mb-6">
          <h3 className="text-lg font-black uppercase tracking-widest text-[#10B981]">Resumo Financeiro do Estoque</h3>
          <p className="text-xs text-slate-300 mt-1 uppercase font-semibold tracking-wider">Patrimônio, capital investido e retorno potencial da Brisa 31</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {/* Card 1: Quantidade Total */}
          <div className="bg-slate-800/40 border border-slate-700/30 p-5 rounded-2xl flex flex-col justify-between hover:bg-slate-800/60 transition-all">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-200">Total de Peças</span>
            <span className="text-2xl font-black tracking-tight mt-2 text-white">{totals.qtdeTotal} <span className="text-xs font-bold text-slate-300 uppercase tracking-widest ml-1">unid</span></span>
          </div>

          {/* Card 2: Valor Investido */}
          <div className="bg-slate-800/40 border border-slate-700/30 p-5 rounded-2xl flex flex-col justify-between hover:bg-slate-800/60 transition-all">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-200">Investido (Produtos)</span>
            <span className="text-lg font-black tracking-tight mt-2 text-amber-500">{formatCurrency(totals.valorInvestido)}</span>
          </div>

          {/* Card 3: Frete Investido */}
          <div className="bg-slate-800/40 border border-slate-700/30 p-5 rounded-2xl flex flex-col justify-between hover:bg-slate-800/60 transition-all">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-200">Frete Investido</span>
            <span className="text-lg font-black tracking-tight mt-2 text-blue-400">{formatCurrency(totals.freteInvestido)}</span>
          </div>

          {/* Card 4: Custo Total */}
          <div className="bg-slate-800/40 border border-slate-700/30 p-5 rounded-2xl flex flex-col justify-between hover:bg-slate-800/60 transition-all">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-200">Custo Total Estoque</span>
            <span className="text-lg font-black tracking-tight mt-2 text-rose-400">{formatCurrency(totals.custoTotalEstoque)}</span>
          </div>

          {/* Card 5: Preço Potencial Venda */}
          <div className="bg-slate-800/40 border border-slate-700/30 p-5 rounded-2xl flex flex-col justify-between hover:bg-slate-800/60 transition-all">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-200">Valor Potencial Venda</span>
            <span className="text-lg font-black tracking-tight mt-2 text-[#3B82F6]">{formatCurrency(totals.valorPotencialVenda)}</span>
          </div>

          {/* Card 6: Lucro Potencial */}
          <div className="bg-slate-800/40 border border-slate-700/30 p-5 rounded-2xl flex flex-col justify-between hover:bg-slate-800/60 transition-all">
            <span className="text-[9px] font-black uppercase tracking-wider text-[#10B981]">Lucro Potencial Bruto</span>
            <span className="text-lg font-black tracking-tight mt-2 text-[#10B981]">{formatCurrency(totals.lucroPotencial)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
