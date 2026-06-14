"use client";

import { useState, useEffect } from "react";
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
  const [timeString, setTimeString] = useState("09:41 AM");
  const [postLoginPath, setPostLoginPath] = useState("/partner-dashboard");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; 
      setTimeString(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);

    // Extract next/redirectTo parameter
    const q = new URLSearchParams(window.location.search);
    const n = q.get("next") || q.get("redirectTo");
    if (n && n.startsWith("/") && !n.startsWith("//")) {
      setPostLoginPath(n);
    }

    return () => clearInterval(interval);
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center font-sans md:py-6 select-none animate-in fade-in duration-500">
      
      {/* Phone Simulator Frame Shell on Desktop */}
      <div className="w-full md:max-w-md md:h-[840px] bg-white flex flex-col justify-between relative overflow-hidden md:rounded-[40px] md:shadow-2xl md:border-[10px] md:border-slate-800">
        
        {/* Notch - Speaker Notch Simulator */}
        <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-36 h-5.5 bg-slate-850 rounded-b-2xl z-55">
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-16 h-1 bg-slate-850 rounded-full"></div>
          <div className="absolute top-1 right-8 w-2 h-2 bg-slate-900 rounded-full border border-slate-950"></div>
        </div>

        {/* Dynamic Mobile OS Status Bar (Desktop Mockup Only) */}
        <div className="hidden md:flex items-center justify-between px-6 pt-5 pb-2 bg-white text-slate-800 text-[11px] shrink-0 select-none font-bold z-50">
          <div>{timeString}</div>
          <div className="flex items-center gap-2">
            <span className="flex items-end gap-0.5 h-2.5">
              <span className="w-0.5 h-1.2 bg-slate-850 rounded-sm"></span>
              <span className="w-0.5 h-1.6 bg-slate-850 rounded-sm"></span>
              <span className="w-0.5 h-2 bg-slate-850 rounded-sm"></span>
              <span className="w-0.5 h-2.4 bg-slate-850 rounded-sm"></span>
            </span>
            <span className="text-[10px] font-black tracking-tighter">5G</span>
            {/* Battery Indicator */}
            <div className="flex items-center border border-slate-700 rounded-md p-0.5 w-6 h-3 relative">
              <div className="bg-emerald-600 h-full w-4/5 rounded-[1px]"></div>
              <div className="absolute -right-0.5 top-[3px] w-0.5 h-1 bg-slate-700 rounded-r-[1px]"></div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col justify-center px-6 py-6 pb-12">
          
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 shadow-sm animate-bounce duration-1000">
              <HeartHandshake className="w-8 h-8" />
            </div>
          </div>

          <h1 className="text-3xl font-black text-slate-900 text-center tracking-tight mb-1">Partner Portal</h1>
          <p className="text-slate-400 text-center text-[10px] font-black uppercase tracking-widest mb-6">MediTonic Affiliates</p>

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

        {/* iOS Home Pill indicator (Desktop mockup simulation only) */}
        <div className="hidden md:flex justify-center items-center pb-6 shrink-0 select-none">
          <div className="w-32 h-1.2 bg-slate-300 rounded-full"></div>
        </div>

      </div>
    </div>
  );
}
