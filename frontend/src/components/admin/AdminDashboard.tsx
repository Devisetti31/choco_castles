import React, { useState } from 'react';
import {
  BarChart3,
  Package,
  Boxes,
  ShoppingBag,
  UserCog,
  ArrowLeft,
  Menu,
  X,
  LogOut,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { AdminSection, Product, Category } from '../../types/store';
import { useAuth } from '../../context/AuthContext';
import { AdminOverviewSection } from './AdminOverviewSection';
import { AdminInventorySection } from './AdminInventorySection';
import { AdminStockSection } from './AdminStockSection';
import { AdminOrdersSection } from './AdminOrdersSection';
import { AdminProfileSection } from './AdminProfileSection';

interface AdminDashboardProps {
  products: Product[];
  categories: Category[];
  whatsappNumber: string;
  onRefreshStore: () => Promise<void>;
  onReturnToStore: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  products,
  categories,
  onRefreshStore,
  onReturnToStore,
}) => {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const handleNotify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  const navItems: {
    id: AdminSection;
    label: string;
    shortDesc: string;
    icon: React.FC<{ className?: string }>;
    badge?: number | string;
  }[] = [
    {
      id: 'overview',
      label: 'Dashboard Overview',
      shortDesc: 'Sales Income & Trends',
      icon: BarChart3,
    },
    {
      id: 'inventory',
      label: 'Product Inventory',
      shortDesc: 'Add, Edit & Delete Products',
      icon: Package,
      badge: products.length,
    },
    {
      id: 'stock',
      label: 'Stock Information',
      shortDesc: 'Monitor Product Stock',
      icon: Boxes,
      badge: products.filter((p) => p.available_stock <= 5).length || undefined,
    },
    {
      id: 'orders',
      label: 'Order Management',
      shortDesc: 'WhatsApp Bookings',
      icon: ShoppingBag,
    },
    {
      id: 'profile',
      label: 'Admin & Users',
      shortDesc: 'Profile, Security & Roles',
      icon: UserCog,
    },
  ];

  const handleSelectSection = (id: AdminSection) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F8F3EC] text-[#2A1810] typo-body flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:shrink-0 bg-[#1F110B] text-[#FDFBF7] border-r border-[#3B2316] min-h-screen sticky top-0">
        {/* Brand Top */}
        <div className="p-6 border-b border-[#341E14]">
          <div className="flex items-center gap-2 text-[#D49B4B] typo-badge uppercase tracking-[0.18em] mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            Admin Control Center
          </div>
          <h4 className="typo-h4 text-[#FDFBF7]">
            The Creative Castles &amp; Choco Delights
          </h4>
          <p className="typo-caption text-[#B89F8D] mt-1 truncate">
            Signed in as <span className="text-[#FDFBF7] font-medium">{user?.email}</span>
          </p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectSection(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#D49B4B] text-[#1F110B] font-semibold shadow-md'
                    : 'text-[#E5D5C5] hover:bg-[#2E1A11] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#1F110B]' : 'text-[#D49B4B]'}`} />
                  <div className="truncate">
                    <div className="typo-nav font-semibold leading-tight">{item.label}</div>
                    <div
                      className={`typo-caption truncate mt-0.5 ${
                        isActive ? 'text-[#2A1810]/80' : 'text-[#A68B77]'
                      }`}
                    >
                      {item.shortDesc}
                    </div>
                  </div>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`ml-2 typo-badge font-mono-num px-2 py-0.5 rounded-md ${
                      isActive ? 'bg-[#1F110B]/15 text-[#1F110B]' : 'bg-[#341E14] text-[#D49B4B]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-[#341E14] space-y-2">
          <button
            type="button"
            onClick={onReturnToStore}
            className="typo-btn w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2E1A11] hover:bg-[#3E2418] text-[#FDFBF7] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#D49B4B]" />
            Back to Customer Storefront
          </button>
          <button
            type="button"
            onClick={() => {
              logout();
              onReturnToStore();
            }}
            className="typo-btn w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-red-300 hover:bg-red-950/50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Logout Admin
          </button>
        </div>
      </aside>

      {/* Mobile & Tablet Header */}
      <div className="lg:hidden sticky top-0 z-30 bg-[#1F110B] text-[#FDFBF7] px-4 py-3.5 flex items-center justify-between border-b border-[#341E14]">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-[#2E1A11] text-[#D49B4B] cursor-pointer"
            aria-label="Toggle admin menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="truncate">
            <span className="typo-badge uppercase tracking-[0.18em] text-[#D49B4B] block">
              Admin Dashboard
            </span>
            <h4 className="typo-h5 font-bold truncate">
              {navItems.find((i) => i.id === activeSection)?.label}
            </h4>
          </div>
        </div>
        <button
          type="button"
          onClick={onReturnToStore}
          className="typo-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2E1A11] text-[#FDFBF7] cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#D49B4B]" />
          Store
        </button>
      </div>

      {/* Mobile Slide-Down Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-[61px] z-40 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#1F110B] text-[#FDFBF7] p-4 border-b border-[#341E14] space-y-2 shadow-2xl">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectSection(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#D49B4B] text-[#1F110B] font-semibold'
                      : 'text-[#E5D5C5] hover:bg-[#2E1A11]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#1F110B]' : 'text-[#D49B4B]'}`} />
                    <div>
                      <div className="typo-nav font-semibold">{item.label}</div>
                      <div className={`typo-caption ${isActive ? 'text-[#1F110B]/80' : 'text-[#A68B77]'}`}>
                        {item.shortDesc}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
            <div className="pt-2 border-t border-[#341E14] flex items-center gap-2">
              <button
                type="button"
                onClick={onReturnToStore}
                className="typo-btn flex-1 py-2.5 rounded-xl bg-[#2E1A11] text-center text-[#FDFBF7]"
              >
                Customer Storefront
              </button>
              <button
                type="button"
                onClick={() => {
                  logout();
                  onReturnToStore();
                }}
                className="typo-btn flex-1 py-2.5 rounded-xl bg-red-950/60 text-center text-red-300"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Initial Password Security Prompt */}
        {user?.must_change_password && activeSection !== 'profile' && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="typo-caption">
                <span className="font-bold block typo-body-secondary">Action Recommended: Change Initial Admin Password</span>
                You are using the default initial administrator credentials. Please update your password to protect store operations.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('profile')}
              className="typo-btn px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white shrink-0 self-start sm:self-auto cursor-pointer"
            >
              Update Password Now
            </button>
          </div>
        )}

        {activeSection === 'overview' && (
          <AdminOverviewSection
            products={products}
            onNavigateSection={(sec) => handleSelectSection(sec)}
            onRefreshStoreData={onRefreshStore}
            onNotify={handleNotify}
          />
        )}

        {activeSection === 'inventory' && (
          <AdminInventorySection
            products={products}
            categories={categories}
            onRefreshStoreData={onRefreshStore}
            onNotify={handleNotify}
          />
        )}

        {activeSection === 'stock' && (
          <AdminStockSection
            products={products}
            categories={categories}
            lowStockThreshold={5}
            onRefreshStoreData={onRefreshStore}
            onNotify={handleNotify}
          />
        )}

        {activeSection === 'orders' && (
          <AdminOrdersSection
            onRefreshStoreData={onRefreshStore}
            onNotify={handleNotify}
          />
        )}

        {activeSection === 'profile' && <AdminProfileSection />}
      </main>

      {/* Admin Notification Toast */}
      {notification && (
        <div
          className={`fixed bottom-5 right-5 z-50 max-w-md px-4 py-3 rounded-xl shadow-xl border flex items-center gap-3 typo-body-secondary font-medium ${
            notification.type === 'success'
              ? 'bg-[#1F110B] text-[#FDFBF7] border-[#3B2316]'
              : 'bg-red-950 text-red-100 border-red-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#D49B4B] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span className="flex-1">{notification.message}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-white/70 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
