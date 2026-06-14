import { createAdminClient } from "../../../../lib/supabase";
import { BRAND } from "../../../../lib/constants";
import { Mail, Phone, Calendar, Users, TrendingUp, CreditCard, ChevronRight } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "../../../../lib/utils";

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  const supabase = createAdminClient();

  const { data: partners, error } = await supabase
    .from("mt_partners")
    .select(`
      *,
      mt_partner_applications (
        name,
        email,
        mobile,
        profession
      ),
      mt_referral_codes (
        code,
        is_active
      )
    `)
    .eq("clinic_id", BRAND.clinicId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching partners:", error);
    return <div className="p-12 text-center text-red-500 font-medium">Failed to load partners. Please try refreshing.</div>;
  }

  // Aggregate Stats
  const activePartnersCount = partners?.filter(p => p.status === 'active').length || 0;
  const totalRevenueGenerated = partners?.reduce((sum, p) => sum + (Number(p.total_revenue) || 0), 0) || 0;
  const totalCommissionsPaid = partners?.reduce((sum, p) => sum + (Number(p.total_commission) || 0), 0) || 0;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Active Partners</h2>
          <p className="text-slate-500 mt-2 text-lg">Manage approved affiliates and view their overall performance.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-[100px] -z-0"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 text-emerald-600 mb-4">
              <div className="bg-emerald-100 p-2.5 rounded-xl"><Users className="w-5 h-5" /></div>
              <span className="font-bold uppercase tracking-wider text-sm">Active Partners</span>
            </div>
            <h3 className="text-4xl font-black text-slate-900">{activePartnersCount}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-[100px] -z-0"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 text-blue-600 mb-4">
              <div className="bg-blue-100 p-2.5 rounded-xl"><TrendingUp className="w-5 h-5" /></div>
              <span className="font-bold uppercase tracking-wider text-sm">Revenue Generated</span>
            </div>
            <h3 className="text-4xl font-black text-slate-900">{formatPrice(totalRevenueGenerated)}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-[100px] -z-0"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 text-purple-600 mb-4">
              <div className="bg-purple-100 p-2.5 rounded-xl"><CreditCard className="w-5 h-5" /></div>
              <span className="font-bold uppercase tracking-wider text-sm">Commissions Paid</span>
            </div>
            <h3 className="text-4xl font-black text-slate-900">{formatPrice(totalCommissionsPaid)}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500">Partner Details</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500">Referral Code</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500">Total Orders</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500">Total Commission</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500">Last Updated</th>
                <th className="px-6 py-4 text-right font-bold text-xs uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {partners?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <Users className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">No active partners found</h3>
                    <p className="text-slate-500">Go to Applications to approve new partners.</p>
                  </td>
                </tr>
              ) : (
                partners?.map((p) => {
                  const app = p.mt_partner_applications;
                  const primaryCode = p.mt_referral_codes?.find((c: any) => c.is_active)?.code || p.mt_referral_codes?.[0]?.code;
                  
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold shadow-sm shrink-0">
                            {app?.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{app?.name}</div>
                            <div className="text-slate-500 text-xs mt-0.5">{app?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {primaryCode ? (
                          <span className="font-mono text-xs font-black bg-slate-150 px-3 py-1.5 rounded-lg text-slate-700 border border-slate-200 tracking-wider">
                            {primaryCode}
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-250 font-black uppercase tracking-wider">
                            Missing Code
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider border ${
                          p.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm font-bold text-slate-700">{p.total_orders || 0}</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm font-bold text-emerald-600">{formatPrice(p.total_commission || 0)}</div>
                      </td>
                      <td className="px-6 py-5 text-slate-500 text-xs font-semibold">
                        {new Date(p.updated_at || p.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Link 
                          href={`/admin/partners/${p.id}`} 
                          className="inline-flex items-center justify-center px-4 py-2 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-750 bg-white hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
                        >
                          View / Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
