import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  DollarSign,
  Package,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';
import { AdminOverviewData, AdminSection, Product } from '../../types/store';
import { useAuth } from '../../context/AuthContext';

interface AdminOverviewSectionProps {
  products: Product[];
  onNavigateSection: (section: AdminSection) => void;
  onRefreshStoreData: () => Promise<void>;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

export const AdminOverviewSection: React.FC<AdminOverviewSectionProps> = ({
  products,
  onNavigateSection,
  onRefreshStoreData,
  onNotify,
}) => {
  const { token } = useAuth();
  const [range, setRange] = useState<'7d' | '30d' | 'all'>('30d');
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchOverview = async (selectedRange = range) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/overview?range=${selectedRange}`, {
        headers: {
          Authorization: `Bearer ${token || ''}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        onNotify('Could not load overview statistics.', 'error');
      }
    } catch {
      onNotify('Network error connecting to admin API.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview(range);
  }, [range, token]);

  const handleRefresh = async () => {
    await Promise.all([fetchOverview(range), onRefreshStoreData()]);
    onNotify('Dashboard statistics refreshed.');
  };

  const totalRevenue =
    data?.summary?.verifiable_sales_income ??
    data?.sales?.total_revenue ??
    0;
  const totalOrders =
    data?.summary?.total_orders ??
    data?.sales?.total_orders ??
    0;
  const totalProducts =
    data?.summary?.total_products ??
    products.length;
  const lowStockCount =
    data?.summary?.low_stock_count ??
    data?.inventory?.low_stock_products ??
    products.filter((p) => p.available_stock <= 5).length;
  const outOfStockCount =
    data?.summary?.out_of_stock_count ??
    data?.inventory?.out_of_stock_products ??
    products.filter((p) => p.available_stock <= 0).length;

  return (
    <div className="space-y-6">
      {/* Top Header & Range Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#DECBB4] shadow-xs">
        <div>
          <h2 className="typo-h3 text-[#1E1410]">Overview & Performance</h2>
          <p className="typo-body-secondary text-[#7A6558] mt-0.5">
            Real-time analytics for orders, sales income and inventory health.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-[#F4ECE1] p-1 rounded-xl border border-[#DECBB4]">
            {(['7d', '30d', 'all'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg typo-caption font-semibold cursor-pointer transition-all ${range === r
                    ? 'bg-[#1E1410] text-white shadow-xs'
                    : 'text-[#655045] hover:text-[#1E1410]'
                  }`}
              >
                {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : 'All Time'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 rounded-xl border border-[#DECBB4] bg-white hover:bg-[#F4ECE1] text-[#1E1410] transition-colors cursor-pointer"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="bg-white p-5 rounded-2xl border border-[#DECBB4] shadow-xs flex items-center justify-between">
          <div>
            <span className="typo-caption uppercase tracking-wider text-[#8A7264] font-semibold">
              Total Revenue
            </span>
            <div className="typo-h3 font-bold font-mono-num text-[#1E1410] mt-1">
              ₹ {totalRevenue.toLocaleString('en-IN')}
            </div>
            <p className="typo-caption text-[#7A6558] mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>{data?.summary?.pending_bookings_value ? `Pending: ₹${data.summary.pending_bookings_value}` : 'Verifiable income'}</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* WhatsApp Orders */}
        <div className="bg-white p-5 rounded-2xl border border-[#DECBB4] shadow-xs flex items-center justify-between">
          <div>
            <span className="typo-caption uppercase tracking-wider text-[#8A7264] font-semibold">
              Orders Placed
            </span>
            <div className="typo-h3 font-bold font-mono-num text-[#1E1410] mt-1">
              {totalOrders}
            </div>
            <p className="typo-caption text-[#7A6558] mt-1">
              {data?.summary?.completed_orders_count ?? 0} completed orders
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        {/* Total Catalog Items */}
        <div className="bg-white p-5 rounded-2xl border border-[#DECBB4] shadow-xs flex items-center justify-between">
          <div>
            <span className="typo-caption uppercase tracking-wider text-[#8A7264] font-semibold">
              Catalog Products
            </span>
            <div className="typo-h3 font-bold font-mono-num text-[#1E1410] mt-1">
              {totalProducts}
            </div>
            <p className="typo-caption text-[#7A6558] mt-1">
              {products.filter((p) => p.is_featured).length} featured items
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Stock Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-[#DECBB4] shadow-xs flex items-center justify-between">
          <div>
            <span className="typo-caption uppercase tracking-wider text-[#8A7264] font-semibold">
              Low Stock Alerts
            </span>
            <div className="typo-h3 font-bold font-mono-num text-[#8B3A2B] mt-1">
              {lowStockCount}
            </div>
            <p className="typo-caption text-[#8B3A2B] mt-1">
              {outOfStockCount} out of stock
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Orders & Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Orders List */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#DECBB4] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="typo-h4 text-[#1E1410]">Recent WhatsApp Orders</h3>
              <p className="typo-caption text-[#7A6558]">
                Latest customer inquiries and purchases
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateSection('orders')}
              className="typo-btn inline-flex items-center gap-1 text-[#8B3A2B] hover:underline cursor-pointer"
            >
              View All Orders
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {data?.recent_orders && data.recent_orders.length > 0 ? (
            <div className="divide-y divide-[#F0E9DC]">
              {data.recent_orders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="py-3.5 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold typo-body text-[#1E1410] truncate">
                        {order.customer_name}
                      </span>
                      <span className="typo-badge font-mono-num px-2 py-0.5 rounded bg-[#F4ECE1] text-[#7A6558]">
                        {order.order_code}
                      </span>
                    </div>
                    <p className="typo-caption text-[#7A6558] mt-0.5 truncate">
                      +{order.region_code} {order.customer_phone} · {order.customer_address}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="typo-body-secondary font-bold font-mono-num text-[#1E1410]">
                      ₹ {order.grand_total}
                    </div>
                    <span
                      className={`inline-block typo-badge px-2 py-0.5 rounded-full mt-0.5 ${order.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : order.status === 'Cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-[#7A6558]">
              <ShoppingBag className="w-10 h-10 mx-auto text-[#C5B198] mb-2" />
              <p className="typo-body font-medium">No customer orders recorded yet.</p>
              <p className="typo-caption mt-1">
                When customers place orders via WhatsApp checkout, they will appear here.
              </p>
            </div>
          )}
        </div>

        {/* Low Stock Alerts & Quick Actions */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-[#DECBB4] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="typo-h4 text-[#1E1410]">Low Stock Monitor</h3>
                <p className="typo-caption text-[#7A6558]">
                  Products with 5 or fewer units left
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateSection('stock')}
                className="typo-btn inline-flex items-center gap-1 text-[#8B3A2B] hover:underline cursor-pointer"
              >
                Manage Stock
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {products.filter((p) => p.available_stock <= 5).length > 0 ? (
              <div className="divide-y divide-[#F0E9DC]">
                {products
                  .filter((p) => p.available_stock <= 5)
                  .slice(0, 5)
                  .map((prod) => (
                    <div
                      key={prod.id}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="typo-body-secondary font-medium text-[#1E1410] truncate">
                          {prod.name}
                        </div>
                        <span className="typo-caption text-[#7A6558]">
                          {prod.category_name}
                        </span>
                      </div>
                      <span
                        className={`typo-badge font-mono-num px-2.5 py-1 rounded-md shrink-0 ${prod.available_stock <= 0
                            ? 'bg-red-100 text-red-800 font-bold'
                            : 'bg-amber-100 text-amber-800'
                          }`}
                      >
                        {prod.available_stock <= 0
                          ? 'Out of Stock'
                          : `${prod.available_stock} Left`}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="py-8 text-center text-[#7A6558]">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                <p className="typo-body-secondary font-medium">All products are healthy in stock!</p>
              </div>
            )}
          </div>

          {/* Quick Management Shortcuts */}
          <div className="bg-[#FAF7F2] rounded-2xl border border-[#DECBB4] p-5 space-y-3">
            <h4 className="typo-h5 text-[#1E1410] font-semibold">Quick Shortcuts</h4>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onNavigateSection('inventory')}
                className="p-3 bg-white hover:bg-[#F4ECE1] border border-[#DECBB4] rounded-xl text-left transition-colors cursor-pointer"
              >
                <Package className="w-4 h-4 text-[#8B3A2B] mb-1.5" />
                <div className="typo-nav text-[#1E1410] font-bold">Add Product</div>
                <div className="typo-caption text-[#7A6558]">Catalog inventory</div>
              </button>
              <button
                type="button"
                onClick={() => onNavigateSection('stock')}
                className="p-3 bg-white hover:bg-[#F4ECE1] border border-[#DECBB4] rounded-xl text-left transition-colors cursor-pointer"
              >
                <Boxes className="w-4 h-4 text-[#D49B4B] mb-1.5" />
                <div className="typo-nav text-[#1E1410] font-bold">Update Stock</div>
                <div className="typo-caption text-[#7A6558]">Inventory counts</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};