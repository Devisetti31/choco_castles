export interface StoreInfo {
  id: number;
  name: string;
  full_header_name: string;
  alias: string;
  reference_url: string;
  logo_url: string;
  banner_url: string;
  whatsapp_region_code: string;
  whatsapp_number: string;
  address: string;
  copyright: string;
}

export interface Category {
  id: number;
  name: string;
  image: string;
  original_url: string;
  display_order: number;
  product_count?: number;
}

export interface Product {
  id: number;
  name: string;
  category_id: number;
  category_name: string;
  currency_icon: string;
  selling_price: number;
  original_price: number | null;
  available_stock: number;
  image: string;
  images: string[];
  description_html?: string;
  description: string;
  is_featured: boolean;
  original_url: string;
  display_order: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type ActiveView =
  | 'home'
  | 'categories'
  | 'catalog'
  | 'detail'
  | 'product-detail'
  | 'admin';

export type SortOption =
  | 'default'
  | 'price-asc'
  | 'price_asc'
  | 'price-desc'
  | 'price_desc'
  | 'name-asc'
  | 'name_asc'
  | 'featured';

export interface UserAccount {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin';
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  last_login_at?: string | null;
}

export type AdminSection =
  | 'overview'
  | 'inventory'
  | 'stock'
  | 'orders'
  | 'profile';

export interface OrderItemDetail {
  product_id: number;
  product_name: string;
  product_url: string;
  currency_icon: string;
  unit_price: number;
  quantity: number;
  total_price: number;
}

export interface OrderConfirmationData {
  order_id: string;
  name: string;
  phone: string;
  region_code: string;
  address: string;
  grand_total: number;
  products: OrderItemDetail[];
  whatsapp_message: string;
  whatsapp_url: string;
  store_whatsapp_number: string;
  created_at: string;
}

export interface OrderItem {
  id?: number;
  order_id?: number;
  product_id: number;
  product_name: string;
  product_url: string;
  currency_icon: string;
  unit_price: number;
  quantity: number;
  total_price: number;
}

export interface Order {
  id: number;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  region_code: string;
  customer_address: string;
  grand_total: number;
  whatsapp_url: string;
  whatsapp_message: string;
  status:
  | 'New'
  | 'Confirmed'
  | 'Preparing'
  | 'Ready'
  | 'Completed'
  | 'Cancelled'
  | string;
  completed_at?: string | null;
  created_at: string;
  items?: OrderItem[];
}

export interface AdminOverviewSummary {
  verifiable_sales_income: number;
  completed_orders_count: number;
  pending_bookings_value: number;
  total_orders: number;
  orders_today: number;
  total_products: number;
  low_stock_count: number;
  out_of_stock_count: number;
  low_stock_threshold: number;
}

export interface AdminOverviewData {
  summary?: AdminOverviewSummary;
  trend_series?: { date: string; sales: number; orders: number }[];
  best_selling_products?: {
    product_id: number;
    product_name: string;
    units_sold: number;
    revenue: number;
  }[];
  most_requested_products?: any[];
  status_breakdown?: Record<string, number>;
  recent_orders?: Order[];
  sales?: {
    total_revenue: number;
    total_orders: number;
    total_products_sold: number;
    avg_order_value: number;
  };
  inventory?: {
    total_products: number;
    in_stock_products: number;
    low_stock_products: number;
    out_of_stock_products: number;
    total_categories: number;
  };
  low_stock_threshold?: number;
}