"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/Button";
import { Loader2, ArrowLeft, UserPlus, FileText, CheckCircle2, RefreshCw, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [caseId, setCaseId] = useState<string>("");
  const [caseData, setCaseData] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  
  // Note state
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    params.then((p) => {
      setCaseId(p.id);
      fetchData(p.id);
    });
  }, [params]);

  const fetchData = async (id: string) => {
    try {
      const supabase = getSupabaseBrowser();
      
      const { data: cData, error: cError } = await supabase
        .from("mt_cases")
        .select("*, doctor:profiles(id, full_name, specialization)")
        .eq("id", id)
        .single();

      if (cError) throw cError;
      setCaseData(cData);

      const { data: dData, error: dError } = await supabase.from("profiles").select("id, full_name, specialization").eq("role", "doctor");

      if (dError) throw dError;
      setDoctors(dData || []);

      const { data: aData, error: aError } = await supabase
        .from("mt_case_activities")
        .select("*")
        .eq("case_id", id)
        .order("created_at", { ascending: false });

      if (!aError) {
        setActivities(aData || []);
      }
    } catch (error) {
      console.error("Error fetching details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignDoctor = async (doctorId: string) => {
    try {
      setAssigning(true);
      const res = await fetch(`/api/admin/cases/${caseId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId }),
      });

      if (!res.ok) throw new Error("Failed to assign doctor");
      await fetchData(caseId);
    } catch (error) {
      console.error(error);
      alert("Error assigning doctor");
    } finally {
      setAssigning(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    try {
      setAddingNote(true);
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.from("mt_case_activities").insert({
        case_id: caseId,
        action: "Internal Note Added",
        details: { message: noteText, type: "internal_note" }
      });

      if (error) throw error;
      setNoteText("");
      await fetchData(caseId);
    } catch (err) {
      console.error("Failed to add note", err);
      alert("Failed to save note.");
    } finally {
      setAddingNote(false);
    }
  };

  const handleManualSync = async (target: string) => {
    try {
      const supabase = getSupabaseBrowser();
      await supabase.from("mt_sync_queue").insert({
        case_id: caseId,
        target_system: target,
        operation: "insert",
        payload: { reference_id: caseData?.reference_id, case_type: "manual_sync" }
      });
      alert(`Sync triggered for ${target}`);
    } catch (err) {
      alert("Failed to trigger sync");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-mt-primary" />
      </div>
    );
  }

  if (!caseData) return <div>Case not found</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="sm" className="shrink-0 h-10 w-10 p-0 sm:h-9 sm:w-auto sm:px-3">
            <Link href="/admin/operations/cases">
              <ArrowLeft className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Back</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-mt-text">Case #{caseId.substring(0, 8)}</h1>
            <p className="text-sm text-mt-text-secondary">{caseData.patient_name}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => handleManualSync('google_sheets')} className="h-11 sm:h-9">
            <RefreshCw className="mr-2 h-4 w-4" /> Sync Sheets
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleManualSync('glow_homeo')} className="h-11 sm:h-9">
            <RefreshCw className="mr-2 h-4 w-4" /> Sync Clinic
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Left Column: Details & Assignment */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="rounded-2xl border border-mt-border bg-white text-mt-text p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col space-y-1.5 pb-6">
              <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2">
                <FileText className="h-5 w-5 text-mt-primary" />
                Patient Information
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-mt-text-secondary mb-1">Patient Name</p>
                <p className="font-semibold text-lg">{caseData.patient_name || "Unknown"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-mt-text-secondary mb-1">Status</p>
                <p className="font-semibold capitalize text-mt-primary inline-flex px-2 py-1 bg-mt-primary/10 rounded-md text-sm">{caseData.status}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-mt-text-secondary mb-1">Email</p>
                <p className="font-medium text-slate-700 break-all">{caseData.patient_email || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-mt-text-secondary mb-1">Phone</p>
                <p className="font-medium text-slate-700">{caseData.patient_phone || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-mt-text-secondary mb-1">Payment Status</p>
                <p className="font-medium capitalize text-mt-text">{caseData.payment_status || "Pending"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-mt-text-secondary mb-1">Reference ID</p>
                <p className="font-mono text-sm text-slate-500">{caseData.reference_id || "N/A"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-mt-border bg-white text-mt-text p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col space-y-1.5 pb-6">
              <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-mt-primary" />
                Clinical Assignment
              </h3>
            </div>
            <div className="space-y-6">
              {caseData.doctor ? (
                <div className="rounded-xl border border-mt-success/20 bg-mt-success/5 p-4 flex items-center gap-4">
                  <CheckCircle2 className="h-10 w-10 text-mt-success shrink-0" />
                  <div>
                    <p className="font-bold text-lg text-mt-text">Dr. {caseData.doctor.full_name}</p>
                    <p className="text-sm text-mt-text-secondary font-medium">{caseData.doctor.specialization}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-mt-text-secondary font-medium bg-orange-50 text-orange-800 p-3 rounded-lg border border-orange-100">
                    This case is currently unassigned. Please allocate it to an available doctor below.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {doctors.map((doc) => (
                      <div key={doc.id} className="flex flex-col justify-between p-4 border border-mt-border rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                        <div className="mb-4">
                          <p className="font-bold">Dr. {doc.full_name}</p>
                          <p className="text-xs text-mt-text-secondary font-medium">{doc.specialization}</p>
                        </div>
                        <Button 
                          size="sm" 
                          className="w-full h-10"
                          onClick={() => handleAssignDoctor(doc.id)}
                          disabled={assigning}
                        >
                          {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign to Case"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Activity Log & Notes */}
        <div className="rounded-2xl border border-mt-border bg-white flex flex-col h-[600px] lg:h-auto overflow-hidden shadow-sm">
          <div className="p-5 border-b border-mt-border bg-gray-50/50 shrink-0">
            <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-mt-primary" />
              Activity & Internal Notes
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50">
            {activities.map((act) => {
              const isNote = act.details?.type === "internal_note";
              return (
                <div key={act.id} className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-[-24px] before:w-px before:bg-mt-border last:before:hidden">
                  <div className={`absolute left-[3px] top-1.5 h-2.5 w-2.5 rounded-full outline outline-4 outline-slate-50 ${isNote ? 'bg-blue-500' : 'bg-mt-primary'}`}></div>
                  <div className="mb-1">
                    <span className="font-semibold text-sm text-mt-text">{act.action}</span>
                  </div>
                  <div className={`text-sm ${isNote ? 'bg-white p-3 rounded-lg border border-blue-100 shadow-sm mt-2 font-medium text-slate-700' : 'text-mt-text-secondary'}`}>
                    {act.details?.message || JSON.stringify(act.details)}
                  </div>
                  <p className="text-xs text-mt-text-secondary/70 mt-1.5 font-medium">
                    {new Date(act.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              );
            })}
            {activities.length === 0 && (
              <div className="text-center text-sm text-mt-text-secondary italic">No activity recorded yet.</div>
            )}
          </div>

          <div className="p-4 border-t border-mt-border bg-white shrink-0">
            <form onSubmit={handleAddNote} className="flex gap-2">
              <input 
                type="text" 
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add an internal note..." 
                className="flex-1 bg-gray-50 border border-mt-border rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-mt-primary/50"
                disabled={addingNote}
              />
              <Button type="submit" disabled={addingNote || !noteText.trim()} className="shrink-0 h-auto py-2">
                {addingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
              </Button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
