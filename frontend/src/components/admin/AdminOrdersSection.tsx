import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageCircle,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { Order } from '../../types/store';
import { useAuth } from '../../context/AuthContext';

interface AdminOrdersSectionProps {
  onRefreshStoreData: () => Promise<void>;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

const ORDER_STATUSES = [
  'New',
  'Confirmed',
  'Preparing',
  'Ready',
  'Completed',
  'Cancelled',
];

export const AdminOrdersSection: React.FC<AdminOrdersSectionProps> = ({
  onRefreshStoreData,
  onNotify,
}) => {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (statusFilter !== 'all') q.set('status', statusFilter);
      if (search.trim()) q.set('search', search.trim());

      const res = await fetch(`/api/admin/orders?${q.toString()}`, {
        headers: {
          Authorization: `Bearer ${token || ''}`,
        },
      });

      if (res.ok) {
        const json = await res.json();
        setOrders(json.orders || []);
      } else {
        onNotify('Failed to retrieve orders list.', 'error');
      }
    } catch {
      onNotify('Network error connecting to orders API.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, token]);

  const handleUpdateStatus = async (orderId: number, nextStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const json = await res.json();
      if (res.ok && !json.error) {
        onNotify(`Order status updated to "${nextStatus}".`);
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
        );
      } else {
        onNotify(json.error || 'Failed to update order status.', 'error');
      }
    } catch {
      onNotify('Network error updating order status.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteOrder = async (orderId: number, orderCode: string) => {
    if (!window.confirm(`Delete order ${orderCode}? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token || ''}`,
        },
      });

      const json = await res.json();
      if (res.ok && !json.error) {
        onNotify(`Deleted order ${orderCode}.`);
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      } else {
        onNotify(json.error || 'Failed to delete order.', 'error');
      }
    } catch {
      onNotify('Network error while deleting order.', 'error');
    }
  };

  const filteredOrders = orders.filter((o) => {
    const term = search.toLowerCase();
    return (
      o.customer_name.toLowerCase().includes(term) ||
      o.customer_phone.includes(term) ||
      o.order_code.toLowerCase().includes(term) ||
      o.customer_address.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#DECBB4] shadow-xs">
        <div>
          <h2 className="typo-h3 text-[#1E1410]">Order Management</h2>
          <p className="typo-body-secondary text-[#7A6558] mt-0.5">
            Track customer orders, update statuses, and directly message customers on WhatsApp.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchOrders}
          disabled={loading}
          className="typo-btn inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#DECBB4] bg-white hover:bg-[#F4ECE1] text-[#1E1410] transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Orders</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#8A7264] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, phone, or order ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#DECBB4] text-[#1E1410] focus:ring-2 focus:ring-[#8B3A2B]/20"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-2 rounded-xl typo-caption font-semibold whitespace-nowrap cursor-pointer transition-colors ${statusFilter === 'all'
                ? 'bg-[#1E1410] text-white'
                : 'bg-white border border-[#DECBB4] text-[#655045] hover:bg-[#F4ECE1]'
              }`}
          >
            All Orders ({orders.length})
          </button>
          {ORDER_STATUSES.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-2 rounded-xl typo-caption font-semibold whitespace-nowrap cursor-pointer transition-colors ${statusFilter === st
                  ? 'bg-[#1E1410] text-white'
                  : 'bg-white border border-[#DECBB4] text-[#655045] hover:bg-[#F4ECE1]'
                }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-2xl border border-[#DECBB4] shadow-xs overflow-hidden">
        {filteredOrders.length > 0 ? (
          <div className="divide-y divide-[#F0E9DC]">
            {filteredOrders.map((order) => {
              const isExpanded = expandedId === order.id;
              const formattedDate = order.created_at
                ? new Date(order.created_at).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
                : 'N/A';

              return (
                <div key={order.id} className="p-5 hover:bg-[#FAF7F2]/40 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Customer & Order Code */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="typo-h5 font-bold text-[#1E1410]">
                          {order.customer_name}
                        </span>
                        <span className="font-mono-num typo-badge px-2 py-0.5 rounded-md bg-[#F4ECE1] text-[#7A6558] font-bold">
                          {order.order_code}
                        </span>
                        <span className="typo-caption text-[#8A7264]">
                          {formattedDate}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-1.5 typo-caption text-[#655045]">
                        <span className="font-mono-num font-medium">
                          📞 +{order.region_code} {order.customer_phone}
                        </span>
                        <span>·</span>
                        <span className="truncate max-w-md">
                          📍 {order.customer_address}
                        </span>
                      </div>
                    </div>

                    {/* Price, Status Selector & WhatsApp Contact */}
                    <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
                      <div className="text-right mr-2">
                        <div className="typo-h4 font-mono-num font-bold text-[#1E1410]">
                          ₹ {order.grand_total}
                        </div>
                        <div className="typo-caption text-[#7A6558]">Grand Total</div>
                      </div>

                      {/* Status Dropdown */}
                      <select
                        value={order.status}
                        disabled={updatingId === order.id}
                        onChange={(e) =>
                          handleUpdateStatus(order.id, e.target.value)
                        }
                        className={`px-3 py-1.5 rounded-xl typo-badge font-semibold border cursor-pointer ${order.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : order.status === 'Cancelled'
                              ? 'bg-red-50 text-red-800 border-red-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                      >
                        {ORDER_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>

                      {/* WhatsApp Direct Action */}
                      <a
                        href={order.whatsapp_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="typo-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow-xs transition-colors cursor-pointer text-xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </a>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : order.id)
                        }
                        className="p-2 rounded-xl border border-[#DECBB4] hover:bg-[#F4ECE1] text-[#1E1410] cursor-pointer"
                        title="Toggle order details"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteOrder(order.id, order.order_code)
                        }
                        className="p-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 cursor-pointer"
                        title="Delete order"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Item List & Message */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-[#F0E9DC] bg-[#FAF7F2] p-4 rounded-xl space-y-3">
                      <div className="font-semibold typo-body-secondary text-[#1E1410]">
                        Order Items &amp; Content:
                      </div>

                      {order.items && order.items.length > 0 ? (
                        <div className="divide-y divide-[#E6DEC8] bg-white rounded-lg border border-[#DECBB4] overflow-hidden">
                          {order.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="p-3 flex items-center justify-between text-sm"
                            >
                              <div className="min-w-0">
                                <span className="font-medium text-[#1E1410]">
                                  {item.product_name}
                                </span>
                                <div className="typo-caption text-[#7A6558]">
                                  Unit: {item.currency_icon || '₹'}{' '}
                                  {item.unit_price} × Qty: {item.quantity}
                                </div>
                              </div>
                              <span className="font-mono-num font-semibold text-[#1E1410]">
                                {item.currency_icon || '₹'} {item.total_price}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <pre className="text-xs font-mono p-3 bg-white rounded-lg border border-[#DECBB4] text-[#5A463C] whitespace-pre-wrap">
                          {order.whatsapp_message}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center text-[#7A6558]">
            <ShoppingBag className="w-10 h-10 mx-auto text-[#C5B198] mb-2" />
            <p className="typo-body font-medium">No customer orders found.</p>
            <p className="typo-caption mt-1">
              New orders placed through the WhatsApp checkout modal will be stored and listed here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
