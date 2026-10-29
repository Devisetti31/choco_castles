import React, { useState } from 'react';
import {
  Edit3,
  Image,
  Package,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Category, Product } from '../../types/store';
import { useAuth } from '../../context/AuthContext';
import { ResilientImage } from '../ResilientImage';

interface AdminInventorySectionProps {
  products: Product[];
  categories: Category[];
  onRefreshStoreData: () => Promise<void>;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

export const AdminInventorySection: React.FC<AdminInventorySectionProps> = ({
  products,
  categories,
  onRefreshStoreData,
  onNotify,
}) => {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id || 4069);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [originalPrice, setOriginalPrice] = useState<number | ''>('');
  const [stock, setStock] = useState<number>(10);
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const resetForm = () => {
    setName('');
    setCategoryId(categories[0]?.id || 4069);
    setSellingPrice(0);
    setOriginalPrice('');
    setStock(10);
    setImageUrl('');
    setDescription('');
    setIsFeatured(false);
    setEditingProduct(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setCategoryId(p.category_id);
    setSellingPrice(p.selling_price);
    setOriginalPrice(p.original_price ?? '');
    setStock(p.available_stock);
    setImageUrl(p.image);
    setDescription(p.description || '');
    setIsFeatured(p.is_featured);
    setIsAddModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      onNotify('Image file size must be less than 5 MB.', 'error');
      return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await fetch('/api/admin/upload-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token || ''}`,
          },
          body: JSON.stringify({
            filename: file.name,
            content_type: file.type,
            data_base64: base64Data,
          }),
        });

