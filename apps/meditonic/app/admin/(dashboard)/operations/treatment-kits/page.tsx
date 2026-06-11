"use client";

import React, { useEffect, useState } from "react";
import { getSupabaseBrowser } from "../../../../../lib/supabase-browser";
import { BRAND } from "../../../../../lib/constants";
import { 
  Loader2, 
  MapPin, 
  Printer, 
  Package, 
  Truck, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Search, 
  X,
  FileText,
  User,
  Info
} from "lucide-react";

const STAGES = [
  { id: "doctor_review", label: "Doctor Review", color: "bg-blue-50 border-blue-200 text-blue-800" },
  { id: "address_collection", label: "Address Collection", color: "bg-purple-50 border-purple-200 text-purple-800" },
  { id: "case_sheet_generation", label: "Case Sheet", color: "bg-indigo-50 border-indigo-200 text-indigo-800" },
  { id: "packing_queue", label: "Packing Queue", color: "bg-amber-50 border-amber-200 text-amber-800" },
  { id: "ready_to_ship", label: "Ready To Ship", color: "bg-orange-50 border-orange-200 text-orange-800" },
  { id: "on_the_way", label: "On The Way", color: "bg-teal-50 border-teal-200 text-teal-800" },
  { id: "delivered", label: "Delivered", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
];

export default function TreatmentKitsOperationsBoard() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"kanban" | "list">("kanban");

  // Modals state
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [modalType, setModalType] = useState<"address" | "ship" | null>(null);
  const [address, setAddress] = useState("");
  const [operationsNotes, setOperationsNotes] = useState("");
  const [courierName, setCourierName] = useState("Delhivery");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shippingNotes, setShippingNotes] = useState("");
  const [shippingDate, setShippingDate] = useState(new Date().toISOString().split("T")[0]);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCases = async () => {
    try {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from("mt_cases")
        .select("*")
        .eq("clinic_id", BRAND.clinicId)
        .eq("case_type", "treatment_kit")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCases(data || []);
    } catch (err) {
      console.error("Error fetching cases:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  // Filter cases based on search
  const filteredCases = cases.filter(
    (c) =>
      c.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.mobile.includes(searchTerm) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group cases by stage
  const casesByStage = STAGES.reduce((acc, stage) => {
    acc[stage.id] = filteredCases.filter((c) => c.workflow_status === stage.id);
    return acc;
  }, {} as Record<string, any[]>);

  // Determine cases requiring action right now
  const actionRequiredCases = filteredCases.filter((c) => {
    if (c.workflow_status === "address_collection" && c.status === "approved") return true;
    if (c.workflow_status === "case_sheet_generation") return true;
    if (c.workflow_status === "packing_queue") return true;
    if (c.workflow_status === "ready_to_ship") return true;
    return false;
  });

  const openAddressModal = (c: any) => {
    setSelectedCase(c);
    setAddress(c.address || "");
    setOperationsNotes(c.operations_notes || "");
    setModalType("address");
  };

  const openShipModal = (c: any) => {
    setSelectedCase(c);
    setCourierName(c.courier_name || "Delhivery");
    setTrackingNumber(c.tracking_number || "");
    setShippingNotes(c.shipping_notes || "");
    setShippingDate(new Date().toISOString().split("T")[0]);
    setModalType("ship");
  };

  const handleSaveAddress = async () => {
    if (!address.trim()) {
      alert("Please enter an address.");
      return;
    }
    setActionLoading(true);
    try {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase
        .from("mt_cases")
        .update({
          address,
          operations_notes: operationsNotes,
          workflow_status: "case_sheet_generation",
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedCase.id);

      if (error) throw error;

      await supabase.from("mt_case_activities").insert({
        case_id: selectedCase.id,
        action: "Address Confirmed",
        details: { message: "Patient shipping address collected", address, notes: operationsNotes },
      });

      setModalType(null);
      fetchCases();
    } catch (err: any) {
      alert(`Error updating address: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveShipment = async () => {
    if (!trackingNumber.trim()) {
      alert("Please enter a tracking number.");
      return;
    }
    setActionLoading(true);
    try {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase
        .from("mt_cases")
        .update({
          courier_name: courierName,
          tracking_number: trackingNumber,
          shipping_notes: shippingNotes,
          shipped_at: new Date(shippingDate).toISOString(),
          workflow_status: "on_the_way",
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedCase.id);

      if (error) throw error;

      await supabase.from("mt_case_activities").insert({
        case_id: selectedCase.id,
        action: "Shipped",
        details: { 
          message: `Kit shipped via ${courierName}`, 
          trackingNumber, 
          courierName, 
          shippedAt: shippingDate,
          notes: shippingNotes
        },
      });

      setModalType(null);
      fetchCases();
    } catch (err: any) {
      alert(`Error saving shipment: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrintCaseSheet = async (c: any) => {
    // 1. Open Case Sheet in new tab
    window.open(`/admin/operations/treatment-kits/case-sheet/${c.id}`, "_blank");

    // 2. Auto-transition case to packing_queue in background
    try {
      const supabase = getSupabaseBrowser();
      await supabase
        .from("mt_cases")
        .update({
          workflow_status: "packing_queue",
          updated_at: new Date().toISOString(),
        })
        .eq("id", c.id);

      await supabase.from("mt_case_activities").insert({
        case_id: c.id,
        action: "Case Sheet Generated",
        details: { message: "Case sheet was printed/downloaded" },
      });

      fetchCases();
    } catch (err) {
      console.error("Failed to transition status on print:", err);
    }
  };

  const handleMarkPacked = async (c: any) => {
    try {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase
        .from("mt_cases")
        .update({
          workflow_status: "ready_to_ship",
          packed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", c.id);

      if (error) throw error;

      await supabase.from("mt_case_activities").insert({
        case_id: c.id,
        action: "Packed",
        details: { message: "Medicine kit packed and sealed" },
      });

      fetchCases();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleMarkDelivered = async (c: any) => {
    try {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase
        .from("mt_cases")
        .update({
          workflow_status: "delivered",
          delivered_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", c.id);

      if (error) throw error;

      await supabase.from("mt_case_activities").insert({
        case_id: c.id,
        action: "Delivered",
        details: { message: "Kit successfully delivered to patient" },
      });

      fetchCases();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Script Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Treatment Kit Operations</h1>
          <p className="text-sm text-slate-500 mt-1">Manage physical kit packing, address collection, and courier fulfillment.</p>
        </div>
        
        <div className="relative flex w-full sm:max-w-xs shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search cases..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-indigo-500 bg-white"
          />
        </div>
      </div>

      {/* QUICK ACTION CENTER: "What cases require action right now?" */}
      <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-5 space-y-4 border-t-4 border-t-rose-500">
        <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-500" />
          Action Center: What cases require action right now? ({actionRequiredCases.length})
        </h2>

        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
        ) : actionRequiredCases.length === 0 ? (
          <p className="text-xs text-slate-500 italic flex items-center gap-1.5 bg-slate-50 p-3 rounded-lg"><Info className="w-4 h-4 text-slate-400"/> All caught up! No cases require immediate operational action.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {actionRequiredCases.map((c) => {
              let actionLabel = "";
              let actionFn = () => {};
              let badgeColor = "";

              if (c.workflow_status === "address_collection") {
                actionLabel = "Collect Address";
                actionFn = () => openAddressModal(c);
                badgeColor = "bg-purple-50 text-purple-700 border-purple-200";
              } else if (c.workflow_status === "case_sheet_generation") {
                actionLabel = "Print Case Sheet";
                actionFn = () => handlePrintCaseSheet(c);
                badgeColor = "bg-indigo-50 text-indigo-700 border-indigo-200";
              } else if (c.workflow_status === "packing_queue") {
                actionLabel = "Pack Medicine";
                actionFn = () => handleMarkPacked(c);
                badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
              } else if (c.workflow_status === "ready_to_ship") {
                actionLabel = "Ship & Add Tracker";
                actionFn = () => openShipModal(c);
                badgeColor = "bg-orange-50 text-orange-700 border-orange-200";
              }

              return (
                <div key={c.id} className="border border-slate-100 bg-slate-50/50 p-3 rounded-xl flex flex-col justify-between hover:bg-slate-50 transition-colors shadow-sm">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-semibold text-slate-800 text-xs truncate max-w-[120px]">{c.patient_name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${badgeColor}`}>
                        {c.workflow_status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 capitalize">{c.treatment_type?.replace("-", " ")}</p>
                  </div>
                  <button
                    onClick={actionFn}
                    className="mt-3 w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-1.5 rounded-lg text-[10px] transition-colors flex items-center justify-center gap-1"
                  >
                    {actionLabel}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* KANBAN BOARD VIEW */}
      {loading ? (
        <div className="flex h-[30vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-6 pt-2 snap-x scrollbar-thin">
          {STAGES.map((stage) => {
            const list = casesByStage[stage.id] || [];
            return (
              <div key={stage.id} className="w-80 shrink-0 flex flex-col bg-slate-100 rounded-2xl p-3 border border-slate-200 snap-align-start h-[600px]">
                {/* Stage Header */}
                <div className="flex justify-between items-center mb-3">
                  <h3 className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border shadow-sm capitalize ${stage.color}`}>
                    {stage.label}
                  </h3>
                  <span className="bg-white text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full border shadow-sm">
                    {list.length}
                  </span>
                </div>

                {/* Stage Card List */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                  {list.length === 0 ? (
                    <div className="h-28 border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 text-xs italic bg-white/50">
                      Empty
                    </div>
                  ) : (
                    list.map((c) => (
                      <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 hover:shadow-md transition-shadow">
                        <div>
                          <div className="font-semibold text-slate-800 text-sm">{c.patient_name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Phone: {c.mobile}</div>
                          <div className="text-[10px] text-slate-500 capitalize mt-1 bg-slate-100 inline-block px-1.5 py-0.5 rounded font-medium">
                            {c.treatment_type?.replace("-", " ") || "General"}
                          </div>
                        </div>

                        {/* Specific Stage info details */}
                        {c.address && (
                          <div className="bg-slate-50 p-2 rounded-lg border text-[10px] text-slate-600 font-medium">
                            <span className="font-bold text-slate-700 block mb-0.5">Address:</span>
                            <p className="line-clamp-2">{c.address}</p>
                          </div>
                        )}

                        {c.tracking_number && (
                          <div className="bg-indigo-50/50 p-2 rounded-lg border border-indigo-100 text-[10px] text-indigo-900">
                            <span className="font-bold block mb-0.5">Shipping:</span>
                            <p>{c.courier_name} - {c.tracking_number}</p>
                          </div>
                        )}

                        {/* NEXT ACTION BUTTONS */}
                        <div className="pt-2 border-t border-slate-100">
                          {stage.id === "doctor_review" && (
                            <span className="text-[10px] text-slate-400 italic block text-center py-1">Awaiting Doctor Triage</span>
                          )}

                          {stage.id === "address_collection" && (
                            c.status === "approved" ? (
                              <button
                                onClick={() => openAddressModal(c)}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
                              >
                                <MapPin className="w-3.5 h-3.5" /> Collect Address
                              </button>
                            ) : (
                              <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 font-semibold rounded p-1 text-center block">Pending Triage Review</span>
                            )
                          )}

                          {stage.id === "case_sheet_generation" && (
                            <button
                              onClick={() => handlePrintCaseSheet(c)}
                              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
                            >
                              <Printer className="w-3.5 h-3.5" /> Generate Case Sheet
                            </button>
                          )}

                          {stage.id === "packing_queue" && (
                            <button
                              onClick={() => handleMarkPacked(c)}
                              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
                            >
                              <Package className="w-3.5 h-3.5" /> Mark Packed
                            </button>
                          )}

                          {stage.id === "ready_to_ship" && (
                            <button
                              onClick={() => openShipModal(c)}
                              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
                            >
                              <Truck className="w-3.5 h-3.5" /> Mark Shipped
                            </button>
                          )}

                          {stage.id === "on_the_way" && (
                            <button
                              onClick={() => handleMarkDelivered(c)}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Mark Delivered
                            </button>
                          )}

                          {stage.id === "delivered" && (
                            <span className="text-[10px] text-emerald-600 font-bold block text-center py-1 flex items-center justify-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> Delivered Complete
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: COLLECT ADDRESS */}
      {modalType === "address" && selectedCase && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">Collect Patient Address</h3>
                <p className="text-xs text-slate-500">Post-Approval Shipping Details</p>
              </div>
              <button onClick={() => setModalType(null)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border text-xs text-slate-600">
                <p className="font-semibold text-slate-700">Patient: {selectedCase.patient_name}</p>
                <p className="mt-0.5">Phone: {selectedCase.mobile}</p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">Shipping Address *</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  placeholder="Enter full shipping address with street name, city, state, pincode, and land mark..."
                  className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">Operations Notes (Optional)</label>
                <textarea
                  value={operationsNotes}
                  onChange={(e) => setOperationsNotes(e.target.value)}
                  rows={2}
                  placeholder="Any delivery instructions, packaging notes, etc..."
                  className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 bg-white"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setModalType(null)}
                className="px-4 py-2 border rounded-xl text-slate-600 font-semibold hover:bg-slate-100 text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAddress}
                disabled={actionLoading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition-colors"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm & Move to Printing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SHIP ORDER */}
      {modalType === "ship" && selectedCase && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">Ship Medicine Kit</h3>
                <p className="text-xs text-slate-500">Register Tracking details</p>
              </div>
              <button onClick={() => setModalType(null)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600">Courier Partner *</label>
                  <select
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    <option value="Delhivery">Delhivery</option>
                    <option value="DTDC">DTDC</option>
                    <option value="Blue Dart">Blue Dart</option>
                    <option value="India Post">India Post</option>
                    <option value="Custom">Custom / Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600">Shipping Date</label>
                  <input
                    type="date"
                    value={shippingDate}
                    onChange={(e) => setShippingDate(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">Tracking ID / Waybill *</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">Shipping Notes (Optional)</label>
                <textarea
                  value={shippingNotes}
                  onChange={(e) => setShippingNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Fragile, Liquid bottle inside, express shipping..."
                  className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 bg-white"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setModalType(null)}
                className="px-4 py-2 border rounded-xl text-slate-600 font-semibold hover:bg-slate-100 text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveShipment}
                disabled={actionLoading}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition-colors"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Shipping & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
