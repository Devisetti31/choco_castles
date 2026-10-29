import React, { useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Minus,
  Plus,
  Save,
  Search,
} from 'lucide-react';
import { Category, Product } from '../../types/store';
import { useAuth } from '../../context/AuthContext';
import { ResilientImage } from '../ResilientImage';

interface AdminStockSectionProps {
  products: Product[];
  categories: Category[];
  lowStockThreshold?: number;
  onRefreshStoreData: () => Promise<void>;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

export const AdminStockSection: React.FC<AdminStockSectionProps> = ({
  products,
  categories,
  lowStockThreshold = 5,
  onRefreshStoreData,
  onNotify,
}) => {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'out' | 'in'>('all');
  const [stockEdits, setStockEdits] = useState<Record<number, number>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [threshold, setThreshold] = useState<number>(lowStockThreshold);
  const [savingThreshold, setSavingThreshold] = useState(false);

  const getStockValue = (prod: Product) => {
    return stockEdits[prod.id] !== undefined ? stockEdits[prod.id] : prod.available_stock;
  };

  const handleStockChange = (prodId: number, val: number) => {
    setStockEdits((prev) => ({
      ...prev,
      [prodId]: Math.max(0, val),
    }));
  };

  const handleSaveStock = async (prod: Product) => {
    const newStock = getStockValue(prod);
    setSavingId(prod.id);
    try {
      const res = await fetch(`/api/admin/products/${prod.id}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ available_stock: newStock }),
      });

      const json = await res.json();
      if (res.ok && !json.error) {
        onNotify(`Updated stock for "${prod.name}" to ${newStock} units.`);
        setStockEdits((prev) => {
          const next = { ...prev };
          delete next[prod.id];
          return next;
        });
        await onRefreshStoreData();
      } else {
        onNotify(json.error || 'Failed to update stock.', 'error');
      }
    } catch {
      onNotify('Network error while saving stock update.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveThreshold = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingThreshold(true);
    try {
      const res = await fetch('/api/admin/settings/threshold', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ low_stock_threshold: threshold }),
      });

      const json = await res.json();
      if (res.ok && !json.error) {
        onNotify(`Low stock threshold updated to ${threshold} units.`);
        await onRefreshStoreData();
      } else {
        onNotify(json.error || 'Failed to update threshold.', 'error');
      }
    } catch {
      onNotify('Network error while updating threshold.', 'error');
    } finally {
      setSavingThreshold(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category_name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'all' || p.category_id === categoryFilter;

    let matchesStatus = true;
    if (statusFilter === 'out') {
      matchesStatus = p.available_stock <= 0;
    } else if (statusFilter === 'low') {
      matchesStatus = p.available_stock > 0 && p.available_stock <= threshold;
    } else if (statusFilter === 'in') {
      matchesStatus = p.available_stock > threshold;
    }

    return matchesSearch && matchesCat && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Threshold Configuration */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#DECBB4] shadow-xs">
        <div>
          <h2 className="typo-h3 text-[#1E1410]">Stock Management</h2>
          <p className="typo-body-secondary text-[#7A6558] mt-0.5">
            Monitor inventories, set low-stock alert thresholds, and quickly adjust inventory.
          </p>
        </div>

        <form
          onSubmit={handleSaveThreshold}
          className="flex items-center gap-3 bg-[#FAF7F2] p-2.5 rounded-xl border border-[#DECBB4] shrink-0"
        >
          <div className="typo-caption text-[#655045]">
            <span className="font-semibold block text-[#1E1410]">Alert Threshold:</span>
            <span>Flag items when below</span>
          </div>
          <input
            type="number"
            min={1}
            max={500}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-16 px-2.5 py-1.5 rounded-lg border border-[#DECBB4] bg-white text-center font-mono-num font-bold text-[#1E1410]"
          />
          <button
            type="submit"
            disabled={savingThreshold}
            className="typo-btn px-3 py-1.5 rounded-lg bg-[#8B3A2B] hover:bg-[#732E21] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            {savingThreshold ? 'Saving...' : 'Set'}
          </button>
        </form>
      </div>

      {/* Filter and Status Quick Pills */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#8A7264] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stock by product name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#DECBB4] text-[#1E1410] focus:ring-2 focus:ring-[#8B3A2B]/20"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'All Stock' },
            { id: 'low', label: 'Low Stock' },
            { id: 'out', label: 'Out of Stock' },
            { id: 'in', label: 'In Stock' },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFilter(st.id as any)}
              className={`px-3.5 py-2 rounded-xl typo-caption font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                statusFilter === st.id
                  ? 'bg-[#1E1410] text-white'
                  : 'bg-white border border-[#DECBB4] text-[#655045] hover:bg-[#F4ECE1]'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stock Table with Inline Quick Adjustments */}
      <div className="bg-white rounded-2xl border border-[#DECBB4] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF7F2] border-b border-[#DECBB4] typo-caption uppercase tracking-wider text-[#7A6558]">
                <th className="py-3.5 px-4">Product Details</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Current Stock</th>
                <th className="py-3.5 px-4 text-center">Quick Adjust</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E9DC] typo-body-secondary">
              {filteredProducts.map((prod) => {
                const currentVal = getStockValue(prod);
                const hasChanged = stockEdits[prod.id] !== undefined && stockEdits[prod.id] !== prod.available_stock;

                return (
                  <tr key={prod.id} className="hover:bg-[#FAF7F2]/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-[#DECBB4] bg-[#F4ECE1] shrink-0">
                          <ResilientImage
                            src={prod.image}
                            alt={prod.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 max-w-sm">
                          <div className="font-semibold text-[#1E1410] truncate">
                            {prod.name}
                          </div>
                          <div className="typo-caption text-[#7A6558]">
                            Unit Price: ₹ {prod.selling_price}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-[#655045]">
                      {prod.category_name}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full typo-badge font-semibold ${
                          prod.available_stock <= 0
                            ? 'bg-red-100 text-red-800'
                            : prod.available_stock <= threshold
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {prod.available_stock <= 0
                          ? 'Out of Stock'
                          : prod.available_stock <= threshold
                          ? 'Low Stock'
                          : 'In Stock'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center font-mono-num font-bold text-[#1E1410]">
                      {prod.available_stock}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1 bg-[#F4ECE1] border border-[#DECBB4] rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => handleStockChange(prod.id, currentVal - 1)}
                          className="w-7 h-7 rounded flex items-center justify-center text-[#1E1410] hover:bg-white transition-colors cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={currentVal}
                          onChange={(e) =>
                            handleStockChange(prod.id, Number(e.target.value))
                          }
                          className="w-14 text-center font-mono-num font-semibold text-[#1E1410] bg-transparent focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleStockChange(prod.id, currentVal + 1)}
                          className="w-7 h-7 rounded flex items-center justify-center text-[#1E1410] hover:bg-white transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {hasChanged && (
                        <button
                          type="button"
                          disabled={savingId === prod.id}
                          onClick={() => handleSaveStock(prod)}
                          className="typo-btn inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer transition-colors"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{savingId === prod.id ? 'Saving...' : 'Save'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#7A6558]">
                    <Boxes className="w-8 h-8 mx-auto text-[#C5B198] mb-2" />
                    <p className="typo-body-secondary font-medium">No items matching current stock filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

