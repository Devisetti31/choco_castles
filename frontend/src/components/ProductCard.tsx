import React from 'react';
import { Images, Minus, Plus, ShoppingBag } from 'lucide-react';
import { Product } from '../types/store';
import { useCart } from '../context/CartContext';
import { ResilientImage } from './ResilientImage';

interface ProductCardProps {
  product: Product;
  onSelectProduct: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelectProduct,
}) => {
  const { addToCart, getItemQuantity, updateQuantity } = useCart();
  const quantityInCart = getItemQuantity(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, 1);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateQuantity(product.id, quantityInCart + 1);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateQuantity(product.id, quantityInCart - 1);
  };

  return (
    <article
      onClick={() => onSelectProduct(product)}
      className="group bg-white rounded-xl border border-[#E6DEC8] hover:border-[#C5B198] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 flex flex-col min-w-0 overflow-hidden cursor-pointer"
    >
      {/* Product Image Slot (70% visual lead on warm neutral backdrop) */}
      <div className="relative aspect-[4/3] w-full bg-[#F5EFE6] overflow-hidden">
        <ResilientImage
          src={product.image}
          alt={product.name}
          fallbackLabel={product.name}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
        />
        {product.images && product.images.length > 1 && (
          <div className="absolute bottom-2.5 right-2.5 bg-black/65 backdrop-blur-xs text-white px-2 py-0.5 rounded typo-badge font-mono-num flex items-center gap-1">
            <Images className="w-3 h-3" />
            <span>{product.images.length}</span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4 min-w-0">
        <div className="space-y-1.5 min-w-0">
          {/* Unboxed Metadata (Zero-Pill Discipline) */}
          <div className="flex items-center gap-1.5 typo-caption text-[#7A6558] min-w-0">
            <span className="truncate">{product.category_name}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num shrink-0">
              {product.available_stock > 0
                ? `${product.available_stock} in stock`
                : 'Out of stock'}
            </span>
          </div>

          {/* Product Name (Card Heading H4: 19px / 600 / 1.35) */}
          <h4 className="typo-card-title text-[#1E1410] group-hover:text-[#8B3A2B] transition-colors line-clamp-2">
            {product.name}
          </h4>
        </div>

        {/* Price & Cart Controls */}
        <div className="pt-3 border-t border-[#F0E9DC] flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="font-mono-num typo-h4 text-[#1E1410]">
              {product.currency_icon}
              {product.selling_price}
            </span>
            {product.original_price !== null &&
              product.original_price > product.selling_price && (
                <del className="font-mono-num typo-caption text-[#8C776B]">
                  {product.currency_icon}
                  {product.original_price}
                </del>
              )}
          </div>

          {quantityInCart > 0 ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 bg-[#F4ECE1] border border-[#DECBB4] rounded-lg p-1 shrink-0"
            >
              <button
                type="button"
                onClick={handleDecrement}
                aria-label="Decrease quantity"
                className="w-7 h-7 rounded flex items-center justify-center text-[#1E1410] hover:bg-white transition-colors cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono-num typo-caption-medium font-semibold px-2 text-[#1E1410]">
                {quantityInCart}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                aria-label="Increase quantity"
                className="w-7 h-7 rounded flex items-center justify-center text-[#1E1410] hover:bg-white transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={product.available_stock <= 0}
              className="typo-btn inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1E1410] hover:bg-[#8B3A2B] disabled:bg-[#D5C9B8] text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Add to Cart</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
