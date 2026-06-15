"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, Eye, EyeOff, HeartHandshake, Sparkles } from "lucide-react";
import { getSupabaseBrowser } from "../../lib/supabase-browser";
import Link from "next/link";

export default function PartnerLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [postLoginPath, setPostLoginPath] = useState("/partner-dashboard");

  useEffect(() => {
    // Extract next/redirectTo parameter
    const q = new URLSearchParams(window.location.search);
    const n = q.get("next") || q.get("redirectTo");
    if (n && n.startsWith("/") && !n.startsWith("//")) {
      setPostLoginPath(n);
    }
  }, []);

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

      // Write session cookies for Edge middleware protection
      document.cookie = `meditonic_session=${data.session.access_token}; path=/; max-age=28800; SameSite=Lax`;
      document.cookie = `meditonic_role=partner; path=/; max-age=28800; SameSite=Lax`;

      router.push(postLoginPath);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row font-sans overflow-x-hidden select-none animate-in fade-in duration-500">
      {/* Left Panel - Branding & Info (Hidden on Mobile) */}
      <div className="hidden md:flex md:w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12 lg:p-16 border-r border-slate-800/80">
        {/* Background glow effects */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-[100px] -z-10"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-teal-500/10 to-transparent rounded-full blur-[100px] -z-10"></div>
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-teal-800 flex items-center justify-center text-white font-serif font-black shadow-lg shadow-emerald-500/15">
            M
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 block uppercase tracking-widest leading-none">MediTonic</span>
            <span className="font-extrabold text-sm text-white tracking-tight mt-0.5 block">Partner Program</span>
          </div>
        </div>

        <div className="my-auto max-w-lg space-y-6">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Premium Health Operating System
          </span>
          <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
            Empower Patients. <br/>
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent font-black">Earn Commissions.</span>
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed font-medium">
            Recommend Dr. Aman Agrawal's premium homeopathy treatment programs, kits, and digital resources to your clients. Gain full visibility into your conversions, monthly payouts, and promo resources.
          </p>

          <div className="grid grid-cols-2 gap-6 pt-4">
            <div>
              <h4 className="text-2xl font-black text-white">Up to 20%</h4>
              <p className="text-slate-400 text-xs font-semibold mt-1">High conversion commissions</p>
            </div>
            <div>
              <h4 className="text-2xl font-black text-white">30-Day</h4>
              <p className="text-slate-400 text-xs font-semibold mt-1">Attribution cookie tracking</p>
            </div>
          </div>
        </div>

        <div className="text-slate-500 text-xs font-semibold">
          &copy; {new Date().getFullYear()} MediTonic Health. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full md:w-1/2 min-h-screen flex items-center justify-center p-6 sm:p-12 bg-slate-950 relative overflow-hidden">
        {/* Background glow for mobile */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/5 rounded-full blur-[80px] -z-10 md:hidden"></div>
        
        <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl p-8 shadow-2xl shadow-emerald-950/20 border border-slate-200 relative">
          <div className="flex justify-center mb-6 md:hidden">
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 shadow-sm">
              <HeartHandshake className="w-8 h-8" />
            </div>
          </div>

          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1 text-center md:text-left">Partner Portal</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-6 text-center md:text-left">MediTonic Affiliates</p>

          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-2xl text-xs font-bold mb-6 text-center animate-shake">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
              <input 
                required 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:border-slate-800 focus:bg-white transition-all shadow-inner" 
              />
            </div>
            
            <div className="space-y-1.5 relative">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</label>
              <div className="relative">
                <input 
                  required 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-4 pr-11 py-3.5 text-sm font-semibold focus:outline-none focus:border-slate-800 focus:bg-white transition-all shadow-inner" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            <button 
              disabled={loading} 
              type="submit" 
              className="w-full mt-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-75 text-white font-black text-xs uppercase tracking-wider py-4.5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-slate-900/10"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="mt-8 text-center pt-5 border-t border-slate-100">
            <p className="text-slate-400 text-xs font-bold">
              Not an active partner yet? <Link href="/partners" className="text-emerald-600 font-extrabold hover:underline">Apply now</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

