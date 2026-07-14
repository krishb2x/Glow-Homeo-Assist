"use client";

import React, { useEffect, useState } from "react";
import { getSupabaseBrowser } from "../../../../../lib/supabase-browser";
import { BRAND } from "../../../../../lib/constants";
import { formatPrice } from "../../../../../lib/utils";
import { 
  Loader2, 
  MapPin, 
  Package, 
  Truck, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  X,
  User,
  Info,
  Calendar,
  Layers
} from "lucide-react";

const STAGES = [
  { id: "packing_queue", label: "Packing Queue", color: "bg-amber-50 border-amber-200 text-amber-800" },
  { id: "ready_to_ship", label: "Ready To Ship", color: "bg-orange-50 border-orange-200 text-orange-800" },
  { id: "on_the_way", label: "On The Way", color: "bg-teal-50 border-teal-200 text-teal-800" },
  { id: "delivered", label: "Delivered", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
];

export default function StoreOperationsBoard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [modalType, setModalType] = useState<"address" | "ship" | null>(null);
  const [courierName, setCourierName] = useState("Delhivery");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shippingNotes, setShippingNotes] = useState("");
  const [shippingDate, setShippingDate] = useState(new Date().toISOString().split("T")[0]);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrders = async () => {
    try {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from("mt_orders")
        .select("*, mt_shipments(*)")
        .eq("clinic_id", BRAND.clinicId)
        .or("status.eq.paid,status.eq.confirmed")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter only orders containing physical items
      const physicalOrders = (data || []).filter((o: any) => {
        const items = o.items || [];
        return items.some((item: any) => 
          item.product?.product_type === 'PHYSICAL_BOOK' || 
          item.product?.product_type === 'TREATMENT_KIT'
        );
      });

      setOrders(physicalOrders);
    } catch (err) {
      console.error("Error fetching store orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Filter orders based on search
  const filteredOrders = orders.filter(
    (o) =>
      o.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customer_phone && o.customer_phone.includes(searchTerm)) ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.shipping_pincode && o.shipping_pincode.includes(searchTerm))
  );

  // Group orders by stage
  const ordersByStage = STAGES.reduce((acc, stage) => {
    acc[stage.id] = filteredOrders.filter((o) => o.workflow_status === stage.id);
    return acc;
  }, {} as Record<string, any[]>);

  // Determine orders requiring action right now
  const actionRequiredOrders = filteredOrders.filter((o) => {
    if (o.workflow_status === "packing_queue") return true;
    if (o.workflow_status === "ready_to_ship") return true;
    return false;
  });

  const openAddressModal = (o: any) => {
    setSelectedOrder(o);
    setModalType("address");
  };

  const openShipModal = (o: any) => {
    setSelectedOrder(o);
    setCourierName(o.carrier_name || "Delhivery");
    setTrackingNumber(o.tracking_id || "");
    setShippingNotes(o.shipping_notes || "");
    setShippingDate(new Date().toISOString().split("T")[0]);
    setModalType("ship");
  };

  const handleMarkPacked = async (o: any) => {
    try {
      const supabase = getSupabaseBrowser();
      
      const newAuditLog = [
        ...(o.audit_log || []),
        { action: "Packed", message: "Store order items packed and sealed", timestamp: new Date().toISOString() }
      ];

      const { error } = await supabase
        .from("mt_orders")
        .update({
          workflow_status: "ready_to_ship",
          packed_at: new Date().toISOString(),
          audit_log: newAuditLog,
          updated_at: new Date().toISOString(),
        })
        .eq("id", o.id);

      if (error) throw error;
      fetchOrders();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleSaveShipment = async () => {
    if (!trackingNumber.trim()) {
      alert("Please enter a tracking number.");
      return;
    }
    setActionLoading(true);
    try {
      const supabase = getSupabaseBrowser();
      
      const newAuditLog = [
        ...(selectedOrder.audit_log || []),
        { 
          action: "Shipped", 
          message: `Package shipped via ${courierName} with Tracking ID: ${trackingNumber}`, 
          timestamp: new Date().toISOString() 
        }
      ];

      const { error } = await supabase
        .from("mt_orders")
        .update({
          carrier_name: courierName,
          tracking_id: trackingNumber,
          shipping_notes: shippingNotes,
          shipped_at: new Date(shippingDate).toISOString(),
          workflow_status: "on_the_way",
          audit_log: newAuditLog,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedOrder.id);

      if (error) throw error;
      setModalType(null);
      fetchOrders();
    } catch (err: any) {
      alert(`Error saving shipment: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkDelivered = async (o: any) => {
    try {
      const supabase = getSupabaseBrowser();
      
      const newAuditLog = [
        ...(o.audit_log || []),
        { action: "Delivered", message: "Store order delivered successfully", timestamp: new Date().toISOString() }
      ];

      const { error } = await supabase
        .from("mt_orders")
        .update({
          workflow_status: "delivered",
          fulfillment_status: "fulfilled",
          delivered_at: new Date().toISOString(),
          audit_log: newAuditLog,
          updated_at: new Date().toISOString(),
        })
        .eq("id", o.id);

      if (error) throw error;
      fetchOrders();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Store Order Operations</h1>
          <p className="text-sm text-slate-500 mt-1">Manage physical book packaging, shipping address checks, and courier tracking updates.</p>
        </div>
        
        <div className="relative flex w-full sm:max-w-xs shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search orders, pincodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-indigo-500 bg-white"
          />
        </div>
      </div>

      {/* Action required alerts */}
      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 space-y-4 border-t-4 border-t-amber-500">
        <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          Fulfillment Actions Required ({actionRequiredOrders.length})
        </h2>

        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
        ) : actionRequiredOrders.length === 0 ? (
          <p className="text-xs text-slate-500 italic flex items-center gap-1.5 bg-slate-50 p-3 rounded-lg">
            <Info className="w-4 h-4 text-slate-400"/> All orders fulfilled and shipped! Great job.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {actionRequiredOrders.map((o) => {
              let actionLabel = "";
              let actionFn = () => {};
              let badgeColor = "";

              if (o.workflow_status === "packing_queue") {
                actionLabel = "Pack Order Items";
                actionFn = () => handleMarkPacked(o);
                badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
              } else if (o.workflow_status === "ready_to_ship") {
                actionLabel = "Ship & Add Tracker";
                actionFn = () => openShipModal(o);
                badgeColor = "bg-orange-50 text-orange-700 border-orange-200";
              }

              return (
                <div key={o.id} className="border border-slate-100 bg-slate-50/50 p-3 rounded-xl flex flex-col justify-between hover:bg-slate-50 transition-colors shadow-sm">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-semibold text-slate-800 text-xs truncate max-w-[120px]">{o.customer_name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${badgeColor}`}>
                        {o.workflow_status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5 font-bold">
                      Order: #{o.id.slice(0, 8)}
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      PIN: {o.shipping_pincode} | Amount: {formatPrice(o.total_amount)}
                    </p>
                  </div>
                  <button
                    onClick={actionFn}
                    className="mt-3 w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-1.5 rounded-lg text-[10px] transition-colors flex items-center justify-center gap-1"
                  >
                    {actionLabel}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* KANBAN BOARD */}
      {loading ? (
        <div className="flex h-[30vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-6 pt-2 snap-x scrollbar-thin">
          {STAGES.map((stage) => {
            const list = ordersByStage[stage.id] || [];
            return (
              <div key={stage.id} className="w-80 shrink-0 flex flex-col bg-slate-100 rounded-2xl p-3 border border-slate-200 snap-align-start h-[600px]">
                {/* Stage Header */}
                <div className="flex justify-between items-center mb-3">
                  <h3 className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border shadow-sm capitalize ${stage.color}`}>
                    {stage.label}
                  </h3>
                  <span className="bg-white text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full border shadow-sm">
                    {list.length}
                  </span>
                </div>

                {/* Stage Card List */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                  {list.length === 0 ? (
                    <div className="h-28 border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 text-xs italic bg-white/50">
                      Empty
                    </div>
                  ) : (
                    list.map((o) => (
                      <div key={o.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 hover:shadow-md transition-shadow">
                        <div>
                          <div className="flex justify-between items-start">
                            <div className="font-semibold text-slate-800 text-sm">{o.customer_name}</div>
                            <button 
                              onClick={() => openAddressModal(o)} 
                              className="text-[10px] text-indigo-600 hover:underline font-bold"
                            >
                              Address
                            </button>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Phone: {o.customer_phone || "N/A"}</div>
                          
                          <div className="text-[10px] text-slate-500 font-bold mt-2">
                            Items:
                          </div>
                          <div className="space-y-1 mt-1 bg-slate-50 p-2 rounded-lg border text-[10px] text-slate-600 font-medium">
                            {o.items?.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between gap-1">
                                <span className="truncate flex-1">• {item.product.title}</span>
                                <span className="shrink-0 text-slate-400">x{item.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Specific Stage details */}
                        {o.shipping_city && (
                          <div className="bg-slate-50 p-2 rounded-lg border text-[10px] text-slate-600 font-medium">
                            <span className="font-bold text-slate-700 block mb-0.5">Delivery Region:</span>
                            <p>{o.shipping_city}, {o.shipping_state} - {o.shipping_pincode}</p>
                          </div>
                        )}

                        {/* Payment Method Details */}
                        <div className="flex justify-between items-center text-[10px] bg-slate-50 p-2 rounded-lg border">
                          <span className="font-semibold text-slate-500">Payment:</span>
                          <span className={`px-1.5 py-0.5 rounded font-extrabold uppercase text-[8px] ${
                            o.payment_method === 'cod' 
                              ? "bg-amber-100 text-amber-800" 
                              : o.payment_method === 'partial_cod' 
                                ? "bg-orange-100 text-orange-800" 
                                : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {o.payment_method === 'cod' 
                              ? "COD" 
                              : o.payment_method === 'partial_cod' 
                                ? `Partial COD (Pending ₹${o.cod_amount_pending})` 
                                : "Prepaid"}
                          </span>
                        </div>

                        {/* Shiprocket Shipments & Tracking Timeline */}
                        {o.mt_shipments && o.mt_shipments.length > 0 ? (
                          <div className="space-y-2">
                            {o.mt_shipments.map((shipment: any) => (
                              <div key={shipment.id} className="p-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100 text-[10px] text-indigo-900 space-y-1">
                                <div className="flex justify-between items-center font-bold text-indigo-950">
                                  <span>Shipment #{shipment.shipment_number} ({shipment.provider})</span>
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-100 font-extrabold uppercase text-[8px]">
                                    {shipment.status}
                                  </span>
                                </div>
                                
                                {shipment.awb_code && (
                                  <p><span className="font-semibold text-slate-500">AWB Code:</span> {shipment.awb_code} ({shipment.courier_name})</p>
                                )}

                                {shipment.sync_status === 'FAILED' && (
                                  <div className="text-red-600 space-y-1">
                                    <p className="font-semibold">Sync Error:</p>
                                    <p className="bg-red-50 p-1.5 rounded font-mono text-[8px] break-all">{shipment.last_error || "Unknown Shiprocket Error"}</p>
                                  </div>
                                )}

                                <div className="flex gap-2 pt-1.5 border-t border-indigo-100">
                                  {shipment.label_url && (
                                    <a 
                                      href={shipment.label_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2.5 py-1 rounded text-[9px] inline-block text-center"
                                    >
                                      Print Label
                                    </a>
                                  )}
                                  
                                  {(shipment.sync_status === 'FAILED' || shipment.sync_status === 'PENDING') && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          alert("Retrying sync with Shiprocket...");
                                          const res = await fetch("/api/admin/shipping/retry-sync", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ shipmentId: shipment.id })
                                          });
                                          const data = await res.json();
                                          if (data.success) {
                                            alert("Synced successfully!");
                                            fetchOrders();
                                          } else {
                                            alert(`Sync failed: ${data.error}`);
                                          }
                                        } catch (err: any) {
                                          alert(`Error: ${err.message}`);
                                        }
                                      }}
                                      className="bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1 rounded hover:bg-indigo-200 text-[9px]"
                                    >
                                      Retry Sync
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-500 text-[10px] text-center italic">
                            No logistics shipment initialized
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="pt-2 border-t border-slate-100">
                          {stage.id === "packing_queue" && (
                            <button
                              onClick={() => handleMarkPacked(o)}
                              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
                            >
                              <Package className="w-3.5 h-3.5" /> Mark Packed
                            </button>
                          )}

                          {stage.id === "ready_to_ship" && (
                            <button
                              onClick={() => openShipModal(o)}
                              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
                            >
                              <Truck className="w-3.5 h-3.5" /> Ship / Add Tracker
                            </button>
                          )}

                          {stage.id === "on_the_way" && (
                            <button
                              onClick={() => handleMarkDelivered(o)}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Mark Delivered
                            </button>
                          )}

                          {stage.id === "delivered" && (
                            <span className="text-[10px] text-emerald-600 font-bold block text-center py-1 flex items-center justify-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> Order Complete
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: VIEW ADDRESS */}
      {modalType === "address" && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">Shipping Address details</h3>
                <p className="text-xs text-slate-500">Order: #{selectedOrder.id.slice(0, 8)}</p>
              </div>
              <button onClick={() => setModalType(null)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-sm text-slate-700">
              <div className="bg-slate-50 p-3 rounded-lg border text-xs text-slate-600 space-y-1">
                <p><span className="font-bold text-slate-700">Customer:</span> {selectedOrder.customer_name}</p>
                <p><span className="font-bold text-slate-700">Phone:</span> {selectedOrder.customer_phone || "N/A"}</p>
                <p><span className="font-bold text-slate-700">Email:</span> {selectedOrder.customer_email}</p>
              </div>

              <div className="space-y-1">
                <span className="font-semibold block text-xs text-slate-500">Address / पता:</span>
                <p className="bg-slate-50 border rounded-xl p-3 text-slate-800 font-medium">
                  {selectedOrder.shipping_street}
                </p>
              </div>

              {selectedOrder.shipping_landmark && (
                <div className="space-y-1">
                  <span className="font-semibold block text-xs text-slate-500">Landmark / लैंडमार्क:</span>
                  <p className="bg-slate-50 border rounded-xl p-3 text-slate-800 font-medium">
                    {selectedOrder.shipping_landmark}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border">
                <div>
                  <span className="text-slate-400 block font-semibold uppercase">City</span>
                  <span className="font-bold text-slate-700">{selectedOrder.shipping_city}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase">State</span>
                  <span className="font-bold text-slate-700">{selectedOrder.shipping_state}</span>
                </div>
                <div className="mt-2">
                  <span className="text-slate-400 block font-semibold uppercase">PIN Code</span>
                  <span className="font-bold text-slate-700">{selectedOrder.shipping_pincode}</span>
                </div>
                <div className="mt-2">
                  <span className="text-slate-400 block font-semibold uppercase">Country</span>
                  <span className="font-bold text-slate-700">{selectedOrder.shipping_country || "India"}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setModalType(null)}
                className="px-5 py-2 bg-slate-800 text-white font-bold rounded-xl text-xs hover:bg-slate-900 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SHIP PACKAGE */}
      {modalType === "ship" && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">Ship Store Order</h3>
                <p className="text-xs text-slate-500">Register Tracking Details</p>
              </div>
              <button onClick={() => setModalType(null)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600">Courier Partner *</label>
                  <select
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    <option value="Delhivery">Delhivery</option>
                    <option value="DTDC">DTDC</option>
                    <option value="Blue Dart">Blue Dart</option>
                    <option value="India Post">India Post</option>
                    <option value="Shiprocket">Shiprocket</option>
                    <option value="Custom">Custom / Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600">Shipping Date</label>
                  <input
                    type="date"
                    value={shippingDate}
                    onChange={(e) => setShippingDate(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">Tracking ID / Waybill *</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking ID number"
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600">Shipping Notes (Optional)</label>
                <textarea
                  value={shippingNotes}
                  onChange={(e) => setShippingNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Fragile, express delivery..."
                  className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 bg-white"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setModalType(null)}
                className="px-4 py-2 border rounded-xl text-slate-600 font-semibold hover:bg-slate-100 text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveShipment}
                disabled={actionLoading}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition-colors"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Shipment & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
