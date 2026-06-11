"use client";

import React, { useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "../../../lib/supabase-browser";
import { formatPrice, getImageUrl } from "../../../lib/utils";
import { UploadCloud, CheckCircle2, ShieldCheck, AlertCircle, ArrowLeft, Loader2, FileText, Image } from "lucide-react";

interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  original_price?: number;
  cover_image_path?: string;
}

const SYMPTOMS_BY_SLUG: Record<string, string[]> = {
  "hair-fall": [
    "Receding Hairline (माथे के बाल कम होना)",
    "Crown Thinning (सिर के बीच के बाल पतले होना)",
    "Widening Partition / Female Pattern (मांग चौड़ी होना)",
    "Severe Hair Fall / Strands on Pillow (बहुत अधिक बाल झड़ना)",
    "Dandruff / Itchy Scalp (रूसी / खुजलीदार खोपड़ी)",
    "Family History of Baldness (गंजेपन का पारिवारिक इतिहास)",
  ],
  "skin": [
    "Acne / Pimples (मुंहासे)",
    "Dark Spots / Pigmentation (काले धब्बे / झाइयां)",
    "Melasma (मेलाज्मा / झाइयां)",
    "Dry / Flaky Skin (रूखी त्वचा)",
    "Oily / Greasy Skin (तैलीय त्वचा)",
    "Itching / Eczema (खुजली / एक्जिमा)",
  ],
  "pcos": [
    "Irregular Periods (अनियमित मासिक धर्म)",
    "Unexplained Weight Gain (वजन बढ़ना)",
    "Excessive Facial/Body Hair (चेहरे/शरीर पर अधिक बाल होना)",
    "Severe Hormonal Acne (हार्मोनल मुंहासे)",
    "Mood Swings / Fatigue (मूड बदलना / थकान)",
  ],
  "thyroid": [
    "Weight Gain / Difficulty Losing Weight (वजन बढ़ना)",
    "Constant Fatigue / Muscle Weakness (लगातार थकान / कमजोरी)",
    "Dry Skin / Hair Thinning (रूखी त्वचा / बालों का झड़ना)",
    "Feeling Excessively Cold (अधिक ठंड लगना)",
    "Constipation / Bloating (कब्ज / पेट फूलना)",
  ],
};

const DEFAULT_SYMPTOMS = [
  "Mild Pain / Discomfort (हल्का दर्द / बेचैनी)",
  "Chronic Symptoms (> 6 months) (6 महीने से अधिक समय से लक्षण)",
  "Disturbed Sleep (नींद में खलल)",
  "Low Energy / Fatigue (कम ऊर्जा / थकान)",
];

