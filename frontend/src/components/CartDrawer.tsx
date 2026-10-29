import React from 'react';
import { MessageCircle, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Product } from '../types/store';
import { ResilientImage } from './ResilientImage';

interface CartDrawerProps {
  onSelectProduct: (product: Product) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onSelectProduct }) => {
  const {
    items,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalItems,
    subtotal,
    totalSavings,
    isCartOpen,
    setIsCartOpen,
    setIsCheckoutOpen,
  } = useCart();

  if (!isCartOpen) return null;

  const handleProceedToOrder = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="fixed inset-0 bg-black/45 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FAF7F2] shadow-2xl border-l border-[#E6DEC8] flex flex-col justify-between">
          {/* Drawer Header */}
          <div className="px-6 py-5 bg-white border-b border-[#E6DEC8] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <ShoppingBag className="w-5 h-5 text-[#8B3A2B] shrink-0" />
              <h3 className="typo-h4 text-[#1E1410]">
                Cart Items
              </h3>
              <span className="typo-caption font-mono-num text-[#7A6558]">
                ({totalItems} {totalItems === 1 ? 'item' : 'items'})
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="typo-caption-medium text-[#8B3A2B] hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                aria-label="Close cart drawer"
                className="p-1.5 rounded-lg text-[#5A463C] hover:bg-[#EFE7DA] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-14 h-14 rounded-full bg-[#EFE7DA] flex items-center justify-center mb-4">
                  <ShoppingBag className="w-6 h-6 text-[#8B3A2B]" />
                </div>
                <h4 className="typo-h4 text-[#1E1410] mb-1">
                  Your shopping bag is empty
                </h4>
                <p className="typo-body-secondary text-[#6E5A4F] max-w-xs mb-6">
                  Browse our customized chocolate bars, Kunafa chocolates, rakhis, and hampers to add items.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="typo-btn px-5 py-2.5 rounded-lg bg-[#1E1410] hover:bg-[#33221B] text-white transition-colors cursor-pointer"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              items.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className="bg-white rounded-xl border border-[#E6DEC8] p-4 flex gap-4 items-center min-w-0"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsCartOpen(false);
                      onSelectProduct(product);
                    }}
                    className="w-20 h-20 rounded-lg overflow-hidden bg-[#F5EFE6] border border-[#E6DEC8] shrink-0 cursor-pointer"
                  >
                    <ResilientImage
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="typo-caption text-[#7A6558] truncate">
                      {product.category_name}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCartOpen(false);
                        onSelectProduct(product);
                      }}
                      className="typo-h5 text-[#1E1410] hover:text-[#8B3A2B] text-left line-clamp-1 transition-colors cursor-pointer"
                    >
                      {product.name}
                    </button>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="font-mono-num typo-caption-medium text-[#5A463C]">
                        {product.currency_icon}
                        {product.selling_price} each
                      </span>
                      <span aria-hidden="true" className="typo-caption text-[#C5B198]">
                        ·
                      </span>
                      <span className="font-mono-num typo-btn text-[#1E1410]">
                        {product.currency_icon}
                        {product.selling_price * quantity}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1 bg-[#FAF7F2] border border-[#DECBB4] rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          aria-label="Decrease quantity"
                          className="w-6 h-6 rounded flex items-center justify-center text-[#1E1410] hover:bg-white transition-colors cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono-num typo-caption-medium font-semibold px-2.5 text-[#1E1410]">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          aria-label="Increase quantity"
                          className="w-6 h-6 rounded flex items-center justify-center text-[#1E1410] hover:bg-white transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(product.id)}
                        aria-label={`Remove ${product.name}`}
                        className="p-1.5 text-[#8C776B] hover:text-[#B91C1C] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer: Order Summary & Order Now Button */}
          {items.length > 0 && (
            <div className="p-6 bg-white border-t border-[#E6DEC8] space-y-4">
              <div className="space-y-2 typo-body-secondary">
                {totalSavings > 0 && (
                  <div className="flex items-center justify-between typo-caption-medium text-[#2E6B47]">
                    <span>Total Savings on MRP</span>
                    <span className="font-mono-num">-₹{totalSavings}</span>
                  </div>
                )}
                <div className="flex items-center justify-between typo-h5 text-[#1E1410]">
                  <span>Grand Total</span>
                  <span className="font-mono-num typo-h4">₹{subtotal}</span>
                </div>
                <p className="typo-caption text-[#7A6558]">
                  Shipping charges extra as applicable · Prepaid orders via WhatsApp confirmation
                </p>
              </div>

              <button
                type="button"
                onClick={handleProceedToOrder}
                className="typo-btn w-full py-3.5 px-5 rounded-lg bg-[#8B3A2B] hover:bg-[#732E21] text-white flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Order Now</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
