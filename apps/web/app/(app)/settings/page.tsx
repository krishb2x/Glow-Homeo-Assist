"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Edit2,
  ImagePlus,
  Loader2,
  Monitor,
  Plus,
  Salad,
  Save,
  Trash2,
  User,
  Utensils
} from "lucide-react";
import { PageHeader } from "../../../components/platform/PageHeader";
import {
  createAdviceTemplate,
  createTreatmentPlan,
  deleteAdviceTemplate,
  deleteTreatmentPlan,
  fetchAdviceTemplates,
  fetchTreatmentPlans,
  fetchWorkspaceContext,
  getToken,
  patchClinicDetails,
  patchDoctorProfile,
  patchPrescriptionBranding,
  presignStorageUpload,
  updateAdviceTemplate,
  updateTreatmentPlan,
  type AdviceTemplate,
  type TreatmentPlan,
  type WorkspaceContext
} from "../../../lib/doctor-api";
import { ThemeSettingsSection } from "../../../components/clinic/settings/ThemeSettingsSection";
import { DS_FIELD } from "../../../lib/ds-classes";
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
    <div className="rounded-2xl border border-hs-border/25 bg-hs-paper/95 shadow-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-6 py-5 text-left transition hover:bg-hs-cream/40"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-hs-primary-very-light text-hs-primary">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <span className="font-heading text-heading-sm font-semibold text-hs-ink">{title}</span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-hs-text-tertiary" aria-hidden />
        ) : (
          <ChevronDown className="h-4 w-4 text-hs-text-tertiary" aria-hidden />
        )}
      </button>
      {open ? <div className="border-t border-hs-border/20 px-6 pb-6 pt-5">{children}</div> : null}
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

