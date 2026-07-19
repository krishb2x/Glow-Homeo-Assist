import { Flag, Megaphone, Plus } from "lucide-react";

export default function CMSBannersList() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-mt-primary" />
              Announcement Bars
            </h2>
            <p className="text-sm text-gray-500 mt-1">Manage global announcement strips at the top of the site.</p>
          </div>
          <button className="flex items-center gap-2 bg-gray-50 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
            <Plus className="w-4 h-4" />
            Create Announcement
          </button>
        </div>
        <div className="p-8 text-center text-gray-500 text-sm">
          No announcements found. Create one to highlight free shipping or an ongoing sale.
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Flag className="w-5 h-5 text-mt-primary" />
              Promotion Banners
            </h2>
            <p className="text-sm text-gray-500 mt-1">Manage in-page promotional banners across product and category pages.</p>
          </div>
          <button className="flex items-center gap-2 bg-gray-50 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
            <Plus className="w-4 h-4" />
            Create Banner
          </button>
        </div>
        <div className="p-8 text-center text-gray-500 text-sm">
          No promotion banners found. Create one to embed targeted sales directly into your layout.
        </div>
      </div>
    </div>
  );
}
