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
  // If it has only a comma, it's BR format: 1200,50
  else if (clean.includes(',')) {
    clean = clean.replace(',', '.');
  }
  // If it has only a dot, it's ambiguous: 1.200 or 1200.50
  else if (clean.includes('.')) {
    const parts = clean.split('.');
    // If the last part has exactly 3 digits, it's likely a thousands separator: 1.200
    // Unless it's something like 1.200, but in currency that's rare without a comma
    if (parts[parts.length - 1].length === 3 && parts.length > 1) {
      clean = clean.replace(/\./g, '');
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

export const isSaleCompleted = (sale: any) => {
  if (!sale) return false;
  const status = (sale.status || '').toLowerCase();
  const isCanceled = status.includes('cancel');
  if (isCanceled) return false;
  
  const completedStatuses = [
    'concluída', 'concluida', 'concluido', 'concluído', 
    'finalizada', 'finalizado', 'pago', 'entregue', 'concluido'
  ];
  
  const isCompleted = completedStatuses.includes(status);
  
  // If status is empty, we assume it's an older completed sale unless it looks canceled
  if (status === '') return true;
  
  return isCompleted;
};

export const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(toNum(val));

export const formatPercent = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(toNum(val)) + '%';
