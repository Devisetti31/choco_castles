import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
} from 'lucide-react';
import { Product, StoreInfo } from '../types/store';
import { useCart } from '../context/CartContext';
import { ResilientImage } from './ResilientImage';
import { ProductCard } from './ProductCard';

interface ProductDetailViewProps {
  product: Product;
  relatedProducts: Product[];
  store: StoreInfo;
  onBack: () => void;
  onSelectCategory: (categoryId: number) => void;
  onSelectProduct: (product: Product) => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  relatedProducts,
  store,
  onBack,
  onSelectCategory,
  onSelectProduct,
}) => {
  const { addToCart, getItemQuantity, setIsCartOpen, setIsCheckoutOpen } = useCart();
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const gallery =
    product.images && product.images.length > 0 ? product.images : [product.image];

  useEffect(() => {
    setSelectedImageIdx(0);
    setQuantity(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [product.id]);

  const currentInCart = getItemQuantity(product.id);
  const maxStock = product.available_stock > 0 ? product.available_stock : 100;

  const handleAdd = () => {
    addToCart(product, quantity);
  };

  const handleOrderNow = () => {
    if (currentInCart === 0) {
      addToCart(product, quantity);
    }
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const directProductInquiryUrl = `https://wa.me/+${store.whatsapp_region_code}${store.whatsapp_number}?text=${encodeURIComponent(
    `Hello ${store.name},\nI am interested in ordering:\nProduct Name: ${product.name}\nCategory: ${product.category_name}\nPrice: ${product.currency_icon} ${product.selling_price}\nQuantity: ${quantity}\nProduct Link: ${product.original_url}`
  )}`;

  const descriptionParagraphs = product.description
    ? product.description.split('\n').filter((line) => line.trim() !== '')
    : [];

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Top Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-[#E6DEC8]">
        <div className="flex flex-wrap items-center gap-2 typo-nav text-[#655045] min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="typo-nav inline-flex items-center gap-1.5 text-[#1E1410] hover:text-[#8B3A2B] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Catalog</span>
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => onSelectCategory(product.category_id)}
            className="typo-nav hover:text-[#1E1410] hover:underline transition-colors cursor-pointer"
          >
            {product.category_name}
          </button>
          <span aria-hidden="true">·</span>
          <span className="typo-caption text-[#8C776B] truncate max-w-[220px] sm:max-w-xs">
            {product.name}
          </span>
        </div>

        <a
          href={product.original_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 typo-caption-medium text-[#7A5B4B] hover:text-[#1E1410] transition-colors"
        >
          <span>Original Store Listing</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Contiguous Purchase Module (Sticky Left Gallery + Sticky Right Details) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left: Product Image Gallery */}
        <div className="lg:col-span-6 lg:sticky lg:top-24 space-y-4 min-w-0">
          <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-white border border-[#E6DEC8] shadow-xs">
            <ResilientImage
              src={gallery[selectedImageIdx] || product.image}
              alt={`${product.name} - Image ${selectedImageIdx + 1}`}
              fallbackLabel={product.name}
              className="w-full h-full object-contain bg-[#F8F3EB]"
            />

            {gallery.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedImageIdx((prev) =>
                      prev === 0 ? gallery.length - 1 : prev - 1
                    )
                  }
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-[#1E1410] border border-[#DDD0BC] flex items-center justify-center shadow-sm transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedImageIdx((prev) =>
                      prev === gallery.length - 1 ? 0 : prev + 1
                    )
                  }
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-[#1E1410] border border-[#DDD0BC] flex items-center justify-center shadow-sm transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-3 right-3 bg-black/65 text-white px-2.5 py-1 rounded typo-badge font-mono-num">
                  {selectedImageIdx + 1} / {gallery.length}
                </div>
              </>
            )}
          </div>

          {/* Thumbnail Strip */}
          {gallery.length > 1 && (
            <div className="flex items-center gap-2.5 overflow-x-auto pb-2">
              {gallery.map((imgUrl, idx) => (
                <button
                  key={`${imgUrl}-${idx}`}
                  type="button"
                  onClick={() => setSelectedImageIdx(idx)}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                    selectedImageIdx === idx
                      ? 'border-[#8B3A2B] ring-2 ring-[#8B3A2B]/20'
                      : 'border-[#E6DEC8] opacity-75 hover:opacity-100'
                  }`}
                >
                  <ResilientImage
                    src={imgUrl}
                    alt={`${product.name} thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Contiguous Purchase & Description Module */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E6DEC8] p-6 sm:p-8 space-y-6 min-w-0">
          {/* Unboxed Metadata (Zero-Pill Discipline) */}
          <div className="flex flex-wrap items-center gap-2 typo-badge text-[#7A5B4B]">
            <button
              type="button"
              onClick={() => onSelectCategory(product.category_id)}
              className="typo-badge hover:underline cursor-pointer"
            >
              {product.category_name}
            </button>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num">Product ID #{product.id}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num text-[#2E6B47]">
              {product.available_stock} in stock
            </span>
          </div>

          {/* Exact Product Name */}
          <h1 className="typo-h2 text-[#1E1410]">
            {product.name}
          </h1>

          {/* Price Block */}
          <div className="flex items-baseline gap-3 pb-6 border-b border-[#EFE7DA]">
            <span className="font-mono-num typo-h2 text-[#1E1410]">
              {product.currency_icon}
              {product.selling_price}
            </span>
            {product.original_price !== null &&
              product.original_price > product.selling_price && (
                <>
                  <del className="font-mono-num typo-h4 text-[#8C776B]">
                    {product.currency_icon}
                    {product.original_price}
                  </del>
                  <span className="typo-badge font-mono-num text-[#8B3A2B]">
                    Save {product.currency_icon}
                    {product.original_price - product.selling_price}
                  </span>
                </>
              )}
          </div>

          {/* Quantity & Purchase Actions */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="typo-label text-[#4A382E]">Quantity</span>
                <div className="flex items-center border border-[#D8C8B4] rounded-lg bg-[#FAF7F2] p-1">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="w-8 h-8 rounded flex items-center justify-center text-[#1E1410] hover:bg-white transition-colors cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-mono-num typo-btn px-4 text-[#1E1410]">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(maxStock, q + 1))}
                    aria-label="Increase quantity"
                    className="w-8 h-8 rounded flex items-center justify-center text-[#1E1410] hover:bg-white transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {currentInCart > 0 && (
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className="typo-caption-medium font-mono-num text-[#8B3A2B] hover:underline cursor-pointer"
                >
                  Currently {currentInCart} in your bag · View Bag
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleAdd}
                disabled={product.available_stock <= 0}
                className="typo-btn flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg bg-[#1E1410] hover:bg-[#33221B] text-white transition-colors cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-[#E6B88A]" />
                <span>
                  Add to Cart · {product.currency_icon}
                  {product.selling_price * quantity}
                </span>
              </button>

              <button
                type="button"
                onClick={handleOrderNow}
                className="typo-btn flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg bg-[#8B3A2B] hover:bg-[#732E21] text-white transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Order Now on WhatsApp</span>
              </button>
            </div>

            <div className="pt-1 flex flex-wrap items-center justify-between gap-2 typo-caption text-[#6E5A4F]">
              <span>Direct inquiry for custom photo/name details:</span>
              <a
                href={directProductInquiryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="typo-caption-medium text-[#1E7E48] hover:underline inline-flex items-center gap-1"
              >
                <span>Chat on WhatsApp (+{store.whatsapp_region_code} {store.whatsapp_number})</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Preserved Original Product Description */}
          <div className="pt-6 border-t border-[#EFE7DA] space-y-3">
            <h5 className="typo-h5 text-[#1E1410]">
              Description
            </h5>
            {descriptionParagraphs.length > 0 && product.description.trim() !== '.' ? (
              <div className="space-y-2.5 typo-body text-[#4A382E]">
                {descriptionParagraphs.map((para, i) => (
                  <p key={i} className="whitespace-pre-line">
                    {para}
                  </p>
                ))}
              </div>
            ) : (
              <p className="typo-body-secondary text-[#6E5A4F]">
                Original product listing from {store.name} under {product.category_name}. Select your preferred design from the product images and share customization details via WhatsApp when ordering.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Related Products from Category */}
      {relatedProducts.length > 0 && (
        <div className="mt-16 pt-12 border-t border-[#E6DEC8]">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <p className="typo-badge text-[#7A5B4B] mb-1">
                More from {product.category_name}
              </p>
              <h2 className="typo-h2 text-[#1E1410]">
                Related Products
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onSelectCategory(product.category_id)}
              className="typo-btn text-[#8B3A2B] hover:underline cursor-pointer"
            >
              View all in {product.category_name}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.slice(0, 4).map((rel) => (
              <ProductCard
                key={rel.id}
                product={rel}
                onSelectProduct={onSelectProduct}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
