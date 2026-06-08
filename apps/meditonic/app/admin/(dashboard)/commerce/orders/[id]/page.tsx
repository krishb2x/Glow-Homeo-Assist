"use client";

import React, { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { formatPrice, formatDate } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, User, CreditCard, Package, Truck, Calendar, MapPin, ExternalLink, Loader2, CheckCircle2 } from "lucide-react";
import { Order } from "@/types/store";

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState<string>("");

  useEffect(() => {
    params.then(p => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    async function loadOrder() {
      const supabase = getSupabaseBrowser();
      try {
        const { data, error } = await supabase
          .from("mt_orders")
          .select("*")
          .eq("id", id)
          .single();
          
        if (error) throw error;
        setOrder(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadOrder();
  }, [id]);

  const toggleFulfillment = async () => {
    if (!order) return;
    const newStatus = order.fulfillment_status === 'fulfilled' ? 'unfulfilled' : 'fulfilled';
    const supabase = getSupabaseBrowser();
    
    // Add to audit log
    const auditEntry = {
      action: `Marked as ${newStatus}`,
      timestamp: new Date().toISOString(),
      user: "Admin"
    };

    const newAuditLog = [...(order.audit_log || []), auditEntry];

    try {
      const { error } = await supabase
        .from("mt_orders")
        .update({ 
          fulfillment_status: newStatus,
          audit_log: newAuditLog
        })
        .eq("id", order.id);

      if (error) throw error;
      setOrder({ ...order, fulfillment_status: newStatus, audit_log: newAuditLog });
    } catch (err) {
      alert("Failed to update fulfillment status");
      console.error(err);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>;
  }

  if (!order) {
    return <div>Order not found</div>;
  }

  const hasPhysicalItems = order.items?.some((i: any) => i.product?.fulfillment_type === 'PHYSICAL_SHIPPING');

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/commerce/orders" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">
              Order {order.razorpay_order_id || order.id.split('-')[0]}
            </h2>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
              order.status === 'paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
              order.status === 'pending' ? 'bg-amber-100 text-amber-800 border-amber-200' :
              'bg-red-100 text-red-800 border-red-200'
            }`}>
              {order.status.toUpperCase()}
            </span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
              order.fulfillment_status === 'fulfilled' ? 'bg-blue-100 text-blue-800 border-blue-200' :
              'bg-slate-100 text-slate-800 border-slate-200'
            }`}>
              {order.fulfillment_status.toUpperCase()}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(order.created_at)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Items List */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-500" /> Purchased Items
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {order.items?.map((item: any, idx: number) => (
                <div key={idx} className="p-5 flex items-start gap-4">
                  <div className="w-16 h-20 bg-slate-100 rounded-md overflow-hidden shrink-0">
                    {item.product?.cover_image_path ? (
                      <img src={item.product.cover_image_path} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
                        <Package className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-800 text-sm">{item.product?.title || 'Unknown Product'}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{item.product?.product_type} • {item.product?.fulfillment_type}</p>
                    
                    {item.product?.fulfillment_type === 'DIGITAL_DOWNLOAD' && order.status === 'paid' && (
                      <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Digital link sent via email
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-medium text-slate-800">{formatPrice(item.product?.price || 0)}</p>
                    <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                    <p className="text-sm font-bold text-slate-800 mt-2">{formatPrice((item.product?.price || 0) * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-slate-50 p-5 border-t border-slate-200 flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.total_amount)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-800 pt-2 border-t border-slate-200 text-base">
                  <span>Total</span>
                  <span>{formatPrice(order.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Fulfillment Action */}
          {hasPhysicalItems && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-5">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
                <Truck className="w-4 h-4 text-slate-500" /> Physical Fulfillment
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                This order contains physical items that require shipping. Once you have dispatched the items, mark the order as fulfilled.
              </p>
              <button 
                onClick={toggleFulfillment}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                  order.fulfillment_status === 'fulfilled' 
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {order.fulfillment_status === 'fulfilled' ? 'Mark as Unfulfilled' : 'Mark as Fulfilled'}
              </button>
            </div>
          )}

          {/* Audit Log */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Audit Timeline</h3>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-white bg-slate-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2"></div>
                <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-sm ml-4 md:ml-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-slate-800 text-xs">Order Placed</div>
                    <div className="text-[10px] text-slate-500">{formatDate(order.created_at)}</div>
                  </div>
                  <div className="text-xs text-slate-600">System</div>
                </div>
              </div>
              
              {order.audit_log?.map((log: any, idx: number) => (
                <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-white bg-blue-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2"></div>
                  <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-sm ml-4 md:ml-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-slate-800 text-xs">{log.action}</div>
                      <div className="text-[10px] text-slate-500">{formatDate(log.timestamp)}</div>
                    </div>
                    <div className="text-xs text-slate-600">{log.user}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-slate-500" /> Customer
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-slate-800">{order.customer_name}</p>
                <a href={`mailto:${order.customer_email}`} className="text-emerald-600 hover:underline">{order.customer_email}</a>
              </div>
              {order.customer_phone && (
                <div>
                  <p className="text-slate-500 text-xs">Phone</p>
                  <p className="text-slate-800">{order.customer_phone}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-slate-500" /> Payment
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-500 text-xs">Gateway</p>
                <p className="text-slate-800">Razorpay</p>
              </div>
              {order.razorpay_order_id && (
                <div>
                  <p className="text-slate-500 text-xs">Razorpay Order ID</p>
                  <p className="text-slate-800 font-mono text-xs mt-0.5">{order.razorpay_order_id}</p>
                </div>
              )}
              {order.razorpay_payment_id && (
                <div>
                  <p className="text-slate-500 text-xs">Razorpay Payment ID</p>
                  <p className="text-slate-800 font-mono text-xs mt-0.5">{order.razorpay_payment_id}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-slate-500" /> Marketing Attribution
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-500 text-xs">UTM Source</p>
                <p className="text-slate-800 font-medium">{order.utm_source || 'organic'}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">UTM Campaign</p>
                <p className="text-slate-800 font-medium">{order.utm_campaign || 'None'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
