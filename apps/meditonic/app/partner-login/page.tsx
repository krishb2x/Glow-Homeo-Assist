"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, Eye, EyeOff, HeartHandshake } from "lucide-react";
import { getSupabaseBrowser } from "../../lib/supabase-browser";
import Link from "next/link";

export default function PartnerLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = getSupabaseBrowser();
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        throw new Error("Invalid email or password");
      }

      // Check if this user is actually a partner
      const { data: partnerData, error: partnerError } = await supabase
        .from("mt_partners")
        .select("id, status")
        .eq("user_id", data.user.id)
        .single();

      if (partnerError || !partnerData) {
        await supabase.auth.signOut();
        throw new Error("Your account is not registered as a MediTonic Partner.");
      }

      if (partnerData.status !== "active") {
        await supabase.auth.signOut();
        throw new Error(`Your partner account is currently ${partnerData.status}.`);
      }

      router.push("/partner-dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white max-w-md w-full rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700">
            <HeartHandshake className="w-7 h-7" />
          </div>
        </div>
        <h1 className="text-2xl font-serif text-slate-900 text-center mb-2">Partner Portal</h1>
        <p className="text-slate-500 text-center text-sm mb-8">Sign in to track your referrals and commissions.</p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input 
              required type="email" value={email} onChange={(e) => setEmail(e.target.value)} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" 
            />
          </div>
          
          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              required type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" 
            />
            <button 
              type="button" onClick={() => setShowPassword(!showPassword)} 
              className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button disabled={loading} type="submit" className="w-full mt-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-70 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign In <ArrowRight className="w-5 h-5" /></>}
          </button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-slate-100">
          <p className="text-slate-500 text-sm">
            Not a partner yet? <Link href="/partners" className="text-emerald-700 font-semibold hover:underline">Apply here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
