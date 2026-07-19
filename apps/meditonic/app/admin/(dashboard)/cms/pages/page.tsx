import Link from "next/link";
import { Plus, Settings, Globe, EyeOff, LayoutTemplate } from "lucide-react";
import { createAdminClient } from "../../../../../lib/supabase";
import { cookies } from "next/headers";
import { LandingPage } from "../../../../../types/cms";

export default async function CMSPagesList() {
  const cookieStore = cookies();
  const supabase = createAdminClient();

  // For real app, use clinic_id from session context
  const { data: pages } = await supabase
    .from('mt_landing_pages')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Landing Pages</h2>
          <p className="text-sm text-gray-500 mt-1">Manage all dynamic landing pages on your website.</p>
        </div>
        <button className="flex items-center gap-2 bg-mt-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
          <Plus className="w-4 h-4" />
          Create Page
        </button>
      </div>

      {pages && pages.length > 0 ? (
        <div className="divide-y divide-gray-200">
          {pages.map((page: LandingPage) => (
            <div key={page.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <LayoutTemplate className="w-5 h-5 text-mt-primary" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-gray-900">{page.title}</h3>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-sm text-gray-500 font-mono">/{page.slug}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <div className="flex items-center gap-1.5">
                      {page.status === 'Published' ? (
                        <>
                          <Globe className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-xs font-medium text-emerald-600">Published</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                          <span className="text-xs font-medium text-amber-600">Draft</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <Settings className="w-5 h-5" />
                </button>
                <Link
                  href={`/admin/cms/pages/${page.id}`}
                  className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Edit Layout
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center">
          <LayoutTemplate className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No pages found</h3>
          <p className="text-gray-500 mt-1">Create your first landing page to start building your store.</p>
        </div>
      )}
    </div>
  );
}
