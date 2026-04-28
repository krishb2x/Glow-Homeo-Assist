"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { fetchPatient, getToken, updatePatient, type PatientDetail } from "../../../../../lib/doctor-api";
import { Button } from "../../../../../components/ui/button";
import { DS_FIELD } from "../../../../../lib/ds-classes";
import { cn } from "../../../../../lib/cn";

type ProfileForm = {
  name: string;
  age: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  address: string;
  bloodGroup: string;
  allergies: string;
  ongoingConditions: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  patientNotes: string;
  initialChiefComplaint: string;
};

function emptyForm(p: PatientDetail): ProfileForm {
  return {
    name: p.name,
    age: p.age != null ? String(p.age) : "",
    dateOfBirth: p.dateOfBirth ?? "",
    gender: p.gender ?? "",
    phone: p.phone ?? "",
    address: p.address ?? "",
    bloodGroup: p.bloodGroup ?? "",
    allergies: p.allergies ?? "",
    ongoingConditions: p.ongoingConditions ?? "",
    emergencyContactName: p.emergencyContactName ?? "",
    emergencyContactPhone: p.emergencyContactPhone ?? "",
    patientNotes: p.patientNotes ?? "",
    initialChiefComplaint: p.initialChiefComplaint ?? ""
  };
}

export default function PatientProfilePage(): JSX.Element {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProfileForm>({
    name: "",
    age: "",
    dateOfBirth: "",
    gender: "",
    phone: "",
    address: "",
    bloodGroup: "",
    allergies: "",
    ongoingConditions: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    patientNotes: "",
    initialChiefComplaint: ""
  });

  const load = useCallback(async () => {
    if (!id || !getToken()) return;
    setErr(null);
    try {
      const p = await fetchPatient(id);
      setPatient(p);
      setForm(emptyForm(p));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (err && !patient) {
    return (
      <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-body-sm text-rose-900" role="alert">
        {err}
      </p>
    );
  }
  if (!patient) {
    return (
      <p className="flex items-center gap-2 text-body-sm text-hs-text-secondary" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
      </p>
    );
  }

  async function saveProfile(): Promise<void> {
    if (!getToken() || !patient) return;
    const ageNum = form.age.trim() === "" ? undefined : parseInt(form.age, 10);
    if (form.age.trim() !== "" && Number.isNaN(ageNum)) {
      setErr("Enter a valid age or leave blank.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const p = await updatePatient(id, {
        name: form.name.trim(),
        age: ageNum,
        dateOfBirth: form.dateOfBirth.trim() || null,
        gender: form.gender.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        bloodGroup: form.bloodGroup.trim() || undefined,
        allergies: form.allergies.trim() || undefined,
        ongoingConditions: form.ongoingConditions.trim() || undefined,
        emergencyContactName: form.emergencyContactName.trim() || undefined,
        emergencyContactPhone: form.emergencyContactPhone.trim() || undefined,
        patientNotes: form.patientNotes.trim() || undefined,
        initialChiefComplaint: form.initialChiefComplaint.trim() || undefined
      });
      setPatient(p);
      setForm(emptyForm(p));
      setEditing(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-heading-sm text-hs-ink">Profile &amp; details</h2>
          <p className="mt-1 text-body-sm text-hs-text-secondary">
            Demographics, clinical context, and chart notes for this patient.
          </p>
        </div>
        <Button
          variant={editing ? "primary" : "secondary"}
          size="sm"
          disabled={saving}
          onClick={() => (editing ? void saveProfile() : setEditing(true))}
        >
          {editing ? (saving ? "Saving…" : "Save changes") : "Edit"}
        </Button>
      </div>
      {err ? (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-body-sm text-rose-900" role="alert">
          {err}
        </p>
      ) : null}

      {editing ? (
        <div className="ds-app-card mt-5 space-y-4 p-5">
          <FormSection title="Demographics">
            <Field label="Name">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={DS_FIELD}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Date of birth">
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => {
                    const dob = e.target.value;
                    setForm((f) => {
                      const ageFromDob = dob
                        ? Math.floor((Date.now() - new Date(dob).getTime()) / 31_557_600_000)
                        : f.age ? parseInt(f.age, 10) : undefined;
                      return { ...f, dateOfBirth: dob, age: ageFromDob != null && !Number.isNaN(ageFromDob) ? String(ageFromDob) : f.age };
                    });
                  }}
                  className={DS_FIELD}
                />
              </Field>
              <Field label="Age">
                <input
                  value={form.age}
                  onChange={(e) => setForm((f) => ({ ...f, age: e.target.value.replace(/\D/g, "") }))}
                  className={DS_FIELD}
                  inputMode="numeric"
                  placeholder="Auto from DOB"
                />
              </Field>
              <Field label="Gender">
                <input
                  value={form.gender}
                  onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                  className={DS_FIELD}
                />
              </Field>
            </div>
            <Field label="Phone">
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className={DS_FIELD}
              />
            </Field>
            <Field label="Address">
              <textarea
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                rows={2}
                className={DS_FIELD}
              />
            </Field>
          </FormSection>

          <FormSection title="Clinical context">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Blood group">
                <input
                  value={form.bloodGroup}
                  placeholder="e.g. O+"
                  onChange={(e) => setForm((f) => ({ ...f, bloodGroup: e.target.value.toUpperCase() }))}
                  className={DS_FIELD}
                  maxLength={8}
                />
              </Field>
              <Field label="Emergency contact name">
                <input
                  value={form.emergencyContactName}
                  onChange={(e) => setForm((f) => ({ ...f, emergencyContactName: e.target.value }))}
                  className={DS_FIELD}
                />
              </Field>
            </div>
            <Field label="Emergency contact phone">
              <input
                value={form.emergencyContactPhone}
                onChange={(e) => setForm((f) => ({ ...f, emergencyContactPhone: e.target.value }))}
                className={DS_FIELD}
              />
            </Field>
            <Field label="Allergies / sensitivities">
              <textarea
                value={form.allergies}
                onChange={(e) => setForm((f) => ({ ...f, allergies: e.target.value }))}
                rows={2}
                className={DS_FIELD}
                placeholder="e.g. penicillin; sulfa; latex"
              />
            </Field>
            <Field label="Ongoing conditions / outside Rx">
              <textarea
                value={form.ongoingConditions}
                onChange={(e) => setForm((f) => ({ ...f, ongoingConditions: e.target.value }))}
                rows={2}
                className={DS_FIELD}
                placeholder="e.g. asthma — inhaler PRN; T2DM — metformin 500 mg BD"
              />
            </Field>
          </FormSection>

          <FormSection title="Notes">
            <Field label="Initial chief complaint">
              <textarea
                value={form.initialChiefComplaint}
                onChange={(e) => setForm((f) => ({ ...f, initialChiefComplaint: e.target.value }))}
                rows={2}
                className={DS_FIELD}
              />
            </Field>
            <Field label="Chart notes">
              <textarea
                value={form.patientNotes}
                onChange={(e) => setForm((f) => ({ ...f, patientNotes: e.target.value }))}
                rows={3}
                className={DS_FIELD}
              />
            </Field>
          </FormSection>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                void load();
              }}
              className="text-body-sm font-medium text-hs-text-secondary underline-offset-2 hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="ds-app-card mt-5 divide-y divide-hs-border/40">
          <ReadSection title="Demographics">
            <ReadRow label="Name" value={patient.name} />
            <ReadRow label="Age" value={patient.age != null ? `${patient.age} years` : "—"} />
            <ReadRow label="Gender" value={patient.gender?.trim() ? patient.gender : "—"} />
            <ReadRow label="Contact" value={patient.phone ?? "—"} />
            <ReadRow label="Address" value={patient.address?.trim() ? patient.address : "—"} multiline />
            <ReadRow label="Preferred language" value={patient.languagePreference ?? "—"} />
          </ReadSection>
          <ReadSection title="Clinical context">
            <ReadRow label="Blood group" value={patient.bloodGroup?.trim() ? patient.bloodGroup : "—"} />
            <ReadRow label="Allergies" value={patient.allergies?.trim() ? patient.allergies : "—"} multiline />
            <ReadRow
              label="Ongoing conditions"
              value={patient.ongoingConditions?.trim() ? patient.ongoingConditions : "—"}
              multiline
            />
            <ReadRow
              label="Emergency contact"
              value={
                [patient.emergencyContactName?.trim(), patient.emergencyContactPhone?.trim()]
                  .filter(Boolean)
                  .join(" · ") || "—"
              }
            />
          </ReadSection>
          <ReadSection title="Notes">
            <ReadRow label="Initial chief complaint" value={patient.initialChiefComplaint ?? "—"} multiline />
            <ReadRow label="Chart notes" value={patient.patientNotes?.trim() ? patient.patientNotes : "—"} multiline />
            <ReadRow
              label="Last visit"
              value={patient.lastVisitAt ? new Date(patient.lastVisitAt).toLocaleString() : "—"}
            />
          </ReadSection>
        </div>
      )}

      <p className="mt-4 text-body-sm text-hs-text-secondary">
        <Link className="font-medium text-hs-primary hover:underline" href={`/patients/${id}/timeline`}>
          Back to timeline
        </Link>
      </p>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section className="space-y-3">
      <h3 className="text-caption-sm font-semibold uppercase tracking-wide text-hs-text-tertiary">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <label className="block">
      <span className="block text-caption-sm font-medium text-hs-text-secondary">{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

function ReadSection({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section className="space-y-2 px-5 py-4">
      <h3 className="text-caption-sm font-semibold uppercase tracking-wide text-hs-text-tertiary">{title}</h3>
      <dl className="space-y-2 text-body-sm">{children}</dl>
    </section>
  );
}

function ReadRow({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }): JSX.Element {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-3">
      <dt className="text-hs-text-tertiary">{label}</dt>
      <dd className={cn("text-hs-ink", multiline && "whitespace-pre-wrap")}>{value}</dd>
    </div>
  );
}
