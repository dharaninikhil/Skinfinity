// src/components/ProductCard.tsx
import { Heart } from 'lucide-react';
import type { Product } from '../lib/supabase';

export type ProductCardProps = {
  product: Product;
  qty?: number;
  onAdd?: (p: Product) => void;
  onRemove?: (p: Product) => void;
  onToggleWishlist?: (p: Product) => void;
  isWished?: boolean;
  showNewBadge?: boolean;
  className?: string;
};

export default function ProductCard({
  product,
  qty = 0,
  onAdd,
  onRemove,
  onToggleWishlist,
  isWished = false,
  showNewBadge = false,
  className = '',
}: ProductCardProps) {
  const outOfStock = product.stock_quantity === 0;
  const getImage = () => product.image_url ?? `/assets/new/${product.id}.jpg`;

  return (
    <div className={`group bg-white rounded-2xl overflow-hidden shadow transition-all transform hover:-translate-y-1 relative ${className}`}>
      {qty > 0 && (
        <div className="absolute top-3 left-3 z-20 bg-rose-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
          {qty}
        </div>
      )}

      <div className="absolute top-3 right-3 z-20 flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist?.(product);
          }}
          aria-pressed={isWished}
          aria-label={isWished ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`p-2 rounded-full transition-transform transform hover:scale-105 focus:outline-none ${isWished ? 'bg-white' : 'bg-white'}`}
          title={isWished ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart className={`w-5 h-5 ${isWished ? 'text-rose-600' : 'text-gray-400'}`} />
        </button>
      </div>

      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        <img src={getImage()} alt={product.name} className="w-full h-full object-cover" loading="lazy" />

        {showNewBadge && product.is_new && (
          <div className="absolute top-3 left-3 text-xs px-3 py-1 rounded-full bg-rose-500 text-white">New</div>
        )}

        {outOfStock && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="bg-white text-gray-900 px-4 py-2 rounded-full text-sm font-medium">Out of Stock</span>
          </div>
        )}
      </div>

      <div className="p-4 md:p-6">
        <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">{product.name}</h3>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.short_description}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-gray-900">
              {product.price != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(product.price)) : '—'}
            </span>
            {qty > 0 && <span className="text-sm text-gray-500">· {qty} in cart</span>}
          </div>

          <div className="flex items-center gap-2">
            {qty > 0 ? (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove?.(product);
                  }}
                  className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 hover:bg-gray-200 transition"
                >
                  −
                </button>

                <div className="px-3 py-1.5 rounded-full text-sm font-semibold bg-white border">{qty}</div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdd?.(product);
                  }}
                  disabled={outOfStock}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${outOfStock ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-rose-600 text-white hover:bg-rose-700'}`}
                >
                  +
                </button>
              </>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd?.(product);
                }}
                disabled={outOfStock}
                className={`px-2 text-sm font-medium transition ${outOfStock ? 'text-gray-400 cursor-not-allowed' : 'text-rose-600 hover:text-rose-700'}`}
              >
                {outOfStock ? 'Sold Out' : 'Add to Cart'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
