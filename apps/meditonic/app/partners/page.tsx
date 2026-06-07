"use client";

import { useState } from "react";
import { Check, ArrowRight, Loader2, HeartHandshake, TrendingUp, Users } from "lucide-react";

export default function PartnersPage() {
  const [formData, setFormData] = useState({
    name: "", email: "", mobile: "", profession: "Doctor",
    instagramUrl: "", youtubeUrl: "", websiteUrl: "",
    audienceSize: "", city: "", state: "", whyPartner: ""
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: any) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/partners/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Submission failed");
      setSuccess(true);
    } catch (err: any) {
      setError("Failed to submit application. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-20 px-6">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16">
        
        {/* Left Side: Marketing Pitch */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-sm font-semibold mb-6">
            <HeartHandshake className="w-4 h-4" />
            MediTonic Partner Program
          </div>
          <h1 className="text-4xl md:text-5xl font-serif text-slate-900 mb-6 leading-tight">
            Help your audience discover true holistic healing.
          </h1>
          <p className="text-lg text-slate-600 mb-10 leading-relaxed">
            Join the MediTonic referral network. Whether you are a healthcare professional, an influencer, or an educator, partner with us to share premium homoeopathic care—and get rewarded for every successful referral.
          </p>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-12 h-12 shrink-0 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-lg mb-1">Earn Commissions</h3>
                <p className="text-slate-600 text-sm">Earn 10-25% commission on consultations, programs, and ebooks purchased through your unique code.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 shrink-0 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-lg mb-1">Exclusive Benefits</h3>
                <p className="text-slate-600 text-sm">Your audience gets a special discount when they use your code. It's a win-win for everyone.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Application Form */}
        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
          {success ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 mb-3">Application Received!</h2>
              <p className="text-slate-600 mb-8">
                Thank you for your interest. Our team will review your application and get back to you within 48 hours.
              </p>
              <button 
                onClick={() => setSuccess(false)}
                className="text-emerald-700 font-semibold hover:underline"
              >
                Submit another application
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-semibold text-slate-900 mb-6">Apply Now</h2>
              {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6">{error}</div>}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mobile</label>
                    <input required type="tel" name="mobile" value={formData.mobile} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Profession</label>
                  <select name="profession" value={formData.profession} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all">
                    <option>Doctor</option>
                    <option>Influencer</option>
                    <option>Educator</option>
                    <option>Healthcare Professional</option>
                    <option>Student</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Instagram URL</label>
                    <input type="url" name="instagramUrl" value={formData.instagramUrl} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Audience Size</label>
                    <input type="text" name="audienceSize" placeholder="e.g. 10k" value={formData.audienceSize} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                    <input required type="text" name="city" value={formData.city} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                    <input required type="text" name="state" value={formData.state} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Why do you want to partner with us?</label>
                  <textarea rows={3} name="whyPartner" value={formData.whyPartner} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none"></textarea>
                </div>

                <button disabled={loading} type="submit" className="w-full mt-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-70 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Submit Application <ArrowRight className="w-5 h-5" /></>}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
