import { createAdminClient } from "../../../../../lib/supabase";
import { formatPrice, formatDate } from "../../../../../lib/utils";
import Link from "next/link";
import { ArrowLeft, UserCircle, MapPin, Phone, Mail, ShoppingBag, Calendar, Eye } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CustomerProfilePage({ params }: { params: Promise<{ email: string }> }) {
  const resolvedParams = await params;
  const decodedEmail = decodeURIComponent(resolvedParams.email);
  const supabase = createAdminClient();

  const { data: orders, error } = await supabase
    .from("mt_orders")
    .select("*")
    .eq("customer_email", decodedEmail)
    .order("created_at", { ascending: false });

  if (error || !orders || orders.length === 0) {
    notFound();
  }

  // Aggregate Customer Data
  let ltv = 0;
  let latestName = orders[0].customer_name;
  let latestPhone = orders[0].customer_phone;
  let firstPurchase = orders[orders.length - 1].created_at;
  let lastPurchase = orders[0].created_at;
  const sources = new Set<string>();

  const validOrders = orders.filter(o => o.status === 'paid' || o.status === 'fulfilled');
  
  validOrders.forEach(o => {
    ltv += Number(o.total_amount);
    if (o.utm_source) sources.add(o.utm_source);
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Link href="/admin/commerce/customers" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Customer Profile</h2>
          <p className="text-sm text-slate-500">Detailed view of lifetime value and purchase history.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column - Profile Card */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-4 border-2 border-emerald-100">
              <UserCircle className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">{latestName}</h3>
            
            <div className="w-full mt-6 space-y-3 text-sm text-left">
              <div className="flex items-center gap-3 text-slate-600 p-2 rounded-lg hover:bg-slate-50">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <a href={`mailto:${decodedEmail}`} className="truncate hover:text-emerald-600">{decodedEmail}</a>
              </div>
              {latestPhone && (
                <div className="flex items-center gap-3 text-slate-600 p-2 rounded-lg hover:bg-slate-50">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <a href={`tel:${latestPhone}`} className="hover:text-emerald-600">{latestPhone}</a>
                </div>
              )}
              <div className="flex items-center gap-3 text-slate-600 p-2 rounded-lg hover:bg-slate-50">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Customer since {formatDate(firstPurchase).split(' at ')[0]}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              Lifetime Value
            </h4>
            <div className="text-4xl font-black text-emerald-600 mb-1">{formatPrice(ltv)}</div>
            <p className="text-xs text-slate-500 mb-4">Total revenue generated from {validOrders.length} completed orders.</p>
            
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Acquisition Sources</h5>
              <div className="flex gap-1.5 flex-wrap">
                {Array.from(sources).map((s: string) => (
                  <span key={s} className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border border-slate-200">
                    <MapPin className="w-3 h-3" /> {s}
                  </span>
                ))}
                {sources.size === 0 && <span className="text-slate-400 text-xs italic">Organic / Direct</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Order History */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800 text-lg">Order History</h3>
              <p className="text-sm text-slate-500">Chronological list of all transactions.</p>
            </div>
            
            <div className="divide-y divide-slate-100">
              {orders.map((order: any) => (
                <div key={order.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        {order.razorpay_order_id || order.id.split('-')[0]}
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${
                          order.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          order.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{formatDate(order.created_at)}</div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-bold text-lg text-slate-800">{formatPrice(order.total_amount)}</div>
                      <Link 
                        href={`/admin/commerce/orders/${order.id}`}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 justify-end mt-1"
                      >
                        View Details <Eye className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-2">
                    {order.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-medium">{item.quantity}x</span>
                          <span className="text-slate-700 font-medium truncate max-w-[200px] sm:max-w-[300px]">{item.product?.title || 'Unknown Product'}</span>
                        </div>
                        <span className="text-slate-500 text-xs font-semibold">{item.product?.product_type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
