"use client";

import { useCallback, useId, useState } from "react";
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "../lib/brand";

const inputClass =
  "w-full min-h-[44px] rounded-md border border-stone-100 bg-white px-3 py-2.5 text-sm text-hs-ink " +
  "placeholder:text-hs-text-tertiary shadow-none transition-[border-color,box-shadow] " +
  "focus:border-hs-primary/40 focus:outline-none focus:ring-2 focus:ring-hs-primary/15";

const labelClass = "text-sm font-medium text-hs-ink";

export type LeadFormProps = {
  /** Prefix for field ids (two forms on one page) */
  idPrefix?: string;
  className?: string;
  /** Contact line under the form (keep false when contact lives in site footer only) */
  showContactLine?: boolean;
  /** e.g. close modal after user acknowledges success */
  onCloseAfterSuccess?: () => void;
};

type FieldError = {
  name?: string;
  phone?: string;
  email?: string;
  clinicName?: string;
  city?: string;
  message?: string;
  _form?: string;
};

function validatePhone(phone: string): boolean {
  const d = phone.replace(/\D/g, "");
  return d.length >= 10 && d.length <= 15;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function LeadForm({
  idPrefix = "lead",
  className = "",
  showContactLine = false,
  onCloseAfterSuccess
}: LeadFormProps): JSX.Element {
  const uid = useId();
  const p = (name: string) => `${idPrefix}-${name}-${uid}`;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [city, setCity] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldError>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const runClientValidation = useCallback((): boolean => {
    const next: FieldError = {};
    if (!name.trim()) next.name = "Required";
    if (!phone.trim()) next.phone = "Required";
    else if (!validatePhone(phone)) next.phone = "Enter a valid number (at least 10 digits)";
    if (!email.trim()) next.email = "Required";
    else if (!validateEmail(email.trim())) next.email = "Enter a valid email";
    if (!clinicName.trim()) next.clinicName = "Required";
    if (!city.trim()) next.city = "Required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [name, phone, email, clinicName, city]);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (submitting || done) return;
    if (!runClientValidation()) return;
    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/marketing-lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          clinicName: clinicName.trim(),
          city: city.trim(),
          message: message.trim() || undefined
        })
      });
      const j = (await res.json().catch(() => null)) as
        | { success?: boolean; data?: { id?: string }; error?: string }
        | null;
      if (!res.ok || !j || j.success !== true) {
        const fromApi = (j as { error?: string } | null)?.error;
        const errMsg =
          res.status === 429
            ? (fromApi ?? "Too many requests. Please wait a few minutes and try again.")
            : (fromApi ?? "Something went wrong. Please try again.");
        setErrors({ _form: errMsg });
        return;
      }
      setDone(true);
    } catch {
      setErrors({ _form: "Network error. Check your connection and try again." });
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div
        className={`rounded-2xl border border-stone-100 bg-hs-primary-very-light/50 px-6 py-8 text-center ${className}`}
        role="status"
      >
        <p className="font-heading text-lg font-medium text-hs-ink">We will contact you shortly</p>
        <p className="mt-2 text-sm text-hs-text-secondary">Our team will reach out at the email or phone you provided.</p>
        {showContactLine ? (
          <p className="mt-6 text-sm text-hs-text-secondary">
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-hs-primary hover:underline">
              {CONTACT_EMAIL}
            </a>{" "}
            · {CONTACT_PHONE_DISPLAY}
          </p>
        ) : null}
        {onCloseAfterSuccess ? (
          <button
            type="button"
            onClick={onCloseAfterSuccess}
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-stone-100 bg-white px-4 text-sm font-medium text-hs-ink transition hover:bg-stone-50"
          >
            Close
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={className} noValidate>
      {errors._form ? (
        <p className="mb-4 rounded-md border border-rose-200/80 bg-rose-50/90 px-3 py-2 text-sm text-rose-900" role="alert">
          {errors._form}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5 sm:col-span-2">
          <label className={labelClass} htmlFor={p("name")}>
            Name <span className="text-rose-600">*</span>
          </label>
          <input
            id={p("name")}
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            disabled={submitting}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${p("name")}-err` : undefined}
          />
          {errors.name ? (
            <p id={`${p("name")}-err`} className="text-xs text-rose-700">
              {errors.name}
            </p>
          ) : null}
        </div>
        <div className="grid gap-1.5">
          <label className={labelClass} htmlFor={p("phone")}>
            Phone <span className="text-rose-600">*</span>
          </label>
          <input
            id={p("phone")}
            name="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
            disabled={submitting}
            placeholder="+91 …"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? `${p("phone")}-err` : undefined}
          />
          {errors.phone ? (
            <p id={`${p("phone")}-err`} className="text-xs text-rose-700">
              {errors.phone}
            </p>
          ) : null}
        </div>
        <div className="grid gap-1.5">
          <label className={labelClass} htmlFor={p("email")}>
            Email <span className="text-rose-600">*</span>
          </label>
          <input
            id={p("email")}
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            disabled={submitting}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? `${p("email")}-err` : undefined}
          />
          {errors.email ? (
            <p id={`${p("email")}-err`} className="text-xs text-rose-700">
              {errors.email}
            </p>
          ) : null}
        </div>
        <div className="grid gap-1.5">
          <label className={labelClass} htmlFor={p("clinic")}>
            Clinic name <span className="text-rose-600">*</span>
          </label>
          <input
            id={p("clinic")}
            name="clinicName"
            type="text"
            value={clinicName}
            onChange={(e) => setClinicName(e.target.value)}
            className={inputClass}
            disabled={submitting}
            aria-invalid={Boolean(errors.clinicName)}
            aria-describedby={errors.clinicName ? `${p("clinic")}-err` : undefined}
          />
          {errors.clinicName ? (
            <p id={`${p("clinic")}-err`} className="text-xs text-rose-700">
              {errors.clinicName}
            </p>
          ) : null}
        </div>
        <div className="grid gap-1.5">
          <label className={labelClass} htmlFor={p("city")}>
            City <span className="text-rose-600">*</span>
          </label>
          <input
            id={p("city")}
            name="city"
            type="text"
            autoComplete="address-level2"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={inputClass}
            disabled={submitting}
            aria-invalid={Boolean(errors.city)}
            aria-describedby={errors.city ? `${p("city")}-err` : undefined}
          />
          {errors.city ? (
            <p id={`${p("city")}-err`} className="text-xs text-rose-700">
              {errors.city}
            </p>
          ) : null}
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <label className={labelClass} htmlFor={p("message")}>
            Message <span className="text-hs-text-tertiary">(optional)</span>
          </label>
          <textarea
            id={p("message")}
            name="message"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={`${inputClass} min-h-[96px] resize-y`}
            disabled={submitting}
          />
        </div>
      </div>
      {showContactLine ? (
        <p className="mt-4 text-center text-xs text-hs-text-tertiary sm:text-left">
          Or reach us:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-hs-primary hover:underline">
            {CONTACT_EMAIL}
          </a>{" "}
          ·{" "}
          <a href={`tel:${CONTACT_PHONE_TEL}`} className="font-medium text-hs-primary hover:underline">
            {CONTACT_PHONE_DISPLAY}
          </a>
        </p>
      ) : null}
      <div className="mt-6">
        <span className="marketing-btn-glow-wrap marketing-btn-glow-wrap--full">
          <button
            type="submit"
            disabled={submitting}
            className="marketing-btn-glow-inner disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Submit request"}
          </button>
        </span>
      </div>
    </form>
  );
}
