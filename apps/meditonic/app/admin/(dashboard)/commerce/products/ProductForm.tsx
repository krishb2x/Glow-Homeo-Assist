"use client";

import React, { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { Product, ProductType, FulfillmentType, ProductStatus } from "@/types/store";
import { BRAND } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { UploadCloud, Loader2, Save, X, ExternalLink } from "lucide-react";
import { saveProductAction } from "./actions";
import VerifiedReviewsManager, { VerifiedReview } from "./VerifiedReviewsManager";
import MobilePreview from "./MobilePreview";

export default function ProductForm({ initialData }: { initialData?: Product }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [metaFields, setMetaFields] = useState<any>(initialData?.metadata || {});
  const [isBestseller, setIsBestseller] = useState(initialData?.metadata?.bestseller || false);
  const [showPreview, setShowPreview] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Product>>({
    title: initialData?.title || "",
    slug: initialData?.slug || "",
    description: initialData?.description || "",
    product_type: "EBOOK",
    fulfillment_type: "DIGITAL_DOWNLOAD",
    price: initialData?.price || 0,
    original_price: (initialData as any)?.original_price || 0,
    category: (initialData as any)?.category || "",
    meta_title: (initialData as any)?.meta_title || "",
    meta_description: (initialData as any)?.meta_description || "",
    status: (initialData as any)?.is_active === false ? "DRAFT" : "PUBLISHED",
    cover_image_path: (initialData as any)?.image_url || "",
    gallery_image_paths: (initialData as any)?.gallery_image_paths || [],
    preview_pdf_path: (initialData as any)?.preview_pdf_path || "",
    final_pdf_path: (initialData as any)?.final_pdf_path || "",
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

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingGallery(true);
    const supabase = getSupabaseBrowser();
    const newPaths: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error } = await supabase.storage
          .from('meditonic-public')
          .upload(filePath, file);

        if (error) throw error;
        newPaths.push(`meditonic-public/${filePath}`);
      }

      setFormData(prev => ({ 
        ...prev, 
        gallery_image_paths: [...(prev.gallery_image_paths || []), ...newPaths] 
      }));
      
    } catch (err: any) {
      console.error(err);
      alert(`Gallery upload failed: ${err.message}`);
    } finally {
      setUploadingGallery(false);
    }
  };

  const removeGalleryImage = (index: number) => {
    setFormData(prev => {
      const newPaths = [...(prev.gallery_image_paths || [])];
      newPaths.splice(index, 1);
      return { ...prev, gallery_image_paths: newPaths };
    });
  };

  const handlePreviewPdf = async (path: string, bucket: string) => {
    if (!path) return;
    const supabase = getSupabaseBrowser();
    const filePath = path.replace(`${bucket}/`, '');
    
    if (bucket === 'meditonic-public') {
      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      window.open(data.publicUrl, '_blank');
    } else {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, 60);
      if (error) {
        alert("Could not generate preview link");
      } else {
        window.open(data.signedUrl, '_blank');
      }
    }
  };

  const getPayload = () => ({
    ...formData,
    metadata: {
      ...metaFields,
      bestseller: isBestseller
    },
    is_active: formData.status === 'PUBLISHED',
    clinic_id: BRAND.clinicId,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowPreview(true);
    setSaveError(null);
  };

  const confirmSave = async () => {
    setLoading(true);
    setSaveError(null);
    try {
      const payload = getPayload();
      const result = await saveProductAction(payload, initialData?.id);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      router.push("/admin/commerce/products");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setSaveError(`Failed to save: ${err.message}`);
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
        {!showPreview && (
          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-900 flex items-center gap-2">
              Preview Changes
            </button>
          </div>
        )}
      </div>

      {saveError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
          {saveError}
        </div>
      )}

      {showPreview ? (
        <MobilePreview 
          payload={getPayload()} 
          onBack={() => setShowPreview(false)} 
          onConfirm={confirmSave} 
          isSaving={loading} 
        />
      ) : (
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
                  <div className="flex flex-col gap-4">
                    <img src={formData.cover_image_path.startsWith('http') ? formData.cover_image_path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${formData.cover_image_path}`} alt="Cover" className="h-32 object-contain rounded border bg-slate-50" />
                    <div className="flex items-center gap-4">
                      <button type="button" onClick={() => window.open(formData.cover_image_path?.startsWith('http') ? formData.cover_image_path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${formData.cover_image_path}`, '_blank')} className="text-emerald-600 text-xs font-semibold flex items-center gap-1"><ExternalLink className="w-3 h-3"/> View Full</button>
                      <button type="button" onClick={() => setFormData(p => ({...p, cover_image_path: ""}))} className="text-red-500 text-xs font-semibold flex items-center gap-1"><X className="w-3 h-3"/> Remove</button>
                    </div>
                  </div>
                ) : (
                  <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'cover_image_path', 'meditonic-public')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    {uploadingImage ? <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /> : <UploadCloud className="w-6 h-6 text-slate-400 mb-2" />}
                    <span className="text-sm font-medium text-slate-600">Click or drag image to upload</span>
                  </div>
                )}
              </div>

              {/* Gallery Images */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Gallery Images (Optional)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                  {(formData.gallery_image_paths || []).map((path, idx) => (
                    <div key={idx} className="relative aspect-square border border-slate-200 rounded-lg overflow-hidden group">
                      <img src={path.startsWith('http') ? path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${path}`} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeGalleryImage(idx)} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  
                  <div className="relative border-2 border-dashed border-slate-300 rounded-lg aspect-square flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
                    <input type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    {uploadingGallery ? <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" /> : <UploadCloud className="w-5 h-5 text-slate-400 mb-1" />}
                    <span className="text-[10px] font-medium text-slate-600">Add Images</span>
                  </div>
                </div>
              </div>

              {/* Sample/Preview PDF */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Sample PDF (meditonic-public) - Free Preview</label>
                {formData.preview_pdf_path ? (
                  <div className="flex items-center gap-4 bg-slate-50 p-3 rounded border">
                    <span className="text-sm font-mono truncate flex-1">{formData.preview_pdf_path}</span>
                    <button type="button" onClick={() => handlePreviewPdf(formData.preview_pdf_path || '', 'meditonic-public')} className="text-emerald-600 text-xs font-semibold flex items-center gap-1"><ExternalLink className="w-3 h-3"/> View</button>
                    <button type="button" onClick={() => setFormData(p => ({...p, preview_pdf_path: ""}))} className="text-red-500 text-xs font-semibold flex items-center gap-1"><X className="w-3 h-3"/> Remove</button>
                  </div>
                ) : (
                  <div className="relative border border-slate-300 rounded-lg p-3 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
                    <input type="file" accept="application/pdf" onChange={(e) => handleFileUpload(e, 'preview_pdf_path', 'meditonic-public')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    {uploadingPdf ? <span className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Uploading...</span> : <span className="text-sm font-medium text-slate-600 flex items-center gap-2"><UploadCloud className="w-4 h-4"/> Upload Sample PDF</span>}
                  </div>
                )}
              </div>

              {/* Private PDF */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Final PDF (meditonic-private) - Sent to buyer</label>
                {formData.final_pdf_path ? (
                  <div className="flex items-center gap-4 bg-slate-50 p-3 rounded border">
                    <span className="text-sm font-mono truncate flex-1">{formData.final_pdf_path}</span>
                    <button type="button" onClick={() => handlePreviewPdf(formData.final_pdf_path || '', 'meditonic-private')} className="text-emerald-600 text-xs font-semibold flex items-center gap-1"><ExternalLink className="w-3 h-3"/> Preview</button>
                    <button type="button" onClick={() => setFormData(p => ({...p, final_pdf_path: ""}))} className="text-red-500 text-xs font-semibold flex items-center gap-1"><X className="w-3 h-3"/> Remove</button>
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
            <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4">Metadata & Attributes</h3>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer border p-3 rounded-lg hover:bg-slate-50 transition-colors w-full sm:w-auto">
                <input type="checkbox" checked={isBestseller} onChange={(e) => setIsBestseller(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" />
                <div>
                  <span className="text-sm font-semibold text-slate-800 block">Mark as Bestseller</span>
                  <span className="text-xs text-slate-500 block">Shows up in the featured section</span>
                </div>
              </label>

              <div className="w-full sm:w-auto flex-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Custom Highlight Badge (Optional)</label>
                <input type="text" value={metaFields.custom_badge || ''} onChange={e => setMetaFields((p: any) => ({...p, custom_badge: e.target.value}))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" placeholder="e.g. New Edition, Limited Time Offer" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Pages / Length</label>
                <input type="number" value={metaFields.pages || ''} onChange={e => setMetaFields((p: any) => ({...p, pages: Number(e.target.value)}))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" placeholder="e.g. 150" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Language</label>
                <input type="text" value={metaFields.language || ''} onChange={e => setMetaFields((p: any) => ({...p, language: e.target.value}))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" placeholder="e.g. English" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Format</label>
                <input type="text" value={metaFields.format || ''} onChange={e => setMetaFields((p: any) => ({...p, format: e.target.value}))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" placeholder="e.g. PDF" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Books Included</label>
                <input type="number" value={metaFields.books || ''} onChange={e => setMetaFields((p: any) => ({...p, books: Number(e.target.value)}))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" placeholder="e.g. 3 (For Combos)" />
              </div>
            </div>
            
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Preview Video URL (YouTube)</label>
              <input type="url" value={metaFields.preview_video_url || ''} onChange={e => setMetaFields((p: any) => ({...p, preview_video_url: e.target.value}))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" placeholder="https://youtube.com/watch?v=..." />
              <p className="text-xs text-slate-500 mt-1">Add a YouTube link to feature a preview video in the product gallery.</p>
            </div>
          </div>
          
          {/* Verified Reviews Manager */}
          <VerifiedReviewsManager 
            reviews={metaFields.verified_reviews || []} 
            onChange={(reviews: VerifiedReview[]) => setMetaFields((p: any) => ({ ...p, verified_reviews: reviews }))} 
          />

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
      )}
    </form>
  );
}
