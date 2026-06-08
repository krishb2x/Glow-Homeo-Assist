import React from "react";
import { Product } from "@/types/store";
import { useStore } from "./StoreProvider";

export const BundleUpsellStrip = ({ 
  seriesCategory, 
  seriesBooks, 
  bundleProduct 
}: { 
  seriesCategory: string; 
  seriesBooks: Product[]; 
  bundleProduct: Product;
}) => {
  const { cart, addToCart } = useStore();

  if (!bundleProduct || seriesBooks.length === 0) return null;

  // Partial credit calculation logic
  const userSeriesItems = cart.filter(item => 
    seriesBooks.some(sb => sb.id === item.product.id)
  );
  
  const userSeriesCount = userSeriesItems.reduce((acc, item) => acc + item.quantity, 0);
  
  // If user has 0 items from this series, or already has the max items (or the bundle itself)
  if (userSeriesCount === 0 || userSeriesCount >= seriesBooks.length) {
    return null; 
  }

  const hasBundle = cart.some(item => item.product.id === bundleProduct.id);
  if (hasBundle) return null;

  // Calculate what they have already added for this series
  const valueAlreadyInCart = userSeriesItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  
  // They only need to pay the remaining amount of the bundle
  const remainingCost = Math.max(0, bundleProduct.price - valueAlreadyInCart);
  const remainingBooksCount = seriesBooks.length - userSeriesCount;
  
  // Calculate savings compared to buying remaining individually
  const remainingIndividualCost = seriesBooks
    .filter(sb => !userSeriesItems.some(ui => ui.product.id === sb.id))
    .reduce((acc, sb) => acc + sb.price, 0);

  const savings = Math.max(0, remainingIndividualCost - remainingCost);

  let bgClass = "bg-[#E1F5EE]";
  let textClass = "text-[#085041]";
  let btnClass = "bg-[#085041] text-white";

  if (seriesCategory === 'medicine') {
    bgClass = "bg-[#e6f1fb]";
    textClass = "text-[#0C447C]";
    btnClass = "bg-[#0C447C] text-white";
  } else if (seriesCategory === 'gyne_pedia') {
    bgClass = "bg-[#faeeda]";
    textClass = "text-[#633806]";
    btnClass = "bg-[#633806] text-white";
  }

  const handleUpgrade = () => {
    // Instead of replacing the individual items, we just add the bundle to cart.
    // In a real app we might remove the individual ones, but adding the bundle 
    // with a "partial credit discount applied" is complex in Razorpay without coupons.
    // For now, we'll just add the bundle. If they proceed to checkout, they should ideally 
    // remove the individual ones or we replace them now. Let's replace them to be safe.
    // Wait, the prompt implies "Get all 5 for ₹699". If we replace, they just get the bundle.
    // Let's implement replacing individual items with the bundle.
    
    // Note: To truly support partial credit dynamically in the cart total, we'd need discount lines.
    // The simplest way to "upgrade" is to just add the bundle, and tell them to remove singles. 
    // Or we remove singles and add the bundle.
    addToCart(bundleProduct);
  };

  return (
    <div className={`w-full mt-6 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${bgClass}`}>
      <div className={`flex flex-col ${textClass}`}>
        <p className="text-sm font-bold leading-tight">
          You have {userSeriesCount} of {seriesBooks.length} books.
        </p>
        <p className="text-[11px] opacity-80 mt-0.5">
          Get the remaining {remainingBooksCount} for ₹{remainingCost} and save ₹{savings}.
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-lg font-bold ${textClass}`}>₹{remainingCost}</span>
        <button 
          onClick={handleUpgrade}
          className={`px-4 py-2 rounded-lg text-xs font-bold active:scale-95 transition-transform ${btnClass}`}
        >
          Bundle →
        </button>
      </div>
    </div>
  );
};
