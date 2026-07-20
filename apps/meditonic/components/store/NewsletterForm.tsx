"use client";

import React from "react";

export default function NewsletterForm() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Thank you for subscribing to our newsletter!");
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
      <input 
        type="email" 
        placeholder="Enter your email" 
        required
        className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-slate-800"
      />
      <button 
        type="submit"
        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-2xl text-sm shadow-sm transition-all shrink-0"
      >
        Subscribe
      </button>
    </form>
  );
}
