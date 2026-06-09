import { createAdminClient } from "@/lib/supabase";
import { BRAND } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";
import { Mail, Phone, Calendar } from "lucide-react";

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
        code
      )
    `)
    .eq("clinic_id", BRAND.clinicId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching partners:", error);
    return <div className="text-red-500">Failed to load partners.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Active Partners</h2>
          <p className="text-slate-500">Manage all approved partners in your program.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Partner Details</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Tracking Code</th>
                <th className="px-6 py-4">Commission Rate</th>
                <th className="px-6 py-4">Total Revenue</th>
                <th className="px-6 py-4">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {partners?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No active partners found. Go to Applications to approve new partners.
                  </td>
                </tr>
              ) : (
                partners?.map((p) => {
                  const app = p.mt_partner_applications;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{app?.name}</div>
                        {app?.profession && <div className="text-slate-500 text-xs mt-0.5">{app.profession}</div>}
                        <div className="flex items-center gap-3 mt-2 text-slate-500 text-xs">
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {app?.email}</span>
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {app?.mobile}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none capitalize">{p.status}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        {p.mt_referral_codes && p.mt_referral_codes.length > 0 ? (
                          <div className="font-mono text-sm font-bold bg-slate-100 px-2 py-1 rounded w-fit text-slate-700 border border-slate-200">
                            {p.mt_referral_codes[0].code}
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100 font-medium">Missing</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium">{p.base_commission_rate}%</td>
                      <td className="px-6 py-4 text-slate-600">₹{p.total_revenue || 0}</td>
                      <td className="px-6 py-4 text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(p.created_at).toLocaleDateString()}
                        </div>
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
