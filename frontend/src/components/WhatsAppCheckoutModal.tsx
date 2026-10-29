import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  ShoppingBag,
  X,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { OrderConfirmationData, StoreInfo } from '../types/store';

interface WhatsAppCheckoutModalProps {
  store: StoreInfo;
}

export const WhatsAppCheckoutModal: React.FC<WhatsAppCheckoutModalProps> = ({
  store,
}) => {
  const {
    items,
    subtotal,
    isCheckoutOpen,
    setIsCheckoutOpen,
    clearCart,
  } = useCart();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [regionCode, setRegionCode] = useState(store.whatsapp_region_code || '91');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [orderConfirmation, setOrderConfirmation] =
    useState<OrderConfirmationData | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isCheckoutOpen) return null;

  const buildClientFallbackOrder = (): OrderConfirmationData => {
    const orderCode = `ORD-${store.id}-${Math.floor(1000 + Math.random() * 9000)}`;
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanRegion = regionCode.replace(/\D/g, '') || '91';

    const resolvedItems = items.map(({ product, quantity }) => ({
      product_id: product.id,
      product_name: product.name,
      product_url: product.original_url,
      currency_icon: product.currency_icon || '₹',
      unit_price: product.selling_price,
      quantity,
      total_price: product.selling_price * quantity,
    }));

    const lines = [
      'Customer Details:',
      '------------------------------',
      `Name: ${name.trim()}`,
      `Phone: +${cleanRegion} ${cleanPhone}`,
      `Address: ${address.trim()}`,
      '',
      `Order ID: ${orderCode}`,
      '------------------------------',
      'Product Details:',
      '------------------------------',
    ];

    resolvedItems.forEach((it, idx) => {
      lines.push(
        `${idx + 1}.`,
        `Product Name: ${it.product_name}`,
        `Product URL : ${it.product_url}`,
        `Price : ${it.currency_icon} ${it.unit_price}`,
        `Quantity : ${it.quantity}`,
        `Total Price : ${it.currency_icon} ${it.total_price}`,
        '------------------------------'
      );
    });

    lines.push('', `Grand Total: ₹ ${subtotal}`);
    const whatsapp_message = lines.join('\n');
    const storeWp = `+${store.whatsapp_region_code}${store.whatsapp_number}`;
    const whatsapp_url = `https://wa.me/${storeWp}?text=${encodeURIComponent(
      whatsapp_message
    )}`;

    return {
      order_id: orderCode,
      name: name.trim(),
      phone: cleanPhone,
      region_code: cleanRegion,
      address: address.trim(),
      grand_total: subtotal,
      products: resolvedItems,
      whatsapp_message,
      whatsapp_url,
      store_whatsapp_number: `+${store.whatsapp_region_code} ${store.whatsapp_number}`,
      created_at: new Date().toISOString(),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanPhone = phone.replace(/\D/g, '');
    if (!name.trim()) {
      setErrorMsg('Please enter your name.');
      return;
    }
    if (cleanPhone.length < 7) {
      setErrorMsg('Please enter a valid WhatsApp phone number.');
      return;
    }
    if (!address.trim()) {
      setErrorMsg('Please enter your delivery address.');
      return;
    }
    if (items.length === 0) {
      setErrorMsg('Your cart is empty.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: cleanPhone,
          region_code: regionCode.replace(/\D/g, '') || '91',
          address: address.trim(),
          items: items.map((i) => ({
            product_id: i.product.id,
            quantity: i.quantity,
          })),
        }),
      });

      if (response.ok) {
        const json = await response.json();
        if (json && json.data) {
          setOrderConfirmation(json.data);
          clearCart();
          setSubmitting(false);
          return;
        }
      }
      // Fallback if API route unreachable
      const fallback = buildClientFallbackOrder();
      setOrderConfirmation(fallback);
      clearCart();
    } catch {
      const fallback = buildClientFallbackOrder();
      setOrderConfirmation(fallback);
      clearCart();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyMessage = async () => {
    if (!orderConfirmation) return;
    try {
      await navigator.clipboard.writeText(orderConfirmation.whatsapp_message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignore clipboard errors
    }
  };

  const handleClose = () => {
    setOrderConfirmation(null);
    setErrorMsg(null);
    setIsCheckoutOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className="fixed inset-0 bg-black/55 backdrop-blur-xs"
      />

      <div className="relative w-full max-w-lg rounded-2xl bg-white border border-[#E6DEC8] shadow-2xl overflow-hidden z-10 my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#FAF7F2] border-b border-[#E6DEC8] flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="typo-h4 text-[#1E1410]">
              {orderConfirmation ? `Order ${orderConfirmation.order_id} Ready` : 'Order Details'}
            </h3>
            <p className="typo-caption text-[#6E5A4F]">
              {store.name} · WhatsApp Storefront (+{store.whatsapp_region_code}{' '}
              {store.whatsapp_number})
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-[#5A463C] hover:bg-[#EFE7DA] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {orderConfirmation ? (
          /* Post-Order Confirmation & WhatsApp Launch View */
          <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            <div className="p-4 rounded-xl bg-[#F2F9F5] border border-[#B8DEC8] text-[#174E2E] typo-body-secondary space-y-1">
              <p className="font-semibold">
                Order #{orderConfirmation.order_id} Prepared for WhatsApp
              </p>
              <p className="typo-caption text-[#286641]">
                Click the button below to send your prefilled order directly to{' '}
                {store.name} on WhatsApp ({orderConfirmation.store_whatsapp_number}).
              </p>
            </div>

            {/* Primary Action: Open WhatsApp Link */}
            <a
              href={orderConfirmation.whatsapp_url}
              target="_blank"
              rel="noopener noreferrer"
              className="typo-btn w-full py-3.5 px-5 rounded-xl bg-[#1E7E48] hover:bg-[#176639] text-white flex items-center justify-center gap-2.5 shadow-sm transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Send Order on WhatsApp ({orderConfirmation.store_whatsapp_number})</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Prefilled Order Message Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="typo-label font-semibold text-[#4A382E]">
                  Prefilled WhatsApp Order Message
                </span>
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="inline-flex items-center gap-1.5 typo-caption-medium text-[#8B3A2B] hover:underline cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#1E7E48]" />
                      <span className="text-[#1E7E48]">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Message</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E6DEC8] typo-caption font-mono-num text-[#3D2B22] whitespace-pre-wrap max-h-56 overflow-y-auto">
                {orderConfirmation.whatsapp_message}
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="typo-btn px-5 py-2.5 rounded-lg bg-[#1E1410] hover:bg-[#33221B] text-white transition-colors cursor-pointer"
              >
                Done &amp; Return to Store
              </button>
            </div>
          </div>
        ) : (
          /* Original Store Order Details Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] typo-caption-medium text-[#991B1B]">
                {errorMsg}
              </div>
            )}

            {/* Order Items Summary Pill-Free Box */}
            <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E6DEC8] space-y-2">
              <div className="flex items-center justify-between typo-label font-semibold text-[#1E1410]">
                <span className="flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-[#8B3A2B]" />
                  <span>Order Summary ({items.length} products)</span>
                </span>
                <span className="font-mono-num typo-btn">Grand Total: ₹{subtotal}</span>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1 pt-1 border-t border-[#E6DEC8]/70">
                {items.map(({ product, quantity }) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between typo-caption text-[#5A463C]"
                  >
                    <span className="truncate pr-2">
                      {product.name} × {quantity}
                    </span>
                    <span className="font-mono-num shrink-0">
                      {product.currency_icon}
                      {product.selling_price * quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Name Field */}
            <div>
              <label
                htmlFor="order-customer-name"
                className="block typo-label font-semibold text-[#1E1410] mb-1.5"
              >
                Name: <span className="text-[#B91C1C]">*</span>
              </label>
              <input
                id="order-customer-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#D8C8B4] text-[#1E1410] placeholder-[#9A8579] focus:outline-none focus:border-[#8B3A2B]"
              />
            </div>

            {/* WhatsApp Number Field with Region Code */}
            <div>
              <label
                htmlFor="order-customer-phone"
                className="block typo-label font-semibold text-[#1E1410] mb-1.5"
              >
                Whatsapp No: <span className="text-[#B91C1C]">*</span>
              </label>
              <div className="flex gap-2">
                <div className="w-20 shrink-0">
                  <input
                    type="text"
                    value={`+${regionCode}`}
                    onChange={(e) =>
                      setRegionCode(e.target.value.replace(/\D/g, '') || '91')
                    }
                    aria-label="Country code"
                    className="w-full px-3 py-2.5 rounded-lg bg-[#FAF7F2] border border-[#D8C8B4] font-mono-num text-[#1E1410] text-center focus:outline-none"
                  />
                </div>
                <input
                  id="order-customer-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="Whatsapp No"
                  className="flex-1 px-3.5 py-2.5 rounded-lg bg-white border border-[#D8C8B4] font-mono-num text-[#1E1410] placeholder-[#9A8579] focus:outline-none focus:border-[#8B3A2B]"
                />
              </div>
            </div>

            {/* Address Field */}
            <div>
              <label
                htmlFor="order-customer-address"
                className="block typo-label font-semibold text-[#1E1410] mb-1.5"
              >
                Address: <span className="text-[#B91C1C]">*</span>
              </label>
              <textarea
                id="order-customer-address"
                rows={3}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Address"
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#D8C8B4] text-[#1E1410] placeholder-[#9A8579] focus:outline-none focus:border-[#8B3A2B]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="typo-btn w-full py-3.5 px-5 rounded-lg bg-[#8B3A2B] hover:bg-[#732E21] disabled:opacity-60 text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{submitting ? 'Preparing WhatsApp Order...' : 'Order Now'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
