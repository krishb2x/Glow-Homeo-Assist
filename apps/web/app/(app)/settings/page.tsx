"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookHeart,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Loader2,
  MessageCircle,
  Monitor,
  Save,
  Trash2,
  User
} from "lucide-react";
import { PageHeader } from "../../../components/platform/PageHeader";
import {
  fetchWorkspaceContext,
  getToken,
  patchClinicDetails,
  patchDoctorProfile,
  patchPrescriptionBranding,
  presignStorageUpload,
  type WorkspaceContext
} from "../../../lib/doctor-api";
import { ThemeSettingsSection } from "../../../components/clinic/settings/ThemeSettingsSection";
import { WhatsAppBusinessSection } from "../../../components/clinic/settings/WhatsAppBusinessSection";
import { DS_BTN_PRIMARY, DS_FIELD } from "../../../lib/ds-classes";
import { cn } from "../../../lib/cn";

// ─── Helpers ────────────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon: Icon,
  children,
  defaultOpen = true
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="ds-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-hs-cream/40"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-hs-primary-very-light text-hs-primary">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <span className="font-heading text-body-md font-semibold text-hs-ink">{title}</span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-hs-text-tertiary" aria-hidden />
        ) : (
          <ChevronDown className="h-4 w-4 text-hs-text-tertiary" aria-hidden />
        )}
      </button>
      {open ? <div className="border-t border-hs-border/20 px-5 pb-5 pt-4">{children}</div> : null}
    </div>
  );
}

function SaveStatus({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  if (state === "idle") return null;
  if (state === "saving") return <span className="flex items-center gap-1.5 text-caption-sm text-hs-text-tertiary"><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</span>;
  if (state === "saved") return <span className="flex items-center gap-1.5 text-caption-sm text-emerald-700"><Check className="h-3.5 w-3.5" />Saved</span>;
  return <span className="text-caption-sm text-red-600">Failed — try again</span>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-caption-sm font-medium text-hs-text-tertiary">{children}</label>;
}

// ─── Doctor Profile Section ──────────────────────────────────────────────────

function DoctorProfileSection({ ctx, onRefresh }: { ctx: WorkspaceContext; onRefresh: () => void }) {
  const [fullName, setFullName] = useState(ctx.fullName ?? "");
  const [qualification, setQualification] = useState(ctx.qualification ?? "");
  const [regNumber, setRegNumber] = useState(ctx.registrationNumber ?? "");
  const [specialty, setSpecialty] = useState(ctx.specialty ?? "");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    setFullName(ctx.fullName ?? "");
    setQualification(ctx.qualification ?? "");
    setRegNumber(ctx.registrationNumber ?? "");
    setSpecialty(ctx.specialty ?? "");
  }, [ctx]);

  const save = async () => {
    setSaveState("saving");
    try {
      await patchDoctorProfile({
        fullName: fullName.trim(),
        qualification: qualification.trim() || null,
        registrationNumber: regNumber.trim() || null,
        specialty: specialty.trim() || null
      });
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 3000);
      onRefresh();
    } catch {
      setSaveState("error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel>Full name</FieldLabel>
          <input className={DS_FIELD} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr. Firstname Lastname" />
        </div>
        <div>
          <FieldLabel>Specialty / Degree</FieldLabel>
          <input className={DS_FIELD} value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="e.g. MD (Homeopathy), BHMS" />
        </div>
        <div>
          <FieldLabel>Qualification</FieldLabel>
          <input className={DS_FIELD} value={qualification} onChange={(e) => setQualification(e.target.value)} placeholder="e.g. BHMS, MD (Hom)" />
        </div>
        <div>
          <FieldLabel>Registration number</FieldLabel>
          <input className={DS_FIELD} value={regNumber} onChange={(e) => setRegNumber(e.target.value)} placeholder="e.g. MH/12345/2010" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saveState === "saving"}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-hs-primary px-5 text-body-sm font-semibold text-white shadow-sm transition hover:bg-hs-primary-light disabled:opacity-60"
        >
          <Save className="h-4 w-4" aria-hidden />
          Save profile
        </button>
        <SaveStatus state={saveState} />
      </div>
    </div>
  );
}

