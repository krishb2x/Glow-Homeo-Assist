"use client";

import React, { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { Search, Plus, Edit, Package, CircleDot, AlertCircle, ExternalLink } from "lucide-react";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function loadProducts() {
      const supabase = getSupabaseBrowser();
      try {
        const { data, error } = await supabase
          .from("mt_ebooks")
          .select("*")
          .order("sort_order", { ascending: true });
          
        if (error && error.code !== '42P01') throw error;
        setProducts(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Products</h2>
          <p className="text-sm text-slate-500">Manage your store catalog and inventory.</p>
        </div>
        <Link 
          href="/admin/commerce/products/new"
          className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Product
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by title or description..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Product</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Fulfillment</th>
                <th className="px-6 py-3 font-medium">Price</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading products...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No products found.</td>
                </tr>
              ) : (
                filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-12 bg-slate-100 rounded overflow-hidden shrink-0">
                          {product.cover_image_path ? (
                            <img src={product.cover_image_path} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">{product.title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                        EBOOK
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-200 text-slate-600">
                        DIGITAL
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{formatPrice(product.price)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        {product.is_active ? (
                          <><CircleDot className="w-3 h-3 text-emerald-500" /> Active</>
                        ) : (
                          <><AlertCircle className="w-3 h-3 text-slate-400" /> Inactive</>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-4">
                      {product.is_active && (
                        <a 
                          href={`/ebooks/${product.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-slate-400 hover:text-emerald-600 transition-colors"
                          title="View on Storefront"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <Link 
                        href={`/admin/commerce/products/${product.id}`}
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-emerald-600 font-medium text-sm transition-colors"
                      >
                        <Edit className="w-4 h-4" /> Edit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
