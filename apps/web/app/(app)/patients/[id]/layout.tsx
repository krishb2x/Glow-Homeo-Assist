import type { ReactNode } from "react";
import { PatientHubLayout } from "../../../../components/clinic/patient/PatientHubLayout";

/**
 * Sticky header + sub-navigation for the patient’s hub; children are timeline, profile, or documents.
 */
export default function PatientRecordLayout({ children }: { children: ReactNode }): JSX.Element {
  return <PatientHubLayout>{children}</PatientHubLayout>;
}
