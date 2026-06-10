import { createAdminClient } from "../../../../../lib/supabase";
import { formatPrice, formatDate } from "../../../../../lib/utils";
import Link from "next/link";
import { Search, UserCircle, MapPin, Stethoscope, BookOpen, Crown, Star } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const resolvedParams = await searchParams;
  const q = (resolvedParams.q || "").toLowerCase();

  const supabase = createAdminClient();

  // Fetch all orders to aggregate LTV (Server Side)
  // In a massive scale app, this would use a materialized view, but server-side aggregation
  // is significantly faster and safer than client-side for moderate scales.
  const { data: orders, error } = await supabase
    .from("mt_orders")
    .select("customer_email, customer_name, customer_phone, total_amount, status, created_at, utm_source, items")
    .order("created_at", { ascending: false });

  if (error && error.code !== '42P01') {
    console.error("Failed to fetch orders:", error);
  }

  // Aggregate by customer_email
  const customerMap: Record<string, any> = {};

  (orders || []).forEach((o: any) => {
    const email = o.customer_email;
    if (!email) return;

    if (!customerMap[email]) {
      customerMap[email] = {
        email: email,
        name: o.customer_name,
        phone: o.customer_phone,
        ltv: 0,
        orderCount: 0,
        firstPurchase: o.created_at,
        lastPurchase: o.created_at,
        sources: new Set(),
        productTypesPurchased: new Set(),
      };
    }

    if (o.status === 'paid' || o.status === 'fulfilled') {
      customerMap[email].ltv += Number(o.total_amount);
      customerMap[email].orderCount += 1;
      
      if (new Date(o.created_at) > new Date(customerMap[email].lastPurchase)) {
        customerMap[email].lastPurchase = o.created_at;
      }
      if (new Date(o.created_at) < new Date(customerMap[email].firstPurchase)) {
        customerMap[email].firstPurchase = o.created_at;
      }
      if (o.utm_source) {
        customerMap[email].sources.add(o.utm_source);
      }
      
      // Extract Product Types
      if (Array.isArray(o.items)) {
        o.items.forEach((item: any) => {
          if (item.product?.product_type) {
            customerMap[email].productTypesPurchased.add(item.product.product_type);
          }
        });
      }
    }
  });

  let customerList = Object.values(customerMap)
    .filter(c => c.orderCount > 0)
    .sort((a, b) => b.ltv - a.ltv); // Sort by highest LTV

  if (q) {
    customerList = customerList.filter(c => 
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  }

  // Determine Personas based on ProductTypes and LTV
  const getPersonas = (c: any) => {
    const personas = [];
    const types = c.productTypesPurchased;
    
    if (types.has('CONSULTATION') || types.has('PROGRAM')) {
      personas.push({ label: 'Patient', icon: Stethoscope, color: 'bg-indigo-100 text-indigo-700 border-indigo-200' });
    }
    if (types.has('EBOOK') || types.has('COURSE') || types.has('PHYSICAL_BOOK')) {
      personas.push({ label: 'Reader', icon: BookOpen, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' });
    }
    if (types.has('MEMBERSHIP')) {
      personas.push({ label: 'Member', icon: Crown, color: 'bg-purple-100 text-purple-700 border-purple-200' });
    }
    if (c.ltv >= 5000) {
      personas.push({ label: 'VIP', icon: Star, color: 'bg-amber-100 text-amber-700 border-amber-200 shadow-sm' });
    }
    
    return personas;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <UserCircle className="h-8 w-8 text-emerald-600" />
            Customers & CRM
          </h1>
          <p className="text-slate-500 mt-1">View lifetime value, behavioral personas, and complete purchase history.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <form className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              name="q"
              defaultValue={q}
              placeholder="Search by name or email..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <button type="submit" className="hidden">Search</button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Behavioral Personas</th>
                <th className="px-6 py-4">Lifetime Value</th>
                <th className="px-6 py-4">Orders</th>
                <th className="px-6 py-4">Acquisition</th>
                <th className="px-6 py-4">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customerList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <UserCircle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="font-medium text-slate-700">No customers found.</p>
                    <p className="text-sm">Try adjusting your search query.</p>
                  </td>
                </tr>
              ) : (
                customerList.map(customer => {
                  const personas = getPersonas(customer);
                  
                  return (
                    <tr key={customer.email} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <Link href={`/admin/commerce/customers/${encodeURIComponent(customer.email)}`} className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:border-emerald-200 transition-colors">
                            <UserCircle className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">{customer.name}</div>
                            <div className="text-xs text-slate-500">{customer.email}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1.5 flex-wrap max-w-[200px]">
                          {personas.map(p => (
                            <span key={p.label} className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${p.color}`}>
                              <p.icon className="w-3 h-3" />
                              {p.label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-emerald-600 text-base">{formatPrice(customer.ltv)}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {customer.orderCount}
                      </td>
                      <td className="px-6 py-4">
                        {Array.from(customer.sources).length > 0 ? (
                          <div className="flex gap-1 flex-wrap max-w-[150px]">
                            {Array.from(customer.sources).map((s: any) => (
                              <span key={s} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border border-slate-200">
                                <MapPin className="w-3 h-3" /> {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">Organic</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs">
                        {formatDate(customer.lastPurchase)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-sm text-slate-500">
            Showing {customerList.length} total customers
          </span>
        </div>
      </div>
    </div>
  );
}
