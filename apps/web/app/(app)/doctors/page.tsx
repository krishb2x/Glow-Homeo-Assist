"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope, UserPlus, Building2 } from "lucide-react";
import {
  createAdminDoctor,
  getToken,
  listAllAdminDoctors,
  type AdminDoctorRowWithClinic
} from "../../../lib/doctor-api";
import { useAppRole } from "../../../contexts/RoleContext";
import { friendlyLoadError } from "../../../lib/friendly-error";
import { PageHeader } from "../../../components/platform/PageHeader";
import { TableCard, TableShell } from "../../../components/platform/TableCard";
import { EmptyState } from "../../../components/platform/EmptyState";
import { StatusBadge } from "../../../components/platform/StatusBadge";

function lastActiveLabel(d: AdminDoctorRowWithClinic): string {
  const raw = d.updated_at ?? d.created_at;
  if (!raw) return "—";
  try {
    const t = new Date(raw).getTime();
    const diff = Date.now() - t;
    const dDays = Math.floor(diff / 86400000);
    if (dDays === 0) return "Today";
    if (dDays === 1) return "Yesterday";
    if (dDays < 14) return `${dDays}d ago`;
    return new Date(raw).toLocaleDateString();
  } catch {
    return "—";
  }
}

export default function DoctorsPage(): JSX.Element | null {
  const router = useRouter();
  const { role, activeClinicId, setActiveClinicId, clinics } = useAppRole();
  const [rows, setRows] = useState<AdminDoctorRowWithClinic[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [newClinicId, setNewClinicId] = useState("");
  const [addErr, setAddErr] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  /** One-time temp password from API — copy for the doctor; not stored on the server after this. */
  const [tempPasswordReveal, setTempPasswordReveal] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      const data = await listAllAdminDoctors();
      setRows(data);
    } catch (e) {
      setErr(friendlyLoadError(e));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (role !== "SUPER_ADMIN") return;
    void load();
  }, [load, role]);

  useEffect(() => {
    if (!addOpen || newClinicId) return;
    if (activeClinicId) {
      setNewClinicId(activeClinicId);
      return;
    }
    const first = clinics[0]?.id;
    if (first) setNewClinicId(first);
  }, [addOpen, activeClinicId, newClinicId, clinics]);

  if (role !== "SUPER_ADMIN") {
    return null;
  }

  return (
    <div>
      <PageHeader
        title="Doctors"
        description="Create doctor accounts, assign a clinic, and manage your directory in one place."
        action={
          <button
            type="button"
            onClick={() => {
              setAddOpen((o) => !o);
              setAddErr(null);
              setAddSuccess(null);
              setTempPasswordReveal(null);
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-hs-border/50 bg-hs-paper px-4 text-sm font-semibold text-hs-ink transition hover:border-hs-primary/30"
          >
            <UserPlus className="h-4 w-4" />
            Add doctor
          </button>
        }
      />

      {addSuccess ? (
        <div
          className="mb-4 space-y-3 rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900"
          role="status"
        >
          <p>{addSuccess}</p>
          {tempPasswordReveal ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <code className="min-w-0 flex-1 break-all rounded-md border border-emerald-300/60 bg-gh-paper px-3 py-2 font-mono text-body-sm text-gh-ink">
                {tempPasswordReveal}
              </code>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(tempPasswordReveal);
                  } catch {
                    /* ignore */
                  }
                }}
                className="shrink-0 rounded-md border border-emerald-600/30 bg-emerald-600/10 px-3 py-2 text-caption-sm font-semibold text-emerald-950 transition hover:bg-emerald-600/20"
              >
                Copy password
              </button>
            </div>
          ) : null}
          {tempPasswordReveal ? (
            <p className="text-caption-sm text-emerald-950/90">
              The doctor can sign in on the web app with this email and temporary password, then use{" "}
              <span className="font-medium">Forgot password</span> on the sign-in page anytime to set their own
              password.
            </p>
          ) : null}
        </div>
      ) : null}

      {addOpen ? (
        <form
          className="mb-8 max-w-lg rounded-2xl border border-hs-border/40 bg-hs-paper p-5 shadow-ds-sm"
          onSubmit={(e) => {
            e.preventDefault();
            setAddErr(null);
            setAddSuccess(null);
            setTempPasswordReveal(null);
            if (!newName.trim() || !newEmail.trim() || !newClinicId) {
              setAddErr("Name, email, and clinic are required.");
              return;
            }
            const pw = newPassword.trim();
            const pwc = newPasswordConfirm.trim();
            if (pw.length > 0 || pwc.length > 0) {
              if (pw.length < 8) {
                setAddErr("Initial password must be at least 8 characters, or leave both password fields blank.");
                return;
              }
              if (pw !== pwc) {
                setAddErr("Password and confirmation do not match.");
                return;
              }
            }
            setAdding(true);
            void (async () => {
              try {
                const usedManualPassword = pw.length >= 8;
                const out = await createAdminDoctor(newName.trim(), newEmail.trim(), newClinicId, {
                  initialPassword: usedManualPassword ? pw : undefined
                });
                setNewName("");
                setNewEmail("");
                setNewPassword("");
                setNewPasswordConfirm("");
                setAddOpen(false);
                setTempPasswordReveal(out.temporaryPassword);
                setAddSuccess(
                  usedManualPassword
                    ? "Doctor account created with the initial password you set. Copy it below to share with the doctor, or they already know it if you told them in person."
                    : "Doctor account created. Copy the generated password below and share it with the doctor through a private channel. It is not shown again."
                );
                await load();
              } catch (er) {
                setAddErr(er instanceof Error ? er.message : "Could not add doctor");
              } finally {
                setAdding(false);
              }
            })();
          }}
        >
          <p className="text-sm font-semibold text-hs-ink">New doctor</p>
          <p className="mt-1 text-caption-sm text-hs-text-tertiary">
            Set an initial password below (optional), or leave both fields blank to auto-generate one. The active
            password is always shown once after creation. The doctor can use Forgot password on the sign-in page
            anytime.
          </p>
          {clinics.length === 0 ? (
            <p className="mt-3 text-sm text-amber-900" role="status">
              Create a clinic first, then you can add doctors to it.
            </p>
          ) : null}
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-caption-sm font-medium text-hs-ink">
              Name
              <input
                required
                value={newName}
                onChange={(ev) => setNewName(ev.target.value)}
                className="rounded-lg border border-hs-border/50 bg-hs-cream/40 px-3 py-2 text-body-sm"
                placeholder="Dr. …"
                autoComplete="name"
              />
            </label>
            <label className="grid gap-1 text-caption-sm font-medium text-hs-ink">
              Work email
              <input
                type="email"
                required
                value={newEmail}
                onChange={(ev) => setNewEmail(ev.target.value)}
                className="rounded-lg border border-hs-border/50 bg-hs-cream/40 px-3 py-2 text-body-sm"
                placeholder="doctor@clinic.com"
                autoComplete="email"
              />
            </label>
            <label className="grid gap-1 text-caption-sm font-medium text-hs-ink">
              Initial password <span className="font-normal text-hs-text-tertiary">(optional)</span>
              <input
                type="password"
                value={newPassword}
                onChange={(ev) => setNewPassword(ev.target.value)}
                className="rounded-lg border border-hs-border/50 bg-hs-cream/40 px-3 py-2 text-body-sm"
                placeholder="Min. 8 characters if you set it; leave blank to auto-generate"
                autoComplete="new-password"
              />
            </label>
            <label className="grid gap-1 text-caption-sm font-medium text-hs-ink">
              Confirm initial password
              <input
                type="password"
                value={newPasswordConfirm}
                onChange={(ev) => setNewPasswordConfirm(ev.target.value)}
                className="rounded-lg border border-hs-border/50 bg-hs-cream/40 px-3 py-2 text-body-sm"
                placeholder="Re-enter to match, or leave blank"
                autoComplete="new-password"
              />
            </label>
            <label className="grid gap-1 text-caption-sm font-medium text-hs-ink">
              Clinic
              <select
                required
                value={newClinicId}
                onChange={(ev) => setNewClinicId(ev.target.value)}
                className="rounded-lg border border-hs-border/50 bg-hs-cream/40 px-3 py-2 text-body-sm"
              >
                <option value="">Select clinic</option>
                {clinics.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {addErr ? (
            <p className="mt-3 text-sm text-hs-danger" role="alert">
              {addErr}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={adding || clinics.length === 0}
              className="rounded-lg bg-hs-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {adding ? "Creating…" : "Create doctor"}
            </button>
            <button
              type="button"
              className="rounded-lg border border-hs-border/50 px-4 py-2 text-sm text-hs-ink"
              onClick={() => setAddOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {err ? (
        <p className="mb-6 text-sm text-red-600" role="alert">
          {err}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-hs-text-secondary">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="No doctor profiles"
          description="Add a doctor with the button above, or switch clinic scope in the top bar to see other tenants."
        />
      ) : (
        <TableCard>
          <TableShell>
            <thead>
              <tr className="border-b border-hs-border/40 bg-hs-cream/50 text-caption-sm font-medium uppercase tracking-wide text-hs-text-tertiary">
                <th className="px-5 py-3.5">Name</th>
                <th className="px-4 py-3.5">Clinic</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Last active</th>
                <th className="w-px px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hs-border/20">
              {rows.map((r) => {
                const inScope = r.clinic_id && activeClinicId === r.clinic_id;
                return (
                  <tr key={r.id} className="bg-hs-paper/50 transition hover:bg-hs-cream/40">
                    <td className="px-5 py-4">
                      <p className="font-medium text-hs-ink">{r.full_name}</p>
                      <p className="text-caption-sm text-hs-text-tertiary">Doctor</p>
                    </td>
                    <td className="px-4 py-4">
                      {r.clinic_id && r.clinic_name ? (
                        <Link
                          href={`/clinics/${r.clinic_id}`}
                          className="inline-flex items-center gap-1.5 text-sm text-hs-primary transition hover:underline"
                        >
                          <Building2 className="h-3.5 w-3.5" />
                          {r.clinic_name}
                        </Link>
                      ) : (
                        <span className="text-hs-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge variant="active">Active</StatusBadge>
                    </td>
                    <td className="px-4 py-4 text-hs-text-secondary">{lastActiveLabel(r)}</td>
                    <td className="px-5 py-4 text-right">
                      {r.clinic_id ? (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveClinicId(r.clinic_id!);
                            router.push("/dashboard");
                          }}
                          className="text-caption-sm font-medium text-hs-primary transition hover:underline"
                        >
                          {inScope ? "Current scope" : "Open in scope"}
                        </button>
                      ) : (
                        <span className="text-caption-sm text-hs-text-tertiary">No clinic on file</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        </TableCard>
      )}
    </div>
  );
}
