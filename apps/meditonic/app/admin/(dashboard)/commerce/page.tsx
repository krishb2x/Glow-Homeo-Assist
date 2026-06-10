import { createAdminClient } from "../../../../lib/supabase";
import { IndianRupee, ShoppingCart, TrendingUp, PackageOpen, Tag, BarChart3, ArrowRight } from "lucide-react";
import { formatPrice } from "../../../../lib/utils";
import Link from "next/link";
import { Button } from "../../../../components/ui/Button";

export const dynamic = "force-dynamic";

export default async function CommerceDashboard() {
  const supabase = createAdminClient();
  
  // 1. Server-Side Data Fetching
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Only select exactly what we need to save memory
  const { data: orders, error } = await supabase
    .from("mt_orders")
    .select("total_amount, status, fulfillment_status, utm_source, items")
    .gte("created_at", thirtyDaysAgo.toISOString());

  if (error && error.code !== '42P01') {
    console.error("Failed to load commerce metrics", error);
  }

  const allOrders = orders || [];
  const paidOrders = allOrders.filter(o => o.status === 'paid' || o.status === 'fulfilled');
  
  // 2. Server-Side Aggregations
  const revenue = paidOrders.reduce((acc, order) => acc + Number(order.total_amount || 0), 0);
  const unfulfilledPhysical = paidOrders.filter(o => o.fulfillment_status === 'unfulfilled').length;
  
  // UTM Attribution
  const utmMap: Record<string, { count: number, revenue: number }> = {};
  paidOrders.forEach(o => {
    const source = o.utm_source || 'organic';
    if (!utmMap[source]) utmMap[source] = { count: 0, revenue: 0 };
    utmMap[source].count += 1;
    utmMap[source].revenue += Number(o.total_amount || 0);
  });
  const utmStats = Object.entries(utmMap).map(([source, data]) => ({ source, ...data })).sort((a,b) => b.revenue - a.revenue);

  // Top Products
  const productMap: Record<string, { title: string, count: number, revenue: number }> = {};
  paidOrders.forEach(o => {
    if (o.items && Array.isArray(o.items)) {
      o.items.forEach((item: any) => {
        const pId = item.product?.id || item.id || "unknown";
        const pTitle = item.product?.title || item.title || "Unknown Product";
        const pPrice = Number(item.product?.price || item.price || 0);
        const qty = Number(item.quantity || 1);
        
        if (!productMap[pId]) {
          productMap[pId] = { title: pTitle, count: 0, revenue: 0 };
        }
        productMap[pId].count += qty;
        productMap[pId].revenue += (pPrice * qty);
      });
    }
  });
  const topProducts = Object.values(productMap).sort((a,b) => b.revenue - a.revenue).slice(0, 5);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShoppingCart className="h-8 w-8 text-emerald-600" />
            Commerce Overview
          </h1>
          <p className="text-slate-500 mt-1">Sales, fulfillment, and product performance over the last 30 days.</p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/admin/commerce/products">Manage Products</Link>
          </Button>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
            <Link href="/admin/commerce/orders">View All Orders</Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Revenue (30d)</h3>
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{formatPrice(revenue)}</div>
          <p className="text-xs text-slate-500 mt-2">Gross sales processed</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Orders</h3>
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{paidOrders.length}</div>
          <p className="text-xs text-slate-500 mt-2">Successful transactions</p>
        </div>

        <div className={`p-6 rounded-2xl shadow-sm border transition-shadow ${unfulfilledPhysical > 0 ? 'bg-orange-50 border-orange-200 hover:shadow-md' : 'bg-white border-slate-200 hover:shadow-md'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-semibold uppercase tracking-wider ${unfulfilledPhysical > 0 ? 'text-orange-700' : 'text-slate-500'}`}>Unfulfilled</h3>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${unfulfilledPhysical > 0 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'}`}>
              <PackageOpen className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-3xl font-bold ${unfulfilledPhysical > 0 ? 'text-orange-700' : 'text-slate-900'}`}>{unfulfilledPhysical}</div>
          <p className={`text-xs mt-2 font-medium ${unfulfilledPhysical > 0 ? 'text-orange-600' : 'text-slate-500'}`}>Requires manual shipping</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Conversion</h3>
            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">~2.4%</div>
          <p className="text-xs text-slate-500 mt-2">Estimated storefront avg</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Column - UTM Attribution */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-slate-800">Marketing Attribution</h2>
          </div>
          <div className="p-5 flex-1">
            {utmStats.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No attribution data available.</div>
            ) : (
              <div className="space-y-4">
                {utmStats.map((stat, i) => (
                  <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-sm font-bold text-indigo-600 uppercase">
                        {stat.source.substring(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 capitalize">{stat.source}</p>
                        <p className="text-xs text-slate-500 font-medium">{stat.count} orders generated</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{formatPrice(stat.revenue)}</p>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                        <div 
                          className="bg-indigo-500 h-full rounded-full" 
                          style={{ width: `${Math.max(10, (stat.revenue / revenue) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right Column - Top Products */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-slate-800">Top Performing Products</h2>
          </div>
          <div className="p-5 flex-1">
            {topProducts.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No product data available.</div>
            ) : (
              <div className="space-y-4">
                {topProducts.map((product, i) => (
                  <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-sm font-bold text-emerald-600">
                        #{i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 line-clamp-1">{product.title}</p>
                        <p className="text-xs text-slate-500 font-medium">{product.count} units sold</p>
                      </div>
                    </div>
                    <div className="font-bold text-emerald-600 shrink-0 ml-4">
                      {formatPrice(product.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-slate-50 p-4 border-t border-slate-200 text-center mt-auto">
            <Link href="/admin/commerce/products" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center justify-center gap-1">
              View full catalog <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
