"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { consultationLinkProps } from "../../lib/consultation-navigation";

type Props = ComponentProps<typeof Link>;

/** Next.js Link that opens live consultations in a new tab (hub/dashboard stays open). */
export function ConsultationLink({ href, ...rest }: Props): JSX.Element {
  const path = typeof href === "string" ? href : href.pathname ?? "";
  return <Link href={href} {...consultationLinkProps(path)} {...rest} />;
}
