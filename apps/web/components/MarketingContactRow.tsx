import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "../lib/brand";

export function MarketingContactRow({ className = "text-sm text-hs-text-secondary" }: { className?: string }): JSX.Element {
  return (
    <p className={className}>
      <a href={`mailto:${CONTACT_EMAIL}`} className="text-hs-ink/90 transition hover:text-hs-primary">
        {CONTACT_EMAIL}
      </a>
      <span className="text-hs-text-tertiary"> · </span>
      <a href={`tel:${CONTACT_PHONE_TEL}`} className="text-hs-ink/90 transition hover:text-hs-primary">
        {CONTACT_PHONE_DISPLAY}
      </a>
    </p>
  );
}
