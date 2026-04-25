
export type ProductVariation = {
  id: string;
  cor: string;
  tamanho: string;
  estoque: number;
};

export type Variation = ProductVariation;

export type Product = {
  id: string;
  name: string;
  category: string;
  brand: string;
  code: string;
  cor: string;
  tamanho: string;
  cost: number;
  frete?: number;
  price: number;
  cash_price?: number;
  card_price?: number;
  promo_price?: number;
  stock: number;
  min_stock: number;
  is_featured?: boolean;
  is_best_seller?: boolean;
  is_new?: boolean;
  is_low_stock_manual?: boolean;
  is_promo_manual?: boolean;
  rating?: number;
  short_description?: string;
  status?: 'ativo' | 'inativo';
  images: string[];
  main_image_index?: number;
  cores?: string[];
  tamanhos?: string[];
  variations?: ProductVariation[];
  has_variations?: boolean;
  last_purchase_date?: string;
  last_cost?: number;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  instagram: string;
  city: string;
  total_purchases?: number;
  total_spent?: number;
  last_purchase?: string;
  status?: 'ativo' | 'inativo';
};

export type SaleItem = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_item_value: number;
  cost: number;
  tamanho: string;
  cor: string;
  brand: string;
  variation_id?: string | null;
  status: 'concluido' | 'cancelado';
};

export type Sale = {
  id: string;
  date: string;
  customer_id: string;
  customer_name: string;
  subtotal: number;
  seller_id: string;
  seller_name: string;
  payment_method: string;
  discount_value: number;
  discount_type: 'percentage' | 'value';
  valor_bruto: number;
  valor_liquido: number;
  total_cost: number;
  profit: number;
  tax_value: number;
  items: SaleItem[];
  installments: number;
  installment_fee_value: number;
  installment_fee_percentage: number;
  status: 'concluida' | 'cancelada';
};

export type SupplierOrder = {
  id: string;
  date: string;
  supplier: string;
  product_id: string;
  quantity: number;
  status: 'pedido feito' | 'enviado' | 'recebido';
  product_name: string;
};

export type Expense = {
  id: string;
  date: string;
  type: string;
  category?: string;
  description: string;
  value: number;
  observations?: string;
  payment_method?: string;
  flow_type?: 'entrada' | 'saída';
};

export type Seller = {
  id: string;
  name: string;
  email: string;
  status: 'ativo' | 'inativo';
  commission_percentage: number;
  role?: 'admin' | 'vendedor';
};

export type Ad = {
  id: string;
  platform: string;
  investment: number;
  sales_generated: number;
  date: string;
};

export type AppUser = {
  id: string;
  login: string;
  name: string;
  role: 'admin' | 'vendedor';
};

export type InstallmentFee = {
  installments: number;
  fee: number;
};

export type StoreSettings = {
  id: string;
  nome_loja: string;
  telefone_whatsapp: string;
  mensagem_padrao_whatsapp: string;
  monthly_goal?: number;
  logo_url?: string;
  card_fee?: number;
  debit_fee?: number;
  low_stock_alert_enabled?: boolean;
  low_stock_threshold?: number;
  taxasParcelamento?: InstallmentFee[];
};

export type DashboardData = {
  dailyRevenue: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  totalProfit: number;
  totalTax: number;
  netProfit: number;
  profitMargin: number;
  totalMonthlyCost: number;
  marketing: number;
  lowStock: Product[];
  topProducts: { name: string; total_sold: number }[];
  mostProfitableProduct: { name: string; profit: number } | null;
  bestSellingSize: { size: string; count: number } | null;
  ticketMedio: number;
  roi: number;
  salesByMonth: { month: string; revenue: number; count: number }[];
  sellerStats: { id: string; name: string; total_sold: number; commission: number; sales_count: number }[];
  monthlySalesCount: number;
  stockSuggestions: { id: number; name: string; stock: number; sales_last_30: number; suggestion: number }[];
  monthlyGoal: number;
  revenueLast7Days: { date: string; revenue: number }[];
  salesByPaymentMethod: { method: string; count: number }[];
  salesByColor: { color: string; total_sold: number }[];
  customerStats: { active: number; inactive: number };
  bestSellingProductMonth: { name: string; total_sold: number } | null;
  trendingProduct: { name: string; growth: number } | null;
  profitByProduct: { id: string; name: string; quantity: number; revenue: number; cost: number; profit: number }[];
  staleProducts: Product[];
  totalStockValue: number;
  totalStockCost: number;
  topCustomers: { name: string; revenue: number; sales_count: number }[];
  cashFlow: {
    inflow: { pix: number; card: number; cash: number; total: number };
    outflow: { 
      purchases: number; 
      operational: number; 
      ads: number; 
      others: number; 
      fees: number;
      total: number; 
    };
    balance: number;
  };
};

export type StockMovement = {
  id: string;
  product_id: string;
  produto: string;
  marca: string;
  cor: string;
  tamanho: string;
  tipo_movimento: 'entrada' | 'venda' | 'ajuste' | 'reposicao';
  quantidade: number;
  date: string;
  usuario: string;
  observations?: string;
  observacao?: string;
};

export type CartItem = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  cost: number;
  tamanho: string;
  cor: string;
  brand: string;
  variation_id?: string;
  cash_price?: number;
  card_price?: number;
};

export type PurchaseItem = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  tamanho: string;
  cor: string;
};

export type Purchase = {
  id: string;
  date: string;
  supplier_name: string;
  items: PurchaseItem[];
  total_value: number;
  observations?: string;
  created_at: string;
  status?: 'active' | 'cancelled';
};
