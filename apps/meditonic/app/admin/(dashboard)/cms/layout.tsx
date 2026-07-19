"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, Image, Megaphone, Flag } from "lucide-react";

export default function CMSLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const links = [
    { name: "Pages", href: "/admin/cms/pages", icon: FileText },
    { name: "Media Library", href: "/admin/cms/media", icon: Image },
    { name: "Banners", href: "/admin/cms/banners", icon: Flag },
    { name: "Announcements", href: "/admin/cms/announcements", icon: Megaphone },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-mt-text-primary">Website CMS</h1>
          <p className="text-sm text-mt-text-secondary mt-1">
            Manage your store's landing pages, media, and promotional content.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-64 shrink-0">
          <nav className="flex lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname.startsWith(link.href);
              
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-mt-primary/10 text-mt-primary"
                      : "text-mt-text-secondary hover:bg-gray-100 hover:text-mt-text-primary"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="whitespace-nowrap">{link.name}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
