import { createAdminClient } from "@/lib/supabase";
import { BRAND } from "@/lib/constants";
import Link from "next/link";
import { 
  AlertCircle, CheckCircle2, Clock, Activity, 
  RefreshCw, ArrowRight, FileText, Stethoscope, 
  UserPlus, UserCog, CalendarClock
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function ClinicOperationsDashboard() {
  const supabase = createAdminClient();
  const clinicId = BRAND.clinicId;

  // 1. Fetch Clinical & Operational Data Only
  const [
    { data: cases, error: casesError },
    { data: syncQueue, error: syncError },
    { data: doctors, error: doctorsError }
  ] = await Promise.all([
    supabase.from("mt_cases").select("*, doctor:profiles(id, full_name)").eq("clinic_id", clinicId).order("created_at", { ascending: false }),
    supabase.from("mt_sync_queue").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, specialty").eq("role", "doctor")
  ]);

  if (casesError) console.error("Cases Error:", casesError);
  if (syncError) console.error("Sync Error:", syncError);

  const allCases = cases || [];
  const allSyncs = syncQueue || [];
  const allDoctors = doctors || [];

  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  // 2. Clinical Triage Metrics
  const unassignedCases = allCases.filter(c => c.status === "new" || !c.assigned_doctor_id);
  const stalledCases = allCases.filter(c => 
    (c.status === "under_review" || c.status === "assigned" || c.status === "scheduled") && 
    new Date(c.updated_at) < twoDaysAgo
  );
  const followUpCases = allCases.filter(c => c.status === "followup");

  // 3. Sync Queue Metrics
  const pendingSyncs = allSyncs.filter(s => s.status === "pending").length;
  const failedSyncs = allSyncs.filter(s => s.status === "failed");

  // 4. Compute Doctor Workloads
  const doctorWorkloads = allDoctors.map(doc => {
    const docCases = allCases.filter(c => c.assigned_doctor_id === doc.id);
    const activeCases = docCases.filter(c => 
      c.status === "assigned" || c.status === "scheduled" || c.status === "active_treatment"
    ).length;
    
    // New cases assigned today
    const todayStr = new Date().toISOString().split("T")[0];
    const newToday = docCases.filter(c => c.updated_at.startsWith(todayStr)).length;
    
    // Last assignment
    const lastCase = docCases[0]; // array is ordered by created_at desc, but really we want by assignment date. Fallback to created_at
    const lastAssignment = lastCase ? new Date(lastCase.created_at).toLocaleDateString() : "Never";

    return { ...doc, activeCases, newToday, lastAssignment };
  }).sort((a, b) => b.activeCases - a.activeCases);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Activity className="h-8 w-8 text-indigo-600" />
            Clinic Operations
          </h1>
          <p className="text-slate-500 mt-1">Manage patient triage, doctor workloads, and integration logistics.</p>
        </div>
      </div>

      {/* SECTION 1: CLINICAL TRIAGE */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-slate-800 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          Clinical Triage Queue
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AlertCard 
            title="Unassigned Cases" 
            count={unassignedCases.length} 
            href="/admin/operations/cases" 
            icon={<UserPlus className="h-5 w-5" />} 
            isCritical={unassignedCases.length > 0} 
          />
          <AlertCard 
            title="Urgent Follow-Ups" 
            count={followUpCases.length} 
            href="/admin/operations/cases" 
            icon={<CalendarClock className="h-5 w-5" />} 
            isCritical={followUpCases.length > 0} 
            colorClass="text-blue-600"
            bgClass="bg-blue-50"
          />
          <AlertCard 
            title="Stalled Cases (>48h)" 
            count={stalledCases.length} 
            href="/admin/operations/cases" 
            icon={<Clock className="h-5 w-5" />} 
            isCritical={stalledCases.length > 0} 
            colorClass="text-red-600"
            bgClass="bg-red-50"
          />
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Queues & Workloads */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* SECTION 2: DOCTOR VISIBILITY */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-indigo-500" />
                Doctor Allocation & Capacity
              </h2>
            </div>
            <div className="p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                {doctorWorkloads.map(doc => (
                  <div key={doc.id} className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col justify-between hover:shadow-sm transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <UserCog className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">Dr. {doc.full_name}</h3>
                          <p className="text-xs text-slate-500">{doc.specialty}</p>
                        </div>
                      </div>
                      <div className="text-center">
                        <span className="block text-2xl font-bold text-indigo-600">{doc.activeCases}</span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-500">Active</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm text-slate-500 border-t border-slate-100 pt-3">
                      <span>Assigned Today: <strong className="text-slate-800">{doc.newToday}</strong></span>
                      <span>Last Case: {doc.lastAssignment}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 3: RECENT CASES QUEUE */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-semibold text-slate-800">Recent Intake Queue</h2>
              <Button asChild variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700">
                <Link href="/admin/operations/cases">View All <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="divide-y divide-slate-100">
              {allCases.slice(0, 5).map((c: any) => (
                <div key={c.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                  <div>
                    <h3 className="font-semibold text-slate-900">{c.patient_name || "Unknown Patient"}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {new Date(c.created_at).toLocaleDateString()}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 uppercase tracking-wider`}>
                        {c.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-right hidden sm:block">
                      <p className="text-slate-500 text-xs">Assigned to</p>
                      <p className="font-medium text-slate-900">{c.doctor?.full_name ? `Dr. ${c.doctor.full_name}` : "Unassigned"}</p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/operations/cases/${c.id}`}>
                        {c.assigned_doctor_id ? "View" : "Assign"}
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
              {allCases.length === 0 && (
                <div className="p-8 text-center text-slate-500">No recent cases found.</div>
              )}
            </div>
          </section>

        </div>

        {/* RIGHT COLUMN: Activity & Integrations */}
        <div className="space-y-8">
          
          {/* SECTION 4: INTEGRATION LOGISTICS */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h2 className="text-sm uppercase tracking-wider font-semibold text-slate-500 flex items-center justify-between">
              Integration Logistics
              <Button asChild variant="ghost" size="sm" className="h-6 text-xs p-0 px-2">
                <Link href="/admin/operations/sync">View Queue</Link>
              </Button>
            </h2>
            
            <div className="flex items-center justify-between text-sm p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="flex items-center gap-2 font-medium text-slate-700">
                <div className={`h-2 w-2 rounded-full ${failedSyncs.length === 0 ? "bg-emerald-500" : "bg-red-500"}`}></div>
                Google Sheets Push
              </span>
              <span className="font-medium">{failedSyncs.length === 0 ? "Operational" : <span className="text-red-600">{failedSyncs.length} Failed</span>}</span>
            </div>
            
            <div className="flex items-center justify-between text-sm p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="flex items-center gap-2 font-medium text-slate-700">
                <div className={`h-2 w-2 rounded-full ${pendingSyncs > 10 ? "bg-orange-500" : "bg-emerald-500"}`}></div>
                Queue Backlog
              </span>
              <span className="font-medium">{pendingSyncs} Pending</span>
            </div>
          </section>

          {/* SECTION 5: CLINICAL CONTEXT STREAM */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full max-h-[600px]">
            <div className="p-5 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-500" />
                Clinical Context Stream
              </h2>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-6">
              {allCases.slice(0, 15).map((c: any) => (
                <div key={c.id} className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-[-24px] before:w-px before:bg-slate-200 last:before:hidden">
                  <div className="absolute left-[3px] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500 outline outline-4 outline-white"></div>
                  <div className="mb-2">
                    <span className="font-medium text-sm text-slate-900">{c.patient_name} ({c.age || 'N/A'}, {c.gender || 'N/A'})</span>
                    <span className="ml-2 text-[10px] uppercase font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{c.concern_category || "General"}</span>
                  </div>
                  <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 mb-2">
                    <p className="font-medium text-[10px] uppercase tracking-wider mb-1 text-slate-400">Symptoms / Intake</p>
                    <p className="line-clamp-3">{c.description || "No description provided."}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(c.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}
              {allCases.length === 0 && (
                <div className="text-center text-sm text-slate-500">No recent cases.</div>
              )}
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
  const textColor = colorClass || (isAlert ? "text-orange-600" : "text-slate-500");
  const bgColor = bgClass || (isAlert ? "bg-orange-50 border-orange-200" : "bg-white border-slate-200");

  return (
    <Link href={href} className={`block p-5 rounded-2xl border transition-all hover:shadow-md ${bgColor}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-xl ${isAlert ? "bg-orange-100/50" : "bg-white/50"}`}>
          <div className={textColor}>{icon}</div>
        </div>
      </div>
      <div>
        <p className={`text-3xl font-bold ${isAlert ? "text-orange-700" : "text-slate-900"}`}>{count}</p>
        <p className={`text-sm mt-1 font-medium ${textColor}`}>{title}</p>
      </div>
    </Link>
  );
}
