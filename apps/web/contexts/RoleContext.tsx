"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  clearClientSession,
  fetchAuthMe,
  fetchWorkspaceContext,
  getToken,
  listAdminClinics,
  setStoredClinicId,
  type WorkspaceContext
} from "../lib/doctor-api";

const LOAD_FAILED_MSG = "Unable to load data. Please try again.";

export type AppStaffRole = "SUPER_ADMIN" | "DOCTOR" | "PATIENT" | null;

const ACTIVE_CLINIC_KEY = "gh_active_clinic_id";

type RoleState = {
  role: AppStaffRole;
  workspace: (WorkspaceContext & { role?: string }) | null;
  clinics: {
    id: string;
    name: string;
    slug: string | null;
    created_at?: string;
    location?: string | null;
    is_active?: boolean;
    doctor_count?: number;
  }[];
  activeClinicId: string | null;
  loading: boolean;
  error: string | null;
  setActiveClinicId: (id: string) => void;
  refresh: () => Promise<void>;
};

const RoleContext = createContext<RoleState | null>(null);

function readLocalActiveClinicId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_CLINIC_KEY) || localStorage.getItem("ha_clinic_id");
}

export function RoleProvider({ children }: { children: ReactNode }): JSX.Element {
  const [role, setRole] = useState<AppStaffRole>(null);
  const [workspace, setWorkspace] = useState<(WorkspaceContext & { role?: string }) | null>(null);
  const [clinics, setClinics] = useState<RoleState["clinics"]>([]);
  const [activeClinicId, setActiveClinicIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyActiveClinic = useCallback(
    (id: string) => {
      setActiveClinicIdState(id);
      if (typeof window !== "undefined") {
        localStorage.setItem(ACTIVE_CLINIC_KEY, id);
        setStoredClinicId(id);
      }
    },
    [setActiveClinicIdState]
  );

  const load = useCallback(async () => {
    if (typeof window === "undefined" || !getToken()) {
      setRole(null);
      setWorkspace(null);
      setClinics([]);
      setActiveClinicIdState(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const me = await fetchAuthMe();
      setRole(me.role);

      if (me.role === "PATIENT") {
        setWorkspace(null);
        setClinics([]);
        setActiveClinicIdState(null);
        return;
      }

      if (me.role === "SUPER_ADMIN") {
        // Workspace + clinic directory are independent — parallel saves one round-trip to first paint.
        const [ctx, { items }] = await Promise.all([
          fetchWorkspaceContext() as Promise<WorkspaceContext & { role?: string }>,
          listAdminClinics()
        ]);
        setWorkspace(ctx);
        setClinics(items);
        const fromStorage = readLocalActiveClinicId();
        const first = items[0]?.id;
        if (fromStorage && items.some((c) => c.id === fromStorage)) {
          applyActiveClinic(fromStorage);
        } else if (first) {
          applyActiveClinic(first);
        } else {
          setActiveClinicIdState(null);
        }
        return;
      }

      const ctx = (await fetchWorkspaceContext()) as WorkspaceContext & { role?: string };
      setWorkspace(ctx);
      setClinics([]);
      if (me.role === "DOCTOR" && me.clinicId) {
        applyActiveClinic(me.clinicId);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "SESSION_EXPIRED") {
        clearClientSession();
        setRole(null);
        setWorkspace(null);
        setClinics([]);
        setActiveClinicIdState(null);
        setError(null);
      } else {
        setRole(null);
        setWorkspace(null);
        setClinics([]);
        setError(LOAD_FAILED_MSG);
      }
    } finally {
      setLoading(false);
    }
  }, [applyActiveClinic]);

  useEffect(() => {
    void load();
  }, [load]);

  const setActiveClinicId = useCallback(
    (id: string) => {
      applyActiveClinic(id);
    },
    [applyActiveClinic]
  );

  const value = useMemo<RoleState>(
    () => ({
      role,
      workspace,
      clinics,
      activeClinicId,
      loading,
      error,
      setActiveClinicId,
      refresh: load
    }),
    [role, workspace, clinics, activeClinicId, loading, error, setActiveClinicId, load]
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useAppRole(): RoleState {
  const v = useContext(RoleContext);
  if (!v) {
    throw new Error("useAppRole must be used within RoleProvider");
  }
  return v;
}

export function useAppRoleOptional(): RoleState | null {
  return useContext(RoleContext);
}
