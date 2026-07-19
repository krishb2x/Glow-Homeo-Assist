"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Save, Eye, LayoutTemplate, Plus, GripVertical, Settings2, Trash2 } from "lucide-react";
import Link from "next/link";
import { LandingPage, LandingPageSection } from "@/types/cms";
// Need a supabase browser client here for real implementation

export default function PageBuilder({ params }: { params: { id: string } }) {
  const [page, setPage] = useState<LandingPage | null>(null);
  const [sections, setSections] = useState<LandingPageSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // In a real app, fetch data via supabase-browser

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] -m-8">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/admin/cms/pages" className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-900">Homepage</h1>
              <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold">Published</span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">/homepage</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-white bg-mt-primary rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm">
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </header>

      {/* Builder Workspace */}
      <div className="flex-1 flex overflow-hidden bg-gray-50">
        
        {/* Left Sidebar - Section List (Draggable) */}
        <aside className="w-80 flex flex-col bg-white border-r border-gray-200 shrink-0 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
            <h2 className="text-sm font-semibold text-gray-900">Page Sections</h2>
            <button className="p-1.5 text-mt-primary hover:bg-emerald-50 rounded-md transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="p-4 flex flex-col gap-3">
            {/* Mock Sections */}
            {[
              { id: 1, name: "Hero Banner", type: "hero" },
              { id: 2, name: "Trust Strip", type: "trust-strip" },
              { id: 3, name: "Shop Categories", type: "categories" },
              { id: 4, name: "Best Sellers", type: "best-sellers" },
              { id: 5, name: "Bundle Deals", type: "bundle-deals" },
              { id: 6, name: "Customer Reviews", type: "reviews" }
            ].map((section) => (
              <div key={section.id} className="group flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-mt-primary transition-colors cursor-pointer">
                <button className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                  <GripVertical className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{section.name}</p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{section.type}</p>
                </div>
                <button className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          
          <div className="p-4 mt-auto border-t border-gray-200">
            <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:text-mt-primary hover:border-mt-primary hover:bg-emerald-50 transition-colors">
              <Plus className="w-4 h-4" />
              Add Section
            </button>
          </div>
        </aside>

        {/* Main Canvas - Preview / Configuration */}
        <main className="flex-1 overflow-y-auto p-8 flex justify-center">
          <div className="w-full max-w-3xl bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
             
             {/* Configuration Panel for selected section */}
             <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50">
               <div className="flex items-center gap-3">
                 <Settings2 className="w-5 h-5 text-mt-primary" />
                 <h2 className="text-lg font-semibold text-gray-900">Hero Banner Configuration</h2>
               </div>
             </div>
             
             <div className="p-6 flex-1">
                {/* Form fields would go here */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section Title</label>
                    <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-mt-primary focus:border-mt-primary" defaultValue="Expand Your Knowledge" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                    <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-mt-primary focus:border-mt-primary" rows={3} defaultValue="Discover premium medical books and exclusive bundles." />
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900">Hero Slides (Items)</h3>
                      <button className="text-sm font-medium text-mt-primary hover:text-emerald-700">Add Slide</button>
                    </div>
                    {/* Items List */}
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                      <div className="p-4 flex items-center gap-4 bg-gray-50">
                         <div className="w-16 h-12 bg-gray-200 rounded overflow-hidden flex shrink-0">
                           {/* image thumbnail */}
                         </div>
                         <div className="flex-1">
                           <p className="text-sm font-medium text-gray-900">Slide 1: Summer Sale</p>
                           <p className="text-xs text-gray-500">Desktop & Mobile Images set</p>
                         </div>
                         <button className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded hover:bg-gray-50">Edit</button>
                      </div>
                    </div>
                  </div>
                </div>
             </div>

          </div>
        </main>
      </div>
    </div>
  );
}
