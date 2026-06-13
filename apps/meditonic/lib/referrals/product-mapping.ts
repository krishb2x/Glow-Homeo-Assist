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
