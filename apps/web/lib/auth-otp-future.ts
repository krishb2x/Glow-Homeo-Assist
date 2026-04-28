/**
 * Future-ready (not default): sign-in with email OTP / magic link for doctors and mobile.
 *
 * Example when enabled behind a product flag:
 *   const { error } = await getSupabaseBrowser().auth.signInWithOtp({
 *     email,
 *     options: { shouldCreateUser: false, emailRedirectTo: getPublicSiteUrl() + "/auth/callback" }
 *   });
 *
 * Keep password login as the primary path; use OTP as a secondary option only.
 */
export const AUTH_OTP_DOCS = "otp-placeholder";