// ─── Signature Section ───────────────────────────────────────────────────────

function SignatureSection({ ctx, onRefresh }: { ctx: WorkspaceContext; onRefresh: () => void }) {
  const [signatureUrl, setSignatureUrl] = useState<string | null>(ctx.signatureUrl ?? null);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSignatureUrl(ctx.signatureUrl ?? null);
  }, [ctx]);

  const uploadSignature = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploadState("uploading");
    try {
      const { uploadUrl, objectKey } = await presignStorageUpload({
        category: "document",
        filename: `signature_${Date.now()}.${file.name.split(".").pop() ?? "png"}`,
        contentType: file.type
      });
      if (uploadUrl) {
        await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      }
      await patchPrescriptionBranding({ signatureObjectKey: objectKey });
      const previewUrl = URL.createObjectURL(file);
      setSignatureUrl(previewUrl);
      setUploadState("done");
      setTimeout(() => setUploadState("idle"), 3000);
      onRefresh();
    } catch {
      setUploadState("error");
    }
  };

  const removeSignature = async () => {
    try {
      await patchPrescriptionBranding({ signatureObjectKey: null });
      setSignatureUrl(null);
      onRefresh();
    } catch {
      /* signature delete is best-effort; UI stays in current state on failure. */
    }
  };

  return (
    <div className="space-y-4">
      {signatureUrl ? (
        <div className="flex items-start gap-4">
          <div className="rounded-xl border border-hs-border/40 bg-hs-cream/50 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={signatureUrl} alt="Doctor signature" className="max-h-24 max-w-[200px] object-contain" />
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-hs-border/50 bg-hs-paper px-3 text-caption-sm font-medium text-hs-ink transition hover:border-hs-primary/30"
            >
              <ImagePlus className="h-4 w-4" aria-hidden />
              Replace
            </button>
            <button
              type="button"
              onClick={removeSignature}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-caption-sm font-medium text-red-700 transition hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploadState === "uploading"}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-hs-border/50 bg-hs-cream/40 py-8 text-hs-text-tertiary transition hover:border-hs-primary/40 hover:bg-hs-primary-very-light/30 disabled:opacity-60"
        >
          {uploadState === "uploading" ? (
            <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
          ) : (
            <ImagePlus className="h-7 w-7" aria-hidden />
          )}
          <span className="text-body-sm font-medium">
            {uploadState === "uploading" ? "Uploading…" : "Click to upload signature"}
          </span>
          <span className="text-caption-sm">PNG or JPG, max 2 MB</span>
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void uploadSignature(f);
          e.target.value = "";
        }}
      />
      {uploadState === "done" && (
        <p className="flex items-center gap-1.5 text-caption-sm text-emerald-700">
          <Check className="h-3.5 w-3.5" />Signature updated
        </p>
      )}
      {uploadState === "error" && (
        <p className="text-caption-sm text-red-600">Upload failed. Please try again.</p>
      )}
    </div>
  );
}

// ─── Clinic Details Section ──────────────────────────────────────────────────