function CategoryBadge({ cat }: { cat: AdviceTemplate["category"] }) {
  const map: Record<AdviceTemplate["category"], { label: string; cls: string }> = {
    diet: { label: "Diet", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    lifestyle: { label: "Lifestyle", cls: "bg-sky-50 text-sky-800 border-sky-200" },
    restriction: { label: "Restriction", cls: "bg-amber-50 text-amber-800 border-amber-200" }
  };
  const m = map[cat];
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-caption-sm font-medium", m.cls)}>
      {m.label}
    </span>
  );
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

// ─── Advice Template Editor ──────────────────────────────────────────────────

function AdviceTemplateForm({
  initial,
  onSave,
  onCancel
}: {
  initial?: AdviceTemplate;
  onSave: (t: Pick<AdviceTemplate, "title" | "category" | "content" | "isShared">) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState<AdviceTemplate["category"]>(initial?.category ?? "diet");
  const [content, setContent] = useState(initial?.content ?? "");
  const [isShared, setIsShared] = useState(initial?.isShared ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) { setError("Title and content are required."); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave({ title: title.trim(), category, content: content.trim(), isShared });
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel>Title</FieldLabel>
          <input className={DS_FIELD} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Low-sugar diet plan" autoFocus />
        </div>
        <div>
          <FieldLabel>Category</FieldLabel>
          <select className={DS_FIELD} value={category} onChange={(e) => setCategory(e.target.value as AdviceTemplate["category"])}>
            <option value="diet">Diet</option>
            <option value="lifestyle">Lifestyle</option>
            <option value="restriction">Restriction</option>
          </select>
        </div>
      </div>
      <div>
        <FieldLabel>Advice content</FieldLabel>
        <textarea
          className={cn(DS_FIELD, "min-h-[6rem] resize-y")}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write the advice text here. This will be applied directly to the consultation."
        />
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-body-sm text-hs-text-secondary">
        <input type="checkbox" checked={isShared} onChange={(e) => setIsShared(e.target.checked)} className="accent-hs-primary" />
        Share with all doctors in this clinic
      </label>
      {error ? <p className="text-caption-sm text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-hs-primary px-4 text-caption-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          {initial ? "Update" : "Create"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-9 items-center rounded-xl border border-hs-border/50 px-4 text-caption-sm font-medium text-hs-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function AdviceTemplatesSection() {
  const [templates, setTemplates] = useState<AdviceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | AdviceTemplate["category"]>("all");

  const load = useCallback(async () => {
    try {
      setTemplates(await fetchAdviceTemplates());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async (body: Pick<AdviceTemplate, "title" | "category" | "content" | "isShared">) => {
    await createAdviceTemplate(body);
    await load();
    setCreating(false);
  };

  const handleUpdate = async (id: string, body: Pick<AdviceTemplate, "title" | "category" | "content" | "isShared">) => {
    await updateAdviceTemplate(id, body);
    await load();
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    await deleteAdviceTemplate(id);
    setTemplates((t) => t.filter((x) => x.id !== id));
  };

  const visible = filter === "all" ? templates : templates.filter((t) => t.category === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "diet", "lifestyle", "restriction"] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            className={cn(
              "rounded-full border px-3 py-1 text-caption-sm font-medium transition",
              filter === cat
                ? "border-hs-primary bg-hs-primary-very-light text-hs-primary"
                : "border-hs-border/40 bg-hs-cream text-hs-text-secondary hover:border-hs-primary/30"
            )}
          >
            {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => { setCreating(true); setEditingId(null); }}
          className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-hs-primary px-4 text-caption-sm font-semibold text-white transition hover:bg-hs-primary-light"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New template
        </button>
      </div>

      {creating ? (
        <div className="rounded-xl border border-hs-primary/25 bg-hs-primary-very-light/40 p-4">
          <p className="mb-3 text-body-sm font-semibold text-hs-ink">New advice template</p>
          <AdviceTemplateForm
            onSave={handleCreate}
            onCancel={() => setCreating(false)}
          />
        </div>
      ) : null}

      {loading ? (
        <p className="text-body-sm text-hs-text-tertiary">Loading…</p>
      ) : visible.length === 0 && !creating ? (
        <div className="rounded-xl border border-dashed border-hs-border/50 bg-hs-cream/40 px-4 py-8 text-center">
          <p className="text-body-sm font-medium text-hs-ink">No templates yet</p>
          <p className="mt-1 text-caption-sm text-hs-text-secondary">Create reusable diet, lifestyle, or restriction advice.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((t) => (
            <li key={t.id} className="rounded-xl border border-hs-border/25 bg-hs-cream/30">
              {editingId === t.id ? (
                <div className="p-4">
                  <AdviceTemplateForm
                    initial={t}
                    onSave={(body) => handleUpdate(t.id, body)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-body-sm font-semibold text-hs-ink">{t.title}</p>
                      <CategoryBadge cat={t.category} />
                      {t.isShared ? (
                        <span className="text-caption-sm text-hs-text-tertiary">Shared</span>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-caption-sm text-hs-text-secondary">{t.content}</p>
                  </div>
                  {t.isOwn ? (
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => { setEditingId(t.id); setCreating(false); }}
                        className="rounded-lg border border-hs-border/40 p-1.5 text-hs-text-tertiary transition hover:border-hs-primary/30 hover:text-hs-primary"
                        aria-label="Edit"
                      >
                        <Edit2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(t.id)}
                        className="rounded-lg border border-hs-border/40 p-1.5 text-hs-text-tertiary transition hover:border-red-300 hover:text-red-600"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Treatment Plan Editor ───────────────────────────────────────────────────

function TreatmentPlanForm({
  initial,
  onSave,
  onCancel
}: {
  initial?: TreatmentPlan;
  onSave: (body: Omit<TreatmentPlan, "id" | "isOwn" | "createdAt" | "updatedAt">) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [dietAdvice, setDietAdvice] = useState(initial?.dietAdvice ?? "");
  const [lifestyleAdvice, setLifestyleAdvice] = useState(initial?.lifestyleAdvice ?? "");
  const [restrictionAdvice, setRestrictionAdvice] = useState(initial?.restrictionAdvice ?? "");
  const [remedyGuidelines, setRemedyGuidelines] = useState(initial?.remedyGuidelines ?? "");
  const [isShared, setIsShared] = useState(initial?.isShared ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        dietAdvice: dietAdvice.trim() || null,
        lifestyleAdvice: lifestyleAdvice.trim() || null,
        restrictionAdvice: restrictionAdvice.trim() || null,
        remedyGuidelines: remedyGuidelines.trim() || null,
        linkedTemplateIds: initial?.linkedTemplateIds ?? [],
        isShared
      });
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const taClass = cn(DS_FIELD, "min-h-[5rem] resize-y");

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FieldLabel>Plan title</FieldLabel>
          <input className={DS_FIELD} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chronic Allergy Management Plan" autoFocus />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel>Description (optional)</FieldLabel>
          <textarea className={cn(DS_FIELD, "min-h-[3rem] resize-y")} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief note on when to use this plan" />
        </div>
        <div>
          <FieldLabel>Diet advice</FieldLabel>
          <textarea className={taClass} value={dietAdvice} onChange={(e) => setDietAdvice(e.target.value)} placeholder="Dietary recommendations…" />
        </div>
        <div>
          <FieldLabel>Lifestyle advice</FieldLabel>
          <textarea className={taClass} value={lifestyleAdvice} onChange={(e) => setLifestyleAdvice(e.target.value)} placeholder="Daily routines, sleep, exercise…" />
        </div>
        <div>
          <FieldLabel>Restrictions</FieldLabel>
          <textarea className={taClass} value={restrictionAdvice} onChange={(e) => setRestrictionAdvice(e.target.value)} placeholder="Foods to avoid, activities to limit…" />
        </div>
        <div>
          <FieldLabel>Remedy guidelines (optional)</FieldLabel>
          <textarea className={taClass} value={remedyGuidelines} onChange={(e) => setRemedyGuidelines(e.target.value)} placeholder="Potency notes, dosing philosophy, notes for clinical use…" />
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-body-sm text-hs-text-secondary">
        <input type="checkbox" checked={isShared} onChange={(e) => setIsShared(e.target.checked)} className="accent-hs-primary" />
        Share with all doctors in this clinic
      </label>
      {error ? <p className="text-caption-sm text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-hs-primary px-4 text-caption-sm font-semibold text-white disabled:opacity-60">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          {initial ? "Update plan" : "Create plan"}
        </button>
        <button type="button" onClick={onCancel} className="inline-flex min-h-9 items-center rounded-xl border border-hs-border/50 px-4 text-caption-sm font-medium text-hs-ink">Cancel</button>
      </div>
    </form>
  );
}

function TreatmentPlansSection() {
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setPlans(await fetchTreatmentPlans());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async (body: Omit<TreatmentPlan, "id" | "isOwn" | "createdAt" | "updatedAt">) => {
    await createTreatmentPlan(body);
    await load();
    setCreating(false);
  };

  const handleUpdate = async (id: string, body: Omit<TreatmentPlan, "id" | "isOwn" | "createdAt" | "updatedAt">) => {
    await updateTreatmentPlan(id, body);
    await load();
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this treatment plan?")) return;
    await deleteTreatmentPlan(id);
    setPlans((p) => p.filter((x) => x.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => { setCreating(true); setEditingId(null); }}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-hs-primary px-4 text-caption-sm font-semibold text-white transition hover:bg-hs-primary-light"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New plan
        </button>
      </div>

      {creating ? (
        <div className="rounded-xl border border-hs-primary/25 bg-hs-primary-very-light/40 p-4">
          <p className="mb-3 text-body-sm font-semibold text-hs-ink">New treatment plan</p>
          <TreatmentPlanForm onSave={handleCreate} onCancel={() => setCreating(false)} />
        </div>
      ) : null}

      {loading ? (
        <p className="text-body-sm text-hs-text-tertiary">Loading…</p>
      ) : plans.length === 0 && !creating ? (
        <div className="rounded-xl border border-dashed border-hs-border/50 bg-hs-cream/40 px-4 py-8 text-center">
          <p className="text-body-sm font-medium text-hs-ink">No plans yet</p>
          <p className="mt-1 text-caption-sm text-hs-text-secondary">Build structured plans combining diet, lifestyle, and remedy notes.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {plans.map((plan) => (
            <li key={plan.id} className="rounded-xl border border-hs-border/25 bg-hs-cream/30">
              {editingId === plan.id ? (
                <div className="p-4">
                  <TreatmentPlanForm
                    initial={plan}
                    onSave={(body) => handleUpdate(plan.id, body)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-body-sm font-semibold text-hs-ink">{plan.title}</p>
                        {plan.isShared ? (
                          <span className="text-caption-sm text-hs-text-tertiary">Shared</span>
                        ) : null}
                      </div>
                      {plan.description ? (
                        <p className="mt-0.5 text-caption-sm text-hs-text-secondary">{plan.description}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {plan.dietAdvice ? <CategoryBadge cat="diet" /> : null}
                        {plan.lifestyleAdvice ? <CategoryBadge cat="lifestyle" /> : null}
                        {plan.restrictionAdvice ? <CategoryBadge cat="restriction" /> : null}
                      </div>
                    </div>
                    {plan.isOwn ? (
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => { setEditingId(plan.id); setCreating(false); }}
                          className="rounded-lg border border-hs-border/40 p-1.5 text-hs-text-tertiary transition hover:border-hs-primary/30 hover:text-hs-primary"
                          aria-label="Edit plan"
                        >
                          <Edit2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(plan.id)}
                          className="rounded-lg border border-hs-border/40 p-1.5 text-hs-text-tertiary transition hover:border-red-300 hover:text-red-600"
                          aria-label="Delete plan"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
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

      {/* Advice templates */}
      <SectionCard title="Advice templates" icon={Utensils} defaultOpen={false}>
        <AdviceTemplatesSection />
      </SectionCard>

      {/* Treatment plans */}
      <SectionCard title="Treatment plans" icon={Salad} defaultOpen={false}>
        <TreatmentPlansSection />
      </SectionCard>
    </div>
  );
}
