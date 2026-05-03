"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { BRAND_NAME } from "../../lib/brand";
import type { IntakeIntent } from "../../lib/public-intake";

const inputClass =
  "w-full min-h-[48px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm " +
  "placeholder:text-slate-400 transition focus:border-hs-primary/45 focus:outline-none focus:ring-2 focus:ring-hs-primary/15";

export type GlowHomeoIntakeFormProps = {
  intent: IntakeIntent;
  submitLabel: string;
};

export function GlowHomeoIntakeForm({ intent, submitLabel }: GlowHomeoIntakeFormProps): JSX.Element {
  const uid = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [practice, setPractice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (loading || done) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, name, email, phone, city, practice: practice.trim() || undefined })
      });
      const j = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      if (!res.ok || !j?.success) {
        setError(j?.error ?? "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div
        className="rounded-2xl border border-hs-primary/25 bg-hs-primary-very-light/50 px-6 py-12 text-center shadow-sm"
        role="status"
      >
        <p className="font-heading text-lg font-semibold text-slate-900">We will contact you shortly</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Our team has received your details and will reach out using the email or phone you provided.
        </p>
        <Link href="/" className="mt-8 inline-flex min-h-10 items-center text-sm font-semibold text-hs-primary hover:underline">
          Return to homepage
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5" noValidate>
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      <div>
        <label htmlFor={`in-name-${uid}`} className="mb-1.5 block text-sm font-medium text-slate-800">
          Full name <span className="text-red-600">*</span>
        </label>
        <input
          id={`in-name-${uid}`}
          name="name"
          autoComplete="name"
          required
          maxLength={200}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor={`in-email-${uid}`} className="mb-1.5 block text-sm font-medium text-slate-800">
          Email <span className="text-red-600">*</span>
        </label>
        <input
          id={`in-email-${uid}`}
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor={`in-phone-${uid}`} className="mb-1.5 block text-sm font-medium text-slate-800">
          Mobile number <span className="text-red-600">*</span>
        </label>
        <input
          id={`in-phone-${uid}`}
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputClass}
          inputMode="tel"
          placeholder="+91 …"
        />
      </div>
      <div>
        <label htmlFor={`in-city-${uid}`} className="mb-1.5 block text-sm font-medium text-slate-800">
          City <span className="text-red-600">*</span>
        </label>
        <input
          id={`in-city-${uid}`}
          name="city"
          autoComplete="address-level2"
          required
          maxLength={120}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor={`in-practice-${uid}`} className="mb-1.5 block text-sm font-medium text-slate-800">
          Practice or clinic name <span className="text-slate-400">(optional)</span>
        </label>
        <input
          id={`in-practice-${uid}`}
          name="practice"
          type="text"
          maxLength={200}
          value={practice}
          onChange={(e) => setPractice(e.target.value)}
          className={inputClass}
          placeholder="Helps us personalize your walkthrough"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full min-h-[52px] rounded-2xl bg-hs-primary text-sm font-semibold text-white shadow-lg shadow-hs-primary/25 transition hover:bg-hs-primary-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Submitting…" : submitLabel}
      </button>

      <p className="text-center text-[0.75rem] leading-relaxed text-slate-500">
        By submitting, you agree we may contact you about {BRAND_NAME}.{" "}
        <Link href="/privacy" className="font-medium text-hs-primary underline-offset-2 hover:underline">
          Privacy policy
        </Link>
      </p>
    </form>
  );
}
