import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { CartItem, Product } from '../types/store';

const CART_STORAGE_KEY = 'the_creative_castles_cart';

interface CartToast {
  message: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  getItemQuantity: (productId: number) => number;
  totalItems: number;
  subtotal: number;
  totalSavings: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
  toast: CartToast | null;
  dismissToast: () => void;
  showToast: (message: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback to empty cart on error
    }
    return [];
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [toast, setToast] = useState<CartToast | null>(null);

  // Sync cart changes with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore quota errors
    }
  }, [items]);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const showToast = useCallback((message: string) => {
    setToast({ message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  }, []);

  const addToCart = useCallback(
    (product: Product, quantity = 1) => {
      if (quantity <= 0) return;
      setItems((prev) => {
        const existingIndex = prev.findIndex(
          (item) => item.product.id === product.id
        );
        if (existingIndex > -1) {
          const updated = [...prev];
          const newQty = updated[existingIndex].quantity + quantity;
          const cappedQty =
            product.available_stock > 0
              ? Math.min(newQty, product.available_stock)
              : newQty;
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: cappedQty,
          };
          return updated;
        }
        const initialQty =
          product.available_stock > 0
            ? Math.min(quantity, product.available_stock)
            : quantity;
        return [...prev, { product, quantity: initialQty }];
      });
      showToast(`Added "${product.name}" to cart`);
    },
    [showToast]
  );

  const updateQuantity = useCallback(
    (productId: number, quantity: number) => {
      if (quantity <= 0) {
        setItems((prev) => prev.filter((i) => i.product.id !== productId));
        return;
      }
      setItems((prev) =>
        prev.map((item) => {
          if (item.product.id === productId) {
            const capped =
              item.product.available_stock > 0
                ? Math.min(quantity, item.product.available_stock)
                : quantity;
            return { ...item, quantity: capped };
          }
          return item;
        })
      );
    },
    []
  );

  const removeFromCart = useCallback((productId: number) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getItemQuantity = useCallback(
    (productId: number) => {
      const match = items.find((item) => item.product.id === productId);
      return match ? match.quantity : 0;
    },
    [items]
  );

  const totalItems = useMemo(
    () => items.reduce((acc, curr) => acc + curr.quantity, 0),
    [items]
  );

  const subtotal = useMemo(
    () =>
      items.reduce(
        (acc, curr) => acc + curr.product.selling_price * curr.quantity,
        0
      ),
    [items]
  );

  const totalSavings = useMemo(
    () =>
      items.reduce((acc, curr) => {
        if (
          curr.product.original_price &&
          curr.product.original_price > curr.product.selling_price
        ) {
          return (
            acc +
            (curr.product.original_price - curr.product.selling_price) *
              curr.quantity
          );
        }
        return acc;
      }, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getItemQuantity,
        totalItems,
        subtotal,
        totalSavings,
        isCartOpen,
        setIsCartOpen,
        isCheckoutOpen,
        setIsCheckoutOpen,
        toast,
        dismissToast,
        showToast,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

