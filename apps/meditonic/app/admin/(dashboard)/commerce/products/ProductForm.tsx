"use client";

import React, { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { Product, ProductType, FulfillmentType, ProductStatus } from "@/types/store";
import { BRAND } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { UploadCloud, Loader2, Save, X } from "lucide-react";

export default function ProductForm({ initialData }: { initialData?: Product }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Product>>({
    title: initialData?.title || "",
    slug: initialData?.slug || "",
    description: initialData?.description || "",
    product_type: initialData?.product_type || "EBOOK",
    fulfillment_type: initialData?.fulfillment_type || "DIGITAL_DOWNLOAD",
    price: initialData?.price || 0,
    original_price: initialData?.original_price || 0,
    category: initialData?.category || "",
    meta_title: initialData?.meta_title || "",
    meta_description: initialData?.meta_description || "",
    status: initialData?.status || "DRAFT",
    cover_image_path: initialData?.cover_image_path || "",
    preview_pdf_path: initialData?.preview_pdf_path || "",
    final_pdf_path: initialData?.final_pdf_path || "",
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'cover_image_path' | 'preview_pdf_path' | 'final_pdf_path', bucket: 'meditonic-public' | 'meditonic-private') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (bucket === 'meditonic-public') setUploadingImage(true);
    else setUploadingPdf(true);

    const supabase = getSupabaseBrowser();
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `products/${fileName}`;

    try {
      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (error) throw error;
      
      // Store the bucket/filepath format so we can construct URLs later
      setFormData(prev => ({ ...prev, [field]: `${bucket}/${filePath}` }));
      
    } catch (err: any) {
      console.error(err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      if (bucket === 'meditonic-public') setUploadingImage(false);
      else setUploadingPdf(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = getSupabaseBrowser();

    try {
      const payload = {
        ...formData,
        clinic_id: BRAND.clinicId,
      };

      if (initialData?.id) {
        const { error } = await supabase.from("mt_products").update(payload).eq("id", initialData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("mt_products").insert([payload]);
        if (error) throw error;
      }

      router.push("/admin/commerce/products");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      alert(`Save failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: ['price', 'original_price'].includes(name) ? Number(value) : value 
    }));
  };

  return (
    <form onSubmit={handleSave} className="space-y-8 max-w-4xl pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">
            {initialData ? "Edit Product" : "New Product"}
          </h2>
          <p className="text-sm text-slate-500">Configure your commerce listing.</p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Product
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column - Main Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Title</label>
                <input required type="text" name="title" value={formData.title} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Slug (URL)</label>
                <input required type="text" name="slug" value={formData.slug} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono text-xs" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
              <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                <input type="text" name="category" value={formData.category} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" placeholder="e.g. diagnostic" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4">Media & Files</h3>
            
            <div className="space-y-6">
              {/* Cover Image */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Cover Image (meditonic-public)</label>
                {formData.cover_image_path ? (
                  <div className="flex items-center gap-4">
                    <img src={formData.cover_image_path.startsWith('http') ? formData.cover_image_path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${formData.cover_image_path}`} alt="Cover" className="h-24 rounded border" />
                    <button type="button" onClick={() => setFormData(p => ({...p, cover_image_path: ""}))} className="text-red-500 text-xs font-semibold flex items-center gap-1"><X className="w-3 h-3"/> Remove</button>
                  </div>
                ) : (
                  <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'cover_image_path', 'meditonic-public')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    {uploadingImage ? <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /> : <UploadCloud className="w-6 h-6 text-slate-400 mb-2" />}
                    <span className="text-sm font-medium text-slate-600">Click or drag image to upload</span>
                  </div>
                )}
              </div>

              {/* Private PDF */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Final PDF (meditonic-private) - Sent to buyer</label>
                {formData.final_pdf_path ? (
                  <div className="flex items-center gap-4 bg-slate-50 p-3 rounded border">
                    <span className="text-sm font-mono truncate">{formData.final_pdf_path}</span>
                    <button type="button" onClick={() => setFormData(p => ({...p, final_pdf_path: ""}))} className="text-red-500 text-xs font-semibold flex items-center gap-1 ml-auto"><X className="w-3 h-3"/> Remove</button>
                  </div>
                ) : (
                  <div className="relative border border-slate-300 rounded-lg p-3 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
                    <input type="file" accept="application/pdf" onChange={(e) => handleFileUpload(e, 'final_pdf_path', 'meditonic-private')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    {uploadingPdf ? <span className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Uploading...</span> : <span className="text-sm font-medium text-slate-600 flex items-center gap-2"><UploadCloud className="w-4 h-4"/> Upload Private PDF</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Organization & Pricing */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4">Configuration</h3>
            
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
              <select name="status" value={formData.status} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500">
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Product Type</label>
              <select name="product_type" value={formData.product_type} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500">
                <option value="EBOOK">eBook (PDF)</option>
                <option value="PHYSICAL_BOOK">Physical Book</option>
                <option value="PROGRAM">Program</option>
                <option value="COURSE">Course</option>
                <option value="CONSULTATION">Consultation</option>
                <option value="MEMBERSHIP">Membership</option>
                <option value="BUNDLE">Bundle</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Fulfillment Type</label>
              <select name="fulfillment_type" value={formData.fulfillment_type} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500">
                <option value="DIGITAL_DOWNLOAD">Digital Download</option>
                <option value="PHYSICAL_SHIPPING">Physical Shipping</option>
                <option value="LMS_ACCESS">LMS Access</option>
                <option value="BOOKING">Booking / Calendar</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4">Pricing</h3>
            
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Price (₹)</label>
              <input required type="number" name="price" value={formData.price} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 font-mono" />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Original Price (₹) - Strike through</label>
              <input type="number" name="original_price" value={formData.original_price} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 font-mono" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4">SEO</h3>
            
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Meta Title</label>
              <input type="text" name="meta_title" value={formData.meta_title} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Meta Description</label>
              <textarea name="meta_description" value={formData.meta_description} onChange={handleChange} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
            </div>
          </div>
        </div>

      </div>
    </form>
  );
}
