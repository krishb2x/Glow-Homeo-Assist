import { createAdminClient } from "../../../../../lib/supabase";
import { formatPrice, formatDate } from "../../../../../lib/utils";
import Link from "next/link";
import { Eye, AlertCircle, CheckCircle2, ShoppingBag, Search, Filter } from "lucide-react";
import { redirect } from "next/navigation";
import OrderFilterSelect from "./OrderFilterSelect";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const resolvedParams = await searchParams;
  const q = resolvedParams.q || "";
  const status = resolvedParams.status || "all";
  const page = parseInt(resolvedParams.page || "1", 10);
  const pageSize = 50;

  const supabase = createAdminClient();

  let query = supabase
    .from("mt_orders")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (q) {
    // Basic search: supabase doesn't easily do OR across multiple columns without rpc or syntax like 'or=(col.ilike.*q*,col2.ilike.*q*)'
    query = query.or(`customer_name.ilike.%${q}%,customer_email.ilike.%${q}%,razorpay_order_id.ilike.%${q}%`);
  }

  const { data: orders, count, error } = await query.range((page - 1) * pageSize, page * pageSize - 1);

  if (error && error.code !== '42P01') {
    console.error("Failed to fetch orders:", error);
  }

  const allOrders = orders || [];
  const totalPages = Math.ceil((count || 0) / pageSize);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShoppingBag className="h-8 w-8 text-indigo-600" />
            Order Management
          </h1>
          <p className="text-slate-500 mt-1">View and manage all customer purchases across the platform.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Server-side Search & Filter Form */}
        <form className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              name="q"
              defaultValue={q}
              placeholder="Search by name, email, or Order ID..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <OrderFilterSelect defaultValue={status} />
          </div>
          {/* Hidden submit button to allow Enter key to submit search */}
          <button type="submit" className="hidden">Search</button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
              <tr>
                <th className="px-6 py-4">Order Details</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Products</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4">Fulfillment</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <ShoppingBag className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="font-medium text-slate-700">No orders found.</p>
                    <p className="text-sm">Try adjusting your search or filters.</p>
                  </td>
                </tr>
              ) : (
                allOrders.map(order => {
                  // Determine product types in order
                  const types = new Set(
                    (Array.isArray(order.items) ? order.items : [])
                      .map((i: any) => i?.product?.product_type || i?.product?.type || 'UNKNOWN')
                  );
                  const typeLabels = Array.from(types).join(", ");

                  return (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{order.razorpay_order_id || order.id.split('-')[0]}</div>
                        <div className="text-xs text-slate-500 mt-1">{formatDate(order.created_at)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">{order.customer_name}</div>
                        <div className="text-xs text-slate-500 mt-1">{order.customer_email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-800 font-medium">{order.items?.length || 0} item(s)</div>
                        <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mt-1">{typeLabels}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {formatPrice(order.total_amount)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider border ${
                          order.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          order.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider border ${
                          order.fulfillment_status === 'fulfilled' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          order.fulfillment_status === 'partial' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {order.fulfillment_status === 'unfulfilled' && <AlertCircle className="w-3 h-3" />}
                          {order.fulfillment_status === 'fulfilled' && <CheckCircle2 className="w-3 h-3" />}
                          {order.fulfillment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          href={`/admin/commerce/orders/${order.id}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, count || 0)} of {count}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link 
                  href={`/admin/commerce/orders?q=${q}&status=${status}&page=${page - 1}`}
                  className="px-3 py-1.5 text-sm font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link 
                  href={`/admin/commerce/orders?q=${q}&status=${status}&page=${page + 1}`}
                  className="px-3 py-1.5 text-sm font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
