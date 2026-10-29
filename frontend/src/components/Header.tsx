import React, { useState } from 'react';
import {
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from 'lucide-react';
import { ActiveView, StoreInfo } from '../types/store';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ResilientImage } from './ResilientImage';

interface HeaderProps {
  store: StoreInfo;
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: () => void;
  selectedCategoryId: number | null;
  onSelectCategory: (categoryId: number | null) => void;
}

export const Header: React.FC<HeaderProps> = ({
  store,
  activeView,
  onNavigate,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  selectedCategoryId,
  onSelectCategory,
}) => {
  const { totalItems, subtotal, setIsCartOpen } = useCart();
  const { user, setIsLoginModalOpen, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const handleNavClick = (view: ActiveView, resetCat = false) => {
    if (resetCat) {
      onSelectCategory(null);
    }
    onNavigate(view);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit();
    setMobileSearchOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    if (activeView === 'admin') {
      onNavigate('home');
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E6DEC8]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4 lg:gap-8">
        {/* Zone 1: Brand Identity */}
        <button
          type="button"
          onClick={() => handleNavClick('home', true)}
          className="flex items-center gap-3 text-left group shrink-0 min-w-0 focus:outline-none cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden border border-[#DECBB4] shrink-0 bg-[#F4ECE1]">
            <ResilientImage
              src={store.logo_url}
              alt={store.name}
              className="w-full h-full object-cover"
            />
          </div>
          <span className="typo-h5 tracking-tight text-[#1E1410] group-hover:text-[#8B3A2B] transition-colors whitespace-nowrap truncate max-w-[180px] sm:max-w-none">
            {store.name}
          </span>
        </button>

        {/* Zone 2: Primary Navigation Links & Search */}
        <div className="hidden lg:flex items-center gap-6 flex-1 justify-center max-w-2xl min-w-0">
          <nav className="flex items-center gap-6 typo-nav text-[#5A463C]">
            <button
              type="button"
              onClick={() => handleNavClick('home', true)}
              className={`typo-nav py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
                activeView === 'home'
                  ? 'border-[#8B3A2B] text-[#1E1410] font-semibold'
                  : 'border-transparent hover:text-[#1E1410]'
              }`}
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('categories')}
              className={`typo-nav py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
                activeView === 'categories'
                  ? 'border-[#8B3A2B] text-[#1E1410] font-semibold'
                  : 'border-transparent hover:text-[#1E1410]'
              }`}
            >
              Categories
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('catalog', true)}
              className={`typo-nav py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
                activeView === 'catalog' && selectedCategoryId === null
                  ? 'border-[#8B3A2B] text-[#1E1410] font-semibold'
                  : 'border-transparent hover:text-[#1E1410]'
              }`}
            >
              All Products
            </button>
            {user?.role === 'admin' && (
              <button
                type="button"
                onClick={() => handleNavClick('admin')}
                className={`typo-nav py-1 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
                  activeView === 'admin'
                    ? 'border-[#8B3A2B] text-[#8B3A2B] font-semibold'
                    : 'border-transparent text-[#8B3A2B] hover:text-[#1E1410]'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            )}
          </nav>

          <form onSubmit={handleFormSubmit} className="relative flex-1 max-w-xs min-w-0">
            <Search className="w-4 h-4 text-[#7D685C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search chocolates, hampers, rakhis..."
              aria-label="Search products"
              className="w-full pl-9 pr-8 py-2 bg-white border border-[#E2D6C3] rounded-lg text-[#1E1410] placeholder-[#8C776B] focus:outline-none focus:border-[#8B3A2B] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7D685C] hover:text-[#1E1410]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
        </div>

        {/* Zone 3: Login / Account + Shopping Bag Action & Mobile Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setMobileSearchOpen((prev) => !prev)}
            aria-label="Toggle search bar"
            className="lg:hidden p-2.5 rounded-lg text-[#3D2B22] hover:bg-[#EFE7DA] transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Shared Navbar Login / Account Control */}
          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              {user.role === 'admin' ? (
                <button
                  type="button"
                  onClick={() => handleNavClick('admin')}
                  className={`typo-btn inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeView === 'admin'
                      ? 'bg-[#8B3A2B] text-white border-[#8B3A2B]'
                      : 'bg-white text-[#1E1410] border-[#DECBB4] hover:bg-[#F3ECE0]'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </button>
              ) : (
                <span className="typo-caption-medium text-[#5A463C] px-2 truncate max-w-[120px]">
                  {user.name}
                </span>
              )}
              <button
                type="button"
                onClick={handleLogout}
                title="Sign Out"
                className="typo-btn inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-[#F3ECE0] text-[#5A463C] hover:text-[#1E1410] border border-[#DECBB4] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="typo-btn inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-white hover:bg-[#F3ECE0] text-[#1E1410] border border-[#DECBB4] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <User className="w-4 h-4 text-[#8B3A2B]" />
              <span>Login</span>
            </button>
          )}

          {/* Shopping Bag Trigger */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="typo-btn flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-lg bg-[#1E1410] hover:bg-[#33221B] text-[#FAF7F2] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-[#E6B88A]" />
            <span>Bag</span>
            <span className="font-mono-num typo-badge px-1.5 py-0.5 rounded bg-[#36251D] text-[#FAF7F2]">
              {totalItems}
            </span>
            {subtotal > 0 && (
              <span className="hidden xl:inline font-mono-num typo-caption-medium text-[#E6B88A] border-l border-[#423027] pl-2">
                ₹{subtotal}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="lg:hidden p-2.5 rounded-lg text-[#3D2B22] hover:bg-[#EFE7DA] transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expandable Mobile Search */}
      {mobileSearchOpen && (
        <div className="lg:hidden px-4 pb-3 pt-1 bg-[#FAF7F2] border-b border-[#E6DEC8]">
          <form onSubmit={handleFormSubmit} className="relative">
            <Search className="w-4 h-4 text-[#7D685C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search chocolates, wrappings, hampers..."
              autoFocus
              className="w-full pl-9 pr-9 py-2.5 bg-white border border-[#E2D6C3] rounded-lg text-[#1E1410] placeholder-[#8C776B] focus:outline-none focus:border-[#8B3A2B]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7D685C]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>
        </div>
      )}

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#FAF7F2] border-b border-[#E6DEC8] px-4 py-4 space-y-2">
          <button
            type="button"
            onClick={() => handleNavClick('home', true)}
            className={`typo-nav w-full text-left px-3 py-2.5 rounded-lg ${
              activeView === 'home'
                ? 'bg-[#EFE7DA] text-[#1E1410] font-semibold'
                : 'text-[#5A463C] hover:bg-[#F4ECE1]'
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('categories')}
            className={`typo-nav w-full text-left px-3 py-2.5 rounded-lg ${
              activeView === 'categories'
                ? 'bg-[#EFE7DA] text-[#1E1410] font-semibold'
                : 'text-[#5A463C] hover:bg-[#F4ECE1]'
            }`}
          >
            Categories
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('catalog', true)}
            className={`typo-nav w-full text-left px-3 py-2.5 rounded-lg ${
              activeView === 'catalog'
                ? 'bg-[#EFE7DA] text-[#1E1410] font-semibold'
                : 'text-[#5A463C] hover:bg-[#F4ECE1]'
            }`}
          >
            All Products
          </button>

          <div className="pt-2 border-t border-[#E6DEC8] flex flex-col gap-2">
            {user ? (
              <>
                <div className="px-3 py-1.5 typo-caption text-[#6E5A4F]">
                  Signed in as <strong className="text-[#1E1410]">{user.name}</strong> ({user.role})
                </div>
                {user.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => handleNavClick('admin')}
                    className="typo-btn w-full text-left px-3 py-2.5 rounded-lg bg-[#8B3A2B] text-white flex items-center gap-2"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Admin Dashboard</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="typo-btn w-full text-left px-3 py-2.5 rounded-lg text-[#991B1B] hover:bg-[#FEF2F2] flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsLoginModalOpen(true);
                }}
                className="typo-btn w-full text-left px-3 py-2.5 rounded-lg bg-white border border-[#DECBB4] text-[#1E1410] flex items-center gap-2"
              >
                <User className="w-4 h-4 text-[#8B3A2B]" />
                <span>Login / Register</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
