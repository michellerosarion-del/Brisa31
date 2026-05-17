import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const toNum = (val: any) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  
  let clean = String(val).replace('R$', '').replace(/\s/g, '');
  
  // If it has both dot and comma, it's definitely BR format: 1.200,50
  if (clean.includes('.') && clean.includes(',')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } 
  // If it has only a comma, it's definitely BR decimal separator: 1200,50 or 0,80
  else if (clean.includes(',')) {
    clean = clean.replace(',', '.');
  }
  // If it has only dots, we check if it's multiple dots (thousands)
  else if (clean.includes('.')) {
    const dotsCount = (clean.match(/\./g) || []).length;
    if (dotsCount > 1) {
      clean = clean.replace(/\./g, '');
    } else {
      // Single dot: We treat it as a decimal point for input compatibility
      // unless it's clearly a thousands separator in a string like "1.000" 
      // but in numeric inputs "1.00" is also extremely common.
      // We'll trust parseFloat to treat it as a decimal point.
    }
  }
  
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
};

export const getValorVenda = (venda: any) => {
  if (!venda) return 0;
  
  // If standardized valor_bruto exists and > 0, use it
  if (toNum(venda.valor_bruto) > 0) return toNum(venda.valor_bruto);
  
  // Try to find the first non-zero value among common field names
  const fields = [
    'valor_bruto',
    'gross_value',
    'total', 
    'valor_total', 
    'final_price', 
    'preco_final', 
    'preço_final', 
    'total_value',
    'valor_liquido',
    'net_value'
  ];
  
  for (const field of fields) {
    const val = toNum(venda[field]);
    if (val > 0) return val;
  }
  
  return 0;
};

const removeAccents = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

export const isSaleCompleted = (sale: any) => {
  if (!sale) return false;
  const rawStatus = (sale.status || '').toLowerCase().trim();
  const status = removeAccents(rawStatus);
  
  // Explicitly check for cancellation first
  const isCanceled = status.includes('cancel') || status.includes('estorn') || status === 'vazio';
  if (isCanceled) return false;
  
  const completedStatuses = [
    'concluida', 'concluido', 'finalizada', 'finalizado', 
    'pago', 'entregue', 'paga', 'recebido', 'ok', 'completed'
  ];
  
  // If status is empty, we assume it's an older completed sale unless it looks canceled
  if (status === '') return true;
  
  const isCompleted = completedStatuses.some(s => status.includes(s)) || completedStatuses.includes(status);
  
  return isCompleted;
};

export const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(toNum(val));

export const formatPercent = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(toNum(val)) + '%';

export const getLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getLocalMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};
