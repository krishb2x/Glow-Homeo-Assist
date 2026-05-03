/** App origin for sign-in links (defaults to NEXT_PUBLIC_SITE_URL, then production). */
export function appOrigin(): string {
  const raw =
    (process.env.NEXT_PUBLIC_APP_ORIGIN ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.glowhomeo.com").trim();
  return raw.replace(/\/$/, "");
}

/** Public marketing / corporate site. Override with NEXT_PUBLIC_MARKETING_ORIGIN. */
export function marketingOrigin(): string {
  return (process.env.NEXT_PUBLIC_MARKETING_ORIGIN ?? "https://glowhomeo.com").replace(/\/$/, "");
}

export function loginUrl(): string {
  return `${appOrigin()}/login`;
}
