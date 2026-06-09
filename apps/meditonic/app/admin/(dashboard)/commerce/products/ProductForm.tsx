"use client";

import React, { useState, useEffect } from "react";
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
  const [showPreview, setShowPreview] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Available products for Upsell
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  
  const [formData, setFormData] = useState<Partial<Product>>({
    title: initialData?.title || "",
    slug: initialData?.slug || "",
    description: initialData?.description || "",
    product_type: initialData?.product_type || "EBOOK",
    fulfillment_type: initialData?.fulfillment_type || "DIGITAL_DOWNLOAD",
    price: initialData?.price || 0,
    original_price: (initialData as any)?.original_price || 0,
    category: initialData?.category || "",
    meta_title: (initialData as any)?.meta_title || "",
    meta_description: (initialData as any)?.meta_description || "",
    
    // Legacy support
    status: (initialData as any)?.status || "PUBLISHED",
    type: (initialData as any)?.type || "EBOOK",
    
    // Merchandising flags
    is_active: initialData?.is_active ?? true,
    display_order: initialData?.display_order ?? 999,
    is_featured: initialData?.is_featured ?? false,
    is_bestseller: initialData?.is_bestseller ?? false,
    is_new_release: initialData?.is_new_release ?? false,
    is_bundle: initialData?.is_bundle ?? false,
    
    cover_image_path: initialData?.cover_image_path || (initialData as any)?.image_url || "",
    gallery_image_paths: initialData?.gallery_image_paths || [],
    preview_pdf_path: initialData?.preview_pdf_path || "",
    final_pdf_path: initialData?.final_pdf_path || "",
    
    // Relationships
    related_product_ids: (initialData as any)?.related_product_ids || [],
  });

  useEffect(() => {
    // Fetch products for Upsell selection
    const fetchProducts = async () => {
      const supabase = getSupabaseBrowser();
      const { data } = await supabase
        .from("mt_products")
        .select("id, title, price")
        .eq("is_active", true)
        .neq("id", initialData?.id || '00000000-0000-0000-0000-000000000000') // Don't allow upselling to self
        .order("title");
      if (data) setAvailableProducts(data as Product[]);
    };
    fetchProducts();
  }, [initialData?.id]);

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

  const getPayload = () => ({
    ...formData,
    metadata: {
      ...metaFields,
    },
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
    const { name, value, type } = e.target as HTMLInputElement;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        [name]: ['price', 'original_price', 'display_order'].includes(name) ? Number(value) : value 
      }));
    }
  };

  const handleUpsellChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setFormData(prev => ({
      ...prev,
      related_product_ids: val ? [val] : [] // Store as array with one primary upsell for now
    }));
  };

  return (
    <form onSubmit={handleSave} className="space-y-8 max-w-4xl pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">
            {initialData ? "Edit Product" : "New Product"}
          </h2>
          <p className="text-sm text-slate-500">Configure your commerce listing and merchandising.</p>
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
                <input required type="text" name="title" value={formData.title} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Slug (URL)</label>
                <input required type="text" name="slug" value={formData.slug} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 font-mono text-xs" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
              <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Collection / Category</label>
                <select name="category" value={formData.category} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500">
                  <option value="">No Category</option>
                  <option value="Diagnostics">Diagnostics</option>
                  <option value="Women's Health">Women's Health</option>
                  <option value="Thyroid">Thyroid</option>
                  <option value="PCOS">PCOS</option>
                  <option value="Homeopathy Basics">Homeopathy Basics</option>
                  <option value="Exam Preparation">Exam Preparation</option>
                </select>
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
                      <button type="button" onClick={() => setFormData(p => ({...p, cover_image_path: ""}))} className="text-red-500 text-xs font-semibold flex items-center gap-1"><X className="w-3 h-3"/> Remove</button>
                    </div>
                  </div>
                ) : (
                  <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'cover_image_path', 'meditonic-public')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    {uploadingImage ? <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /> : <UploadCloud className="w-6 h-6 text-slate-400 mb-2" />}
                    <span className="text-sm font-medium text-slate-600">Upload Cover</span>
                  </div>
                )}
              </div>

              {/* Gallery Images */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Gallery Images</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
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
                    <span className="text-[10px] font-medium text-slate-600">Add Image</span>
                  </div>
                </div>
              </div>

              {/* PDF Uploads */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg bg-slate-50">
                  <label className="block text-xs font-bold text-slate-700 mb-2">Sample PDF (Public)</label>
                  {formData.preview_pdf_path ? (
                    <div className="flex items-center justify-between bg-white border p-2 rounded">
                      <span className="text-xs truncate max-w-[150px]">{formData.preview_pdf_path}</span>
                      <button type="button" onClick={() => setFormData(p => ({...p, preview_pdf_path: ""}))} className="text-red-500"><X className="w-4 h-4"/></button>
                    </div>
                  ) : (
                    <div className="relative border-2 border-dashed border-slate-300 p-2 rounded text-center bg-white cursor-pointer hover:bg-slate-50">
                      <input type="file" accept=".pdf" onChange={(e) => handleFileUpload(e, 'preview_pdf_path', 'meditonic-public')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      <span className="text-xs text-slate-500">Upload Sample PDF</span>
                    </div>
                  )}
                </div>
                
                <div className="p-4 border rounded-lg bg-emerald-50 border-emerald-100">
                  <label className="block text-xs font-bold text-emerald-800 mb-2">Final Product PDF (Private)</label>
                  {formData.final_pdf_path ? (
                    <div className="flex items-center justify-between bg-white border border-emerald-200 p-2 rounded">
                      <span className="text-xs truncate max-w-[150px]">{formData.final_pdf_path}</span>
                      <button type="button" onClick={() => setFormData(p => ({...p, final_pdf_path: ""}))} className="text-red-500"><X className="w-4 h-4"/></button>
                    </div>
                  ) : (
                    <div className="relative border-2 border-dashed border-emerald-300 p-2 rounded text-center bg-white cursor-pointer hover:bg-emerald-50">
                      <input type="file" accept=".pdf" onChange={(e) => handleFileUpload(e, 'final_pdf_path', 'meditonic-private')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      <span className="text-xs text-emerald-600 font-semibold">Upload Full PDF</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4">Marketing Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">YouTube Preview Video URL</label>
                <input type="text" value={metaFields.preview_video_url || ''} onChange={(e) => setMetaFields((p: any) => ({...p, preview_video_url: e.target.value}))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" placeholder="https://youtu.be/..." />
              </div>
            </div>
            
            <div className="mt-6">
              <VerifiedReviewsManager 
                reviews={metaFields.verified_reviews || []} 
                onChange={(reviews: VerifiedReview[]) => setMetaFields((p: any) => ({ ...p, verified_reviews: reviews }))} 
              />
            </div>
          </div>
        </div>

        {/* Right Column - Merchandising & Pricing */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4">Visibility & Ranking</h3>
            
            <label className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 cursor-pointer">
              <span className="text-sm font-semibold text-slate-700">Active (Public)</span>
              <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} className="w-4 h-4 accent-emerald-600" />
            </label>
            
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Display Order (1 = Highest)</label>
              <input type="number" name="display_order" value={formData.display_order} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
              <p className="text-[10px] text-slate-500 mt-1">Products are sorted by this number ascending.</p>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4">Merchandising Flags</h3>
            
            <div className="space-y-2">
              <label className="flex items-center gap-3">
                <input type="checkbox" name="is_featured" checked={formData.is_featured} onChange={handleChange} className="w-4 h-4 accent-emerald-600" />
                <span className="text-sm text-slate-700">Featured Product</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" name="is_bestseller" checked={formData.is_bestseller} onChange={handleChange} className="w-4 h-4 accent-emerald-600" />
                <span className="text-sm text-slate-700">Best Seller</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" name="is_new_release" checked={formData.is_new_release} onChange={handleChange} className="w-4 h-4 accent-emerald-600" />
                <span className="text-sm text-slate-700">New Release</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" name="is_bundle" checked={formData.is_bundle} onChange={handleChange} className="w-4 h-4 accent-emerald-600" />
                <span className="text-sm text-slate-700">Premium Bundle</span>
              </label>
            </div>
          </div>
          
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl shadow-sm p-6 space-y-4">
            <h3 className="font-semibold text-emerald-800 border-b border-emerald-200 pb-2 mb-4">Upsell Engine</h3>
            
            <div>
              <label className="block text-xs font-semibold text-emerald-700 mb-1">Primary Upsell Recommendation</label>
              <select 
                value={(formData.related_product_ids && formData.related_product_ids.length > 0) ? formData.related_product_ids[0] : ""} 
                onChange={handleUpsellChange} 
                className="w-full border border-emerald-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 bg-white"
              >
                <option value="">No Upsell (Standalone)</option>
                {availableProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.title} (₹{p.price})</option>
                ))}
              </select>
              <p className="text-[10px] text-emerald-600 mt-2 leading-relaxed">
                Selecting a product here will automatically render an "Upgrade to Bundle & Save" card directly above the Buy button on this product's page.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4">Pricing</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Selling Price (₹)</label>
                <input required type="number" name="price" value={formData.price} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-emerald-600" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Original Price (₹)</label>
                <input type="number" name="original_price" value={formData.original_price} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-500" />
              </div>
            </div>
          </div>

        </div>
      </div>
      )}
    </form>
  );
}
