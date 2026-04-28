import type { ReactNode } from "react";
import { ClinicAppShell } from "../../components/clinic/ClinicAppShell";
import { RoleProvider } from "../../contexts/RoleContext";
import { RoleRouteGate } from "../../components/role/RoleRouteGate";

/**
 * Authenticated app shell: role context (API-backed) + route gates + desktop layout.
 */
export default function AppGroupLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <RoleProvider>
      <RoleRouteGate>
        <ClinicAppShell>{children}</ClinicAppShell>
      </RoleRouteGate>
    </RoleProvider>
  );
}
