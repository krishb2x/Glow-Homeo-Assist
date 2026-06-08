import { createAdminClient } from "@/lib/supabase";
import { BRAND } from "@/lib/constants";
import Link from "next/link";
import { 
  AlertCircle, CheckCircle2, Clock, Activity, Users, 
  RefreshCw, DollarSign, ArrowRight, FileText, Calendar, XCircle, Stethoscope
} from "lucide-react";
import { Button } from "@/components/ui/Button";

// Force dynamic rendering since this is an admin dashboard
export const dynamic = "force-dynamic";

export default async function OperationsCommandCenter() {
  const supabase = createAdminClient();
  const clinicId = BRAND.clinicId;

  // 1. Fetch All Relevant Data Concurrently
  const [
    { data: cases, error: casesError },
    { data: syncQueue, error: syncError },
    { data: payments, error: paymentsError },
    { data: partners, error: partnersError },
    { data: activities, error: activitiesError },
    { data: doctors, error: doctorsError }
  ] = await Promise.all([
    supabase.from("mt_cases").select("*, doctor:profiles(id, full_name)").eq("clinic_id", clinicId).order("created_at", { ascending: false }),
    supabase.from("mt_sync_queue").select("*").order("created_at", { ascending: false }),
    supabase.from("mt_payments").select("*").order("created_at", { ascending: false }),
    supabase.from("mt_partner_applications").select("*").eq("status", "pending"),
    supabase.from("mt_case_activities").select("*, case:mt_cases(patient_name)").order("created_at", { ascending: false }).limit(20),
    supabase.from("profiles").select("id, full_name, specialization").eq("role", "doctor")
  ]);

  if (casesError) console.error("Cases Error:", casesError);
  if (syncError) console.error("Sync Error:", syncError);
  if (paymentsError) console.error("Payments Error:", paymentsError);

  const allCases = cases || [];
  const allSyncs = syncQueue || [];
  const allPayments = payments || [];
  const allDoctors = doctors || [];
  const allActivities = activities || [];

  // 2. Compute "Today's Work" Bottlenecks
  const unassignedCases = allCases.filter(c => c.status === "unassigned" || !c.doctor_id);
  const reviewCases = allCases.filter(c => c.status === "review_pending");
  const failedSyncs = allSyncs.filter(s => s.status === "failed");
  const failedPayments = allPayments.filter(p => p.status === "failed");
  const pendingPartners = partners?.length || 0;

  // 3. Compute Operational Health
  const pendingSyncs = allSyncs.filter(s => s.status === "pending").length;
  const healthStatus = failedSyncs.length > 0 ? "degraded" : "healthy";

  // 4. Compute Doctor Workloads
  const doctorWorkloads = allDoctors.map(doc => {
    const docCases = allCases.filter(c => c.doctor_id === doc.id);
    const activeCases = docCases.filter(c => c.status === "assigned" || c.status === "active").length;
    
    // New cases today
    const todayStr = new Date().toISOString().split("T")[0];
    const newToday = docCases.filter(c => c.created_at.startsWith(todayStr)).length;
    
    // Last assignment
    const lastCase = docCases[0]; // array is ordered by created_at desc
    const lastAssignment = lastCase ? new Date(lastCase.created_at).toLocaleDateString() : "Never";

    return { ...doc, activeCases, newToday, lastAssignment };
  }).sort((a, b) => b.activeCases - a.activeCases);

  // 5. Compute Revenue Context
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaysRevenue = allPayments
    .filter(p => p.status === "captured" && new Date(p.created_at) >= today)
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-mt-text flex items-center gap-2">
            <Activity className="h-8 w-8 text-mt-primary" />
            Operations Command Center
          </h1>
          <p className="text-mt-text-secondary mt-1">Manage cases, resolve bottlenecks, and monitor clinic activity.</p>
        </div>
        <div className={`px-4 py-2 rounded-full border text-sm font-medium flex items-center gap-2 ${healthStatus === "healthy" ? "bg-mt-success/10 text-mt-success border-mt-success/20" : "bg-red-50 text-red-600 border-red-200"}`}>
          {healthStatus === "healthy" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          System Health: {healthStatus === "healthy" ? "Optimal" : "Degraded"}
        </div>
      </div>

      {/* SECTION 1: TODAY'S WORK (Bottlenecks) */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-mt-text flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          Requires Attention Today
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AlertCard 
            title="Unassigned Cases" 
            count={unassignedCases.length} 
            href="/admin/operations/cases" 
            icon={<FileText className="h-5 w-5" />} 
            isCritical={unassignedCases.length > 0} 
          />
          <AlertCard 
            title="Failed Payments" 
            count={failedPayments.length} 
            href="/admin/operations/payments" 
            icon={<DollarSign className="h-5 w-5" />} 
            isCritical={failedPayments.length > 0} 
          />
          <AlertCard 
            title="Sync Errors" 
            count={failedSyncs.length} 
            href="/admin/operations/sync" 
            icon={<RefreshCw className="h-5 w-5" />} 
            isCritical={failedSyncs.length > 0} 
          />
          <AlertCard 
            title="Pending Partners" 
            count={pendingPartners} 
            href="/admin/partners/applications" 
            icon={<Users className="h-5 w-5" />} 
            isCritical={pendingPartners > 0} 
            colorClass="text-blue-600"
            bgClass="bg-blue-50"
          />
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Queues & Workloads */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* SECTION 2: RECENT CASES QUEUE */}
          <section className="bg-white rounded-2xl border border-mt-border overflow-hidden">
            <div className="p-5 border-b border-mt-border flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-semibold text-mt-text">Recent Cases Queue</h2>
              <Button asChild variant="ghost" size="sm" className="text-mt-primary">
                <Link href="/admin/operations/cases">View All <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="divide-y divide-mt-border">
              {allCases.slice(0, 5).map((c: any) => (
                <div key={c.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                  <div>
                    <h3 className="font-semibold text-mt-text">{c.patient_name || "Unknown Patient"}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm">
                      <span className="text-mt-text-secondary flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {new Date(c.created_at).toLocaleDateString()}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.payment_status === "captured" ? "bg-mt-success/10 text-mt-success" : "bg-orange-100 text-orange-700"}`}>
                        Pay: {c.payment_status || "pending"}
                      </span>
                      <span className="text-mt-primary text-xs font-medium uppercase tracking-wider">
                        {c.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-right hidden sm:block">
                      <p className="text-mt-text-secondary text-xs">Assigned to</p>
                      <p className="font-medium text-mt-text">{c.doctor?.full_name ? `Dr. ${c.doctor.full_name}` : "Unassigned"}</p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/operations/cases/${c.id}`}>
                        {c.doctor ? "View" : "Assign"}
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
              {allCases.length === 0 && (
                <div className="p-8 text-center text-mt-text-secondary">No recent cases found.</div>
              )}
            </div>
          </section>

          {/* SECTION 3: DOCTOR VISIBILITY */}
          <section className="bg-white rounded-2xl border border-mt-border overflow-hidden">
            <div className="p-5 border-b border-mt-border bg-gray-50/50">
              <h2 className="text-lg font-semibold text-mt-text flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-mt-primary" />
                Doctor Allocation & Workload
              </h2>
            </div>
            <div className="p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                {doctorWorkloads.map(doc => (
                  <div key={doc.id} className="p-4 rounded-xl border border-mt-border bg-white flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold">Dr. {doc.name}</h3>
                        <p className="text-xs text-mt-text-secondary">{doc.specialization}</p>
                      </div>
                      <div className="text-center">
                        <span className="block text-2xl font-bold text-mt-primary">{doc.activeCases}</span>
                        <span className="text-[10px] uppercase tracking-wider text-mt-text-secondary">Active Cases</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm text-mt-text-secondary border-t border-mt-border pt-3">
                      <span>New Today: <strong className="text-mt-text">{doc.newToday}</strong></span>
                      <span>Last: {doc.lastAssignment}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>

        {/* RIGHT COLUMN: Activity & Secondary Metrics */}
        <div className="space-y-8">
          
          {/* SECTION 4: UNIFIED ACTIVITY FEED */}
          <section className="bg-white rounded-2xl border border-mt-border overflow-hidden flex flex-col h-full max-h-[600px]">
            <div className="p-5 border-b border-mt-border bg-gray-50/50">
              <h2 className="text-lg font-semibold text-mt-text">Live Activity</h2>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-6">
              {allActivities.map((act: any) => (
                <div key={act.id} className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-[-24px] before:w-px before:bg-mt-border last:before:hidden">
                  <div className="absolute left-[3px] top-1.5 h-2.5 w-2.5 rounded-full bg-mt-primary outline outline-4 outline-white"></div>
                  <div className="mb-1">
                    <span className="font-medium text-sm text-mt-text">{act.action}</span>
                  </div>
                  <p className="text-sm text-mt-text-secondary">{act.case?.patient_name} — {act.details?.message || "Status updated"}</p>
                  <p className="text-xs text-mt-text-secondary/70 mt-1">
                    {new Date(act.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              ))}
              {allActivities.length === 0 && (
                <div className="text-center text-sm text-mt-text-secondary">No recent activity.</div>
              )}
            </div>
          </section>

          {/* SECTION 5: REVENUE CONTEXT (Secondary) */}
          <section className="bg-white rounded-2xl border border-mt-border p-5">
            <h2 className="text-sm uppercase tracking-wider font-semibold text-mt-text-secondary mb-4">Financial Context</h2>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-mt-success/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-mt-success" />
              </div>
              <div>
                <p className="text-sm text-mt-text-secondary">Today's Revenue</p>
                <p className="text-2xl font-bold text-mt-text">₹{todaysRevenue.toLocaleString()}</p>
              </div>
            </div>
          </section>

          {/* SECTION 6: OPERATIONAL HEALTH PANEL */}
          <section className="bg-white rounded-2xl border border-mt-border p-5 space-y-4">
            <h2 className="text-sm uppercase tracking-wider font-semibold text-mt-text-secondary">System Health</h2>
            
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${failedSyncs.length === 0 ? "bg-mt-success" : "bg-red-500"}`}></div>
                Google Sheets Sync
              </span>
              <span className="font-medium">{failedSyncs.length === 0 ? "Operational" : `${failedSyncs.length} Failed`}</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${pendingSyncs > 10 ? "bg-orange-500" : "bg-mt-success"}`}></div>
                Sync Queue
              </span>
              <span className="font-medium">{pendingSyncs} Pending</span>
            </div>
            
          </section>

        </div>
      </div>
    </div>
  );
}

// Helper Component for the Top Alert Cards
function AlertCard({ title, count, href, icon, isCritical, colorClass, bgClass }: any) {
  const isAlert = isCritical && !colorClass;
  const textColor = colorClass || (isAlert ? "text-orange-600" : "text-mt-text-secondary");
  const bgColor = bgClass || (isAlert ? "bg-orange-50 border-orange-200" : "bg-white border-mt-border");

  return (
    <Link href={href} className={`block p-5 rounded-2xl border transition-all hover:shadow-md ${bgColor}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-xl ${isAlert ? "bg-orange-100/50" : "bg-gray-100"}`}>
          <div className={textColor}>{icon}</div>
        </div>
      </div>
      <div>
        <p className={`text-3xl font-bold ${isAlert ? "text-orange-700" : "text-mt-text"}`}>{count}</p>
        <p className={`text-sm mt-1 font-medium ${textColor}`}>{title}</p>
      </div>
    </Link>
  );
}
