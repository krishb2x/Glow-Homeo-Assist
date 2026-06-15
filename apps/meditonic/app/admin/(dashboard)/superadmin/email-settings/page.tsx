"use client";

import React, { useEffect, useState } from "react";
import { getSupabaseBrowser } from "../../../../../lib/supabase-browser";
import { 
  Loader2, Save, Mail, Key, Eye, EyeOff, Sliders, CheckCircle2, ShieldCheck, MailWarning, Settings, Check, Info
} from "lucide-react";
import { Button } from "../../../../../components/ui/Button";

// Native ToggleSwitch component to match the admin portal design system
const ToggleSwitch = ({ checked, onChange, disabled }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6.5 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
        checked ? 'bg-emerald-600' : 'bg-slate-200'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <span
        className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out ${
          checked ? 'translate-x-5.5' : 'translate-x-0'
        }`}
      />
    </button>
  );
};

export default function SuperadminEmailSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Settings states
  const [provider, setProvider] = useState<"ses" | "resend" | "smtp">("ses");
  const [resendApiKey, setResendApiKey] = useState("");
  const [defaultCc, setDefaultCc] = useState("");
  const [defaultBcc, setDefaultBcc] = useState("");
  const [enableConsultationConfirmed, setEnableConsultationConfirmed] = useState(true);
  const [enableStoreProductDelivery, setEnableStoreProductDelivery] = useState(true);
  const [enablePartnerApplicationReceived, setEnablePartnerApplicationReceived] = useState(true);
  const [enablePartnerApproved, setEnablePartnerApproved] = useState(true);
  const [enablePartnerPayoutProcessed, setEnablePartnerPayoutProcessed] = useState(true);
  const [enablePartnerRejected, setEnablePartnerRejected] = useState(true);

  useEffect(() => {
    loadEmailSettings();
  }, []);

  const loadEmailSettings = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch("/api/admin/email-settings", {
        headers: {
          "Authorization": `Bearer ${session?.access_token || ""}`
        }
      });
      
      const data = await res.json();
      
      if (res.ok && data.settings) {
        const s = data.settings;
        setProvider(s.provider || "ses");
        setResendApiKey(s.resend_api_key || "");
        setDefaultCc(s.default_cc || "");
        setDefaultBcc(s.default_bcc || "");
        setEnableConsultationConfirmed(s.enable_consultation_confirmed !== false);
        setEnableStoreProductDelivery(s.enable_store_product_delivery !== false);
        setEnablePartnerApplicationReceived(s.enable_partner_application_received !== false);
        setEnablePartnerApproved(s.enable_partner_approved !== false);
        setEnablePartnerPayoutProcessed(s.enable_partner_payout_processed !== false);
        setEnablePartnerRejected(s.enable_partner_rejected !== false);
      } else {
        showToast("error", data.error || "Failed to load email configurations.");
      }
    } catch (err) {
      console.error(err);
      showToast("error", "Error contacting the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch("/api/admin/email-settings", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token || ""}`
        },
        body: JSON.stringify({
          provider,
          resend_api_key: resendApiKey,
          default_cc: defaultCc,
          default_bcc: defaultBcc,
          enable_consultation_confirmed: enableConsultationConfirmed,
          enable_store_product_delivery: enableStoreProductDelivery,
          enable_partner_application_received: enablePartnerApplicationReceived,
          enable_partner_approved: enablePartnerApproved,
          enable_partner_payout_processed: enablePartnerPayoutProcessed,
          enable_partner_rejected: enablePartnerRejected,
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        showToast("success", "Email configurations saved successfully!");
      } else {
        showToast("error", data.error || "Failed to save settings.");
      }
    } catch (err) {
      console.error(err);
      showToast("error", "Error saving configurations.");
    } finally {
      setSaving(false);
    }
  };

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  if (loading) {
    return (
      <div className="flex flex-col h-[50vh] items-center justify-center select-none">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
        <p className="text-slate-500 font-semibold text-sm">Loading email controls...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      
      {/* Header Panel */}
      <div className="sticky top-0 z-40 bg-slate-50/90 backdrop-blur-md border-b border-slate-200 -mx-4 px-4 py-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-600" />
            Email Settings & Cost Control (Super Admin Only)
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            Toggle automated notifications, configure routing rules, and save messaging costs.
          </p>
        </div>
        <div>
          <Button 
            disabled={saving}
            onClick={handleSave} 
            className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 rounded-xl transition-all shadow-md shadow-emerald-600/10 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Configuration
          </Button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 shadow-md animate-in fade-in slide-in-from-top-2 duration-300 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {notification.type === 'success' ? (
            <Check className="w-5 h-5 shrink-0 bg-emerald-500 text-white rounded-full p-0.5" />
          ) : (
            <span className="w-5 h-5 shrink-0 bg-rose-500 text-white rounded-full p-0.5 flex items-center justify-center font-bold text-xs">!</span>
          )}
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Columns - Configuration Inputs */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Card 1: Mail Gateway Selection */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Mail Transporter Gateway</h3>
                <p className="text-xs text-slate-400 mt-0.5">Select your primary outgoing provider routing.</p>
              </div>
            </div>
            <hr className="border-slate-100" />
            
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "ses", label: "AWS SES", desc: "Enterprise Scalability" },
                { id: "resend", label: "Resend", desc: "Developer Friendly" },
                { id: "smtp", label: "Zoho SMTP", desc: "Fallback Zoho Server" }
              ].map((prov) => (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() => setProvider(prov.id as any)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    provider === prov.id
                      ? "border-emerald-600 bg-emerald-50/20 text-emerald-900"
                      : "border-slate-200 hover:border-slate-300 text-slate-600"
                  }`}
                >
                  <div className="font-extrabold text-sm">{prov.label}</div>
                  <div className="text-[10px] font-semibold text-slate-400 mt-0.5">{prov.desc}</div>
                </button>
              ))}
            </div>

            {/* Resend API Key Field */}
            {provider === "resend" && (
              <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  Resend API Key Override
                </label>
                <div className="relative flex rounded-xl border border-slate-200 bg-slate-50/70 overflow-hidden focus-within:border-slate-800 focus-within:bg-white focus-within:ring-1 focus-within:ring-slate-800 transition-all shadow-inner">
                  <input 
                    type={showApiKey ? "text" : "password"}
                    value={resendApiKey}
                    onChange={e => setResendApiKey(e.target.value)}
                    className="w-full bg-transparent px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none"
                    placeholder="re_..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="px-3.5 flex items-center justify-center border-l border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                  If left blank, the system will fall back to the system environment key: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">RESEND_API_KEY</code>.
                </p>
              </div>
            )}
          </div>

          {/* Card 2: Routing Rule Overrides */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Global Routing Rules</h3>
                <p className="text-xs text-slate-400 mt-0.5">Append default CC/BCC addresses globally.</p>
              </div>
            </div>
            <hr className="border-slate-100" />

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Default CC Recipients</label>
                <input 
                  type="text"
                  value={defaultCc}
                  onChange={e => setDefaultCc(e.target.value)}
                  placeholder="e.g. audit@mymeditonic.com, manager@mymeditonic.com"
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-slate-800 focus:bg-white focus:ring-1 focus:ring-slate-800 transition-all shadow-inner"
                />
                <p className="text-[10px] text-slate-400 font-medium">Comma-separated email lists. Every outgoing system mail will copy these addresses.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Default BCC Recipients</label>
                <input 
                  type="text"
                  value={defaultBcc}
                  onChange={e => setDefaultBcc(e.target.value)}
                  placeholder="e.g. archive@mymeditonic.com"
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-slate-800 focus:bg-white focus:ring-1 focus:ring-slate-800 transition-all shadow-inner"
                />
                <p className="text-[10px] text-slate-400 font-medium">Every outgoing system mail will blindly copy these addresses for compliance/archival.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Informational / Helpers */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-emerald-500" />
              Gateway Routing Status
            </h4>
            <div className="space-y-3.5 text-xs font-medium leading-relaxed">
              <div className="flex gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>AWS SES</strong> is active and verified for the domain <code className="bg-slate-100 p-0.5 rounded font-mono">glowhomeo.com</code>.</span>
              </div>
              <div className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Resend</strong> utilizes secure HTTPS API calls directly, making it highly secure and fast.</span>
              </div>
              <div className="flex gap-2">
                <MailWarning className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span><strong>Zoho SMTP</strong> will serve as fallback if active gateways encounter configuration faults.</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Total System Health</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between font-bold border-b border-slate-100 pb-2">
                <span className="text-slate-500">Mailing Gateway</span>
                <span className="text-slate-800 uppercase">{provider}</span>
              </div>
              <div className="flex justify-between font-bold border-b border-slate-100 pb-2">
                <span className="text-slate-500">Toggles Activated</span>
                <span className="text-emerald-600">
                  {[enableConsultationConfirmed, enableStoreProductDelivery, enablePartnerApplicationReceived, enablePartnerApproved, enablePartnerPayoutProcessed, enablePartnerRejected].filter(Boolean).length} / 6
                </span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-slate-500">Compliance CC/BCC</span>
                <span className="text-slate-850">{(defaultCc || defaultBcc) ? "Active" : "None"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Automated Notifications Toggles */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-150 bg-slate-50/30 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Cost-Saving Feature Toggles</h3>
            <p className="text-xs text-slate-400 mt-0.5">Toggle automated notifications on/off to scale back billing costs.</p>
          </div>
          <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-indigo-100">
            Active Rules
          </span>
        </div>
        
        <div className="divide-y divide-slate-100">
          {[
            {
              id: "enable_consultation_confirmed",
              state: enableConsultationConfirmed,
              setter: setEnableConsultationConfirmed,
              title: "Consultation Confirmed Notification",
              desc: "Dispatched to patient immediately after checkout when consultation/case booking is logged in database."
            },
            {
              id: "enable_store_product_delivery",
              state: enableStoreProductDelivery,
              setter: setEnableStoreProductDelivery,
              title: "Store Product Delivery Notification",
              desc: "Dispatched with watermarked digital eBooks, courses, or physical fulfillment details."
            },
            {
              id: "enable_partner_application_received",
              state: enablePartnerApplicationReceived,
              setter: setEnablePartnerApplicationReceived,
              title: "Partner Application Received",
              desc: "Sent to incoming influencers or clinicians confirming application submission."
            },
            {
              id: "enable_partner_approved",
              state: enablePartnerApproved,
              setter: setEnablePartnerApproved,
              title: "Partner approved Credential Welcome",
              desc: "Sent to approved partners containing login URL, temporal credentials, and referral structure details."
            },
            {
              id: "enable_partner_payout_processed",
              state: enablePartnerPayoutProcessed,
              setter: setEnablePartnerPayoutProcessed,
              title: "Partner Payout Processed",
              desc: "Sent to partner with PDF/screenshot receipt proof once commission payout is executed by admin."
            },
            {
              id: "enable_partner_rejected",
              state: enablePartnerRejected,
              setter: setEnablePartnerRejected,
              title: "Partner Application Rejected",
              desc: "Dispatched to applicants whose clinical partner profile was audited and rejected."
            }
          ].map((toggle) => (
            <div key={toggle.id} className="p-6 flex items-center justify-between gap-6 hover:bg-slate-50/50 transition-colors">
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm text-slate-900">{toggle.title}</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-2xl">{toggle.desc}</p>
              </div>
              <ToggleSwitch checked={toggle.state} onChange={toggle.setter} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
