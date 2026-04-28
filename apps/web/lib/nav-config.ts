import type { LucideIcon } from "lucide-react";
import {
  BarChart2,
  Building2,
  CalendarDays,
  Inbox,
  LayoutGrid,
  MessageSquare,
  Settings,
  Stethoscope,
  Users
} from "lucide-react";

export type NavItem = { href: string; label: string; Icon: LucideIcon };

export const NAV_SUPER_ADMIN: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutGrid },
  { href: "/clinics", label: "Clinics", Icon: Building2 },
  { href: "/doctors", label: "Doctors", Icon: Users },
  { href: "/analytics", label: "Analytics", Icon: BarChart2 },
  { href: "/settings", label: "Settings", Icon: Settings }
];

export const NAV_DOCTOR: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutGrid },
  { href: "/consultation", label: "Consultation", Icon: Stethoscope },
  { href: "/patients", label: "Patients", Icon: Users },
  { href: "/appointments", label: "Schedule", Icon: CalendarDays },
  { href: "/follow-ups", label: "Follow-ups", Icon: Inbox },
  { href: "/messages", label: "Messages", Icon: MessageSquare },
  { href: "/settings", label: "Settings", Icon: Settings }
];

export function isMainNavActive(href: string, path: string): boolean {
  if (href === "/dashboard") return path === "/dashboard" || path === "/";
  if (href === "/clinics") return path === "/clinics" || path.startsWith("/clinics/");
  if (href === "/doctors") return path === "/doctors" || path.startsWith("/doctors/");
  if (href === "/analytics") return path.startsWith("/analytics");
  if (href === "/patients") return path.startsWith("/patients");
  if (href === "/appointments") return path.startsWith("/appointments");
  if (href === "/consultation") return path === "/consultation" || path.startsWith("/consultation");
  if (href === "/follow-ups") return path.startsWith("/follow-ups");
  if (href === "/messages") return path.startsWith("/messages");
  if (href === "/settings") return path === "/settings";
  return path === href;
}
