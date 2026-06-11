"use client";

import React from "react";

export default function OrderFilterSelect({ defaultValue }: { defaultValue: string }) {
  return (
    <select 
      name="status"
      defaultValue={defaultValue}
      onChange={(e) => e.target.form?.submit()}
      className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 w-full sm:w-auto"
    >
      <option value="all">All Statuses</option>
      <option value="paid">Paid</option>
      <option value="pending">Pending</option>
      <option value="failed">Failed</option>
    </select>
  );
}
