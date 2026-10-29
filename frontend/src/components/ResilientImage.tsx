import React, { useEffect, useState } from 'react';
import { Gift, ImageOff } from 'lucide-react';

interface ResilientImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  alt?: string;
  fallbackLabel?: string;
  className?: string;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt = 'Store product',
  fallbackLabel,
  className = '',
  loading = 'lazy',
  ...rest
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [src]);

  const cleanSrc = typeof src === 'string' ? src.trim() : '';

  if (!cleanSrc || hasError) {
    const displayLabel = fallbackLabel || alt || 'Choco Delight';
    return (
      <div
        className={`flex flex-col items-center justify-center p-3 text-center bg-[#F4ECE1] text-[#7A6558] select-none ${className}`}
        aria-label={alt}
      >
        <div className="w-9 h-9 rounded-full bg-[#E8DDD0] flex items-center justify-center mb-1 text-[#8B3A2B] shrink-0">
          <Gift className="w-5 h-5" />
        </div>
        <span className="text-[11px] font-medium tracking-tight text-[#6E5A4F] line-clamp-1 max-w-[90%]">
          {displayLabel}
        </span>
      </div>
    );
  }

  return (
    <img
      src={cleanSrc}
      alt={alt}
      loading={loading}
      onLoad={() => setIsLoaded(true)}
      onError={() => setHasError(true)}
      className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-90'
        } transition-opacity duration-200`}
      {...rest}
    />
  );
};