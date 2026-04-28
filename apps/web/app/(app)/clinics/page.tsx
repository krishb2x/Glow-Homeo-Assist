"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Pencil, Plus, Power, Eye } from "lucide-react";
import {
  createClinic,
  getToken,
  listAdminClinics,
  updateAdminClinic,
  type AdminClinicRow
} from "../../../lib/doctor-api";
import { useAppRole } from "../../../contexts/RoleContext";
import { PageHeader } from "../../../components/platform/PageHeader";
import { TableCard, TableShell } from "../../../components/platform/TableCard";
import { EmptyState } from "../../../components/platform/EmptyState";
import { StatusBadge } from "../../../components/platform/StatusBadge";
import { Modal } from "../../../components/platform/Modal";

function locationLabel(row: AdminClinicRow): string {
  const loc = row.location;
  if (loc && loc.trim() !== "") return loc.trim();
  return "—";
}

export default function ClinicsPage(): JSX.Element | null {
  const router = useRouter();
  const { refresh, role } = useAppRole();
  const [rows, setRows] = useState<AdminClinicRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<AdminClinicRow | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      const { items } = await listAdminClinics();
      setRows(items);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (role !== "SUPER_ADMIN") return;
    void load();
  }, [load, role]);

  function openCreate() {
    setFormName("");
    setFormSlug("");
    setFormLocation("");
    setFormActive(true);
    setCreateOpen(true);
  }

  function openEdit(row: AdminClinicRow) {
    setEditRow(row);
    setFormName(row.name);
    setFormSlug(row.slug ?? "");
    setFormLocation(row.location ?? "");
    setFormActive(row.is_active !== false);
  }

  if (role !== "SUPER_ADMIN") {
    return null;
  }

  return (
    <div>
      <PageHeader
        title="Clinics"
        description="Create tenant workspaces and manage activation. Scope API calls with the clinic switcher in the top bar."
        action={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-hs-primary px-4 text-sm font-semibold text-white shadow-ds-sm transition hover:bg-hs-primary-light"
          >
            <Plus className="h-4 w-4" />
            Create clinic
          </button>
        }
      />

      {err ? (
        <p className="mb-6 text-sm text-red-600" role="alert">
          {err}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-hs-text-secondary" role="status">
          Loading clinics…
        </p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No clinics yet"
          description="Create your first clinic to onboard a tenant, then assign doctors in Supabase."
          action={
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-hs-primary px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Create your first clinic
            </button>
          }
        />
      ) : (
        <TableCard>
          <TableShell>
            <thead>
              <tr className="border-b border-hs-border/40 bg-hs-cream/50 text-caption-sm font-medium uppercase tracking-wide text-hs-text-tertiary">
                <th className="px-5 py-3.5">Clinic</th>
                <th className="px-4 py-3.5">Location</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Doctors</th>
                <th className="w-px min-w-[200px] px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hs-border/20">
              {rows.map((r) => (
                <tr key={r.id} className="bg-hs-paper/50 transition hover:bg-hs-cream/40">
                  <td className="px-5 py-4">
                    <p className="font-medium text-hs-ink">{r.name}</p>
                    {r.slug ? <p className="mt-0.5 font-mono text-caption-sm text-hs-text-tertiary">{r.slug}</p> : null}
                  </td>
                  <td className="px-4 py-4 text-hs-text-secondary">{locationLabel(r)}</td>
                  <td className="px-4 py-4">
                    <StatusBadge variant={r.is_active === false ? "inactive" : "active"}>
                      {r.is_active === false ? "Inactive" : "Active"}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-4 text-right tabular-nums text-hs-ink">{r.doctor_count ?? 0}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={`/clinics/${r.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-hs-border/50 px-2.5 py-1.5 text-caption-sm font-medium text-hs-ink transition hover:border-hs-primary/30"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="inline-flex items-center gap-1 rounded-lg border border-hs-border/50 px-2.5 py-1.5 text-caption-sm font-medium text-hs-ink transition hover:border-hs-primary/30"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void (async () => {
                            try {
                              await updateAdminClinic(r.id, { is_active: r.is_active === false });
                              await load();
                              await refresh();
                            } catch (e) {
                              setErr(e instanceof Error ? e.message : "Update failed");
                            }
                          })();
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-hs-border/50 px-2.5 py-1.5 text-caption-sm font-medium text-hs-ink transition hover:border-hs-primary/30"
                      >
                        <Power className="h-3.5 w-3.5" />
                        {r.is_active === false ? "Activate" : "Deactivate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </TableCard>
      )}

      <Modal
        open={createOpen}
        title="Create clinic"
        onClose={() => setCreateOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="rounded-xl border border-hs-border/60 px-4 py-2 text-sm font-medium text-hs-ink">
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setPending(true);
                setErr(null);
                void (async () => {
                  try {
                    await createClinic(formName.trim(), {
                      slug: formSlug.trim() || undefined,
                      location: formLocation.trim() || null
                    });
                    setCreateOpen(false);
                    await load();
                    await refresh();
                  } catch (e) {
                    setErr(e instanceof Error ? e.message : "Create failed");
                  } finally {
                    setPending(false);
                  }
                })();
              }}
              className="rounded-xl bg-hs-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Create
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-caption-sm font-medium text-hs-text-tertiary">Name *</label>
            <input
              required
              className="mt-1.5 w-full rounded-xl border border-hs-border/50 bg-hs-cream/40 px-3 py-2.5 text-sm"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Verdant Clinic"
            />
          </div>
          <div>
            <label className="text-caption-sm font-medium text-hs-text-tertiary">Slug (optional)</label>
            <input
              className="mt-1.5 w-full rounded-xl border border-hs-border/50 bg-hs-cream/40 px-3 py-2.5 font-mono text-sm"
              value={formSlug}
              onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="verdant-clinic"
            />
          </div>
          <div>
            <label className="text-caption-sm font-medium text-hs-text-tertiary">Location (display)</label>
            <input
              className="mt-1.5 w-full rounded-xl border border-hs-border/50 bg-hs-cream/40 px-3 py-2.5 text-sm"
              value={formLocation}
              onChange={(e) => setFormLocation(e.target.value)}
              placeholder="City, country"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={editRow !== null}
        title="Edit clinic"
        onClose={() => setEditRow(null)}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditRow(null)} className="rounded-xl border border-hs-border/60 px-4 py-2 text-sm font-medium text-hs-ink">
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!editRow) return;
                setPending(true);
                setErr(null);
                void (async () => {
                  try {
                    await updateAdminClinic(editRow.id, {
                      name: formName.trim(),
                      slug: formSlug.trim() || null,
                      location: formLocation.trim() || null,
                      is_active: formActive
                    });
                    setEditRow(null);
                    await load();
                    await refresh();
                  } catch (e) {
                    setErr(e instanceof Error ? e.message : "Save failed");
                  } finally {
                    setPending(false);
                  }
                })();
              }}
              className="rounded-xl bg-hs-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Save
            </button>
          </div>
        }
      >
        {editRow ? (
          <div className="space-y-4">
            <div>
              <label className="text-caption-sm font-medium text-hs-text-tertiary">Name *</label>
              <input
                className="mt-1.5 w-full rounded-xl border border-hs-border/50 bg-hs-cream/40 px-3 py-2.5 text-sm"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-caption-sm font-medium text-hs-text-tertiary">Slug</label>
              <input
                className="mt-1.5 w-full rounded-xl border border-hs-border/50 bg-hs-cream/40 px-3 py-2.5 font-mono text-sm"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              />
            </div>
            <div>
              <label className="text-caption-sm font-medium text-hs-text-tertiary">Location</label>
              <input
                className="mt-1.5 w-full rounded-xl border border-hs-border/50 bg-hs-cream/40 px-3 py-2.5 text-sm"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-hs-ink">
              <input type="checkbox" className="rounded border-hs-border" checked={formActive} onChange={(e) => setFormActive(e.currentTarget.checked)} />
              Clinic active
            </label>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
