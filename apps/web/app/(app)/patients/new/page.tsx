"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createPatient, getToken } from "../../../../lib/doctor-api";

export default function NewPatientPage(): JSX.Element {
  const router = useRouter();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [chartNotes, setChartNotes] = useState("");
  const [complaint, setComplaint] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    if (!name.trim()) {
      setErr("Name is required.");
      return;
    }
    setErr(null);
    setSaving(true);
    try {
      const ageNum = age.trim() === "" ? undefined : parseInt(age, 10);
      if (age.trim() !== "" && Number.isNaN(ageNum)) {
        setErr("Please enter a valid age or leave it empty.");
        setSaving(false);
        return;
      }
      await createPatient({
        name: name.trim(),
        phone: phone.trim() || undefined,
        age: ageNum,
        gender: gender.trim() || undefined,
        address: address.trim() || undefined,
        patientNotes: chartNotes.trim() || undefined,
        initialChiefComplaint: complaint.trim() || undefined
      });
      router.push("/patients");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not save patient");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gh-ink">New patient</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gh-muted">
          Quick capture for a walk-in or new caller — you can add detail after the first visit.
        </p>
      </div>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="max-w-xl space-y-5 rounded-2xl border border-stone-200/80 bg-gh-paper p-6 shadow-sm"
      >
        {err ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
            {err}
          </p>
        ) : null}
        <div>
          <label htmlFor="np-name" className="block text-sm font-medium text-gh-ink">
            Full name <span className="text-rose-600">*</span>
          </label>
          <input
            id="np-name"
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-gh-ink shadow-sm focus:border-gh-accent/50 focus:outline-none focus:ring-2 focus:ring-gh-accent/20"
            autoComplete="name"
            autoFocus
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="np-age" className="block text-sm font-medium text-gh-ink">
              Age
            </label>
            <input
              id="np-age"
              name="age"
              inputMode="numeric"
              value={age}
              onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))}
              className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-gh-ink shadow-sm focus:border-gh-accent/50 focus:outline-none focus:ring-2 focus:ring-gh-accent/20"
            />
          </div>
          <div>
            <label htmlFor="np-gender" className="block text-sm font-medium text-gh-ink">
              Gender
            </label>
            <input
              id="np-gender"
              name="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              placeholder="Optional"
              className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-gh-ink shadow-sm focus:border-gh-accent/50 focus:outline-none focus:ring-2 focus:ring-gh-accent/20"
            />
          </div>
        </div>
        <div>
          <label htmlFor="np-phone" className="block text-sm font-medium text-gh-ink">
            Contact
          </label>
          <input
            id="np-phone"
            name="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-gh-ink shadow-sm focus:border-gh-accent/50 focus:outline-none focus:ring-2 focus:ring-gh-accent/20"
            autoComplete="tel"
          />
        </div>
        <div>
          <label htmlFor="np-address" className="block text-sm font-medium text-gh-ink">
            Address
          </label>
          <textarea
            id="np-address"
            name="address"
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Optional"
            className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-gh-ink shadow-sm focus:border-gh-accent/50 focus:outline-none focus:ring-2 focus:ring-gh-accent/20"
          />
        </div>
        <div>
          <label htmlFor="np-notes" className="block text-sm font-medium text-gh-ink">
            Chart notes
          </label>
          <textarea
            id="np-notes"
            name="patientNotes"
            rows={2}
            value={chartNotes}
            onChange={(e) => setChartNotes(e.target.value)}
            placeholder="Optional — general notes"
            className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-gh-ink shadow-sm focus:border-gh-accent/50 focus:outline-none focus:ring-2 focus:ring-gh-accent/20"
          />
        </div>
        <div>
          <label htmlFor="np-complaint" className="block text-sm font-medium text-gh-ink">
            Chief complaint (initial)
          </label>
          <textarea
            id="np-complaint"
            name="initialChiefComplaint"
            rows={3}
            value={complaint}
            onChange={(e) => setComplaint(e.target.value)}
            placeholder="What brought them in today?"
            className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-gh-ink shadow-sm focus:border-gh-accent/50 focus:outline-none focus:ring-2 focus:ring-gh-accent/20"
          />
        </div>
        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-gh-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gh-leaf disabled:opacity-70"
          >
            {saving ? "Saving…" : "Save patient"}
          </button>
          <Link
            href="/patients"
            className="inline-flex items-center rounded-2xl border border-stone-200 bg-gh-cream px-5 py-2.5 text-sm font-medium text-gh-ink shadow-sm"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