function ClinicDetailsSection({ ctx, onRefresh }: { ctx: WorkspaceContext; onRefresh: () => void }) {
  const [name, setName] = useState(ctx.clinicName ?? "");
  const [location, setLocation] = useState(ctx.clinicLocation ?? "");
  const [address, setAddress] = useState(ctx.clinicAddress ?? "");
  const [phone, setPhone] = useState(ctx.clinicPhone ?? "");
  const [email, setEmail] = useState(ctx.clinicEmail ?? "");
  const [regNumber, setRegNumber] = useState(ctx.clinicRegistrationNumber ?? "");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    setName(ctx.clinicName ?? "");
    setLocation(ctx.clinicLocation ?? "");
    setAddress(ctx.clinicAddress ?? "");
    setPhone(ctx.clinicPhone ?? "");
    setEmail(ctx.clinicEmail ?? "");
    setRegNumber(ctx.clinicRegistrationNumber ?? "");
  }, [ctx]);

  const save = async () => {
    setSaveState("saving");
    try {
      await patchClinicDetails({
        name: name.trim() || undefined,
        location: location.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        registrationNumber: regNumber.trim() || null
      });
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 3000);
      onRefresh();
    } catch {
      setSaveState("error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FieldLabel>Clinic name</FieldLabel>
          <input className={DS_FIELD} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Harmony Homeopathy Clinic" />
        </div>
        <div>
          <FieldLabel>City / Location</FieldLabel>
          <input className={DS_FIELD} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Mumbai, Maharashtra" />
        </div>
        <div>
          <FieldLabel>Phone</FieldLabel>
          <input className={DS_FIELD} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel>Full address</FieldLabel>
          <textarea className={cn(DS_FIELD, "min-h-[4.5rem] resize-y")} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, Area, City, PIN" />
        </div>
        <div>
          <FieldLabel>Email</FieldLabel>
          <input className={DS_FIELD} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="clinic@example.com" />
        </div>
        <div>
          <FieldLabel>Clinic registration number</FieldLabel>
          <input className={DS_FIELD} value={regNumber} onChange={(e) => setRegNumber(e.target.value)} placeholder="e.g. REG/MH/2023/001" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saveState === "saving"}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-hs-primary px-5 text-body-sm font-semibold text-white shadow-sm transition hover:bg-hs-primary-light disabled:opacity-60"
        >
          <Save className="h-4 w-4" aria-hidden />
          Save clinic details
        </button>
        <SaveStatus state={saveState} />
      </div>
      <p className="text-caption-sm text-hs-text-tertiary">
        These details are injected into all prescriptions, PDFs, and print views automatically.
      </p>
    </div>
  );
}

// ─── Care Plan Library (single advice surface) ─────────────────────────────

function CarePlanLibrarySection(): JSX.Element {
  return (
    <div className="space-y-3">
      <p className="text-body-sm text-hs-text-secondary leading-relaxed">
        Structured diet, lifestyle, and recovery plans live in the Care Plan Library — reusable in every consultation and ready for the patient app.
      </p>
      <Link href="/care-plan-library" className={DS_BTN_PRIMARY}>
        Open Care Plan Library
      </Link>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage(): JSX.Element {
  const router = useRouter();
  const [ctx, setCtx] = useState<WorkspaceContext | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCtx = useCallback(async () => {
    try {
      const c = await fetchWorkspaceContext();
      setCtx(c);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !getToken()) {
      router.replace("/login");
      return;
    }
    void loadCtx();
  }, [router, loadCtx]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Settings" />
        <div className="flex items-center justify-center py-16 text-hs-text-tertiary">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Settings" />

      <SectionCard title="Appearance" icon={Monitor} defaultOpen={false}>
        <ThemeSettingsSection />
      </SectionCard>

      {/* Doctor profile */}
      <SectionCard title="Doctor profile" icon={User} defaultOpen>
        {ctx ? (
          <DoctorProfileSection ctx={ctx} onRefresh={loadCtx} />
        ) : (
          <p className="text-body-sm text-hs-text-tertiary">Could not load profile.</p>
        )}
      </SectionCard>

      {/* Signature */}
      <SectionCard title="Digital signature" icon={ImagePlus} defaultOpen={false}>
        {ctx ? (
          <SignatureSection ctx={ctx} onRefresh={loadCtx} />
        ) : (
          <p className="text-body-sm text-hs-text-tertiary">Could not load profile.</p>
        )}
      </SectionCard>

      {/* Clinic details */}
      <SectionCard title="Clinic details" icon={Building2} defaultOpen={false}>
        {ctx ? (
          <ClinicDetailsSection ctx={ctx} onRefresh={loadCtx} />
        ) : (
          <p className="text-body-sm text-hs-text-tertiary">Could not load clinic details.</p>
        )}
      </SectionCard>

      <SectionCard title="Patient care plans" icon={BookHeart} defaultOpen={false}>
        <CarePlanLibrarySection />
      </SectionCard>

      <SectionCard title="WhatsApp Business" icon={MessageCircle} defaultOpen={false}>
        <WhatsAppBusinessSection />
      </SectionCard>
    </div>
  );
}
