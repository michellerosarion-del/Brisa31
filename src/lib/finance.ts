import { toNum, getValorVenda, isSaleCompleted } from './utils';
import { Sale, Expense, Product } from '../types';

export const getSaleFinancials = (s: Sale, products: Product[] = []) => {
  const items = s.items || [];
  const activeItems = items.filter(i => i.status !== 'cancelado');
  
  // Important: items should have cost and frete registered at the time of sale
  const subtotalFromItems = activeItems.reduce((acc, i) => acc + (toNum(i.unit_price) * toNum(i.quantity)), 0);
  
  const totalCost = activeItems.reduce((acc, i) => {
    // 1. Try saved historical cost/frete
    let itemCost = toNum(i.cost);
    let itemFrete = toNum((i as any).frete);

    // 2. Retrocompatibility: if cost is 0, try to find in current products (fallback)
    if (itemCost === 0 && products.length > 0) {
      const p = products.find(prod => prod.id === i.product_id);
      if (p) {
        itemCost = toNum(p.cost);
        itemFrete = toNum(p.frete);
      }
    }

    return acc + ((itemCost + itemFrete) * toNum(i.quantity));
  }, 0);
  
  const subtotal = toNum(s.subtotal) || subtotalFromItems;
  
  const discountValue = s.discount_type === 'percentage' 
    ? (subtotal * (toNum(s.discount_value) / 100)) 
    : toNum(s.discount_value);
    
  const adjustment = toNum((s as any).adjustment);
  
  // Valor Bruto is what the customer pays (Subtotal - Discount + Adjustment)
  const valorBruto = Math.max(0, (toNum(s.valor_bruto) > 0 ? toNum(s.valor_bruto) : (subtotal - (toNum(discountValue) || 0) + adjustment)));
  
  const feePercent = toNum(s.installment_fee_percentage);
  const taxValue = toNum(s.installment_fee_value) > 0 
    ? toNum(s.installment_fee_value) 
    : (valorBruto * (toNum(feePercent) / 100));
    
  const valorLiquido = valorBruto - taxValue;
  const profit = valorLiquido - totalCost;

  const payments = s.payments || [];
  const paymentBreakdown = {
    pix: 0,
    card: 0,
    debito: 0,
    credito: 0,
    cash: 0
  };

  if (payments.length > 0) {
    payments.forEach((p: any) => {
      const amount = toNum(p.amount);
      const method = (p.method || '').toLowerCase();
      if (method === 'pix') paymentBreakdown.pix += amount;
      else if (method === 'debito') {
        paymentBreakdown.debito += amount;
        paymentBreakdown.card += amount;
      }
      else if (['credito', 'cartao_vista', 'cartao_parcelado'].includes(method)) {
        paymentBreakdown.credito += amount;
        paymentBreakdown.card += amount;
      }
      else if (method === 'dinheiro') paymentBreakdown.cash += amount;
      else if (method === 'cartao') {
         // Generic card fallback
         paymentBreakdown.card += amount;
      }
    });
  } else {
    // Fallback for single payment old data
    const total = valorBruto;
    const method = (s.payment_method || '').toLowerCase();
    if (method === 'pix') paymentBreakdown.pix = total;
    else if (method === 'debito') {
      paymentBreakdown.debito = total;
      paymentBreakdown.card = total;
    }
    else if (['credito', 'cartao_vista', 'cartao_parcelado'].includes(method)) {
      paymentBreakdown.credito = total;
      paymentBreakdown.card = total;
    }
    else if (method === 'dinheiro') paymentBreakdown.cash = total;
    else if (method.includes('cartao')) paymentBreakdown.card = total;
  }

  return {
    subtotal: toNum(subtotal) || 0,
    total_cost: toNum(totalCost) || 0,
    valor_bruto: toNum(valorBruto) || 0,
    valor_liquido: toNum(valorLiquido) || 0,
    tax_value: toNum(taxValue) || 0,
    profit: toNum(profit) || 0,
    paymentBreakdown
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
    const eDate = (e.date || '').split('T')[0];
    if (startDate && endDate) return eDate >= startDate && eDate <= endDate;
    if (targetMonth) return eDate.startsWith(targetMonth);
    return true;
  });

  // Split expenses into entries (inflows) and exits (outflows)
  const manualInflowsValue = filteredExpenses
    .filter(e => e.flow_type === 'entrada')
    .reduce((acc, e) => acc + toNum(e.value), 0);

  // CRITICAL: Filter out "estoque" (investments) from operational expenses to avoid duplication
  const actualOutflows = filteredExpenses.filter(e => 
    e.flow_type !== 'entrada' && 
    !(e.category || '').toLowerCase().includes('estoque') &&
    !(e.type || '').toLowerCase().includes('estoque')
  );

  // Calculate All Individual Sale Financials
  const salesFinancials = filteredSales.map(s => getSaleFinancials(s, products));

  // Payment Breakdown Aggregator
  const paymentTotals = {
    pix: salesFinancials.reduce((acc, f) => acc + f.paymentBreakdown.pix, 0),
    card: salesFinancials.reduce((acc, f) => acc + f.paymentBreakdown.card, 0),
    debito: salesFinancials.reduce((acc, f) => acc + f.paymentBreakdown.debito, 0),
    credito: salesFinancials.reduce((acc, f) => acc + f.paymentBreakdown.credito, 0),
    cash: salesFinancials.reduce((acc, f) => acc + f.paymentBreakdown.cash, 0),
    // Counts (approximate by identifying if method was used in sale)
    countPix: filteredSales.filter(s => (s.payments?.some(p => p.method === 'pix') || s.payment_method === 'pix')).length,
    countDebito: filteredSales.filter(s => (s.payments?.some(p => p.method === 'debito') || s.payment_method === 'debito')).length,
    countCredito: filteredSales.filter(s => (s.payments?.some(p => ['credito', 'cartao_vista', 'cartao_parcelado'].includes(p.method)) || ['credito', 'cartao_vista', 'cartao_parcelado'].includes(s.payment_method))).length,
    countCash: filteredSales.filter(s => (s.payments?.some(p => p.method === 'dinheiro') || s.payment_method === 'dinheiro')).length
  };

  // Totals
  const totalBrutoSales = salesFinancials.reduce((acc, f) => acc + f.valor_bruto, 0);
  const totalBruto = totalBrutoSales + manualInflowsValue;

  const totalLiquidoSales = salesFinancials.reduce((acc, f) => acc + f.valor_liquido, 0);
  const totalLiquido = totalLiquidoSales + manualInflowsValue;

  const totalTaxasCartao = salesFinancials.reduce((acc, f) => acc + f.tax_value, 0);
  const custo = salesFinancials.reduce((acc, f) => acc + f.total_cost, 0);

  // Categorize Expenses correctly
  const ads = actualOutflows
    .filter(e => (e.type || '').toLowerCase().includes('anúncio') || (e.category || '').toLowerCase().includes('marketing'))
    .reduce((acc, e) => acc + toNum(e.value), 0);

  const despesasLoja = actualOutflows
    .filter(e => (e.type || '').toLowerCase().includes('fixo') || (e.type || '').toLowerCase().includes('operacional') || (e.category || '').toLowerCase().includes('operacional'))
    .reduce((acc, e) => acc + toNum(e.value), 0);

  const outrasDespesasManual = actualOutflows
    .filter(e => 
      !(e.type || '').toLowerCase().includes('anúncio') && 
      !(e.type || '').toLowerCase().includes('fixo') && 
      !(e.type || '').toLowerCase().includes('operacional') &&
      !(e.category || '').toLowerCase().includes('marketing') &&
      !(e.category || '').toLowerCase().includes('operacional')
    )
    .reduce((acc, e) => acc + toNum(e.value), 0);

  const totalManualExpenses = actualOutflows.reduce((acc, e) => acc + toNum(e.value), 0);

  // Resumo Final
  const totalDespesas = totalManualExpenses + totalTaxasCartao;
  const lucroLiquido = totalLiquido - custo - totalManualExpenses;
  const margemLucro = totalBruto > 0 ? (toNum(lucroLiquido) / totalBruto) * 100 : 0;

  return {
    vendas: toNum(totalBruto) || 0, 
    faturamento: toNum(totalBruto) || 0,
    totalBruto: toNum(totalBruto) || 0,
    totalLiquido: toNum(totalLiquido) || 0,
    custo: toNum(custo) || 0,
    totalTaxasCartao: toNum(totalTaxasCartao) || 0,
    totalDespesas: toNum(totalDespesas) || 0,
    anuncios: toNum(ads) || 0,
    despesasLoja: toNum(despesasLoja) || 0,
    outrasDespesas: toNum(outrasDespesasManual) || 0,
    lucroLiquido: toNum(lucroLiquido) || 0,
    margemLucro: isNaN(margemLucro) ? 0 : margemLucro,
    paymentTotals,
    filteredSales,
    filteredExpenses
  };
};
