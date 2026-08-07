interface ShopprLogoProps {
  withWordmark?: boolean;
  size?: number;
  className?: string;
}

/**
 * Temporary brand mark: a geometric compass-star, built from four
 * kite shapes meeting at a point. Deliberately not nautical clip-art.
 */
export function ShopprLogo({
  withWordmark = true,
  size = 28,
  className = '',
}: ShopprLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        <path d="M16 2 L20 16 L16 30 L12 16 Z" fill="#14141A" />
        <path d="M2 16 L16 12 L30 16 L16 20 Z" fill="#3454D1" />
      </svg>
      {withWordmark && (
        <span className="font-display font-semibold text-lg tracking-tight text-ink">
          SHOPPR
        </span>
      )}
    </div>
  );
}
