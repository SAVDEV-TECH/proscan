"use client";

import React, { useState } from "react";
import { ShoppingCart, Scan } from "lucide-react";
import { useCart } from "@/context/CartContext";
import dynamic from "next/dynamic";
const Scanner = dynamic(() => import("@/components/Scanner"), { ssr: false });
import CartDrawer from "@/components/CartDrawer";

export default function HomePage() {
  const { itemCount, total } = useCart();
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0f0e]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0a0f0e]/90 backdrop-blur-md border-b border-white/5 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#00C896] rounded-lg flex items-center justify-center">
              <Scan size={18} className="text-black" />
            </div>
            <div>
              <h1 className="text-white font-semibold text-lg leading-none">ProScan</h1>
              <p className="text-gray-500 text-xs">Smart Product Scanner</p>
            </div>
          </div>

          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition"
          >
            <ShoppingCart size={18} className="text-[#00C896]" />
            <span className="text-white text-sm font-medium">
              ₦{total.toLocaleString()}
            </span>
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#00C896] text-black text-xs font-bold rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-md mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-white text-2xl font-semibold">Scan Product</h2>
          <p className="text-gray-500 text-sm mt-1">
            Use AI recognition or barcode scanner to add products instantly
          </p>
        </div>

        <Scanner />

        {/* Quick tips */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            { emoji: "🤖", title: "AI Scan", desc: "Point at any product — AI identifies it" },
            { emoji: "📊", title: "Barcode", desc: "Auto-reads barcode when camera is active" },
            { emoji: "🔥", title: "Firebase", desc: "Prices pulled from your product database" },
            { emoji: "🌍", title: "Barcode DB", desc: "Fallback to global Open Food Facts API" },
          ].map((tip) => (
            <div
              key={tip.title}
              className="bg-white/3 border border-white/5 rounded-2xl p-3 space-y-1"
            >
              <div className="text-xl">{tip.emoji}</div>
              <p className="text-white text-xs font-medium">{tip.title}</p>
              <p className="text-gray-500 text-xs leading-tight">{tip.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
