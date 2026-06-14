/**
 * Shared utility for checking referral code product type mapping and eligibility.
 * All checks for product scope applicability throughout the platform (checkout, validation, webhook)
 * must use this function to prevent duplicate mapping logic.
 */
export function isReferralApplicable(referralType: string, productType: string): boolean {
  if (!referralType || !productType) return false;

  const ref = referralType.toLowerCase().trim();
  const prod = productType.toLowerCase().trim();

  // 'all' applies to everything
  if (ref === "all") return true;

  // Exact singular matches
  if (ref === prod) return true;

  // Custom mapping for specific combinations and legacy plural support
  if (ref === "ebooks" || ref === "ebook") {
    return prod === "ebook" || prod === "bundle";
  }

  if (ref === "programs" || ref === "program") {
    return prod === "program" || prod === "course" || prod === "membership";
  }

  if (ref === "physical_book" || ref === "hard_copy") {
    return prod === "physical_book";
  }

  if (ref === "treatment_kit" || ref === "kit") {
    return prod === "treatment_kit" || prod === "kit";
  }

  return false;
}

/**
 * Centrally resolves and prioritizes the referral override configuration
 * for a specific product item.
 * Priority order:
 * 1. Exact product_id match
 * 2. Category-specific match (e.g. consultation, kit) excluding 'all'
 * 3. Generic 'all' match
 */
export function findReferralOverride(
  overrides: any[] | null | undefined,
  productId: string | null | undefined,
  productType: string | null | undefined
): any | null {
  if (!overrides || overrides.length === 0) return null;

  const targetProdId = productId ? String(productId).trim() : null;
  const targetType = productType ? String(productType).toLowerCase().trim() : null;

  // 1. Prioritize exact product_id match
  if (targetProdId) {
    const exactMatch = overrides.find(o => o.product_id === targetProdId);
    if (exactMatch) return exactMatch;
  }

  // 2. Next, category-specific match (excluding 'all')
  if (targetType) {
    const categoryMatch = overrides.find(o => 
      !o.product_id && 
      o.product_type && 
      o.product_type.toLowerCase().trim() !== "all" && 
      isReferralApplicable(o.product_type, targetType)
    );
    if (categoryMatch) return categoryMatch;
  }

  // 3. Fallback to generic 'all' match
  const allMatch = overrides.find(o => 
    !o.product_id && 
    o.product_type && 
    o.product_type.toLowerCase().trim() === "all"
  );
  if (allMatch) return allMatch;

  return null;
}

