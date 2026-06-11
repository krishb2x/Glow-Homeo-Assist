"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowser } from "../../../../../../../lib/supabase-browser";
import { formatPrice } from "../../../../../../../lib/utils";
import { Loader2, Printer, ArrowLeft, Download, RefreshCw, Layers } from "lucide-react";
import Link from "next/link";

type SizingType = "A5" | "A6" | "thermal";

export default function CaseSheetPrintPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState<any>(null);
  const [doctorName, setDoctorName] = useState("Dr. Aman Agrawal");
  const [pageSize, setPageSize] = useState<SizingType>("thermal");

  const fetchDetails = async () => {
    try {
      const supabase = getSupabaseBrowser();
      const { data: c, error } = await supabase
        .from("mt_cases")
        .select("*, doctor:profiles(full_name)")
        .eq("id", id)
        .single();

      if (error) throw error;
      setCaseData(c);
      
      if (c.doctor?.full_name) {
        setDoctorName(c.doctor.full_name);
      }
    } catch (err) {
      console.error("Error fetching case details for print:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDetails();
  }, [id]);

  // Handle printing
  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-slate-500 text-sm">Preparing Case Sheet...</p>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-4 p-6 bg-white rounded-2xl border max-w-sm">
          <p className="text-red-500 font-bold">Case Sheet Not Found</p>
          <button onClick={() => router.back()} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Formatting variables
  const formattedDate = new Date(caseData.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const getPageStyles = () => {
    switch (pageSize) {
      case "A5":
        return "w-[148mm] h-[210mm] max-h-[210mm] p-6 text-sm";
      case "A6":
        return "w-[105mm] h-[148mm] max-h-[148mm] p-4 text-xs";
      case "thermal":
      default:
        return "w-[100mm] h-[150mm] max-h-[150mm] p-4 text-xs"; // standard 4x6 label
    }
  };

  // Generate QR Code URL
  const qrCodeData = `https://meditonic.glowhomeo.com/admin/operations/treatment-kits?search=${caseData.id}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrCodeData)}`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-8 print:py-0 print:bg-white select-none">
      {/* Top Action Bar (hidden on print) */}
      <div className="w-full max-w-[148mm] bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-sm no-print space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-semibold">
            <ArrowLeft className="w-4 h-4" /> Operations Board
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Print Case Sheet
            </button>
            <button
              onClick={handlePrint}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reprint
            </button>
            <button
              onClick={handlePrint} // Print to PDF
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download PDF
            </button>
          </div>
        </div>

        {/* Size Selection Tabs */}
        <div className="border-t border-slate-100 pt-3 flex items-center gap-3">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sheet Size:</label>
          <div className="flex gap-1.5">
            {(["thermal", "A6", "A5"] as SizingType[]).map((size) => (
              <button
                key={size}
                onClick={() => setPageSize(size)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                  pageSize === size
                    ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {size === "thermal" ? "Thermal Label (4x6)" : `${size} Sheet`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CSS print style configurations injected dynamically */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: white !important;
            padding: 0 !important;
            margin: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: auto;
            margin: 0mm;
          }
        }
      `}</style>

      {/* Case Sheet Printable Container */}
      <div 
        className={`bg-white border border-slate-300 shadow-lg print:border-none print:shadow-none font-sans flex flex-col justify-between overflow-hidden relative leading-tight text-slate-800 ${getPageStyles()}`}
        style={{
          boxSizing: "border-box",
        }}
      >
        {/* Top Header Branding */}
        <div className="border-b-2 border-slate-800 pb-2 flex justify-between items-start">
          <div>
            <h2 className="font-extrabold text-sm tracking-tight text-slate-900">MEDITONIC CLINICAL CARE</h2>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">Constitutional Homeopathy</p>
          </div>
          <div className="text-right">
            <span className="font-bold text-[9px] bg-slate-900 text-white px-1.5 py-0.5 rounded uppercase tracking-wider">
              {caseData.treatment_type?.replace("-", " ") || "Treatment Kit"}
            </span>
            <p className="text-[9px] text-slate-500 mt-1 font-mono">{formattedDate}</p>
          </div>
        </div>

        {/* Case Info details grid */}
        <div className="grid grid-cols-3 gap-2 my-3 text-[10px] border-b border-slate-200 pb-2">
          <div className="col-span-2 space-y-1">
            <div>
              <span className="text-slate-400 text-[9px] uppercase font-semibold">Patient Name:</span>
              <p className="font-bold text-slate-900 text-xs">{caseData.patient_name}</p>
            </div>
            <div>
              <span className="text-slate-400 text-[9px] uppercase font-semibold">Phone:</span>
              <p className="font-semibold">{caseData.mobile}</p>
            </div>
            <div>
              <span className="text-slate-400 text-[9px] uppercase font-semibold">Case ID:</span>
              <p className="font-mono text-[9px]">{caseData.id}</p>
            </div>
          </div>
          
          <div className="col-span-1 flex flex-col justify-between items-end border-l pl-2 border-slate-100">
            <div className="text-right w-full">
              <span className="text-slate-400 text-[9px] uppercase font-semibold">Profile:</span>
              <p className="font-semibold text-slate-700 capitalize">{caseData.gender}, {caseData.age ? `${caseData.age} Yrs` : "N/A"}</p>
            </div>
            {/* Real QR Code generation */}
            <div className="w-12 h-12 border bg-slate-50 flex items-center justify-center overflow-hidden">
              <img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>

        {/* Shipping details (bold box) */}
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-300 text-[10px] my-2 leading-relaxed">
          <span className="font-extrabold text-slate-900 uppercase block tracking-wider text-[9px]">SHIPPING DESTINATION:</span>
          <p className="font-bold text-slate-800 mt-0.5 whitespace-pre-wrap">{caseData.address || "No shipping address confirmed."}</p>
        </div>

        {/* Clinical notes from Doctor */}
        <div className="flex-1 flex flex-col justify-start border-t border-slate-200 pt-2 my-2 overflow-hidden">
          <span className="text-slate-400 text-[9px] uppercase font-bold tracking-wider">DOCTOR NOTES & PRESCRIBED PROTOCOL:</span>
          <div className="text-[10px] text-slate-700 font-medium whitespace-pre-wrap leading-relaxed mt-1 overflow-y-auto max-h-[120px] pr-1">
            {caseData.doctor_notes || (
              <span className="italic text-slate-400 block pt-4 text-center">No doctor directions registered. Pack standard constitutional remedy list.</span>
            )}
          </div>
        </div>

        {/* Footer branding metadata */}
        <div className="border-t-2 border-slate-800 pt-2 mt-auto flex justify-between items-center text-[9px] text-slate-500 font-semibold uppercase">
          <div>
            <span>Prescribing Doctor: </span>
            <span className="text-slate-800 font-bold">{doctorName}</span>
          </div>
          <div className="text-right tracking-wider">
            <span>Powered by GlowHomeo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
