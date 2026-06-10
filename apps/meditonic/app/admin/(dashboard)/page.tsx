import { createAdminClient } from "@/lib/supabase";
import { BRAND } from "@/lib/constants";
import Link from "next/link";
import { 
  Activity, Calendar, DollarSign, 
  FileText, ShoppingBag, Users, AlertCircle, 
  CheckCircle2, ArrowRight, Package
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminGlobalDashboard() {
  const supabase = createAdminClient();
  const clinicId = BRAND.clinicId;

  // 1. Fetch Aggregated Data
  const [
    { data: recentOrders },
    { data: recentCases },
    { data: recentPayments },
    { data: syncQueue },
    { data: partnerApps },
  ] = await Promise.all([
    supabase.from("mt_orders").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("mt_cases").select("*").eq("clinic_id", clinicId).order("created_at", { ascending: false }).limit(50),
    supabase.from("mt_payments").select("*").eq("clinic_id", clinicId).order("created_at", { ascending: false }).limit(50),
    supabase.from("mt_sync_queue").select("status"),
    supabase.from("mt_partner_applications").select("id").eq("status", "pending")
  ]);

  const todayStr = new Date().toISOString().split("T")[0];

  // Calculations
  const ordersToday = recentOrders?.filter(o => o.created_at.startsWith(todayStr) && (o.status === "paid" || o.status === "fulfilled")) || [];
  const paymentsToday = recentPayments?.filter(p => p.created_at.startsWith(todayStr) && p.status === "captured") || [];
  const casesToday = recentCases?.filter(c => c.created_at.startsWith(todayStr)) || [];

  const storeRevenueToday = ordersToday.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const paymentRevenueToday = paymentsToday.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalRevenueToday = storeRevenueToday + paymentRevenueToday;

  // Health Metrics
  const failedSyncs = syncQueue?.filter(s => s.status === "failed").length || 0;
  const unassignedCases = recentCases?.filter(c => !c.assigned_doctor_id).length || 0;
  const pendingPartners = partnerApps?.length || 0;

  const isHealthy = failedSyncs === 0 && unassignedCases === 0;

  // Unified Activity Feed
  const feed = [
    ...(recentOrders?.map(o => ({
      id: `order-${o.id}`,
      type: 'order',
      title: `Store Order #${o.id.substring(0, 6).toUpperCase()}`,
      subtitle: `${o.customer_name} purchased items`,
      amount: o.total_amount,
      status: o.status,
      date: new Date(o.created_at)
    })) || []),
    ...(recentCases?.map(c => ({
      id: `case-${c.id}`,
      type: 'case',
      title: `Consultation Booked`,
      subtitle: c.patient_name,
      amount: recentPayments?.find(p => p.reference_id === c.reference_id)?.amount || 0,
      status: c.status,
      date: new Date(c.created_at)
    })) || [])
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 8);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Global Command Center</h1>
          <p className="text-slate-500 mt-1">10,000-foot view of MediTonic's operations, commerce, and partners.</p>
        </div>
        <div className={`px-4 py-2 rounded-full border text-sm font-medium flex items-center gap-2 ${isHealthy ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
          {isHealthy ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          System Health: {isHealthy ? "Optimal" : "Requires Attention"}
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Revenue Today</h3>
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{formatPrice(totalRevenueToday)}</div>
          <p className="text-xs text-slate-500 mt-2">Combined Store + Clinic</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Store Orders</h3>
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{ordersToday.length}</div>
          <p className="text-xs text-slate-500 mt-2">Paid today</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">New Cases</h3>
            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{casesToday.length}</div>
          <p className="text-xs text-slate-500 mt-2">Consultations booked today</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Partner Apps</h3>
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{pendingPartners}</div>
          <p className="text-xs text-slate-500 mt-2">Awaiting approval</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - System Alerts */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            System Alerts
          </h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
            <Link href="/admin/operations/cases" className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${unassignedCases > 0 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className={`font-medium ${unassignedCases > 0 ? 'text-slate-900' : 'text-slate-500'}`}>Unassigned Cases</p>
                  <p className="text-xs text-slate-500">Needs doctor allocation</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${unassignedCases > 0 ? 'text-orange-600' : 'text-slate-400'}`}>{unassignedCases}</span>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
              </div>
            </Link>

            <Link href="/admin/operations/sync" className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${failedSyncs > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <p className={`font-medium ${failedSyncs > 0 ? 'text-slate-900' : 'text-slate-500'}`}>Sync Errors</p>
                  <p className="text-xs text-slate-500">Google Sheets queue</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${failedSyncs > 0 ? 'text-red-600' : 'text-slate-400'}`}>{failedSyncs}</span>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
              </div>
            </Link>
            
            <Link href="/admin/partners/applications" className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${pendingPartners > 0 ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className={`font-medium ${pendingPartners > 0 ? 'text-slate-900' : 'text-slate-500'}`}>Pending Partners</p>
                  <p className="text-xs text-slate-500">Referral program</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${pendingPartners > 0 ? 'text-blue-600' : 'text-slate-400'}`}>{pendingPartners}</span>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
              </div>
            </Link>
          </div>
        </div>

        {/* Right Column - Unified Feed */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-500" />
            Live Activity Feed
          </h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-100">
              {feed.map((item) => (
                <div key={item.id} className="p-4 flex items-start sm:items-center justify-between hover:bg-slate-50 transition-colors gap-4 flex-col sm:flex-row">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.type === 'order' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {item.type === 'order' ? <Package className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="text-sm text-slate-500">{item.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 sm:justify-end w-full sm:w-auto">
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{formatPrice(item.amount)}</p>
                      <p className="text-xs text-slate-400">{item.date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                      item.status === 'paid' || item.status === 'captured' || item.status === 'fulfilled' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
              {feed.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  No recent activity found.
                </div>
              )}
            </div>
            <div className="bg-slate-50 p-4 border-t border-slate-200 text-center">
              <Link href="/admin/commerce/orders" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
                View all transactions →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
