import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Filter,
  MessageCircle,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import catalogSeed from './data/catalog.json';
import {
  ActiveView,
  Category,
  Product,
  SortOption,
  StoreInfo,
  UserAccount,
} from './types/store';
import { CartProvider, useCart } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { CategorySection } from './components/CategorySection';
import { ProductCard } from './components/ProductCard';
import { ProductDetailView } from './components/ProductDetailView';
import { CartDrawer } from './components/CartDrawer';
import { WhatsAppCheckoutModal } from './components/WhatsAppCheckoutModal';
import { AuthModal } from './components/AuthModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { Footer } from './components/Footer';

const initialStore: StoreInfo = catalogSeed.store as StoreInfo;

const initialCategories: Category[] = (catalogSeed.categories as Category[]).map(
  (cat) => ({
    ...cat,
    product_count: (catalogSeed.products as Product[]).filter(
      (p) => p.category_id === cat.id || p.category_name === cat.name
    ).length,
  })
);

const initialProducts: Product[] = catalogSeed.products as Product[];

function StorefrontContent() {
  const { toast, dismissToast } = useCart();
  const { user } = useAuth();

  const [store, setStore] = useState<StoreInfo>(initialStore);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<SortOption>('default');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const refreshStoreData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [storeRes, prodRes] = await Promise.all([
        fetch('/api/store'),
        fetch('/api/products'),
      ]);

      if (storeRes.ok) {
        const storeData = await storeRes.json();
        if (storeData.store && storeData.store.name) {
          setStore(storeData.store);
        }
        if (Array.isArray(storeData.categories) && storeData.categories.length > 0) {
          setCategories(storeData.categories);
        }
      }

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        if (Array.isArray(prodData.products)) {
          setProducts(prodData.products);
          setSelectedProduct((prev) => {
            if (!prev) return null;
            return prodData.products.find((p: Product) => p.id === prev.id) || null;
          });
        }
      }
      setLoadError(null);
    } catch {
      // Initial catalogSeed from SQLite extraction remains active
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync with FastAPI / SQLite backend on mount
  useEffect(() => {
    refreshStoreData();
  }, [refreshStoreData]);

  // Guard admin view if user logs out or is not an admin
  useEffect(() => {
    if (activeView === 'admin' && (!user || user.role !== 'admin')) {
      setActiveView('home');
    }
  }, [activeView, user]);

  const handleLoginSuccess = (loggedUser: UserAccount) => {
    if (loggedUser.role === 'admin') {
      setActiveView('admin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (activeView === 'admin') {
      setActiveView('home');
    }
  };

  const featuredProducts = useMemo(
    () => products.filter((p) => p.is_featured),
    [products]
  );

  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (selectedCategoryId !== null) {
      list = list.filter((p) => p.category_id === selectedCategoryId);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category_name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          String(p.id).includes(q)
      );
    }

    if (sortOption === 'price_asc') {
      list.sort((a, b) => a.selling_price - b.selling_price);
    } else if (sortOption === 'price_desc') {
      list.sort((a, b) => b.selling_price - a.selling_price);
    } else if (sortOption === 'name_asc') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [products, selectedCategoryId, searchQuery, sortOption]);

  const activeCategoryObj = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) || null,
    [categories, selectedCategoryId]
  );

  const relatedProducts = useMemo(() => {
    if (!selectedProduct) return [];
    const sameCat = products.filter(
      (p) =>
        p.category_id === selectedProduct.category_id &&
        p.id !== selectedProduct.id
    );
    if (sameCat.length >= 4) return sameCat.slice(0, 8);
    const others = products.filter(
      (p) =>
        p.category_id !== selectedProduct.category_id &&
        p.id !== selectedProduct.id
    );
    return [...sameCat, ...others].slice(0, 8);
  }, [products, selectedProduct]);

  const handleSelectCategory = (categoryId: number | null) => {
    setSelectedCategoryId(categoryId);
    setActiveView('catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setActiveView('product-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (q.trim() !== '' && activeView !== 'catalog') {
      setActiveView('catalog');
    }
  };

  const handleSearchSubmit = () => {
    if (activeView !== 'catalog') {
      setActiveView('catalog');
    }
  };

  // Render Secure Admin Dashboard when authenticated as Admin and activeView === 'admin'
  if (activeView === 'admin' && user?.role === 'admin') {
    return (
      <>
        <AdminDashboard
          products={products}
          categories={categories}
          whatsappNumber={store.whatsapp_number}
          onRefreshStore={refreshStoreData}
          onReturnToStore={() => {
            refreshStoreData();
            setActiveView('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
        <AuthModal storeName={store.name} onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#1E1410] typo-body">
      {/* Top Navigation Header */}
      <Header
        store={store}
        activeView={activeView}
        onNavigate={(view) => {
          if (view === 'admin' && (!user || user.role !== 'admin')) {
            return;
          }
          setActiveView(view);
        }}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onSearchSubmit={handleSearchSubmit}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0">
        {loadError && (
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] typo-body-secondary text-[#991B1B]">
              {loadError}
            </div>
          </div>
        )}

        {/* VIEW 1: HOMEPAGE */}
        {activeView === 'home' && (
          <>
            <HeroSection
              store={store}
              totalProducts={products.length}
              totalCategories={categories.length}
              onBrowseCatalog={() => {
                setSelectedCategoryId(null);
                setActiveView('catalog');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onBrowseCategories={() => {
                setActiveView('categories');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

            {/* All 8 Preserved Categories */}
            <CategorySection
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={(catId) => handleSelectCategory(catId)}
            />

            {/* Featured Products Section (Original Homepage Featured Items) */}
            <section className="py-12 sm:py-16 border-b border-[#E6DEC8]">
              <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                  <div className="min-w-0">
                    <p className="typo-badge text-[#7A5B4B] mb-1">
                      Storefront Highlights · {featuredProducts.length} Featured Creations
                    </p>
                    <h2 className="typo-h2 text-[#1E1410]">
                      Featured Products
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(null);
                      setActiveView('catalog');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="typo-btn inline-flex items-center gap-2 text-[#8B3A2B] hover:text-[#1E1410] transition-colors cursor-pointer"
                  >
                    <span>View All {products.length} Products</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {featuredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSelectProduct={handleSelectProduct}
                    />
                  ))}
                </div>

                <div className="mt-10 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(null);
                      setActiveView('catalog');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="typo-btn inline-flex items-center gap-2.5 px-7 py-3.5 rounded-lg bg-[#1E1410] hover:bg-[#33221B] text-white transition-colors cursor-pointer"
                  >
                    <span>View More Products ({products.length} Total)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </section>

            {/* Customization & WhatsApp Ordering Guide Section */}
            <section className="py-12 sm:py-16 bg-[#F5EFE6]">
              <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl mb-10">
                  <p className="typo-badge text-[#7A5B4B] mb-1">
                    Personalization Workflow · {store.name}
                  </p>
                  <h2 className="typo-h2 text-[#1E1410]">
                    How Personalized Ordering Works
                  </h2>
                  <p className="typo-body text-[#5A463C] mt-2">
                    Every chocolate bar, wrapper, resin rakhi, fridge magnet, and hamper can be personalized with your preferred photos, names, and wishes.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl border border-[#E6DEC8] p-6 space-y-2.5 min-w-0">
                    <span className="font-mono-num typo-badge text-[#8B3A2B]">
                      01. Select Your Creation
                    </span>
                    <h4 className="typo-h4 text-[#1E1410]">
                      Browse &amp; Add to Bag
                    </h4>
                    <p className="typo-card-desc text-[#5A463C]">
                      Explore all {products.length} products across {categories.length}{' '}
                      categories. Choose your favorite wrapper or gift design from the product gallery.
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-[#E6DEC8] p-6 space-y-2.5 min-w-0">
                    <span className="font-mono-num typo-badge text-[#8B3A2B]">
                      02. Place Order via WhatsApp
                    </span>
                    <h4 className="typo-h4 text-[#1E1410]">
                      Share Photo, Name &amp; Wishes
                    </h4>
                    <p className="typo-card-desc text-[#5A463C]">
                      Enter your name, WhatsApp number, and delivery address at checkout to send a prefilled order message directly to +{store.whatsapp_region_code}{' '}
                      {store.whatsapp_number}.
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-[#E6DEC8] p-6 space-y-2.5 min-w-0">
                    <span className="font-mono-num typo-badge text-[#8B3A2B]">
                      03. Design Approval &amp; Delivery
                    </span>
                    <h4 className="typo-h4 text-[#1E1410]">
                      Preview Before Printing
                    </h4>
                    <p className="typo-card-desc text-[#5A463C]">
                      For customized wrappers and keepsakes, we prepare your custom design for approval before printing and ship across India (prepaid orders, shipping extra).
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* VIEW 2: ALL CATEGORIES DIRECTORY */}
        {activeView === 'categories' && (
          <div className="py-6">
            <CategorySection
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={(catId) => handleSelectCategory(catId)}
              compact
            />

            <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12 pb-8">
              {categories.map((cat) => {
                const catProducts = products.filter((p) => p.category_id === cat.id);
                return (
                  <section
                    key={cat.id}
                    className="pt-8 border-t border-[#E6DEC8]"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
                      <div className="min-w-0">
                        <p className="typo-caption font-mono-num text-[#7A5B4B]">
                          Category ID #{cat.id} · {catProducts.length}{' '}
                          {catProducts.length === 1 ? 'Product' : 'Products'}
                        </p>
                        <h3 className="typo-h3 text-[#1E1410]">
                          {cat.name}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectCategory(cat.id)}
                        className="typo-btn inline-flex items-center gap-1.5 text-[#8B3A2B] hover:underline cursor-pointer"
                      >
                        <span>Filter by {cat.name}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {catProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onSelectProduct={handleSelectProduct}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 3: FULL PRODUCT CATALOG WITH FILTERS & SEARCH */}
        {activeView === 'catalog' && (
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            {/* Catalog Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E6DEC8]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 typo-caption text-[#7A5B4B] mb-1">
                  <span>{store.name}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-num">
                    Showing {filteredProducts.length} of {products.length} Products
                  </span>
                </div>
                <h1 className="typo-h2 text-[#1E1410]">
                  {activeCategoryObj ? activeCategoryObj.name : 'All Products'}
                </h1>
              </div>

              {/* Search & Sort Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[220px] sm:min-w-[260px] flex-1 sm:flex-initial">
                  <Search className="w-4 h-4 text-[#7D685C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter by product name..."
                    aria-label="Filter by product name"
                    className="w-full pl-9 pr-8 py-2 bg-white border border-[#D8C8B4] rounded-lg text-[#1E1410] placeholder-[#8C776B] focus:outline-none focus:border-[#8B3A2B]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search query"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7D685C] hover:text-[#1E1410]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 bg-white border border-[#D8C8B4] rounded-lg px-3 py-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#7A5B4B] shrink-0" />
                  <label htmlFor="sort-select" className="typo-label text-[#6E5A4F] shrink-0">
                    Sort:
                  </label>
                  <select
                    id="sort-select"
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                    className="typo-nav text-[#1E1410] bg-transparent focus:outline-none cursor-pointer"
                  >
                    <option value="default">Original Catalog Order</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="name_asc">Name: A to Z</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Interactive Category Filter Bar (Functional Buttons) */}
            <div className="py-5 flex items-center gap-2 overflow-x-auto border-b border-[#EFE7DA] mb-8">
              <span className="inline-flex items-center gap-1 typo-label text-[#7A5B4B] mr-1 shrink-0">
                <Filter className="w-3.5 h-3.5" />
                <span>Category:</span>
              </span>

              <button
                type="button"
                onClick={() => setSelectedCategoryId(null)}
                className={`typo-btn px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategoryId === null
                    ? 'bg-[#1E1410] text-white shadow-xs'
                    : 'bg-white text-[#5A463C] border border-[#E6DEC8] hover:border-[#C5B198] hover:text-[#1E1410]'
                }`}
              >
                All Categories ({products.length})
              </button>

              {categories.map((cat) => {
                const active = selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setSelectedCategoryId(active ? null : cat.id)
                    }
                    className={`typo-btn px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-[#8B3A2B] text-white shadow-xs'
                        : 'bg-white text-[#5A463C] border border-[#E6DEC8] hover:border-[#C5B198] hover:text-[#1E1410]'
                    }`}
                  >
                    {cat.name} ({cat.product_count ?? 0})
                  </button>
                );
              })}
            </div>

            {/* Product Grid or Empty Search State */}
            {isLoading && products.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-80 rounded-xl bg-[#EFE7DA] animate-pulse"
                  />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E6DEC8] p-12 text-center max-w-lg mx-auto my-8">
                <h3 className="typo-h3 text-[#1E1410] mb-2">
                  No matching products found
                </h3>
                <p className="typo-body-secondary text-[#6E5A4F] mb-6">
                  We couldn&apos;t find any products matching{' '}
                  {searchQuery ? `"${searchQuery}"` : 'your selected filter'}.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategoryId(null);
                    setSortOption('default');
                  }}
                  className="typo-btn px-5 py-2.5 rounded-lg bg-[#1E1410] hover:bg-[#33221B] text-white transition-colors cursor-pointer"
                >
                  Reset Filters &amp; Show All {products.length} Products
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelectProduct={handleSelectProduct}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: PRODUCT DETAILS VIEW */}
        {activeView === 'product-detail' && selectedProduct && (
          <ProductDetailView
            product={selectedProduct}
            relatedProducts={relatedProducts}
            store={store}
            onBack={() => setActiveView('catalog')}
            onSelectCategory={(catId) => handleSelectCategory(catId)}
            onSelectProduct={handleSelectProduct}
          />
        )}
      </main>

      {/* Slide-Over Shopping Cart Drawer */}
      <CartDrawer onSelectProduct={handleSelectProduct} />

      {/* WhatsApp Order Details Checkout Modal */}
      <WhatsAppCheckoutModal store={store} />

      {/* Shared Customer & Admin Login / Register Modal */}
      <AuthModal storeName={store.name} onLoginSuccess={handleLoginSuccess} />

      {/* Toast Feedback Banner */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-[#1E1410] text-white px-4 py-3 rounded-xl shadow-lg border border-[#3D2B22] flex items-center gap-3 typo-body-secondary">
          <CheckCircle2 className="w-4 h-4 text-[#E6B88A] shrink-0" />
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={dismissToast}
            aria-label="Close notification"
            className="text-[#B8A698] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Floating WhatsApp Direct Support Button (Mobile & Desktop) */}
      <a
        href={`https://wa.me/+${store.whatsapp_region_code}${store.whatsapp_number}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="typo-btn fixed bottom-5 left-5 z-40 inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[#1E7E48] hover:bg-[#176639] text-white shadow-md transition-colors"
      >
        <MessageCircle className="w-4 h-4" />
        <span className="hidden sm:inline">WhatsApp Store</span>
      </a>

      {/* Store Footer */}
      <Footer
        store={store}
        categories={categories}
        onNavigate={(view) => setActiveView(view)}
        onSelectCategory={(catId) => handleSelectCategory(catId)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <StorefrontContent />
      </CartProvider>
    </AuthProvider>
  );
}
