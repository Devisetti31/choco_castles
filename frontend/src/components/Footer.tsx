import React from 'react';
import { ExternalLink, MapPin, MessageCircle } from 'lucide-react';
import { ActiveView, Category, StoreInfo } from '../types/store';
import { ResilientImage } from './ResilientImage';

interface FooterProps {
  store: StoreInfo;
  categories: Category[];
  onNavigate: (view: ActiveView) => void;
  onSelectCategory: (categoryId: number) => void;
}

export const Footer: React.FC<FooterProps> = ({
  store,
  categories,
  onNavigate,
  onSelectCategory,
}) => {
  const whatsappHref = `https://wa.me/+${store.whatsapp_region_code}${store.whatsapp_number}`;

  return (
    <footer className="bg-[#1E1410] text-[#E6DEC8] border-t border-[#33221B] mt-16 typo-footer">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#33221B]">
          {/* Col 1: Business Identity */}
          <div className="md:col-span-5 space-y-4 min-w-0">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-full overflow-hidden border border-[#5A463C] bg-[#FAF7F2] shrink-0">
                <ResilientImage
                  src={store.logo_url}
                  alt={store.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <h4 className="typo-h4 text-white truncate">
                  {store.full_header_name}
                </h4>
                <p className="typo-caption text-[#B8A698]">
                  Customized Chocolates · Kunafa · Hampers · Personalized Keepsakes
                </p>
              </div>
            </div>

            <p className="typo-footer text-[#C9B8A6] max-w-md">
              Personalize your chocolate bars, Kunafa chocolates, chocolate wrappings,
              resin rakhis, acrylic fridge magnets, and gift hampers for birthdays,
              anniversaries, weddings, and special celebrations.
            </p>
          </div>

          {/* Col 2: Original Categories */}
          <div className="md:col-span-4 space-y-3 min-w-0">
            <h5 className="typo-badge uppercase tracking-wider text-[#E6B88A]">
              Product Categories ({categories.length})
            </h5>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 typo-footer text-[#D6C7B8]">
              {categories.map((cat) => (
                <li key={cat.id} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCategory(cat.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="typo-footer hover:text-white transition-colors text-left truncate max-w-full cursor-pointer"
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Store Location & WhatsApp Ordering Contact */}
          <div className="md:col-span-3 space-y-3 min-w-0">
            <h5 className="typo-badge uppercase tracking-wider text-[#E6B88A]">
              Store Contact &amp; Location
            </h5>
            <div className="space-y-3 typo-footer text-[#D6C7B8]">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#E6B88A] shrink-0 mt-1" />
                <span>{store.address}</span>
              </div>

              <div className="flex items-center gap-2.5">
                <MessageCircle className="w-4 h-4 text-[#4ADE80] shrink-0" />
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono-num typo-footer text-white hover:underline"
                >
                  +{store.whatsapp_region_code} {store.whatsapp_number}
                </a>
              </div>

              <div className="pt-2">
                <a
                  href={store.reference_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 typo-caption text-[#B8A698] hover:text-white transition-colors"
                >
                  <span>Reference WhatsApp Store</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 typo-footer text-[#A39081]">
          <p className="text-center sm:text-left">{store.copyright}</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => {
                onNavigate('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="typo-nav hover:text-white transition-colors cursor-pointer"
            >
              Home
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => {
                onNavigate('categories');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="typo-nav hover:text-white transition-colors cursor-pointer"
            >
              Categories
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => {
                onNavigate('catalog');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="typo-nav hover:text-white transition-colors cursor-pointer"
            >
              All Products
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