export default function TreatmentKitClient({ product }: { product: Product }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingReport, setUploadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form States
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [symptomDescription, setSymptomDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [reportUrl, setReportUrl] = useState("");

  const symptomsList = SYMPTOMS_BY_SLUG[product.slug] || DEFAULT_SYMPTOMS;

  const handleSymptomToggle = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((item) => item !== symptom)
        : [...prev, symptom]
    );
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "photo" | "report"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === "photo") setUploadingPhoto(true);
    else setUploadingReport(true);

    try {
      const supabase = getSupabaseBrowser();
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `cases/${fileName}`;
      const bucket = "meditonic-public";

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const fullPath = `${bucket}/${filePath}`;
      if (type === "photo") {
        setPhotoUrl(fullPath);
      } else {
        setReportUrl(fullPath);
      }
    } catch (err: any) {
      console.error("File upload error:", err);
      alert(`File upload failed: ${err.message}`);
    } finally {
      if (type === "photo") setUploadingPhoto(false);
      else setUploadingReport(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !phone || !gender || !age) {
      setError("Please fill in all patient profile fields.");
      return;
    }

    setLoading(true);

    try {
      // 1. Call Create Order API
      const res = await fetch("/api/treatment-kit-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email: email || undefined,
          age: Number(age),
          gender,
          symptoms: selectedSymptoms,
          symptomDescription,
          slug: product.slug,
          photoUrl,
          reportUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create order");

      // 2. Open Razorpay Checkout Modal
      const options = {
        key: process.env.NEXT_PUBLIC_MEDITONIC_RAZORPAY_KEY_ID || "rzp_test_placeholder",
        amount: data.amount,
        currency: "INR",
        name: "MediTonic Care",
        description: `Assessment - ${product.title}`,
        order_id: data.razorpayOrderId,
        handler: function (response: any) {
          router.push(`/payment-success?case_id=${data.caseId}`);
        },
        prefill: {
          name,
          contact: phone,
          email: email || "",
        },
        theme: { color: "#1B6B5C" },
      };

      if ((window as any).Razorpay) {
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        // If Razorpay not loaded (like in dev without script), redirect to mock success page directly
        if (process.env.NODE_ENV === "development") {
          console.warn("Razorpay script not available. Redirecting to mock success.");
          router.push(`/payment-success?case_id=${data.caseId}`);
        } else {
          throw new Error("Payment gateway scripts failed to load. Please check your internet connection.");
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during submission.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-slate-200 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg text-slate-800">MediTonic Clinical Assessment</h1>
            <p className="text-xs text-slate-500">Root-Cause Constitutional Homeopathy</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Product Summary & Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {product.cover_image_path && (
              <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative">
                <img
                  src={getImageUrl(product.cover_image_path)}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-5 space-y-4">
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 px-2 py-1 rounded">
                  Treatment Kit
                </span>
                <h2 className="text-xl font-bold mt-2 text-slate-900">{product.title}</h2>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">{product.description}</p>
              
              <div className="border-t border-slate-100 pt-4 flex justify-between items-baseline">
                <span className="text-xs font-semibold text-slate-500">Review Fee</span>
                <div className="text-right">
                  {product.original_price && product.original_price > product.price && (
                    <span className="text-xs text-slate-400 line-through mr-2">
                      {formatPrice(product.original_price)}
                    </span>
                  )}
                  <span className="text-2xl font-bold text-emerald-700">{formatPrice(product.price)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              How the process works:
            </h3>
            <ol className="text-xs text-emerald-800 space-y-3 list-decimal list-inside pl-1 leading-relaxed">
              <li>Submit patient details and pay the case review fee.</li>
              <li>Dr. Aman reviews the case (normally within 12-24 hours).</li>
              <li>Upon approval, enter your shipping address.</li>
              <li>Your custom medicine kit is dispatched to your door.</li>
            </ol>
          </div>
        </div>

        {/* Right Column: Intake Form */}
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              Intake Consultation Form
            </h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {error}
              </div>
            )}

            {/* Section 1: Patient Profile */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">1. Patient Profile</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Mobile Phone (WhatsApp) *</label>
                  <input
                    required
                    type="tel"
                    pattern="[0-9]{10}"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit number"
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. rahul@gmail.com"
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Age *</label>
                    <input
                      required
                      type="number"
                      min="1"
                      max="120"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="Age"
                      className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Gender *</label>
                    <select
                      required
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                    >
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Symptoms & Problem */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">2. Symptoms Checklist</h3>
              <p className="text-xs text-slate-500 mb-2">Check any symptoms that apply to you:</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {symptomsList.map((symptom) => (
                  <label
                    key={symptom}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                      selectedSymptoms.includes(symptom)
                        ? "bg-emerald-50/70 border-emerald-300 text-emerald-900"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSymptoms.includes(symptom)}
                      onChange={() => handleSymptomToggle(symptom)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 mt-0.5"
                    />
                    <span>{symptom}</span>
                  </label>
                ))}
              </div>

              <div className="mt-4">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Describe your problem in detail (लक्षणों का विवरण)
                </label>
                <textarea
                  value={symptomDescription}
                  onChange={(e) => setSymptomDescription(e.target.value)}
                  rows={4}
                  placeholder="Tell us when it started, what treatments you've tried, or any general concerns."
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Section 3: Uploads */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">3. Attachments (Optional)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Photo Upload */}
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                  <label className="block text-xs font-semibold text-slate-600 mb-2">
                    Photos of the affected area (e.g. Hair partition / skin)
                  </label>
                  {photoUrl ? (
                    <div className="flex items-center justify-between bg-white border p-2 rounded-lg">
                      <span className="text-xs truncate max-w-[200px] flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Photo Uploaded
                      </span>
                      <button type="button" onClick={() => setPhotoUrl("")} className="text-red-500 text-xs font-semibold">Remove</button>
                    </div>
                  ) : (
                    <div className="relative border border-dashed border-slate-300 p-4 rounded-lg text-center bg-white cursor-pointer hover:bg-slate-50">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, "photo")}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={uploadingPhoto}
                      />
                      {uploadingPhoto ? (
                        <div className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-emerald-600"/> <span className="text-xs text-slate-500">Uploading...</span></div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-500">
                          <Image className="w-5 h-5 text-slate-400" />
                          <span className="text-xs">Select Image File</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Report Upload */}
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                  <label className="block text-xs font-semibold text-slate-600 mb-2">
                    Recent blood reports or clinical files (PDF/Images)
                  </label>
                  {reportUrl ? (
                    <div className="flex items-center justify-between bg-white border p-2 rounded-lg">
                      <span className="text-xs truncate max-w-[200px] flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Report Uploaded
                      </span>
                      <button type="button" onClick={() => setReportUrl("")} className="text-red-500 text-xs font-semibold">Remove</button>
                    </div>
                  ) : (
                    <div className="relative border border-dashed border-slate-300 p-4 rounded-lg text-center bg-white cursor-pointer hover:bg-slate-50">
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={(e) => handleFileUpload(e, "report")}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={uploadingReport}
                      />
                      {uploadingReport ? (
                        <div className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-emerald-600"/> <span className="text-xs text-slate-500">Uploading...</span></div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-500">
                          <FileText className="w-5 h-5 text-slate-400" />
                          <span className="text-xs">Select PDF / Image</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || uploadingPhoto || uploadingReport}
              className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Razorpay Session...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  Pay {formatPrice(product.price)} & Submit Assessment
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
