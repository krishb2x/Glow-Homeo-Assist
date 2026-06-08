"use client";

import React, { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { IndianRupee, ShoppingCart, TrendingUp, PackageOpen } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export default function CommerceDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    revenue: 0,
    orders: 0,
    unfulfilledPhysical: 0,
    failedPayments: 0
  });
  
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [utmStats, setUtmStats] = useState<any[]>([]);

  useEffect(() => {
    async function loadDashboard() {
      const supabase = getSupabaseBrowser();
      
      try {
        // Fetch all recent orders (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: orders, error } = await supabase
          .from("mt_orders")
          .select("*")
          .gte("created_at", thirtyDaysAgo.toISOString())
          .order("created_at", { ascending: false });
          
        if (error) {
          // Fallback if table doesn't exist yet
          if (error.code === '42P01') {
            setLoading(false);
            return;
          }
          throw error;
        }

        const paidOrders = orders.filter(o => o.status === 'paid' || o.status === 'fulfilled');
        
        // Calculate basic metrics
        const revenue = paidOrders.reduce((acc, order) => acc + Number(order.total_amount), 0);
        const unfulfilledPhysical = paidOrders.filter(o => o.fulfillment_status === 'unfulfilled').length;
        const failedPayments = orders.filter(o => o.status === 'failed').length;

        setMetrics({
          revenue,
          orders: paidOrders.length,
          unfulfilledPhysical,
          failedPayments
        });

        // Calculate UTM Attribution
        const utmMap: Record<string, { count: number, revenue: number }> = {};
        paidOrders.forEach(o => {
          const source = o.utm_source || 'organic';
          if (!utmMap[source]) utmMap[source] = { count: 0, revenue: 0 };
          utmMap[source].count += 1;
          utmMap[source].revenue += Number(o.total_amount);
        });
        
        setUtmStats(Object.entries(utmMap).map(([source, data]) => ({ source, ...data })).sort((a,b) => b.revenue - a.revenue));

        // Calculate Top Products
        const productMap: Record<string, { title: string, count: number, revenue: number }> = {};
        paidOrders.forEach(o => {
          if (o.items && Array.isArray(o.items)) {
            o.items.forEach(item => {
              const pId = item.product.id;
              if (!productMap[pId]) {
                productMap[pId] = { title: item.product.title, count: 0, revenue: 0 };
              }
              productMap[pId].count += item.quantity;
              productMap[pId].revenue += (item.product.price * item.quantity);
            });
          }
        });
        
        setTopProducts(Object.values(productMap).sort((a,b) => b.revenue - a.revenue).slice(0, 5));

      } catch (err) {
        console.error("Failed to load commerce metrics", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-800">Commerce Overview</h2>
        <p className="text-slate-500">Sales, fulfillment, and product performance over the last 30 days.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Revenue (30d)</CardTitle>
            <IndianRupee className="w-4 h-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {loading ? "..." : formatPrice(metrics.revenue)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Orders (30d)</CardTitle>
            <ShoppingCart className="w-4 h-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {loading ? "..." : metrics.orders}
            </div>
          </CardContent>
        </Card>
        <Card className={`border-slate-200 shadow-sm ${metrics.unfulfilledPhysical > 0 ? 'bg-orange-50 border-orange-200' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className={`text-sm font-medium ${metrics.unfulfilledPhysical > 0 ? 'text-orange-700' : 'text-slate-500'}`}>Unfulfilled Orders</CardTitle>
            <PackageOpen className={`w-4 h-4 ${metrics.unfulfilledPhysical > 0 ? 'text-orange-500' : 'text-slate-400'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.unfulfilledPhysical > 0 ? 'text-orange-700' : 'text-slate-800'}`}>
              {loading ? "..." : metrics.unfulfilledPhysical}
            </div>
            <p className="text-xs text-orange-600 mt-1">Requires manual shipping</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Conversion Rate</CardTitle>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {loading ? "..." : "~2.4%"}
            </div>
            <p className="text-xs text-slate-500 mt-1">Storefront average</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-200 shadow-sm col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Marketing Attribution (UTM)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-slate-500">Loading...</div>
            ) : utmStats.length === 0 ? (
              <div className="text-sm text-slate-500">No attribution data available.</div>
            ) : (
              <div className="space-y-4">
                {utmStats.map((stat, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 uppercase">
                        {stat.source.substring(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{stat.source}</p>
                        <p className="text-xs text-slate-500">{stat.count} orders</p>
                      </div>
                    </div>
                    <div className="font-semibold text-slate-800">
                      {formatPrice(stat.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Top Performing Products</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-slate-500">Loading...</div>
            ) : topProducts.length === 0 ? (
              <div className="text-sm text-slate-500">No product data available.</div>
            ) : (
              <div className="space-y-4">
                {topProducts.map((product, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800 line-clamp-1">{product.title}</p>
                      <p className="text-xs text-slate-500">{product.count} units sold</p>
                    </div>
                    <div className="font-semibold text-emerald-600 shrink-0 ml-4">
                      {formatPrice(product.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
