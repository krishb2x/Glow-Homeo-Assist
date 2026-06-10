"use client";

import React, { useState, useEffect } from "react";
import { getSupabaseBrowser } from "../../../../../lib/supabase-browser";
import { Product, ProductType, FulfillmentType, ProductStatus } from "../../../../../types/store";
import { BRAND } from "../../../../../lib/constants";
import { useRouter } from "next/navigation";
import { UploadCloud, Loader2, Save, X, ExternalLink, CheckCircle2 } from "lucide-react";
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
    gallery_image_paths: initialData?.metadata?.gallery_image_paths || initialData?.gallery_image_paths || [],
    preview_pdf_path: initialData?.metadata?.preview_pdf_path || initialData?.preview_pdf_path || "",
    final_pdf_path: initialData?.metadata?.final_pdf_path || initialData?.final_pdf_path || "",
    
    // Relationships
    related_product_ids: (initialData as any)?.related_product_ids || [],
    bundle_item_ids: initialData?.bundle_item_ids || [],
    fbt_product_ids: (initialData as any)?.fbt_product_ids || [],
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
      if (field === 'final_pdf_path') {
        if (!formData.slug) {
          alert("Please enter a Slug (URL) first before uploading the Final Product PDF.");
          return;
        }
        // 1. Validate PDF compatibility before uploading
        let arrayBuffer: ArrayBuffer;
        try {
          const { PDFDocument } = await import('pdf-lib');
          arrayBuffer = await file.arrayBuffer();
          // This will throw if the PDF uses unsupported features (e.g. Object Streams in PDF 1.5+ or is Encrypted)
          await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        } catch (pdfErr: any) {
          alert(`INVALID PDF FORMAT: This PDF is encrypted or uses unsupported compression. The delivery system cannot watermark it.\\n\\nPlease open the PDF on your computer and 'Print to PDF', then upload the new file.\\n\\nError: ${pdfErr.message}`);
          if (bucket === 'meditonic-public') setUploadingImage(false);
          else setUploadingPdf(false);
          return;
        }
        
        // 2. Get Presigned URL
        const { data: { session } } = await supabase.auth.getSession();
        const presignRes = await fetch('/api/admin/s3-presign', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`
          },
          body: JSON.stringify({ slug: formData.slug, contentType: file.type })
        });
        const presignData = await presignRes.json();
        
        if (!presignRes.ok) throw new Error(presignData.error || "Failed to get upload URL");

        // 2. Upload to S3
        const uploadRes = await fetch(presignData.url, {
          method: 'PUT',
          body: arrayBuffer,
          headers: { 'Content-Type': file.type }
        });

        if (!uploadRes.ok) throw new Error("Failed to upload file to S3");
        
        // 3. Save pseudo-path (delivery system auto-resolves using slug)
        setFormData(prev => ({ ...prev, [field]: `aws-s3-managed` }));
      } else {
        // Upload to Supabase Storage
        const { error } = await supabase.storage
          .from(bucket)
          .upload(filePath, file);

        if (error) throw error;
        setFormData(prev => ({ ...prev, [field]: `${bucket}/${filePath}` }));
      }
      
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

  const moveGalleryImage = (index: number, direction: 'left' | 'right') => {
    setFormData(prev => {
      const newPaths = [...(prev.gallery_image_paths || [])];
      if (direction === 'left' && index > 0) {
        [newPaths[index - 1], newPaths[index]] = [newPaths[index], newPaths[index - 1]];
      } else if (direction === 'right' && index < newPaths.length - 1) {
        [newPaths[index + 1], newPaths[index]] = [newPaths[index], newPaths[index + 1]];
      }
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

  const handleMetaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMetaFields((prev: any) => ({
      ...prev,
      [name]: ['pages', 'books'].includes(name) ? Number(value) : value
    }));
  };

  const handleUpsellChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setFormData(prev => ({
      ...prev,
      related_product_ids: val ? [val] : [] // Store as array with one primary upsell for now
    }));
  };

  const handleBundleItemChange = (productId: string) => {
    setFormData(prev => {
      const current = prev.bundle_item_ids || [];
      if (current.includes(productId)) {
        return { ...prev, bundle_item_ids: current.filter(id => id !== productId) };
      } else {
        return { ...prev, bundle_item_ids: [...current, productId] };
      }
    });
  };

  const handleFBTItemChange = (productId: string) => {
    setFormData(prev => {
      const current = (prev as any).fbt_product_ids || [];
      if (current.includes(productId)) {
        return { ...prev, fbt_product_ids: current.filter((id: string) => id !== productId) };
      } else {
        return { ...prev, fbt_product_ids: [...current, productId] };
      }
    });
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
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4 border-t-4 border-t-indigo-500">
            <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">Basic Information</h3>
            
            <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
              <label className="block text-xs font-bold text-indigo-900 mb-2">Product Architecture Type</label>
              <select 
                name="product_type" 
                value={formData.product_type} 
                onChange={handleChange} 
                className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white font-semibold text-indigo-900 shadow-sm"
              >
                <option value="EBOOK">E-Book (Digital PDF)</option>
                <option value="PHYSICAL_BOOK">Physical Book (Shipping)</option>
                <option value="CONSULTATION">Medical Consultation (Clinical Triage)</option>
                <option value="PROGRAM">Digital Program</option>
                <option value="COURSE">Online Course</option>
                <option value="MEMBERSHIP">Membership Access</option>
                <option value="BUNDLE">Product Bundle</option>
              </select>
              <p className="text-[10px] text-indigo-700 mt-2">
                This dictates how the system fulfills the order (e.g. S3 Watermarking vs Clinical Triage Queue).
              </p>
            </div>
            
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
                  <option value="Diagnosis">Diagnosis</option>
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
                      
                      {/* Top Right: Remove */}
                      <button type="button" onClick={() => removeGalleryImage(idx)} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600">
                        <X className="w-3 h-3" />
                      </button>

                      {/* Bottom Controls: Reorder */}
                      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        {idx > 0 && (
                          <button type="button" onClick={() => moveGalleryImage(idx, 'left')} className="bg-slate-800/80 backdrop-blur text-white px-2 py-1 rounded text-xs hover:bg-slate-900 transition-colors">
                            &larr; Move
                          </button>
                        )}
                        {idx < (formData.gallery_image_paths?.length || 0) - 1 && (
                          <button type="button" onClick={() => moveGalleryImage(idx, 'right')} className="bg-slate-800/80 backdrop-blur text-white px-2 py-1 rounded text-xs hover:bg-slate-900 transition-colors">
                            Move &rarr;
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <div className="relative border-2 border-dashed border-slate-300 rounded-lg aspect-square flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
                    <input type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    {uploadingGallery ? <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" /> : <UploadCloud className="w-5 h-5 text-slate-400 mb-1" />}
                    <span className="text-[10px] font-medium text-slate-600">Add Image</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Book / Content Details Panel */}
          {['EBOOK', 'PHYSICAL_BOOK', 'PROGRAM', 'COURSE'].includes(formData.product_type || '') && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4 border-l-4 border-l-amber-500">
              <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4">Content Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Author / Creator</label>
                  <input type="text" name="author" value={metaFields.author || ''} onChange={handleMetaChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" placeholder="e.g. Dr. Aman Agrawal" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Format Type</label>
                  <input type="text" name="format" value={metaFields.format || ''} onChange={handleMetaChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" placeholder="e.g. PDF, Hardcover" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Total Pages</label>
                  <input type="number" name="pages" value={metaFields.pages || ''} onChange={handleMetaChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Language</label>
                  <input type="text" name="language" value={metaFields.language || ''} onChange={handleMetaChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" placeholder="e.g. English, Hindi" />
                </div>
              </div>
            </div>
          )}

          {/* Digital Delivery Panel */}
          {['EBOOK', 'PROGRAM', 'COURSE'].includes(formData.product_type || '') && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4 border-l-4 border-l-emerald-500">
              <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4">Digital Delivery Files</h3>

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
                  <label className="block text-sm font-bold text-emerald-800 mb-1">Final Product PDF (Private)</label>
                  <p className="text-[10px] text-emerald-600 mb-3 leading-tight">Securely stored in AWS S3. Uploading a new file will overwrite the existing one for future deliveries.</p>
                  
                  {uploadingPdf ? (
                    <div className="flex items-center justify-center p-4 border-2 border-dashed border-emerald-300 rounded bg-white">
                      <Loader2 className="w-5 h-5 text-emerald-500 animate-spin mr-2" />
                      <span className="text-xs text-emerald-600 font-semibold">Uploading to S3...</span>
                    </div>
                  ) : formData.final_pdf_path ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between bg-white border border-emerald-200 p-2 rounded">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-semibold text-slate-700">Stored in AWS S3</span>
                        </div>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Ready</span>
                      </div>
                      <div className="relative border border-dashed border-emerald-300 p-2 rounded text-center bg-white cursor-pointer hover:bg-emerald-50 transition-colors">
                        <input type="file" accept=".pdf" onChange={(e) => handleFileUpload(e, 'final_pdf_path', 'meditonic-private')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <span className="text-[11px] text-emerald-600 font-medium flex items-center justify-center gap-1"><UploadCloud className="w-3 h-3"/> Replace File in S3</span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative border-2 border-dashed border-emerald-300 p-4 rounded text-center bg-white cursor-pointer hover:bg-emerald-50 transition-colors">
                      <input type="file" accept=".pdf" onChange={(e) => handleFileUpload(e, 'final_pdf_path', 'meditonic-private')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      <UploadCloud className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                      <span className="text-xs text-emerald-600 font-semibold">Upload to AWS S3</span>
                    </div>
                  )}
                  
                  <div className="mt-4 pt-4 border-t border-emerald-200">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={metaFields.requires_watermark !== false}
                          onChange={(e) => setMetaFields((p: any) => ({ ...p, requires_watermark: e.target.checked }))}
                          className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500 cursor-pointer"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-emerald-800">Visual Watermarking</span>
                        <span className="text-[10px] text-emerald-600">Draws buyer name/email diagonally across pages. If disabled, PDF is delivered 15x faster with password protection only.</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Clinical Panel */}
          {formData.product_type === 'CONSULTATION' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4 border-l-4 border-l-purple-500">
              <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4">Clinical Operations</h3>
              <p className="text-xs text-slate-600 mb-4">
                Orders for this product will automatically generate a Case in the Clinical Triage queue. No files are delivered.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Consultation Duration (mins)</label>
                  <input type="number" name="duration" value={metaFields.duration || ''} onChange={handleMetaChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" placeholder="e.g. 30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Modality</label>
                  <select name="modality" value={metaFields.modality || ''} onChange={handleMetaChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500">
                    <option value="">Select Modality...</option>
                    <option value="Video Call">Video Call</option>
                    <option value="Voice Call">Voice Call</option>
                    <option value="In-Clinic">In-Clinic</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          
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

          <div className="bg-blue-50 border border-blue-100 rounded-xl shadow-sm p-6 space-y-4">
            <h3 className="font-semibold text-blue-800 border-b border-blue-200 pb-2 mb-4">Frequently Bought Together</h3>
            <p className="text-xs text-blue-700 leading-relaxed">
              Select products that customers often purchase alongside this one. This will render a checklist on the product page allowing customers to add them all to the cart at once.
            </p>
            
            <div className="max-h-64 overflow-y-auto space-y-2 bg-white rounded-lg border border-blue-200 p-3">
              {availableProducts.map(p => {
                const isSelected = (formData as any).fbt_product_ids?.includes(p.id);
                return (
                  <label key={`fbt-${p.id}`} className="flex items-start gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => handleFBTItemChange(p.id)}
                      className="mt-1 w-4 h-4 accent-blue-600"
                    />
                    <div>
                      <span className="text-sm font-semibold text-slate-800 block">{p.title}</span>
                      <span className="text-xs text-slate-500 block">₹{p.price}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {(formData.is_bundle || formData.product_type === 'BUNDLE') && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl shadow-sm p-6 space-y-4">
              <h3 className="font-semibold text-purple-800 border-b border-purple-200 pb-2 mb-4">Bundle Contents</h3>
              <p className="text-xs text-purple-700 leading-relaxed">
                Select the individual Ebooks that are included in this bundle. When a customer purchases this bundle, the system will automatically deliver all selected Ebooks.
              </p>
              
              <div className="max-h-64 overflow-y-auto space-y-2 bg-white rounded-lg border border-purple-200 p-3">
                {availableProducts.map(p => {
                  const isSelected = formData.bundle_item_ids?.includes(p.id);
                  return (
                    <label key={p.id} className="flex items-start gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => handleBundleItemChange(p.id)}
                        className="mt-1 w-4 h-4 accent-purple-600"
                      />
                      <div>
                        <span className="text-sm font-semibold text-slate-800 block">{p.title}</span>
                        <span className="text-xs text-slate-500 block">₹{p.price}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

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
