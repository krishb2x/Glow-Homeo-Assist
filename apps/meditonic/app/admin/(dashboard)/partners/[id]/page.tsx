"use client";

import { useEffect, useState, use } from "react";
import { getSupabaseBrowser } from "../../../../../lib/supabase-browser";
import { 
  Loader2, Save, Mail, ChevronLeft, Check, Eye, Download, RefreshCw, Copy, Search, Filter, Calendar, User, History, Activity, Wallet, X
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
  const [activeTab, setActiveTab] = useState<"config" | "email_history" | "commission_history">("config");

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
  const [emailPage, setEmailPage] = useState(1);
  const emailsPerPage = 10;

  // Commission History state
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loadingCommissions, setLoadingCommissions] = useState(false);
  const [searchCommissionQuery, setSearchCommissionQuery] = useState("");
  const [filterCommissionStatus, setFilterCommissionStatus] = useState("all");
  const [commissionPage, setCommissionPage] = useState(1);
  const commissionsPerPage = 10;
  const [commissionSortField, setCommissionSortField] = useState<"created_at" | "revenue" | "commission">("created_at");
  const [commissionSortOrder, setCommissionSortOrder] = useState<"asc" | "desc">("desc");

  // Payout processing state
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState("bank_transfer");
  const [payoutRef, setPayoutRef] = useState("");
  const [payoutRemarks, setPayoutRemarks] = useState("Your monthly payout has been processed successfully. Please review the attached receipt.");
  const [payoutScreenshot, setPayoutScreenshot] = useState("");
  const [processingPayout, setProcessingPayout] = useState(false);

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
    loadCommissions();
  }, [partnerId]);

  const loadCommissions = async () => {
    setLoadingCommissions(true);
    try {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from("mt_order_attributions")
        .select("*")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCommissions(data || []);
    } catch (err) {
      console.error("Failed to load commissions:", err);
    } finally {
      setLoadingCommissions(false);
    }
  };

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
      Hello ${partner.name || "Partner"},<br/><br/>
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

  const handleResendEmail = async (log: EmailLog) => {
    if (!confirm(`Are you sure you want to resend this email to ${log.to_email}?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/partners/${partnerId}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: log.to_email,
          cc: log.cc_emails,
          bcc: log.bcc_emails,
          subject: log.subject,
          adminName: log.sent_by_admin || "Admin",
          resendContent: log.email_content_snapshot,
        }),
      });
      if (res.ok) {
        showNotification("success", "Email notification resent successfully!");
        loadEmailLogs();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to resend email.");
      }
    } catch (err) {
      console.error(err);
      alert("Error resending email notification.");
    } finally {
      setSaving(false);
    }
  };

  const getProductName = (productId: string, productType: string) => {
    const cfg = configs.find(c => c.db_id === productId);
    if (cfg) return cfg.name;
    return productType ? productType.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : "Unknown Product";
  };

  // Screenshot proof handler
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("File size must be less than 2MB");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPayoutScreenshot(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit Payout
  const handleProcessPayout = async () => {
    setProcessingPayout(true);
    try {
      const res = await fetch(`/api/admin/partners/${partnerId}/payouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalPendingCommission,
          paymentMethod: payoutMethod,
          transactionRef: payoutRef,
          remarks: payoutRemarks,
          screenshotBase64: payoutScreenshot
        })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("success", "Payout marked as done and notification email sent!");
        setIsPayoutModalOpen(false);
        setPayoutRef("");
        setPayoutScreenshot("");
        setPayoutRemarks("Your monthly payout has been processed successfully. Please review the attached receipt.");
        loadCommissions();
        loadPartnerConfig();
        loadEmailLogs();
      } else {
        alert(data.error || "Failed to process payout");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to process payout");
    } finally {
      setProcessingPayout(false);
    }
  };

  // Filtering CC, Subject, To for Email History
  const filteredLogs = emailLogs.filter(log => {
    const matchesSearch = 
      log.subject?.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
      log.to_email?.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
      (log.cc_emails && log.cc_emails.some((cc: string) => cc.toLowerCase().includes(searchLogQuery.toLowerCase())));
      
    const matchesStatus = filterLogStatus === "all" || log.status?.toLowerCase() === filterLogStatus.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  // Filtering for Commission history
  const filteredCommissions = commissions.filter(comm => {
    const productName = getProductName(comm.product_id, comm.product_type);
    const matchesSearch = 
      comm.order_id?.toLowerCase().includes(searchCommissionQuery.toLowerCase()) ||
      comm.customer_id?.toLowerCase().includes(searchCommissionQuery.toLowerCase()) ||
      productName.toLowerCase().includes(searchCommissionQuery.toLowerCase());
      
    const matchesStatus = filterCommissionStatus === "all" || comm.status?.toLowerCase() === filterCommissionStatus.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  // Sorting for Commission history
  const sortedCommissions = [...filteredCommissions].sort((a, b) => {
    let aVal: any = 0;
    let bVal: any = 0;

    if (commissionSortField === "created_at") {
      aVal = new Date(a.created_at).getTime();
      bVal = new Date(b.created_at).getTime();
    } else if (commissionSortField === "revenue") {
      aVal = Number(a.revenue_after_discount || 0);
      bVal = Number(b.revenue_after_discount || 0);
    } else if (commissionSortField === "commission") {
      aVal = Number(a.commission_amount || 0);
      bVal = Number(b.commission_amount || 0);
    }

    if (commissionSortOrder === "asc") {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  // Pagination for Commission history
  const paginatedCommissions = sortedCommissions.slice(
    (commissionPage - 1) * commissionsPerPage,
    commissionPage * commissionsPerPage
  );

  // Summation totals
  const totalGrossRevenue = filteredCommissions.reduce((sum, curr) => sum + Number(curr.revenue_after_discount || 0), 0);
  const totalCommissionEarned = filteredCommissions.reduce((sum, curr) => sum + Number(curr.commission_amount || 0), 0);

  // Total unpaid commission balance
  const totalPendingCommission = commissions
    .filter(c => c.status === 'pending')
    .reduce((sum, curr) => sum + Number(curr.commission_amount || 0), 0);

  if (loading) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mb-4" />
        <p className="text-slate-500 font-semibold animate-pulse text-sm">Loading partner workspace...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 px-4">
      
      {/* Sticky Top Header Bar */}
      <div className="sticky top-0 z-40 bg-slate-50/90 backdrop-blur-md border-b border-slate-205 -mx-4 px-4 py-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/partners"
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-650 hover:text-slate-900 hover:shadow-sm hover:border-slate-300 transition-all shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {partner.name || "Affiliate Partner"}
              </h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                partner.status === 'active' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : partner.status === 'inactive' 
                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {partner.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 font-semibold">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Created: {partner.created_at ? new Date(partner.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'N/A'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span className="flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                Updated: {partner.updated_at ? new Date(partner.updated_at).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            disabled={saving}
            onClick={() => handleSave(false)} 
            className="h-11 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-bold px-5 rounded-xl transition-all shadow-sm flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin text-slate-550" /> : <Save className="w-4 h-4" />}
            Save Changes Only
          </Button>
          <Button 
            disabled={saving}
            onClick={() => handleSave(true)} 
            className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 rounded-xl transition-all shadow-md shadow-emerald-600/10 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Save & Dispatch Email
          </Button>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 shadow-md animate-in fade-in slide-in-from-top-2 duration-300 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {notification.type === 'success' ? (
            <Check className="w-5 h-5 shrink-0 bg-emerald-500 text-white rounded-full p-0.5" />
          ) : (
            <span className="w-5 h-5 shrink-0 text-rose-600 font-bold">!</span>
          )}
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 mb-6 gap-2 select-none">
        <button
          onClick={() => setActiveTab("config")}
          className={`pb-3.5 px-4 text-sm font-bold tracking-tight border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "config"
              ? "border-emerald-600 text-emerald-700 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <User className="w-4.5 h-4.5" />
          Referral Configuration
        </button>
        <button
          onClick={() => setActiveTab("email_history")}
          className={`pb-3.5 px-4 text-sm font-bold tracking-tight border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "email_history"
              ? "border-emerald-600 text-emerald-700 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <History className="w-4.5 h-4.5" />
          Email History
          {emailLogs.length > 0 && (
            <span className="bg-slate-100 text-slate-650 text-xs px-2 py-0.5 rounded-full font-extrabold border border-slate-200 ml-1">
              {emailLogs.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("commission_history")}
          className={`pb-3.5 px-4 text-sm font-bold tracking-tight border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "commission_history"
              ? "border-emerald-600 text-emerald-700 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Activity className="w-4.5 h-4.5" />
          Commission History
          {commissions.length > 0 && (
            <span className="bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-extrabold border border-emerald-100 ml-1">
              {commissions.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Contents: Referral Configuration */}
      {activeTab === "config" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Partner Profile Info Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Partner Profile</h3>
                <p className="text-xs text-slate-400 mt-0.5">Demographics and status information.</p>
              </div>
              <hr className="border-slate-100" />
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Partner Name</label>
                <input 
                  type="text"
                  value={partner.name || ""}
                  onChange={e => setPartner({...partner, name: e.target.value})}
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-slate-800 focus:bg-white focus:ring-1 focus:ring-slate-800 transition-all shadow-inner"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Partner Email</label>
                <input 
                  type="email"
                  value={partner.email || ""}
                  onChange={e => setPartner({...partner, email: e.target.value})}
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-slate-800 focus:bg-white focus:ring-1 focus:ring-slate-800 transition-all shadow-inner"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Referral Code</label>
                <div className="relative flex rounded-xl border border-slate-200 bg-slate-50/70 overflow-hidden focus-within:border-slate-850 focus-within:ring-1 focus-within:ring-slate-850 transition-all shadow-inner">
                  <input 
                    type="text"
                    value={referralCode?.code || ""}
                    onChange={e => setReferralCode({
                      ...referralCode, 
                      code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                    })}
                    className="w-full bg-transparent px-4 py-3 text-sm font-black tracking-widest font-mono text-slate-800 uppercase focus:outline-none"
                    placeholder="NO_CODE"
                  />
                  <button
                    type="button"
                    onClick={copyCode}
                    disabled={!referralCode?.code}
                    className={`px-3.5 flex items-center justify-center border-l border-slate-200 transition-all ${
                      codeCopied ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {codeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Partner Status</label>
                <select 
                  value={partner.status || "active"}
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
                  placeholder="E.g. Approved campaign code"
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-755 focus:outline-none focus:border-slate-800 focus:bg-white focus:ring-1 focus:ring-slate-800 transition-all shadow-inner"
                />
              </div>
            </div>
          </div>

          {/* Right Columns: Summary, Live Preview & Overrides */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Summary Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 select-none">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Referral Code</div>
                <div className="text-xl font-mono font-black text-slate-800 mt-1.5 tracking-wider truncate">
                  {referralCode?.code || "N/A"}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Enabled Products</div>
                <div className="text-xl font-extrabold text-slate-800 mt-1.5">
                  {configs.filter(c => c.is_active).length} / {configs.length}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Orders</div>
                <div className="text-xl font-extrabold text-slate-800 mt-1.5">
                  {partner.total_orders || 0}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Attributed Revenue</div>
                <div className="text-xl font-extrabold text-emerald-600 mt-1.5">
                  ₹{(partner.total_revenue || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Commission Earned</div>
                <div className="text-xl font-extrabold text-emerald-750 mt-1.5">
                  ₹{(partner.total_commission || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Last Email Sent</div>
                <div className="text-xs font-bold text-slate-600 mt-3.5 truncate">
                  {emailLogs[0] ? new Date(emailLogs[0].sent_at).toLocaleDateString(undefined, { dateStyle: 'medium' }) : "Never"}
                </div>
              </div>
            </div>

            {/* Checkout Experience Live Preview */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Checkout Experience Preview</h4>
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-[9px] uppercase font-bold text-slate-400">Applied Coupon</div>
                  <div className="font-mono text-base font-black text-slate-800 tracking-wider">
                    {referralCode?.code || "NO_CODE"}
                  </div>
                </div>
                <span className="bg-emerald-500/10 text-emerald-700 text-[10px] font-black uppercase px-3 py-1 rounded-full border border-emerald-250/30">
                  Discount Activated
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {configs.filter(c => c.is_active).map(c => {
                  const disc = c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`;
                  return (
                    <div key={c.db_id} className="flex justify-between text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                      <span className="truncate">{c.name}</span>
                      <span className="text-emerald-600 font-bold shrink-0">{disc}</span>
                    </div>
                  );
                })}
                {configs.filter(c => c.is_active).length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-2">No active discount benefits configured.</p>
                )}
              </div>
            </div>

            {/* Product Configuration Override Grid */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-150">
                <h3 className="font-extrabold text-slate-900 text-sm">Product Level overrides</h3>
                <p className="text-xs text-slate-400 mt-0.5">Override discounts and partner commissions per product type.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest">Product / Category</th>
                      <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest w-40">User Discount</th>
                      <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest w-40">Partner Commission</th>
                      <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-center w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {configs.map((cfg, index) => (
                      <tr 
                        key={`${cfg.product_type}-${cfg.db_id}`}
                        className={`hover:bg-slate-50/50 transition-all ${
                          !cfg.is_active ? "opacity-50 bg-slate-50/20" : "bg-white"
                        }`}
                      >
                        <td className="px-6 py-4.5">
                          <div className="font-extrabold text-slate-800 text-sm">{cfg.name}</div>
                          <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">{cfg.product_type.replace('_', ' ')}</div>
                          <div className="text-xs text-slate-500 font-bold mt-1 inline-block bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Base Price: ₹{cfg.price}</div>
                        </td>
                        
                        <td className="px-6 py-4.5">
                          <div className="flex rounded-xl overflow-hidden border border-slate-200 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 transition-all bg-slate-50 shadow-inner">
                            <input 
                              type="number"
                              min="0"
                              disabled={!cfg.is_active}
                              value={cfg.discount_value}
                              onChange={e => handleConfigChange(index, 'discount_value', Number(e.target.value))}
                              className="w-full px-3 py-2 text-xs font-bold focus:outline-none bg-transparent"
                            />
                            <select 
                              value={cfg.discount_type}
                              disabled={!cfg.is_active}
                              onChange={e => handleConfigChange(index, 'discount_type', e.target.value as any)}
                              className="border-l border-slate-200 bg-slate-100 text-xs font-black px-2.5 focus:outline-none cursor-pointer"
                            >
                              <option value="percentage">%</option>
                              <option value="fixed">₹</option>
                            </select>
                          </div>
                        </td>

                        <td className="px-6 py-4.5">
                          <div className="flex rounded-xl overflow-hidden border border-slate-200 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 transition-all bg-slate-50 shadow-inner">
                            <input 
                              type="number"
                              min="0"
                              disabled={!cfg.is_active}
                              value={cfg.commission_value}
                              onChange={e => handleConfigChange(index, 'commission_value', Number(e.target.value))}
                              className="w-full px-3 py-2 text-xs font-bold focus:outline-none bg-transparent"
                            />
                            <select 
                              value={cfg.commission_type}
                              disabled={!cfg.is_active}
                              onChange={e => handleConfigChange(index, 'commission_type', e.target.value as any)}
                              className="border-l border-slate-200 bg-slate-100 text-xs font-black px-2.5 focus:outline-none cursor-pointer"
                            >
                              <option value="percentage">%</option>
                              <option value="fixed">₹</option>
                            </select>
                          </div>
                        </td>

                        <td className="px-6 py-4.5 text-center">
                          <ToggleSwitch 
                            checked={cfg.is_active}
                            onChange={checked => handleConfigChange(index, 'is_active', checked)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Contents: Email History */}
      {activeTab === "email_history" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Communication Log</h3>
              <p className="text-xs text-slate-400 mt-0.5">Logs of all referral program configuration notifications sent to this partner.</p>
            </div>
            
            <div className="flex items-center gap-3.5 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search subject or email..."
                  value={searchLogQuery}
                  onChange={e => {
                    setSearchLogQuery(e.target.value);
                    setEmailPage(1);
                  }}
                  className="pl-9.5 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-800 transition-all bg-slate-50 shadow-inner w-60"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterLogStatus}
                  onChange={e => {
                    setFilterLogStatus(e.target.value);
                    setEmailPage(1);
                  }}
                  className="pl-8 pr-4.5 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-800 transition-all bg-slate-50 shadow-inner cursor-pointer"
                >
                  <option value="all">All Dispatches</option>
                  <option value="sent">Sent Successfully</option>
                  <option value="failed">Failed Delivery</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-150 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest">Date & Time</th>
                  <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest">Subject</th>
                  <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest">Sender Admin</th>
                  <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest">Recipient (To)</th>
                  <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest">CC Recipients</th>
                  <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-right font-bold text-[10px] uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingLogs ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold">
                      <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
                      Loading delivery records...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-400 font-bold">
                      No matching email logs found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.slice((emailPage - 1) * emailsPerPage, emailPage * emailsPerPage).map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {new Date(log.sent_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td className="px-6 py-4 font-extrabold text-slate-800 max-w-xs truncate">{log.subject}</td>
                      <td className="px-6 py-4 font-semibold text-slate-700">{log.sent_by_admin || "Admin"}</td>
                      <td className="px-6 py-4 font-bold text-blue-600">{log.to_email}</td>
                      <td className="px-6 py-4 max-w-xs truncate text-slate-500 font-semibold">{log.cc_emails?.join(", ") || "-"}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          log.status?.toLowerCase() === 'sent' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-150' 
                            : 'bg-rose-50 text-rose-700 border-rose-150'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setSelectedLogForView(log)}
                          className="h-8 text-[10px] font-bold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg px-2.5 transition-all shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> View Copy
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownloadCopy(log)}
                          className="h-8 text-[10px] font-bold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg px-2.5 transition-all shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5 mr-1" /> Download
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleResendEmail(log)}
                          disabled={saving}
                          className="h-8 text-[10px] font-bold border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-250 rounded-lg px-2.5 transition-all shadow-sm"
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Resend
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Email Pagination controls */}
          {filteredLogs.length > emailsPerPage && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-slate-500 font-semibold text-xs select-none">
              <span>
                Showing {(emailPage - 1) * emailsPerPage + 1} to {Math.min(emailPage * emailsPerPage, filteredLogs.length)} of {filteredLogs.length} logs
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={emailPage === 1}
                  onClick={() => setEmailPage(prev => Math.max(prev - 1, 1))}
                  className="h-8 px-3 rounded-lg border-slate-200"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={emailPage * emailsPerPage >= filteredLogs.length}
                  onClick={() => setEmailPage(prev => prev + 1)}
                  className="h-8 px-3 rounded-lg border-slate-200"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Contents: Commission History */}
      {activeTab === "commission_history" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
          
          {/* Payout Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center bg-slate-50 border border-slate-200 p-5 rounded-2xl select-none">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Commissions (Lifetime)</div>
              <div className="text-xl font-extrabold text-slate-900 mt-1">₹{(partner.total_commission || 0).toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Unpaid Commissions (Pending)</div>
              <div className="text-xl font-black text-amber-600 mt-1">₹{totalPendingCommission.toLocaleString('en-IN')}</div>
            </div>
            <div className="text-right md:text-right">
              <Button
                disabled={totalPendingCommission <= 0 || processingPayout}
                onClick={() => setIsPayoutModalOpen(true)}
                className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 rounded-xl shadow-md transition-all inline-flex items-center gap-2"
              >
                <Wallet className="w-4 h-4" /> Initiate Payout
              </Button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Referral Commission Ledger</h3>
              <p className="text-xs text-slate-400 mt-0.5">Order attribution history and commissions generated via this partner's code.</p>
            </div>
            
            <div className="flex items-center gap-3.5 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search Order, Customer or Product..."
                  value={searchCommissionQuery}
                  onChange={e => {
                    setSearchCommissionQuery(e.target.value);
                    setCommissionPage(1);
                  }}
                  className="pl-9.5 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-800 transition-all bg-slate-50 shadow-inner w-64"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterCommissionStatus}
                  onChange={e => {
                    setFilterCommissionStatus(e.target.value);
                    setCommissionPage(1);
                  }}
                  className="pl-8 pr-4.5 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-800 transition-all bg-slate-50 shadow-inner cursor-pointer"
                >
                  <option value="all">All Attributions</option>
                  <option value="pending">Pending Payout</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-150 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-505 select-none">
                <tr>
                  <th 
                    onClick={() => {
                      if (commissionSortField === "created_at") {
                        setCommissionSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                      } else {
                        setCommissionSortField("created_at");
                        setCommissionSortOrder("desc");
                      }
                    }}
                    className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    Date & Time {commissionSortField === 'created_at' && (commissionSortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest">Order ID</th>
                  <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest">Customer ID</th>
                  <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest">Product Name</th>
                  <th 
                    onClick={() => {
                      if (commissionSortField === "revenue") {
                        setCommissionSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                      } else {
                        setCommissionSortField("revenue");
                        setCommissionSortOrder("desc");
                      }
                    }}
                    className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    Gross Revenue {commissionSortField === 'revenue' && (commissionSortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th 
                    onClick={() => {
                      if (commissionSortField === "commission") {
                        setCommissionSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                      } else {
                        setCommissionSortField("commission");
                        setCommissionSortOrder("desc");
                      }
                    }}
                    className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    Commission Earned {commissionSortField === 'commission' && (commissionSortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingCommissions ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold">
                      <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
                      Loading commission ledger...
                    </td>
                  </tr>
                ) : paginatedCommissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-400 font-bold">
                      No commission attributions found.
                    </td>
                  </tr>
                ) : (
                  paginatedCommissions.map(comm => (
                    <tr key={comm.id} className="hover:bg-slate-50/50 transition-colors font-medium">
                      <td className="px-6 py-4 text-slate-800 font-semibold">
                        {new Date(comm.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-800 truncate max-w-xs">{comm.order_id}</td>
                      <td className="px-6 py-4 font-mono text-slate-500 truncate max-w-[120px]">{comm.customer_id || "-"}</td>
                      <td className="px-6 py-4 font-bold text-slate-800 truncate max-w-[180px]">
                        {getProductName(comm.product_id, comm.product_type)}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700">₹{(comm.revenue_after_discount || 0).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 font-bold text-emerald-600 font-extrabold">₹{(comm.commission_amount || 0).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          comm.status?.toLowerCase() === 'completed' || comm.status?.toLowerCase() === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-150' 
                            : comm.status?.toLowerCase() === 'pending'
                            ? 'bg-amber-50 text-amber-700 border-amber-150'
                            : 'bg-slate-50 text-slate-750 border-slate-200'
                        }`}>
                          {comm.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {/* Table Footer with Gross Totals Summation */}
              {sortedCommissions.length > 0 && (
                <tfoot className="bg-slate-50/80 border-t border-slate-200 font-black text-slate-900 text-xs select-none">
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-right font-black">Totals / Summary:</td>
                    <td className="px-6 py-4 text-slate-800 font-extrabold text-sm">
                      ₹{totalGrossRevenue.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-emerald-650 font-black text-sm">
                      ₹{totalCommissionEarned.toLocaleString('en-IN')}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Commissions Pagination controls */}
          {sortedCommissions.length > commissionsPerPage && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-slate-500 font-semibold text-xs select-none">
              <span>
                Showing {(commissionPage - 1) * commissionsPerPage + 1} to {Math.min(commissionPage * commissionsPerPage, sortedCommissions.length)} of {sortedCommissions.length} transactions
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={commissionPage === 1}
                  onClick={() => setCommissionPage(prev => Math.max(prev - 1, 1))}
                  className="h-8 px-3 rounded-lg border-slate-200"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={commissionPage * commissionsPerPage >= sortedCommissions.length}
                  onClick={() => setCommissionPage(prev => prev + 1)}
                  className="h-8 px-3 rounded-lg border-slate-200"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin Initiate Payout Modal */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                  <Wallet className="w-5.5 h-5.5 text-emerald-600" />
                  Initiate Monthly Payout
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Clears all pending commissions for this partner and sends a confirmation email.</p>
              </div>
              <button 
                onClick={() => setIsPayoutModalOpen(false)} 
                className="p-2 -mr-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5"/>
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-semibold text-slate-700">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Payout Amount (INR)</label>
                <input 
                  type="text" 
                  readOnly
                  value={`₹${totalPendingCommission.toLocaleString('en-IN')}`}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black text-slate-600 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Payment Method</label>
                <select 
                  value={payoutMethod}
                  onChange={e => setPayoutMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:border-slate-800 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Transaction Reference / ID</label>
                <input 
                  type="text" 
                  value={payoutRef}
                  onChange={e => setPayoutRef(e.target.value)}
                  placeholder="e.g. TXN9823120"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:border-slate-800 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Payout Proof Screenshot (Attach Receipt)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleScreenshotChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-850 focus:outline-none cursor-pointer file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Email Remarks / Notes</label>
                <textarea 
                  rows={3}
                  value={payoutRemarks}
                  onChange={e => setPayoutRemarks(e.target.value)}
                  placeholder="Your monthly payout has been processed successfully..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-slate-800 focus:bg-white transition-all resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-4 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setIsPayoutModalOpen(false)}
                className="h-11 border-slate-250 text-slate-700 hover:bg-slate-100 px-5 font-bold rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                disabled={processingPayout || totalPendingCommission <= 0}
                onClick={handleProcessPayout} 
                className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white px-5 font-bold rounded-xl flex items-center gap-2"
              >
                {processingPayout ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Confirm & Mark Paid
              </Button>
            </div>

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
                className="p-2 -mr-2 text-slate-405 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors font-bold"
              >
                X
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
                          <button type="button" onClick={() => removeCcTag(idx)} className="text-slate-400 hover:text-slate-850 transition-colors font-bold text-sm">
                            ×
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
                className="h-12 border-slate-250 text-slate-755 hover:bg-slate-100 px-6 font-extrabold rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                disabled={sendingEmail}
                onClick={handleSendEmail} 
                className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white px-6 font-bold rounded-xl transition-all shadow-md shadow-emerald-600/10 flex items-center justify-center gap-2"
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
                <p className="text-xs text-slate-505 mt-0.5">Dispatched on {new Date(selectedLogForView.sent_at).toLocaleString()}</p>
              </div>
              <button 
                onClick={() => setSelectedLogForView(null)} 
                className="p-2 -mr-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors font-extrabold"
              >
                X
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
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-350"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-350"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-350"></div>
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
