import type { PatientTag } from "../../lib/doctor-api";
import { PATIENT_TAG_LABEL, tagClass } from "../../lib/patient-tag-styles";

export function PatientTagBadges({
  tags,
  className = ""
}: {
  tags?: PatientTag[] | undefined;
  className?: string;
}): JSX.Element | null {
  if (!tags?.length) return null;
  return (
    <span className={`flex flex-wrap gap-1 ${className}`}>
      {tags.map((t) => (
        <span
          key={t}
          className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${tagClass(t)}`}
        >
          {PATIENT_TAG_LABEL[t]}
        </span>
      ))}
    </span>
  );
}
