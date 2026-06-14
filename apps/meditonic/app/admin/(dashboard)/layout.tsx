"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSupabaseBrowser } from "../../../lib/supabase-browser";
import Link from "next/link";
import { LayoutDashboard, Users, UserPlus, Gift, IndianRupee, LogOut, Loader2, Workflow, FolderGit2, ShoppingCart, Package, UserCircle } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("support");

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/admin/login");
      } else if (session.user.user_metadata?.role === "PARTNER") {
        // Prevent partners from accessing admin
        router.push("/partner-login");
      } else {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();

          if (profile?.role) {
            setUserRole(profile.role);
          } else if (session.user.user_metadata?.role) {
            setUserRole(session.user.user_metadata.role);
          } else {
            setUserRole("support"); // Default fallback
          }
        } catch (err) {
          console.error("Failed to query profile role:", err);
          setUserRole("support");
        }
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (loading) return;

    // Support route guard
    if (userRole === "support") {
      const isForbidden = 
        pathname.startsWith("/admin/partners") || 
        pathname.startsWith("/admin/commerce/products") || 
        pathname.startsWith("/admin/commerce/customers") ||
        (pathname.startsWith("/admin/operations") && 
         !pathname.startsWith("/admin/operations/treatment-kits") && 
         !pathname.startsWith("/admin/operations/cases"));

      if (isForbidden) {
        router.push("/admin/operations/treatment-kits");
      }
    }
    
    // Doctor route guard
    if (userRole === "doctor") {
      const isForbidden = 
        pathname.startsWith("/admin/partners") || 
        pathname.startsWith("/admin/commerce/products") || 
        pathname.startsWith("/admin/commerce/customers") ||
        pathname.startsWith("/admin/commerce/orders") ||
        (pathname.startsWith("/admin/operations") && 
         !pathname.startsWith("/admin/operations/cases"));

      if (isForbidden) {
        router.push("/admin/commerce/treatment-kits");
      }
    }
  }, [pathname, loading, userRole, router]);

  const handleLogout = async () => {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    document.cookie = "meditonic_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "meditonic_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/admin/login");
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
  }

  // Role checking flags
  const isSuperAdminOrAdmin = ["super_admin", "admin"].includes(userRole);
  const isSupport = userRole === "support";
  const isDoctor = userRole === "doctor";

  const navItems = [
    { name: "Overview", href: "/admin", icon: LayoutDashboard, visible: isSuperAdminOrAdmin || isDoctor || isSupport },
    { name: "Operations", href: "/admin/operations", icon: Workflow, visible: isSuperAdminOrAdmin },
    { name: "All Cases", href: "/admin/operations/cases", icon: FolderGit2, visible: isSuperAdminOrAdmin || isDoctor || isSupport },
    { name: "Treatment Kits", href: "/admin/operations/treatment-kits", icon: Package, visible: isSuperAdminOrAdmin || isSupport },
  ].filter(i => i.visible);

  const commerceItems = [
    { name: "Overview", href: "/admin/commerce", icon: LayoutDashboard, visible: isSuperAdminOrAdmin },
    { name: "Orders", href: "/admin/commerce/orders", icon: ShoppingCart, visible: isSuperAdminOrAdmin || isSupport },
    { name: "Products", href: "/admin/commerce/products", icon: Package, visible: isSuperAdminOrAdmin },
    { name: "Kit Reviews", href: "/admin/commerce/treatment-kits", icon: FolderGit2, visible: isSuperAdminOrAdmin || isDoctor || isSupport },
    { name: "Customers", href: "/admin/commerce/customers", icon: UserCircle, visible: isSuperAdminOrAdmin },
  ].filter(i => i.visible);

  const partnerItems = [
    { name: "Applications", href: "/admin/partners/applications", icon: UserPlus, visible: isSuperAdminOrAdmin },
    { name: "Partners", href: "/admin/partners", icon: Users, visible: isSuperAdminOrAdmin },
    { name: "Commissions", href: "/admin/partners/commissions", icon: IndianRupee, visible: isSuperAdminOrAdmin },
  ].filter(i => i.visible);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar / Bottom Nav */}
      <aside className="fixed bottom-0 w-full z-50 md:z-auto md:w-64 bg-slate-900 text-white flex md:flex-col shrink-0 md:h-full md:top-0 border-t md:border-t-0 md:border-r border-slate-800">
        <div className="hidden md:flex h-16 items-center px-6 border-b border-slate-800 shrink-0">
          <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 font-serif text-lg mr-3">M</div>
          <span className="font-semibold text-lg">MediTonic</span>
        </div>
        
        <div className="flex-1 flex md:flex-col overflow-x-auto md:overflow-y-auto overflow-y-hidden md:p-4 space-x-2 md:space-x-0 md:space-y-1 p-2 items-center md:items-stretch">
          <div className="hidden md:block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 mt-4 px-2">Clinic Administration</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 px-3 py-2 md:py-2.5 rounded-xl text-[10px] md:text-sm font-medium transition-colors shrink-0 ${
                  isActive ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                <Icon className={`w-5 h-5 md:w-5 md:h-5 ${isActive ? "text-emerald-200" : "text-slate-500"}`} />
                <span className="hidden md:inline">{item.name}</span>
                <span className="md:hidden">{item.name.split(' ')[0]}</span>
              </Link>
            )
          })}

          {commerceItems.length > 0 && (
            <>
              <div className="hidden md:block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 mt-6 px-2">Commerce Module</div>
              {commerceItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === '/admin/commerce' 
                  ? pathname === '/admin/commerce'
                  : pathname.startsWith(item.href);
                  
                return (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 px-3 py-2 md:py-2.5 rounded-xl text-[10px] md:text-sm font-medium transition-colors shrink-0 ${
                      isActive ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <Icon className={`w-5 h-5 md:w-5 md:h-5 ${isActive ? "text-emerald-200" : "text-slate-500"}`} />
                    <span className="hidden md:inline">{item.name}</span>
                    <span className="md:hidden">{item.name.split(' ')[0]}</span>
                  </Link>
                )
              })}
            </>
          )}

          {partnerItems.length > 0 && (
            <>
              <div className="hidden md:block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 mt-6 px-2">Partner Network</div>
              {partnerItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 px-3 py-2 md:py-2.5 rounded-xl text-[10px] md:text-sm font-medium transition-colors shrink-0 ${
                      isActive ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <Icon className={`w-5 h-5 md:w-5 md:h-5 ${isActive ? "text-emerald-200" : "text-slate-500"}`} />
                    <span className="hidden md:inline">{item.name}</span>
                    <span className="md:hidden">{item.name.split(' ')[0]}</span>
                  </Link>
                )
              })}
            </>
          )}
        </div>

        <div className="hidden md:block p-4 border-t border-slate-800 shrink-0">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full text-left rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-5 h-5 text-slate-500" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pb-20 md:pb-0 min-h-screen flex flex-col w-full">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 md:px-8 justify-between sticky top-0 z-10 w-full">
          <h1 className="text-lg md:text-xl font-semibold text-slate-800 capitalize truncate pr-4">
            {[...navItems, ...commerceItems, ...partnerItems].find(i => pathname === i.href || (i.href !== '/admin/commerce' && pathname.startsWith(i.href)))?.name || "Dashboard"}
          </h1>
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <button onClick={handleLogout} className="md:hidden p-2 text-slate-500">
              <LogOut className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-medium text-sm">
              AD
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
