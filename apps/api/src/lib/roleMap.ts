import type { Role } from "@homeoassist/domain";

const PROFILE_TO_DOMAIN: Record<string, Role> = {
  super_admin: "SUPER_ADMIN",
  /** Legacy rows: treat as doctor until migration */
  admin: "DOCTOR",
  doctor: "DOCTOR",
  support: "DOCTOR",
  patient: "PATIENT"
};

/**
 * Map `public.profiles.role` (lowercase) to domain `Role` (uppercase).
 * Unknown strings default to PATIENT to avoid privilege escalation.
 */
export function mapProfileRoleStringToDomain(profileRole: string | null | undefined): Role {
  if (!profileRole) return "PATIENT";
  return PROFILE_TO_DOMAIN[profileRole] ?? "PATIENT";
}
