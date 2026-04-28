import type { Role } from "@homeoassist/domain/src";
import { createSupabaseUserClient, supabaseAdmin } from "./supabase";
import { mapProfileRoleStringToDomain } from "./lib/roleMap";

export { mapProfileRoleStringToDomain };

/**
 * Resolves the signed-in user + profile row from an access token (for REST + WSS).
 */
export async function getAuthClaimsForAccessToken(accessToken: string): Promise<{
  userId: string;
  role: Role;
  clinicId: string | null;
  accessToken: string;
} | null> {
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return null;
  }
  const client = createSupabaseUserClient(accessToken);
  const { data: profile, error: pErr } = await client
    .from("profiles")
    .select("clinic_id,role")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (pErr) {
    return null;
  }
  if (!profile) {
    return {
      userId: userData.user.id,
      role: "PATIENT",
      clinicId: null,
      accessToken
    };
  }
  const p = profile as { clinic_id: string | null; role: string };
  return {
    userId: userData.user.id,
    role: mapProfileRoleStringToDomain(p.role),
    clinicId: p.clinic_id,
    accessToken
  };
}
