import { Plus, Search, FolderOpen, Image as ImageIcon, LayoutGrid, List } from "lucide-react";

export default function CMSMediaLibrary() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[600px] flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Media Library</h2>
            <p className="text-sm text-gray-500 mt-1">Manage images and files used across your store.</p>
          </div>
          <button className="flex items-center gap-2 bg-mt-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            Upload File
          </button>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
           <div className="relative w-full max-w-md">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
             <input 
               type="text" 
               placeholder="Search files by name, alt text, or tags..." 
               className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-mt-primary focus:border-mt-primary"
             />
           </div>
           
           <div className="flex items-center gap-2 self-start sm:self-auto">
             <button className="p-2 border border-gray-300 rounded-md text-gray-600 bg-gray-50 hover:bg-gray-100">
               <LayoutGrid className="w-4 h-4" />
             </button>
             <button className="p-2 border border-gray-300 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50">
               <List className="w-4 h-4" />
             </button>
           </div>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Folders Sidebar */}
        <div className="w-64 border-r border-gray-200 p-4 overflow-y-auto bg-gray-50">
           <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">Folders</h3>
           <nav className="space-y-1">
             <a href="#" className="flex items-center gap-3 px-3 py-2 bg-white border border-gray-200 text-mt-primary rounded-lg text-sm font-medium shadow-sm">
               <FolderOpen className="w-4 h-4 text-mt-primary" />
               All Media
             </a>
             <a href="#" className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors">
               <FolderOpen className="w-4 h-4 text-gray-400" />
               Hero Banners
             </a>
             <a href="#" className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors">
               <FolderOpen className="w-4 h-4 text-gray-400" />
               Category Images
             </a>
             <a href="#" className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors">
               <FolderOpen className="w-4 h-4 text-gray-400" />
               Review Photos
             </a>
           </nav>
        </div>
        
        {/* Grid Canvas */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
             {/* Empty State Mockup */}
             <div className="col-span-full py-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <ImageIcon className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-base font-medium text-gray-900">No media found</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-sm">Upload images to use them across your landing pages, banners, and categories.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
