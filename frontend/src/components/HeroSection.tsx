import React from 'react';
import { ArrowRight, MapPin, MessageCircle } from 'lucide-react';
import { StoreInfo } from '../types/store';
import { ResilientImage } from './ResilientImage';

interface HeroSectionProps {
  store: StoreInfo;
  totalProducts: number;
  totalCategories: number;
  onBrowseCatalog: () => void;
  onBrowseCategories: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  store,
  totalProducts,
  totalCategories,
  onBrowseCatalog,
  onBrowseCategories,
}) => {
  const directWhatsappHref = `https://wa.me/+${store.whatsapp_region_code}${store.whatsapp_number}?text=${encodeURIComponent(
    `Hello ${store.name}, I would like to inquire about ordering customized chocolates and gifts.`
  )}`;

  return (
    <section className="relative border-b border-[#E6DEC8] bg-[#FAF7F2] overflow-hidden">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* Left Column: Editorial Store Identity & Primary Actions */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6 min-w-0">
            <div className="space-y-5">
              {/* Quiet unboxed text kicker (Zero-Pill Discipline) */}
              <div className="flex flex-wrap items-center gap-2 typo-badge tracking-wide text-[#7A5B4B]">
                <span>{store.full_header_name}</span>
                <span aria-hidden="true">·</span>
                <span>Handmade &amp; Customized Gifts</span>
                <span aria-hidden="true">·</span>
                <span>All India Delivery</span>
              </div>

              <h1
                className="typo-h1 text-[#1E1410]"
                style={{ textWrap: 'balance' }}
              >
                Personalized Chocolates, Kunafa Creations &amp; Keepsake Gifting
              </h1>

              <p className="typo-body text-[#5A463C] max-w-[62ch]">
                Discover {store.name}&apos;s complete catalog of customized photo chocolate bars,
                crispy pistachio Kunafa chocolates, bespoke chocolate wrappings, handmade resin
                rakhis, acrylic fridge magnets, and celebration hampers.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={onBrowseCatalog}
                  className="typo-btn inline-flex items-center gap-2.5 px-6 py-3.5 rounded-lg bg-[#8B3A2B] hover:bg-[#732E21] text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
                >
                  <span>Shop All {totalProducts} Products</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={onBrowseCategories}
                  className="typo-btn inline-flex items-center gap-2 px-5 py-3.5 rounded-lg bg-white hover:bg-[#F3ECE0] text-[#1E1410] border border-[#DDD0BC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Browse {totalCategories} Categories</span>
                </button>
              </div>
            </div>

            {/* Store Location & Direct WhatsApp Contact Bar */}
            <div className="pt-6 border-t border-[#E6DEC8] grid grid-cols-1 sm:grid-cols-2 gap-4 typo-caption text-[#655045]">
              <div className="flex items-start gap-2.5 min-w-0">
                <MapPin className="w-4 h-4 text-[#8B3A2B] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="typo-label font-semibold text-[#1E1410]">Store Location</p>
                  <p className="typo-caption mt-0.5">{store.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 min-w-0">
                <MessageCircle className="w-4 h-4 text-[#1E7E48] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="typo-label font-semibold text-[#1E1410]">WhatsApp Ordering</p>
                  <a
                    href={directWhatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-block font-mono-num typo-caption-medium text-[#1E7E48] hover:underline"
                  >
                    +{store.whatsapp_region_code} {store.whatsapp_number}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Original Store Cover Banner & Brand Showcase */}
          <div className="lg:col-span-6 flex flex-col min-w-0">
            <div className="relative flex-1 min-h-[280px] sm:min-h-[360px] lg:min-h-full rounded-2xl overflow-hidden border border-[#E2D5C1] bg-[#F4ECE1] shadow-sm">
              <ResilientImage
                src={store.banner_url}
                alt={`${store.name} Banner`}
                className="w-full h-full object-cover"
              />
              {/* Measured Contrast Scrim for Overlaid Store Identity */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex flex-col justify-end p-6 sm:p-8">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-white/80 bg-white shrink-0 shadow-md">
                    <ResilientImage
                      src={store.logo_url}
                      alt={store.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-white min-w-0">
                    <p className="typo-badge text-white/80">
                      Official WhatsApp Store Catalog
                    </p>
                    <h3 className="typo-h4 text-white truncate">
                      {store.full_header_name}
                    </h3>
                    <p className="typo-caption text-white/85 mt-0.5 font-mono-num">
                      {totalCategories} Categories · {totalProducts} Original Products Preserved
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
