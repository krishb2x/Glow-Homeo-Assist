import { createAdminClient } from "@/lib/supabase";
import { MarkPaidButton } from "./MarkPaidButton";
import { formatPrice } from "@/lib/utils";
import { Wallet, CheckCircle2, Clock, AlertCircle } from "lucide-react";

// Revalidate data on every request for this admin page to ensure fresh data
export const revalidate = 0;

export default async function PartnerCommissionsPage() {
  const supabase = createAdminClient();
  
  // Fetch attributions to see all tracked commissions
  const { data: commissions, error } = await supabase
    .from("mt_order_attributions")
    .select(`
      *,
      mt_partners (
        id,
        mt_partner_applications ( name )
      ),
      mt_referral_codes ( code )
    `)
    .order("created_at", { ascending: false });

  const totalPending = commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + (Number(c.commission_amount) || 0), 0) || 0;
  const totalPaid = commissions?.filter(c => c.status === 'paid').reduce((sum, c) => sum + (Number(c.commission_amount) || 0), 0) || 0;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 text-purple-600 rounded-xl">
              <Wallet className="h-7 w-7" />
            </div>
            Commissions Ledger
          </h2>
          <p className="text-slate-500 mt-2 text-lg">Track affiliate sales and process payouts to your partners.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-[100px] -z-0"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 text-amber-600 mb-4">
              <div className="bg-amber-100 p-2.5 rounded-xl"><Clock className="w-5 h-5" /></div>
              <span className="font-bold uppercase tracking-wider text-sm">Total Pending Payouts</span>
            </div>
            <h3 className="text-4xl font-black text-slate-900">{formatPrice(totalPending)}</h3>
            <p className="text-sm font-medium text-slate-500 mt-2">Awaiting processing</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-[100px] -z-0"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 text-emerald-600 mb-4">
              <div className="bg-emerald-100 p-2.5 rounded-xl"><CheckCircle2 className="w-5 h-5" /></div>
              <span className="font-bold uppercase tracking-wider text-sm">Total Paid Out</span>
            </div>
            <h3 className="text-4xl font-black text-slate-900">{formatPrice(totalPaid)}</h3>
            <p className="text-sm font-medium text-slate-500 mt-2">Historically cleared</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="px-6 py-5">Date</th>
                <th className="px-6 py-5">Partner</th>
                <th className="px-6 py-5">Attribution</th>
                <th className="px-6 py-5">Revenue</th>
                <th className="px-6 py-5">Commission</th>
                <th className="px-6 py-5">Status / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!commissions || commissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <Wallet className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">No commissions recorded yet</h3>
                    <p className="text-slate-500">Sales tracked via partner links will appear here.</p>
                  </td>
                </tr>
              ) : commissions.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="text-sm font-bold text-slate-700">
                      {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="text-xs font-medium text-slate-500 mt-0.5">
                      {new Date(item.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="font-bold text-slate-900">
                      {item.mt_partners?.mt_partner_applications?.name || "Unknown"}
                    </div>
                    <div className="text-[11px] font-mono font-medium text-slate-500 mt-1 uppercase tracking-wider">
                      ID: {item.partner_id.split("-")[0]}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 w-fit">
                      {item.mt_referral_codes?.code || "N/A"}
                    </div>
                    {item.product_type && (
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1.5 ml-1">
                        {item.product_type.replace('_', ' ')}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm text-slate-900 font-bold">
                      {formatPrice(item.revenue_after_discount)}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm font-black text-emerald-600">
                      {formatPrice(item.commission_amount)}
                    </div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                      {item.commission_percentage}% Rate
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      {item.status === 'pending' ? (
                        <>
                          <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md uppercase tracking-wider">
                            <AlertCircle className="w-3.5 h-3.5" /> Pending
                          </span>
                          <MarkPaidButton attributionId={item.id} currentStatus={item.status} />
                        </>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md uppercase tracking-wider">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
