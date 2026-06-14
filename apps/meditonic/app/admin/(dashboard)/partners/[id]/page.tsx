"use client";

import { useEffect, useState, use } from "react";
import { getSupabaseBrowser } from "../../../../../lib/supabase-browser";
import { 
  Loader2, Save, Mail, ChevronLeft, Plus, X, History, User, Check, 
  AlertCircle, Eye, Download, RefreshCw, AlertTriangle, Copy, Search, Filter, Globe, Activity, Calendar
} from "lucide-react";
import { Button } from "../../../../../components/ui/Button";
import Link from "next/link";

interface PartnerConfig {
  db_id: string;
  name: string;
  product_type: string;
  price: number;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  commission_type: "percentage" | "fixed";
  commission_value: number;
  is_active: boolean;
}

interface EmailLog {
  id: string;
  sent_at: string;
  sent_by_admin: string;
  to_email: string;
  cc_emails: string[];
  bcc_emails: string[];
  subject: string;
  email_content_snapshot: string;
  status: string;
}

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

export default function PartnerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: partnerId } = use(params);

  // States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "history">("profile");

  // Partner Info state
  const [partner, setPartner] = useState<any>({
    name: "",
    email: "",
    status: "active",
    notes: "",
    created_at: "",
    updated_at: "",
  });

  const [referralCode, setReferralCode] = useState<any>(null);
  const [configs, setConfigs] = useState<PartnerConfig[]>([]);

  // Email Notification Modal state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailCcInput, setEmailCcInput] = useState("");
  const [emailCcTags, setEmailCcTags] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState("Your Referral Program Configuration Has Been Updated");
  const [emailBodyPreview, setEmailBodyPreview] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // Email History state
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [searchLogQuery, setSearchLogQuery] = useState("");
  const [filterLogStatus, setFilterLogStatus] = useState("all");
  const [selectedLogForView, setSelectedLogForView] = useState<EmailLog | null>(null);

  // Success notifications
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const copyCode = () => {
    if (referralCode?.code) {
      navigator.clipboard.writeText(referralCode.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  useEffect(() => {
    loadPartnerConfig();
    loadEmailLogs();
  }, [partnerId]);

  const loadPartnerConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/partners/${partnerId}/referral-config`);
      const data = await res.json();
      if (res.ok) {
        setPartner(data.partner);
        setReferralCode(data.referralCode);
        setConfigs(data.configs || []);
        setEmailTo(data.partner.email);
      } else {
        showNotification("error", data.error || "Failed to load partner settings.");
      }
    } catch (err) {
      console.error(err);
      showNotification("error", "Error loading partner configurations.");
    } finally {
      setLoading(false);
    }
  };

  const loadEmailLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/admin/partners/${partnerId}/send-email`);
      const data = await res.json();
      if (res.ok) {
        setEmailLogs(data.logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // CC tags management
  const addCcTag = () => {
    const email = emailCcInput.trim().toLowerCase();
    if (!email) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address");
      return;
    }
    if (!emailCcTags.includes(email)) {
      setEmailCcTags([...emailCcTags, email]);
    }
    setEmailCcInput("");
  };

  const removeCcTag = (index: number) => {
    setEmailCcTags(emailCcTags.filter((_, i) => i !== index));
  };

  const handleConfigChange = (index: number, key: keyof PartnerConfig, value: any) => {
    const updated = [...configs];
    updated[index] = { ...updated[index], [key]: value };
    setConfigs(updated);
  };

  const handleSave = async (shouldSendEmail: boolean) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/partners/${partnerId}/referral-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: partner.name,
          email: partner.email,
          status: partner.status,
          notes: partner.notes,
          referral_code: referralCode?.code,
          configs
        })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("success", "Referral configuration saved successfully!");
        if (shouldSendEmail) {
          // Compute a live email body preview for the modal
          generateEmailPreview();
          setIsEmailModalOpen(true);
        }
        loadPartnerConfig();
      } else {
        showNotification("error", data.error || "Failed to save configuration.");
      }
    } catch (err) {
      console.error(err);
      showNotification("error", "Error saving configuration.");
    } finally {
      setSaving(false);
    }
  };

  const generateEmailPreview = () => {
    const activeConfigs = configs.filter(c => c.is_active);
    let tableRows = "";
    if (activeConfigs.length === 0) {
      tableRows = `<tr><td colspan="3" style="text-align:center; padding: 12px; color: #64748b;">No products configured</td></tr>`;
    } else {
      activeConfigs.forEach(cfg => {
        const disc = cfg.discount_type === 'percentage' ? `${cfg.discount_value}% Off` : `₹${cfg.discount_value} Off`;
        const comm = cfg.commission_type === 'percentage' ? `${cfg.commission_value}% Comm.` : `₹${cfg.commission_value} Comm.`;
        tableRows += `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: 500; color: #1e293b;">${cfg.name}</td>
            <td style="padding: 10px; color: #475569;">${disc}</td>
            <td style="padding: 10px; color: #10b981; font-weight: 600;">${comm}</td>
          </tr>
        `;
      });
    }

    const tableHtml = `
      <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%; max-width: 600px; font-family: sans-serif; border: 1px solid #e2e8f0; border-radius: 6px; margin: 15px 0;">
        <thead>
          <tr style="background-color: #f8fafc; text-align: left;">
            <th style="padding: 10px; font-size: 13px; color: #475569;">Product</th>
            <th style="padding: 10px; font-size: 13px; color: #475569;">Customer Benefit</th>
            <th style="padding: 10px; font-size: 13px; color: #475569;">Your Commission</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;

    setEmailBodyPreview(`
      Hello ${partner.name},<br/><br/>
      Your referral program settings have been successfully updated.<br/><br/>
      Referral Code:<br/>
      <span style="font-family: monospace; font-size: 20px; font-weight: 700; background-color: #f1f5f9; padding: 8px 12px; border-radius: 4px; display: inline-block; margin: 8px 0; letter-spacing: 1px;">${referralCode?.code || 'N/A'}</span><br/><br/>
      The following products and benefits are currently configured for your referral code:<br/>
      ${tableHtml}<br/>
      You can now promote your referral code and start earning commissions based on successful purchases.<br/><br/>
      If you have any questions, please contact our support team.<br/><br/>
      Best Regards,<br/>
      <strong>MediTonic Support</strong>
    `);
  };

  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      const res = await fetch(`/api/admin/partners/${partnerId}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailTo,
          cc: emailCcTags,
          subject: emailSubject,
          adminName: "MediTonic Admin",
          configs
        })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("success", "Email notification sent successfully!");
        setIsEmailModalOpen(false);
        setEmailCcTags([]);
        loadEmailLogs();
      } else {
        alert(data.error || "Failed to send email.");
      }
    } catch (err) {
      console.error(err);
      alert("Error sending email notification.");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDownloadCopy = (log: EmailLog) => {
    const element = document.createElement("a");
    const file = new Blob([log.email_content_snapshot], { type: 'text/html' });
    element.href = URL.createObjectURL(file);
    element.download = `email_copy_${log.id}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const filteredLogs = emailLogs.filter(log => {
    const matchesSearch = 
      log.subject.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
      log.to_email.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
      (log.cc_emails && log.cc_emails.some(cc => cc.toLowerCase().includes(searchLogQuery.toLowerCase())));
      
    const matchesStatus = filterLogStatus === "all" || log.status.toLowerCase() === filterLogStatus.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mb-4" />
        <p className="text-slate-500 font-semibold animate-pulse text-sm">Loading partner details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4">
      
      {/* Header breadcrumb & info */}
      <div className="flex flex-col gap-4">
        <Link href="/admin/partners" className="group inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-900 transition-colors font-bold text-xs uppercase tracking-wider">
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" /> Back to Partners
        </Link>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-3xl text-white shadow-xl">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md">Affiliate Partner Profile</span>
            <h2 className="text-3xl font-black tracking-tight mt-1.5">{partner.name || "Affiliate Partner"}</h2>
            <p className="text-slate-300 text-sm">Manage referral code definitions, product-wise override discounts, and review email histories.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="relative flex h-3.5 w-3.5">
              {partner.status === 'active' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                partner.status === 'active' ? 'bg-emerald-500' : partner.status === 'inactive' ? 'bg-amber-500' : 'bg-rose-500'
              }`}></span>
            </span>
            <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border ${
              partner.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
              {partner.status}
            </span>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className={`p-4.5 rounded-2xl border flex items-center gap-3.5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {notification.type === 'success' ? <Check className="w-5 h-5 shrink-0 bg-emerald-500 text-white rounded-full p-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />}
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Tabs Layout */}
      <div className="bg-slate-100/80 p-1.5 rounded-2xl flex w-fit gap-2 border border-slate-200 shadow-inner">
        <button 
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
            activeTab === 'profile' 
              ? 'bg-white text-slate-900 shadow-md' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
          }`}
        >
          <User className="w-4 h-4" /> Profile & Configurations
        </button>
        <button 
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
            activeTab === 'history' 
              ? 'bg-white text-slate-900 shadow-md' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
          }`}
        >
          <History className="w-4 h-4" /> Email Audit Trail
        </button>
      </div>

      {activeTab === "profile" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Column: Basic Information Dashboard Card */}
          <div className="lg:col-span-1 lg:sticky lg:top-20 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-md hover:shadow-lg transition-all space-y-5">
              <div>
                <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                  <Activity className="w-4.5 h-4.5 text-emerald-600" /> Basic Information
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Demographics and core authorization keys.</p>
              </div>
              <div className="h-px bg-slate-100"></div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Partner Name</label>
                <input 
                  type="text"
                  value={partner.name}
                  onChange={e => setPartner({...partner, name: e.target.value})}
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-slate-800 focus:bg-white focus:ring-1 focus:ring-slate-800 transition-all shadow-inner"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Partner Email</label>
                <input 
                  type="email"
                  value={partner.email}
                  onChange={e => setPartner({...partner, email: e.target.value})}
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-slate-800 focus:bg-white focus:ring-1 focus:ring-slate-800 transition-all shadow-inner"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Referral Code (Unique)</label>
                <div className="relative flex rounded-xl border border-slate-200 bg-slate-50/70 overflow-hidden focus-within:border-slate-850 focus-within:ring-1 focus-within:ring-slate-850 transition-all shadow-inner">
                  <input 
                    type="text"
                    value={referralCode?.code || ""}
                    onChange={e => setReferralCode({...referralCode, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')})}
                    className="w-full bg-transparent px-4 py-3 text-base font-black tracking-widest font-mono text-slate-800 uppercase focus:outline-none"
                    placeholder="NO_CODE"
                  />
                  <button
                    type="button"
                    onClick={copyCode}
                    disabled={!referralCode?.code}
                    className={`px-3.5 flex items-center justify-center border-l border-slate-200 transition-all ${
                      codeCopied ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-850'
                    }`}
                  >
                    {codeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Partner Status</label>
                <select 
                  value={partner.status}
                  onChange={e => setPartner({...partner, status: e.target.value})}
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-4 py-3 text-sm font-extrabold text-slate-700 focus:outline-none focus:border-slate-800 focus:bg-white focus:ring-1 focus:ring-slate-800 transition-all shadow-inner cursor-pointer"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Internal Notes</label>
                <textarea 
                  rows={4}
                  value={partner.notes || ""}
                  onChange={e => setPartner({...partner, notes: e.target.value})}
                  placeholder="E.g. Approved via campaign"
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-750 focus:outline-none focus:border-slate-800 focus:bg-white focus:ring-1 focus:ring-slate-800 transition-all shadow-inner"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5 text-xs text-slate-400 font-semibold">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                  <span>Created: {new Date(partner.created_at).toLocaleString(undefined, { dateStyle: 'medium' })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                  <span>Updated: {new Date(partner.updated_at || partner.created_at).toLocaleString(undefined, { dateStyle: 'medium' })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Product-wise configuration table details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-white">
                <h3 className="font-extrabold text-base text-slate-800">Product Referral Configurations</h3>
                <p className="text-xs text-slate-400 mt-0.5">Determine custom discount incentives and partner commission overrides per product type.</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-slate-700 text-sm">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="px-6 py-4.5 font-bold text-xs uppercase tracking-widest">Product Details</th>
                      <th className="px-6 py-4.5 font-bold text-xs uppercase tracking-widest w-44">User Benefit (Discount)</th>
                      <th className="px-6 py-4.5 font-bold text-xs uppercase tracking-widest w-44">Partner Yield (Commission)</th>
                      <th className="px-6 py-4.5 font-bold text-xs uppercase tracking-widest text-center w-28">Active Scope</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {configs.map((cfg, index) => (
                      <tr 
                        key={`${cfg.product_type}-${cfg.db_id}`} 
                        className={`hover:bg-slate-50/50 transition-all ${
                          !cfg.is_active ? 'opacity-50 bg-slate-50/30' : 'bg-white'
                        }`}
                      >
                        <td className="px-6 py-5">
                          <div className="font-extrabold text-slate-800 text-sm">{cfg.name}</div>
                          <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">{cfg.product_type.replace('_', ' ')}</div>
                          <div className="text-xs text-slate-500 font-bold mt-1.5 bg-slate-100 inline-block px-2.5 py-0.5 rounded-md border border-slate-200">Base: ₹{cfg.price}</div>
                        </td>
                        
                        <td className="px-6 py-5">
                          <div className={`flex rounded-xl overflow-hidden border border-slate-200 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 transition-all bg-slate-50/50 shadow-inner ${
                            !cfg.is_active ? 'opacity-60 pointer-events-none' : ''
                          }`}>
                            <input 
                              type="number"
                              min="0"
                              disabled={!cfg.is_active}
                              value={cfg.discount_value}
                              onChange={e => handleConfigChange(index, 'discount_value', Number(e.target.value))}
                              className="w-full px-3 py-2.5 text-xs font-bold focus:outline-none bg-transparent"
                            />
                            <select 
                              value={cfg.discount_type}
                              disabled={!cfg.is_active}
                              onChange={e => handleConfigChange(index, 'discount_type', e.target.value)}
                              className="border-l border-slate-200 bg-slate-100 text-xs font-black px-3.5 focus:outline-none cursor-pointer text-slate-650"
                            >
                              <option value="percentage">%</option>
                              <option value="fixed">₹</option>
                            </select>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <div className={`flex rounded-xl overflow-hidden border border-slate-200 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 transition-all bg-slate-50/50 shadow-inner ${
                            !cfg.is_active ? 'opacity-60 pointer-events-none' : ''
                          }`}>
                            <input 
                              type="number"
                              min="0"
                              disabled={!cfg.is_active}
                              value={cfg.commission_value}
                              onChange={e => handleConfigChange(index, 'commission_value', Number(e.target.value))}
                              className="w-full px-3 py-2.5 text-xs font-bold focus:outline-none bg-transparent"
                            />
                            <select 
                              value={cfg.commission_type}
                              disabled={!cfg.is_active}
                              onChange={e => handleConfigChange(index, 'commission_type', e.target.value)}
                              className="border-l border-slate-200 bg-slate-100 text-xs font-black px-3.5 focus:outline-none cursor-pointer text-slate-650"
                            >
                              <option value="percentage">%</option>
                              <option value="fixed">₹</option>
                            </select>
                          </div>
                        </td>

                        <td className="px-6 py-5 text-center">
                          <div className="flex items-center justify-center">
                            <ToggleSwitch 
                              checked={cfg.is_active}
                              onChange={checked => handleConfigChange(index, 'is_active', checked)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions workflow trigger buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <Button 
                variant="outline" 
                disabled={saving}
                onClick={() => handleSave(false)} 
                className="h-12.5 border-slate-350 text-slate-700 font-extrabold hover:bg-slate-50 hover:text-slate-900 px-6 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin text-slate-500" /> : <Save className="w-5 h-5" />}
                Save Changes Only
              </Button>
              <Button 
                disabled={saving}
                onClick={() => handleSave(true)} 
                className="h-12.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 rounded-xl transition-all shadow-md shadow-emerald-600/10 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                Save & Dispatch Email
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Email history audits */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                <Globe className="w-4.5 h-4.5 text-emerald-600" /> Email Audit Trail
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Comprehensive history logs of all referral updates sent to this partner.</p>
            </div>
            
            {/* Search filter tools layout */}
            <div className="flex items-center gap-3.5 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search logs..."
                  value={searchLogQuery}
                  onChange={e => setSearchLogQuery(e.target.value)}
                  className="pl-9.5 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-800 transition-all bg-slate-50 shadow-inner w-52"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterLogStatus}
                  onChange={e => setFilterLogStatus(e.target.value)}
                  className="pl-8 pr-4.5 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-800 transition-all bg-slate-50 shadow-inner cursor-pointer"
                >
                  <option value="all">All Logs</option>
                  <option value="sent">Sent</option>
                  <option value="failed">Failed</option>
                  <option value="queued">Queued</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-sm">
            <table className="w-full text-left text-xs font-semibold border-collapse text-slate-650">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-6 py-4.5 font-bold text-xs uppercase tracking-widest">Date & Time</th>
                  <th className="px-6 py-4.5 font-bold text-xs uppercase tracking-widest">Admin Dispatcher</th>
                  <th className="px-6 py-4.5 font-bold text-xs uppercase tracking-widest">To Recipient</th>
                  <th className="px-6 py-4.5 font-bold text-xs uppercase tracking-widest">CC Recipients</th>
                  <th className="px-6 py-4.5 font-bold text-xs uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4.5 text-right font-bold text-xs uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingLogs ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">
                      <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
                      Loading historical dispatches...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400 font-bold">
                      No logs matching selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{new Date(log.sent_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                      <td className="px-6 py-4 font-extrabold text-slate-700">{log.sent_by_admin}</td>
                      <td className="px-6 py-4 font-bold text-blue-600">{log.to_email}</td>
                      <td className="px-6 py-4 max-w-xs truncate">{log.cc_emails?.join(", ") || "-"}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          log.status.toLowerCase() === 'sent' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2.5 whitespace-nowrap">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setSelectedLogForView(log)}
                          className="h-8.5 text-[11px] font-bold border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg px-3.5 transition-all shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> View Copy
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownloadCopy(log)}
                          className="h-8.5 text-[11px] font-bold border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg px-3.5 transition-all shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5 mr-1" /> Download
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Email Composition and Live Sandbox Mock Preview Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Email Notification Composer</h3>
                <p className="text-xs text-slate-500 mt-0.5">Customize recipient lists, add carbon-copies (CC), and audit contents before dispatching.</p>
              </div>
              <button 
                onClick={() => setIsEmailModalOpen(false)} 
                className="p-2 -mr-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5"/>
              </button>
            </div>

            {/* Composition Forms and simulated render */}
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              
              {/* Form entries - Left pane */}
              <div className="space-y-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Recipient To Email</label>
                  <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 shadow-inner">
                    {emailTo}
                  </div>
                </div>

                {/* CC list tags manager */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">CC Recipients</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Add email e.g. hello@company.com"
                      value={emailCcInput}
                      onChange={e => setEmailCcInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          addCcTag();
                        }
                      }}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-slate-800 focus:bg-white focus:ring-1 focus:ring-slate-800 transition-all shadow-inner"
                    />
                    <Button type="button" onClick={addCcTag} className="bg-slate-900 text-white hover:bg-slate-800 font-extrabold px-4.5 rounded-xl transition-all shadow-sm">
                      Add
                    </Button>
                  </div>
                  
                  {/* CC list active tag badges */}
                  {emailCcTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1.5">
                      {emailCcTags.map((tag, idx) => (
                        <span key={tag} className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 text-xs px-3 py-1 rounded-full font-bold animate-in fade-in zoom-in-95">
                          {tag}
                          <button type="button" onClick={() => removeCcTag(idx)} className="text-slate-400 hover:text-slate-800 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Subject Line</label>
                  <input 
                    type="text" 
                    value={emailSubject}
                    onChange={e => setEmailSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-slate-800 focus:bg-white focus:ring-1 focus:ring-slate-800 transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Live Render preview - Right pane styled as Desktop Mail Client Simulator */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Simulated Email Client Preview</label>
                <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-lg flex flex-col h-108">
                  {/* Mail window bar */}
                  <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex items-center gap-1.5 shrink-0 select-none">
                    <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                    <span className="text-[10px] font-extrabold text-slate-400 ml-4 font-mono">MailViewer Pro</span>
                  </div>
                  {/* Mail envelope details header */}
                  <div className="bg-slate-50 border-b border-slate-150 p-4 space-y-1.5 text-xs text-slate-500 shrink-0 select-none">
                    <div><strong>From:</strong> MediTonic Affiliate Portal &lt;partners@meditonic.glowhomeo.com&gt;</div>
                    <div><strong>To:</strong> <span className="text-slate-700 font-bold">{emailTo}</span></div>
                    {emailCcTags.length > 0 && (
                      <div className="truncate"><strong>Cc:</strong> <span className="text-slate-650 font-bold">{emailCcTags.join(", ")}</span></div>
                    )}
                    <div><strong>Subject:</strong> <span className="text-slate-800 font-bold">{emailSubject}</span></div>
                  </div>
                  {/* HTML live markup rendering */}
                  <div 
                    className="p-6 overflow-y-auto flex-1 bg-white text-slate-800 text-sm shadow-inner"
                    dangerouslySetInnerHTML={{ __html: emailBodyPreview }}
                  />
                </div>
              </div>

            </div>

            {/* Actions modal control trigger */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-4 shrink-0 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setIsEmailModalOpen(false)}
                className="h-12 border-slate-250 text-slate-700 hover:bg-slate-100 hover:text-slate-900 px-6 font-extrabold rounded-xl transition-all shadow-sm"
              >
                Cancel
              </Button>
              <Button 
                disabled={sendingEmail}
                onClick={handleSendEmail} 
                className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white px-6 font-extrabold rounded-xl transition-all shadow-md shadow-emerald-600/10 flex items-center justify-center gap-2"
              >
                {sendingEmail ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                Send Notification Email
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* Log Details Viewer Modal */}
      {selectedLogForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Historical Dispatch Copy</h3>
                <p className="text-xs text-slate-500 mt-0.5">Dispatched on {new Date(selectedLogForView.sent_at).toLocaleString()}</p>
              </div>
              <button 
                onClick={() => setSelectedLogForView(null)} 
                className="p-2 -mr-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="text-xs space-y-1.5 text-slate-500 bg-slate-50 p-4.5 rounded-2xl border border-slate-150">
                <div><strong>Recipient (To):</strong> <span className="text-blue-600 font-bold">{selectedLogForView.to_email}</span></div>
                <div><strong>CC Recipients:</strong> {selectedLogForView.cc_emails?.join(", ") || "None"}</div>
                <div><strong>BCC Recipients:</strong> {selectedLogForView.bcc_emails?.join(", ") || "None"}</div>
                <div><strong>Subject Line:</strong> <span className="font-extrabold text-slate-800">{selectedLogForView.subject}</span></div>
                <div><strong>Dispatcher Admin:</strong> <span className="font-bold text-slate-700">{selectedLogForView.sent_by_admin}</span></div>
                <div><strong>Delivery Status:</strong> <span className="font-black text-emerald-600 uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{selectedLogForView.status}</span></div>
              </div>
              
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-md flex flex-col">
                <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center gap-1.5 shrink-0 select-none">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                  <span className="text-[9px] font-extrabold text-slate-400 ml-3 font-mono">MailViewer Pro - Snapshot</span>
                </div>
                <div 
                  className="p-6 bg-white text-slate-800 text-sm overflow-y-auto max-h-96 shadow-inner"
                  dangerouslySetInnerHTML={{ __html: selectedLogForView.email_content_snapshot }}
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-4 shrink-0 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setSelectedLogForView(null)}
                className="h-11 border-slate-250 text-slate-700 hover:bg-slate-100 px-6 font-extrabold rounded-xl transition-all shadow-sm"
              >
                Close Viewer
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
