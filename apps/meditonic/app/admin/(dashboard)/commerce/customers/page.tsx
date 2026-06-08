"use client";

import React, { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { formatPrice, formatDate } from "@/lib/utils";
import { Search, UserCircle, Mail, MapPin } from "lucide-react";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function loadCustomers() {
      const supabase = getSupabaseBrowser();
      try {
        const { data: orders, error } = await supabase
          .from("mt_orders")
          .select("*")
          .order("created_at", { ascending: false });
          
        if (error && error.code !== '42P01') throw error;
        
        // Aggregate by customer_email
        const customerMap: Record<string, any> = {};
        
        (orders || []).forEach(o => {
          const email = o.customer_email;
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
          }
        });
        
        const customerList = Object.values(customerMap)
          .filter(c => c.orderCount > 0)
          .sort((a, b) => b.ltv - a.ltv); // Sort by highest LTV
          
        setCustomers(customerList);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadCustomers();
  }, []);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Customers</h2>
          <p className="text-sm text-slate-500">View customer lifetime value and acquisition sources.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name or email..." 
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
                <th className="px-6 py-3 font-medium">Customer</th>
                <th className="px-6 py-3 font-medium">Lifetime Value (LTV)</th>
                <th className="px-6 py-3 font-medium">Orders</th>
                <th className="px-6 py-3 font-medium">Acquisition</th>
                <th className="px-6 py-3 font-medium">Last Purchase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading customers...</td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No customers found.</td>
                </tr>
              ) : (
                filteredCustomers.map(customer => (
                  <tr key={customer.email} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <UserCircle className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">{customer.name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" /> {customer.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-emerald-600 text-base">{formatPrice(customer.ltv)}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {customer.orderCount}
                    </td>
                    <td className="px-6 py-4">
                      {Array.from(customer.sources).length > 0 ? (
                        <div className="flex gap-1 flex-wrap max-w-[150px]">
                          {Array.from(customer.sources).map((s: any) => (
                            <span key={s} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
