import { toNum, getValorVenda, isSaleCompleted } from './utils';
import { Sale, Expense, Product } from '../types';

export const getSaleFinancials = (s: Sale) => {
  const items = s.items || [];
  const activeItems = items.filter(i => i.status !== 'cancelado');
  
  const subtotal = activeItems.reduce((acc, i) => acc + (toNum(i.unit_price) * toNum(i.quantity)), 0);
  const totalCost = activeItems.reduce((acc, i) => acc + ((toNum(i.cost) + toNum((i as any).frete)) * toNum(i.quantity)), 0);
  
  const discountValue = s.discount_type === 'percentage' 
    ? (subtotal * (toNum(s.discount_value) / 100)) 
    : toNum(s.discount_value);
    
  const valorBruto = Math.max(0, subtotal - discountValue);
  
  // Tax logic: prioritize the saved percentage, then the saved value, then 0
  const feePercent = toNum(s.installment_fee_percentage);
  const taxValue = toNum(s.installment_fee_value) > 0 
    ? toNum(s.installment_fee_value) 
    : (valorBruto * (feePercent / 100));
    
  const valorLiquido = valorBruto - taxValue;
  const profit = valorLiquido - totalCost;

  return {
    subtotal,
    total_cost: totalCost,
    valor_bruto: valorBruto,
    valor_liquido: valorLiquido,
    tax_value: taxValue,
    profit
  };
};

export const calcularFinanceiro = (
  sales: Sale[] = [], 
  expenses: Expense[] = [], 
  products: Product[] = [], 
  storeSettings: any = {}, 
  targetMonth?: string, 
  startDate?: string, 
  endDate?: string
) => {
  const activeSales = sales.filter(s => isSaleCompleted(s));
  
  let filteredSales = activeSales;
  if (startDate && endDate) {
    filteredSales = activeSales.filter(s => {
      const sDate = (s.date || '').split('T')[0];
      return sDate >= startDate && sDate <= endDate;
    });
  } else if (targetMonth) {
    filteredSales = activeSales.filter(s => (s.date || '').startsWith(targetMonth));
  }

  const filteredExpenses = expenses.filter(e => {
    if (startDate && endDate) return e.date >= startDate && e.date <= endDate;
    if (targetMonth) return e.date.startsWith(targetMonth);
    return true;
  });

  // Split expenses into entries (inflows) and exits (outflows)
  const manualInflowsValue = filteredExpenses
    .filter(e => e.flow_type === 'entrada')
    .reduce((acc, e) => acc + toNum(e.value), 0);

  const actualOutflows = filteredExpenses.filter(e => e.flow_type !== 'entrada');

  // 1. Calculate All Individual Sale Financials (Recalculated from base data)
  const salesFinancials = filteredSales.map(s => getSaleFinancials(s));

  // 2. Total Bruto (Before fees)
  const totalBruto = salesFinancials.reduce((acc, f) => acc + f.valor_bruto, 0) + manualInflowsValue;

  // 3. Total Líquido (After fees)
  const totalLiquido = salesFinancials.reduce((acc, f) => acc + f.valor_liquido, 0) + manualInflowsValue;

  // 4. Taxas de Venda (Cartão)
  const totalTaxasCartao = salesFinancials.reduce((acc, f) => acc + f.tax_value, 0);

  // 5. Custo das peças vendidas (COGS)
  const custo = salesFinancials.reduce((acc, f) => acc + f.total_cost, 0);

  // 6. Outras Despesas
  const totalOutrasDespesas = actualOutflows.reduce((acc, e) => acc + toNum(e.value), 0);

  // 7. Resumo Final
  const lucroLiquido = totalLiquido - custo - totalOutrasDespesas;
  const margemLucro = totalBruto > 0 ? (lucroLiquido / totalBruto) * 100 : 0;

  return {
    vendas: totalBruto, 
    faturamento: totalBruto,
    totalBruto,
    totalLiquido,
    custo,
    totalTaxasCartao,
    totalDespesas: totalOutrasDespesas + totalTaxasCartao,
    lucroLiquido,
    margemLucro,
    filteredSales,
    filteredExpenses
  };
};
