import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Category } from '../types/store';
import { ResilientImage } from './ResilientImage';

interface CategorySectionProps {
  categories: Category[];
  selectedCategoryId: number | null;
  onSelectCategory: (categoryId: number) => void;
  compact?: boolean;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  compact = false,
}) => {
  return (
    <section className={compact ? 'py-8' : 'py-12 sm:py-16 border-b border-[#E6DEC8]'}>
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div className="min-w-0">
            <p className="typo-badge text-[#7A5B4B] mb-1">
              Original Store Taxonomy · {categories.length} Collections
            </p>
            <h2 className="typo-h2 text-[#1E1410]">
              Choose your Category
            </h2>
          </div>
          <p className="typo-body-secondary text-[#655045] max-w-md">
            Browse all {categories.length} original product categories from The Creative Castles
            &amp; Choco Delights.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {categories.map((category) => {
            const isSelected = selectedCategoryId === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onSelectCategory(category.id)}
                className={`group text-left rounded-xl bg-white border transition-all duration-200 overflow-hidden flex flex-col min-w-0 cursor-pointer ${
                  isSelected
                    ? 'border-[#8B3A2B] ring-2 ring-[#8B3A2B]/20 shadow-sm'
                    : 'border-[#E6DEC8] hover:border-[#C5B198] hover:-translate-y-0.5 hover:shadow-md'
                }`}
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-[#F4ECE1] relative">
                  <ResilientImage
                    src={category.image}
                    alt={category.name}
                    fallbackLabel={category.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4 flex items-start justify-between gap-2 flex-1 bg-white min-w-0">
                  <div className="min-w-0">
                    <h4 className="typo-h4 text-[#1E1410] group-hover:text-[#8B3A2B] transition-colors">
                      {category.name}
                    </h4>
                    <p className="typo-caption text-[#7A6558] mt-1 font-mono-num">
                      {category.product_count ?? 0}{' '}
                      {category.product_count === 1 ? 'Product' : 'Products'} · ID #{category.id}
                    </p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#8B7568] group-hover:text-[#8B3A2B] shrink-0 mt-0.5 transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