        const data = await res.json();
        if (res.ok && data.image_url) {
          setImageUrl(data.image_url);
          onNotify('Image uploaded successfully!');
        } else {
          onNotify(data.error || 'Failed to upload image.', 'error');
        }
      } catch {
        onNotify('Error uploading image to server.', 'error');
      } finally {
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onNotify('Please enter a product name.', 'error');
      return;
    }
    if (sellingPrice < 0) {
      onNotify('Selling price must be 0 or higher.', 'error');
      return;
    }
    if (!imageUrl.trim()) {
      onNotify('Please provide an image URL or upload an image.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        category_id: Number(categoryId),
        selling_price: Number(sellingPrice),
        original_price: originalPrice === '' ? null : Number(originalPrice),
        available_stock: Number(stock),
        image: imageUrl.trim(),
        description: description.trim(),
        is_featured: isFeatured,
      };

      const isEdit = Boolean(editingProduct);
      const url = isEdit
        ? `/api/admin/products/${editingProduct?.id}`
        : '/api/admin/products';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (res.ok && !resJson.error) {
        onNotify(
          isEdit
            ? `Updated "${name}" successfully.`
            : `Added "${name}" to catalog.`
        );
        setIsAddModalOpen(false);
        resetForm();
        await onRefreshStoreData();
      } else {
        onNotify(resJson.error || resJson.detail || 'Could not save product.', 'error');
      }
    } catch {
      onNotify('Network error connecting to catalog server.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: number, prodName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${prodName}"?`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token || ''}`,
        },
      });

      const resJson = await res.json();
      if (res.ok && !resJson.error) {
        onNotify(`Deleted "${prodName}" from catalog.`);
        await onRefreshStoreData();
      } else {
        onNotify(resJson.error || 'Failed to delete product.', 'error');
      }
    } catch {
      onNotify('Network error while deleting product.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category_name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#DECBB4] shadow-xs">
        <div>
          <h2 className="typo-h3 text-[#1E1410]">Product Inventory</h2>
          <p className="typo-body-secondary text-[#7A6558] mt-0.5">
            Add, update pricing, descriptions, and manage live products.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="typo-btn inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#8B3A2B] hover:bg-[#732E21] text-white shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
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
            placeholder="Search products by title or category..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#DECBB4] focus:outline-none focus:ring-2 focus:ring-[#8B3A2B]/20 text-[#1E1410]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-2 rounded-xl typo-caption font-semibold whitespace-nowrap cursor-pointer transition-colors ${selectedCategory === 'all'
                ? 'bg-[#1E1410] text-white'
                : 'bg-white border border-[#DECBB4] text-[#655045] hover:bg-[#F4ECE1]'
              }`}
          >
            All Categories ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl typo-caption font-semibold whitespace-nowrap cursor-pointer transition-colors ${selectedCategory === cat.id
                  ? 'bg-[#1E1410] text-white'
                  : 'bg-white border border-[#DECBB4] text-[#655045] hover:bg-[#F4ECE1]'
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product List Table / Grid */}
      <div className="bg-white rounded-2xl border border-[#DECBB4] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF7F2] border-b border-[#DECBB4] typo-caption uppercase tracking-wider text-[#7A6558]">
                <th className="py-3.5 px-4">Product</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-right">Price</th>
                <th className="py-3.5 px-4 text-center">Stock</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E9DC] typo-body-secondary">
              {filteredProducts.map((prod) => (
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
                      <div className="min-w-0 max-w-xs">
                        <div className="font-semibold text-[#1E1410] truncate">
                          {prod.name}
                        </div>
                        <div className="typo-caption text-[#7A6558] truncate">
                          ID: #{prod.id}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-[#655045]">
                    {prod.category_name}
                  </td>

                  <td className="py-3 px-4 text-right font-mono-num font-semibold text-[#1E1410]">
                    ₹ {prod.selling_price}
                    {prod.original_price && (
                      <span className="block typo-caption text-[#8A7264] line-through font-normal">
                        ₹ {prod.original_price}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-center font-mono-num">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-md typo-caption font-semibold ${prod.available_stock <= 0
                          ? 'bg-red-100 text-red-800'
                          : prod.available_stock <= 5
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                    >
                      {prod.available_stock}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-center">
                    {prod.is_featured ? (
                      <span className="typo-badge px-2 py-0.5 rounded-full bg-[#8B3A2B]/10 text-[#8B3A2B] font-semibold">
                        Featured
                      </span>
                    ) : (
                      <span className="typo-caption text-[#8A7264]">Standard</span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(prod)}
                        className="p-1.5 rounded-lg border border-[#DECBB4] hover:bg-[#F4ECE1] text-[#1E1410] transition-colors cursor-pointer"
                        title="Edit product"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === prod.id}
                        onClick={() => handleDeleteProduct(prod.id, prod.name)}
                        className="p-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                        title="Delete product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#7A6558]">
                    <Package className="w-8 h-8 mx-auto text-[#C5B198] mb-2" />
                    <p className="typo-body-secondary font-medium">No products match your filter criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Add / Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            onClick={() => setIsAddModalOpen(false)}
            className="fixed inset-0 bg-black/55 backdrop-blur-xs"
          />

          <div className="relative w-full max-w-xl rounded-2xl bg-white border border-[#DECBB4] shadow-2xl overflow-hidden z-10 my-8">
            <div className="px-6 py-4 bg-[#FAF7F2] border-b border-[#DECBB4] flex items-center justify-between">
              <div>
                <h3 className="typo-h4 text-[#1E1410]">
                  {editingProduct ? 'Edit Product Details' : 'Add New Product'}
                </h3>
                <p className="typo-caption text-[#7A6558]">
                  Fill in the product attributes below
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-[#655045] hover:bg-[#EFE7DA] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div>
                <label className="block typo-label text-[#1E1410] mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Personalized Photo Chocolate Bar"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#DECBB4] focus:ring-2 focus:ring-[#8B3A2B]/20 text-[#1E1410]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block typo-label text-[#1E1410] mb-1">
                    Category *
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#DECBB4] text-[#1E1410] bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block typo-label text-[#1E1410] mb-1">
                    Available Stock Units *
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#DECBB4] text-[#1E1410]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block typo-label text-[#1E1410] mb-1">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#DECBB4] text-[#1E1410]"
                  />
                </div>

                <div>
                  <label className="block typo-label text-[#1E1410] mb-1">
                    Original Price (₹) <span className="text-[#7A6558] font-normal">(optional)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={originalPrice}
                    onChange={(e) =>
                      setOriginalPrice(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="e.g. 499"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#DECBB4] text-[#1E1410]"
                  />
                </div>
              </div>

              {/* Image Input & Upload */}
              <div>
                <label className="block typo-label text-[#1E1410] mb-1">
                  Product Image *
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      required
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Paste image URL or upload file below..."
                      className="flex-1 px-3.5 py-2 rounded-xl border border-[#DECBB4] text-[#1E1410]"
                    />
                    {imageUrl && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#DECBB4] shrink-0">
                        <ResilientImage
                          src={imageUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[#7A6558] typo-caption">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DECBB4] bg-[#FAF7F2] hover:bg-[#F4ECE1] text-[#1E1410] cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-[#8B3A2B]" />
                      <span>{uploadingImage ? 'Uploading...' : 'Upload Local Image'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileUpload}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                    </label>
                    <span>JPG, PNG, or WebP up to 5 MB</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block typo-label text-[#1E1410] mb-1">
                  Product Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter details, ingredients, or personalization notes..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[#DECBB4] text-[#1E1410]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="featured-check"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded border-[#DECBB4] text-[#8B3A2B] focus:ring-[#8B3A2B] w-4 h-4 cursor-pointer"
                />
                <label htmlFor="featured-check" className="typo-label text-[#1E1410] cursor-pointer">
                  Feature this product on homepage
                </label>
              </div>

              <div className="pt-4 border-t border-[#DECBB4] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#DECBB4] text-[#655045] hover:bg-[#F4ECE1] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || uploadingImage}
                  className="typo-btn px-5 py-2 rounded-xl bg-[#8B3A2B] hover:bg-[#732E21] text-white disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
