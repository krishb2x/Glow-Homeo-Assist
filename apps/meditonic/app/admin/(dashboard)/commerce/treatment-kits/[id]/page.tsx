"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowser } from "../../../../../../lib/supabase-browser";
import { formatPrice, getImageUrl } from "../../../../../../lib/utils";
import { ArrowLeft, Loader2, Save, CheckCircle2, HelpCircle, XCircle, FileText, Image, MessageSquare, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function DoctorCaseReviewDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState<any>(null);
  const [doctorNotes, setDoctorNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);

  const fetchCaseDetails = async () => {
    try {
      const supabase = getSupabaseBrowser();

      // 1. Fetch Case
      const { data: c, error } = await supabase
        .from("mt_cases")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setCaseData(c);
      setDoctorNotes(c.doctor_notes || "");

      // 2. Fetch Case Activities
      const { data: act } = await supabase
        .from("mt_case_activities")
        .select("*")
        .eq("case_id", id)
        .order("created_at", { ascending: false });

      setActivities(act || []);

      // 3. Auto-transition "new" status to "under_review"
      if (c.status === "new") {
        await supabase
          .from("mt_cases")
          .update({ status: "under_review" })
          .eq("id", id);
        
        await supabase.from("mt_case_activities").insert({
          case_id: id,
          action: "Status Change",
          details: { message: "Doctor opened case for review", status: "under_review" }
        });

        // Update local state status to reflect the transition
        setCaseData((prev: any) => ({ ...prev, status: "under_review" }));
      }

    } catch (err) {
      console.error("Error fetching case details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchCaseDetails();
  }, [id]);

  const updateCaseStatus = async (newStatus: "approved" | "more_information_required" | "rejected") => {
    setSaving(true);
    try {
      const supabase = getSupabaseBrowser();
      
      // If approved, advance the workflow status to "address_collection"
      const updates: any = {
        status: newStatus,
        doctor_notes: doctorNotes,
        updated_at: new Date().toISOString()
      };

      if (newStatus === "approved") {
        updates.workflow_status = "address_collection";
      }

      const { error } = await supabase
        .from("mt_cases")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      // Log Activity
      await supabase.from("mt_case_activities").insert({
        case_id: id,
        action: newStatus === "approved" ? "Approved" : newStatus === "rejected" ? "Rejected" : "Information Requested",
        details: { message: `Doctor set status to ${newStatus}`, notes: doctorNotes }
      });

      alert(`Case successfully marked as ${newStatus.replace("_", " ")}.`);
      router.push("/admin/commerce/treatment-kits");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const saveNotesOnly = async () => {
    setSaving(true);
    try {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase
        .from("mt_cases")
        .update({ doctor_notes: doctorNotes, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      alert("Notes saved successfully.");
      fetchCaseDetails();
    } catch (err: any) {
      console.error(err);
      alert(`Failed to save notes: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="bg-red-50 text-red-800 p-6 rounded-2xl border border-red-200 text-center max-w-lg mx-auto mt-10">
        <ShieldAlert className="w-12 h-12 text-red-600 mx-auto mb-3" />
        <h2 className="font-bold text-lg">Case Not Found</h2>
        <p className="text-sm mt-1">The requested Treatment Kit case does not exist or has been removed.</p>
        <Link href="/admin/commerce/treatment-kits" className="inline-flex mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
          Go Back
        </Link>
      </div>
    );
  }

  const { symptoms = [], photoUrl = null, reportUrl = null, kit_title = "" } = caseData.metadata || {};

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/commerce/treatment-kits" className="p-2 border rounded-xl bg-white text-slate-600 hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <span className="text-[10px] font-bold tracking-wider uppercase bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
            {kit_title || caseData.treatment_type?.replace("-", " ") || "Treatment Kit"}
          </span>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">Review Case: {caseData.patient_name}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Columns - Triage Details & Notes */}
        <div className="md:col-span-2 space-y-6">
          {/* Patient Profile */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
              1. Patient Profile
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-slate-400 block text-xs">Age</span>
                <span className="font-semibold text-slate-800">{caseData.age ? `${caseData.age} Years` : "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs">Gender</span>
                <span className="font-semibold text-slate-800 capitalize">{caseData.gender || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs">Phone</span>
                <span className="font-semibold text-slate-800">{caseData.mobile}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs">Email</span>
                <span className="font-semibold text-slate-800 truncate block">{caseData.email || "N/A"}</span>
              </div>
            </div>
          </div>

          {/* Intake Answers */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
              2. Intake Questionnaire & Checked Symptoms
            </h2>
            
            {symptoms.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {symptoms.map((s: string) => (
                  <span key={s} className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg">
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No checklist symptoms selected.</p>
            )}

            <div className="pt-2">
              <span className="text-slate-400 block text-xs mb-1">Details/Concerns</span>
              <div className="bg-slate-50 border p-4 rounded-xl text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {caseData.description || <span className="italic text-slate-400">No additional details provided.</span>}
              </div>
            </div>
          </div>

          {/* Uploaded Files */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
              3. Attached Files & Photos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Photo */}
              <div className="p-4 border rounded-xl bg-slate-50">
                <span className="block text-xs font-bold text-slate-500 mb-2">Affected Area Photo</span>
                {photoUrl ? (
                  <div className="space-y-2">
                    <div className="aspect-[4/3] rounded-lg overflow-hidden border bg-white relative">
                      <img src={getImageUrl(photoUrl)} alt="Affected Area" className="w-full h-full object-cover" />
                    </div>
                    <a href={getImageUrl(photoUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline">
                      <Image className="w-3.5 h-3.5" /> View Full Image
                    </a>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic block py-4 text-center">No photo attached.</span>
                )}
              </div>

              {/* Report */}
              <div className="p-4 border rounded-xl bg-slate-50">
                <span className="block text-xs font-bold text-slate-500 mb-2">Clinical Reports</span>
                {reportUrl ? (
                  <div className="h-full flex flex-col justify-between py-2">
                    <div className="flex items-center gap-2 bg-white border p-3 rounded-lg shadow-sm">
                      <FileText className="w-6 h-6 text-indigo-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs text-slate-700 font-semibold truncate block">Medical Report Document</span>
                        <span className="text-[10px] text-slate-400 block">PDF / Image File</span>
                      </div>
                    </div>
                    <a href={getImageUrl(reportUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline mt-4">
                      <FileText className="w-3.5 h-3.5" /> View / Download Document
                    </a>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic block py-4 text-center">No reports attached.</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Actions & Activity */}
        <div className="space-y-6">
          {/* Notes and Triage Box */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 border-t-4 border-t-indigo-600">
            <h2 className="font-bold text-slate-800 text-sm">Doctor Triage Actions</h2>
            
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-500">Doctor Notes (For Case Sheet)</label>
              <textarea
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                rows={5}
                placeholder="Enter clinical observations, constitutional analysis, or customized kit directions here..."
                className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={saveNotesOnly}
                disabled={saving}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-200"
              >
                <Save className="w-3.5 h-3.5" /> Save Notes Only
              </button>

              <div className="border-t border-slate-100 my-4 pt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => updateCaseStatus("approved")}
                  disabled={saving}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve Treatment Kit
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateCaseStatus("more_information_required")}
                    disabled={saving}
                    className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition-colors border border-purple-200"
                  >
                    <HelpCircle className="w-3.5 h-3.5" /> Request Info
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCaseStatus("rejected")}
                    disabled={saving}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition-colors border border-red-200"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject Case
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline / Case Activity */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-slate-400" /> Case Activity Timeline
            </h2>
            <div className="relative border-l-2 border-slate-100 pl-4 space-y-5 text-xs">
              {activities.map((act) => (
                <div key={act.id} className="relative">
                  <div className="absolute -left-[21px] top-1.5 bg-white border-2 border-indigo-500 rounded-full w-2.5 h-2.5" />
                  <div className="font-semibold text-slate-700">{act.action}</div>
                  <div className="text-slate-500 mt-0.5">{act.details?.message || JSON.stringify(act.details)}</div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {new Date(act.created_at).toLocaleString("en-IN", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
