"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Download, FileText, FolderOpen, Loader2, UploadCloud } from "lucide-react";
import {
  fetchPatientDocuments,
  fetchPresignDownload,
  getToken,
  presignStorageUpload,
  recordUploadedFile,
  type PatientDocumentItem
} from "../../../../../lib/doctor-api";
import { friendlyLoadError } from "../../../../../lib/friendly-error";
import { ErrorState } from "../../../../../components/ui/LoadState";
import { DS_BTN_PRIMARY_ROUNDED, DS_SURFACE_DASHED } from "../../../../../lib/ds-classes";
import { cn } from "../../../../../lib/cn";

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.heic,.webp,.doc,.docx,.txt";
const MAX_BYTES = 25 * 1024 * 1024;

function formatBytesUnknown(): string {
  return "";
}

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function inferContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "heic":
      return "image/heic";
    case "webp":
      return "image/webp";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "txt":
      return "text/plain";
    default:
      return "application/octet-stream";
  }
}

export default function PatientDocumentsPage(): JSX.Element {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<PatientDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id || !getToken()) return;
    setLoadError(null);
    void (async () => {
      setLoading(true);
      try {
        setItems(await fetchPatientDocuments(id));
      } catch (e) {
        setLoadError(e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onPick = useCallback(() => {
    fileRef.current?.click();
  }, []);

  const onFile = useCallback(
    async (file: File) => {
      setUploadError(null);
      if (file.size > MAX_BYTES) {
        setUploadError(`File is too large (max ${(MAX_BYTES / 1024 / 1024).toFixed(0)} MB).`);
        return;
      }
      setUploading(true);
      try {
        const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, "_");
        const presign = await presignStorageUpload({
          category: "document",
          filename: safeName,
          contentType: file.type || inferContentType(safeName)
        });
        if (presign.uploadUrl) {
          const put = await fetch(presign.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type || inferContentType(safeName) },
            body: file
          });
          if (!put.ok) {
            throw new Error(`Upload failed (${put.status}). Please try again.`);
          }
        }
        await recordUploadedFile({
          objectKey: presign.objectKey,
          category: "document",
          patientId: id
        });
        load();
      } catch (e) {
        setUploadError(friendlyLoadError(e));
      } finally {
        setUploading(false);
      }
    },
    [id, load]
  );

  const onDownload = useCallback(async (objectKey: string) => {
    try {
      const { downloadUrl } = await fetchPresignDownload(objectKey);
      if (!downloadUrl) return;
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch {
      /* swallow — UI will show empty state */
    }
  }, []);

  if (loadError && !loading) {
    return (
      <ErrorState err={loadError} title="Couldn’t load documents" onRetry={load} />
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-heading-sm text-hs-ink">Documents &amp; media</h2>
          <p className="mt-1 text-body-sm text-hs-text-secondary">
            Lab reports, scans, consents, and any reference material for this patient.
          </p>
        </div>
        <button
          type="button"
          onClick={onPick}
          disabled={uploading}
          className={cn(DS_BTN_PRIMARY_ROUNDED, "gap-2", uploading && "opacity-70")}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <UploadCloud className="h-4 w-4" aria-hidden />}
          {uploading ? "Uploading…" : "Upload file"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            if (fileRef.current) fileRef.current.value = "";
          }}
        />
      </div>

      {uploadError ? (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-body-sm text-rose-900">
          {uploadError}
        </p>
      ) : null}

      <div className="mt-5">
        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center text-body-sm text-hs-text-secondary">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Loading…
          </div>
        ) : items.length === 0 ? (
          <div className={cn(DS_SURFACE_DASHED, "flex min-h-[240px] flex-col items-center justify-center p-8 text-center")} role="status">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-hs-cream/90 text-hs-text-tertiary" aria-hidden>
              <FolderOpen className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <h3 className="font-heading text-body-md font-semibold text-hs-ink">No documents yet</h3>
            <p className="mt-1 max-w-md text-body-sm text-hs-text-secondary">
              Upload lab reports, scans or consents — they will appear here and on the patient timeline.
            </p>
          </div>
        ) : (
          <ul className="ds-app-card divide-y divide-hs-border/40">
            {items.map((d) => (
              <li key={d.id} className="flex items-center gap-3 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-hs-cream/70 text-hs-primary" aria-hidden>
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-body-sm font-semibold text-hs-ink">{d.filename}</p>
                  <p className="mt-0.5 text-caption-sm text-hs-text-tertiary">
                    {formatRelative(d.uploadedAt)}
                    {d.consultationId ? " · linked to a consultation" : ""}
                    {formatBytesUnknown()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void onDownload(d.objectKey)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-hs-border/60 bg-hs-paper px-3 text-caption-sm font-semibold text-hs-ink transition hover:border-hs-primary/35 focus:outline-none focus:ring-2 focus:ring-hs-primary/25"
                >
                  <Download className="h-4 w-4" aria-hidden />
                  Download
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
