import { createAdminClient } from "../../../../lib/supabase";
import { formatPrice } from "../../../../lib/utils";
import { BRAND } from "../../../../lib/constants";
import Link from "next/link";
import { 
  Activity, Wallet, Users, ArrowRight, Settings, 
  TrendingUp, ShoppingCart, Mail, ArrowUpRight, 
  CheckCircle2, Clock, AlertCircle, Sparkles, Building, Award
} from "lucide-react";
import { Button } from "../../../../components/ui/Button";

export const dynamic = "force-dynamic";

export default async function SuperadminDashboardPage() {
  const supabase = createAdminClient();
  
  // 1. Fetch Aggregated Metrics
  const [
    { data: ordersData, error: ordersErr },
    { data: attributionsData, error: attrErr },
    { count: casesCount, error: casesErr },
    { count: partnersCount, error: partnersErr },
  ] = await Promise.all([
    supabase.from("mt_orders").select("total_amount").eq("status", "paid"),
    supabase.from("mt_order_attributions").select("commission_amount"),
    supabase.from("mt_cases").select("*", { count: 'exact', head: true }),
    supabase.from("mt_partners").select("*", { count: 'exact', head: true })
  ]);

  const totalSales = ordersData?.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0) || 0;
  const totalCommissions = attributionsData?.reduce((sum: number, a: any) => sum + Number(a.commission_amount || 0), 0) || 0;
  
  // 2. Fetch Recent Attributions (limit 8)
  const { data: recentAttributions, error: recentErr } = await supabase
    .from("mt_order_attributions")
    .select(`
      *,
      mt_partners (
        id,
        mt_partner_applications ( name )
      ),
      mt_referral_codes ( code )
    `)
    .order("created_at", { ascending: false })
    .limit(8);

  // Batch lookup customer names for recent attributions
  const orderIds = recentAttributions?.map((a: any) => a.order_id).filter(Boolean) || [];
  
  let ordersLookup: any[] = [];
  let casesLookup: any[] = [];

  if (orderIds.length > 0) {
    const [ordersRes, casesRes] = await Promise.all([
      supabase.from("mt_orders").select("id, customer_name").in("id", orderIds),
      supabase.from("mt_cases").select("reference_id, patient_name").in("reference_id", orderIds)
    ]);
    ordersLookup = ordersRes.data || [];
    casesLookup = casesRes.data || [];
  }

  const attributions = (recentAttributions || []).map((attr: any) => {
    const customerName = 
      ordersLookup.find(o => o.id === attr.order_id)?.customer_name ||
      casesLookup.find(c => c.reference_id === attr.order_id)?.patient_name ||
      "N/A";
    return {
      ...attr,
      customerName
    };
  });

  // 3. Fetch Top Partners (ordered by total_commission descending)
  const { data: topPartners, error: partnersListErr } = await supabase
    .from("mt_partners")
    .select(`
      id,
      total_orders,
      total_commission,
      total_revenue,
      status,
      created_at,
      mt_partner_applications (
        name,
        email
      ),
      mt_referral_codes (
        code,
        is_active
      )
    `)
    .order("total_commission", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 text-white p-8 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-gradient-to-bl from-emerald-500/10 to-indigo-500/10 rounded-full blur-3xl -z-0"></div>
        <div className="relative z-10 space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/35 text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" /> Super Admin Center
          </span>
          <h1 className="text-3xl font-black tracking-tight">System Control & Operations</h1>
          <p className="text-slate-400 font-semibold max-w-2xl text-sm leading-relaxed">
            Financial auditing, cost-saving toggle switches, and partner channel performance oversight.
          </p>
        </div>
        <div className="flex gap-3 shrink-0 relative z-10">
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-6 rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2">
            <Link href="/admin/superadmin/email-settings">
              <Settings className="w-4 h-4" />
              Configure System Emails
            </Link>
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Original Sales */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-slate-50 rounded-full group-hover:scale-110 transition-transform -z-0"></div>
          <div className="relative z-10 flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Original Sales</h3>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="relative z-10 text-3xl font-black text-slate-900">{formatPrice(totalSales)}</div>
          <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-wide">Gross store purchases processed</p>
        </div>

        {/* Total Commissions */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-slate-50 rounded-full group-hover:scale-110 transition-transform -z-0"></div>
          <div className="relative z-10 flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Commissions</h3>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="relative z-10 text-3xl font-black text-slate-900">{formatPrice(totalCommissions)}</div>
          <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-wide">Referral payments distributed</p>
        </div>

        {/* Total Services */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-slate-50 rounded-full group-hover:scale-110 transition-transform -z-0"></div>
          <div className="relative z-10 flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Services</h3>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="relative z-10 text-3xl font-black text-slate-900">{casesCount || 0}</div>
          <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-wide">Clinical consultation cases</p>
        </div>

        {/* Total Partners */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-slate-50 rounded-full group-hover:scale-110 transition-transform -z-0"></div>
          <div className="relative z-10 flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Partners</h3>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="relative z-10 text-3xl font-black text-slate-900">{partnersCount || 0}</div>
          <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-wide">Active/Pending affiliates</p>
        </div>
      </div>

      {/* Cost Control Settings Widget */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
            <Mail className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-950 text-lg">System Communication Cost Control</h3>
            <p className="text-xs text-slate-500 mt-1 font-semibold max-w-xl">
              Enable/disable automated email notifications, override API keys, and manage auditing CC/BCC routes. Lower AWS/Resend transaction billing instantly.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="border-slate-200 hover:bg-slate-50 text-slate-700 h-11 px-5 rounded-xl font-bold shrink-0 flex items-center gap-2">
          <Link href="/admin/superadmin/email-settings">
            Manage System Emails
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Link>
        </Button>
      </div>

      {/* Tables Row */}
      <div className="grid lg:grid-cols-5 gap-8">
        
        {/* Attributed Sales Feed (3 columns) */}
        <section className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              <h2 className="text-base font-extrabold text-slate-900">Attributed Sales Feed</h2>
            </div>
            <Link href="/admin/partners/commissions" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5">
              View All Ledger
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                  <th className="px-5 py-4">Order / Customer</th>
                  <th className="px-5 py-4">Partner (Code)</th>
                  <th className="px-5 py-4">Revenue</th>
                  <th className="px-5 py-4">Commission</th>
                  <th className="px-5 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attributions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-slate-400 font-semibold">
                      No attributed sales found.
                    </td>
                  </tr>
                ) : (
                  attributions.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-extrabold text-slate-800">
                          #{item.order_id.split("-")[0].toUpperCase()}
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold mt-0.5 capitalize">
                          {item.customerName}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 truncate max-w-[120px]">
                          {item.mt_partners?.mt_partner_applications?.name || "Unknown"}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono tracking-wider mt-0.5">
                          ({item.mt_referral_codes?.code || "N/A"})
                        </div>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-950">
                        {formatPrice(item.revenue_after_discount)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-black text-emerald-600">
                          {formatPrice(item.commission_amount)}
                        </div>
                        <div className="text-[9px] text-slate-400 font-bold mt-0.5">
                          {item.commission_percentage}% rate
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                          item.status === 'paid' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {item.status === 'paid' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Top Earners (2 columns) */}
        <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-purple-500" />
              <h2 className="text-base font-extrabold text-slate-900">Top Earning Partners</h2>
            </div>
            <Link href="/admin/partners" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5">
              All Partners
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                  <th className="px-5 py-4">Partner</th>
                  <th className="px-5 py-4">Referrals</th>
                  <th className="px-5 py-4">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(!topPartners || topPartners.length === 0) ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-12 text-center text-slate-400 font-semibold">
                      No partners records found.
                    </td>
                  </tr>
                ) : (
                  topPartners.map((partner: any) => {
                    const code = Array.isArray(partner.mt_referral_codes) 
                      ? (partner.mt_referral_codes.find((c: any) => c.is_active)?.code || partner.mt_referral_codes[0]?.code)
                      : partner.mt_referral_codes?.code;
                    return (
                      <tr key={partner.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-extrabold text-slate-800">
                            {partner.mt_partner_applications?.name || "Unknown"}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            Code: {code || "None"}
                          </div>
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-600">
                          {partner.total_orders || 0} order(s)
                        </td>
                        <td className="px-5 py-4 font-black text-purple-600">
                          {formatPrice(partner.total_commission || 0)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>

    </div>
  );
}
