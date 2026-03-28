"use client";

import React, { useRef } from "react";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Printer, 
  CheckCircle2, 
  ArrowLeft, 
  Scan,
  Calendar,
  Hash
} from "lucide-react";
import toast from "react-hot-toast";

function generateReceiptNumber() {
  return "PRO-" + Math.floor(100000 + Math.random() * 900000);
}

export default function ReceiptPage() {
  const { state, total, dispatch } = useCart();
  const router = useRouter();
  const receiptRef = useRef<HTMLDivElement>(null);
  const receiptNumber = useRef(generateReceiptNumber());
  const now = new Date();

  function handlePrint() {
    window.print();
  }

  function handleNewSale() {
    dispatch({ type: "CLEAR_CART" });
    router.push("/");
    toast.success("New sale started!");
  }

  if (state.items.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0f0e] flex flex-col items-center justify-center gap-4">
        <Scan size={48} className="text-gray-600" />
        <p className="text-gray-400 text-sm">No items in cart</p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 bg-[#00C896] text-black rounded-xl font-medium"
        >
          Go to Scanner
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f0e] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0a0f0e]/90 backdrop-blur-md border-b border-white/5 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white/10 rounded-xl transition"
          >
            <ArrowLeft size={20} className="text-gray-400" />
          </button>
          <h1 className="text-white font-semibold text-lg">Receipt</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {/* Success badge */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center mb-6"
        >
          <div className="w-16 h-16 bg-[#00C896]/20 rounded-full flex items-center justify-center mb-3">
            <CheckCircle2 size={36} className="text-[#00C896]" />
          </div>
          <h2 className="text-white text-xl font-semibold">Sale Summary</h2>
          <p className="text-gray-500 text-sm mt-1">Review before completing</p>
        </motion.div>

        {/* Receipt Card */}
        <div
          ref={receiptRef}
          className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden"
        >
          {/* Receipt header */}
          <div className="p-5 border-b border-white/10 space-y-3">
            <div className="flex items-center justify-center gap-2">
              <div className="w-7 h-7 bg-[#00C896] rounded-lg flex items-center justify-center">
                <Scan size={14} className="text-black" />
              </div>
              <span className="text-white font-semibold text-lg">ProScan</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar size={12} />
                {now.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                {" "}
                {now.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="flex items-center gap-1">
                <Hash size={12} />
                {receiptNumber.current}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="p-5 space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Items</p>
            {state.items.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-xl shrink-0">
                  {item.emoji || "📦"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{item.name}</p>
                  <p className="text-gray-500 text-xs">
                    ₦{item.price.toLocaleString()} × {item.quantity}
                  </p>
                </div>
                <p className="text-white text-sm font-semibold shrink-0">
                  ₦{(item.price * item.quantity).toLocaleString()}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Totals */}
          <div className="p-5 border-t border-white/10 space-y-2">
            <div className="flex justify-between text-sm text-gray-400">
              <span>{state.items.length} item{state.items.length !== 1 ? "s" : ""}</span>
              <span>{state.items.reduce((s, i) => s + i.quantity, 0)} units</span>
            </div>
            <div className="flex justify-between text-white text-xl font-semibold pt-2 border-t border-white/10">
              <span>Total</span>
              <span className="text-[#00C896]">₦{total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <button
            onClick={handlePrint}
            className="w-full py-4 bg-white/5 border border-white/10 text-white font-medium rounded-2xl flex items-center justify-center gap-2 hover:bg-white/10 transition"
          >
            <Printer size={18} />
            Print Receipt
          </button>
          <button
            onClick={handleNewSale}
            className="w-full py-4 bg-[#00C896] text-black font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-[#00A87E] transition"
          >
            <Scan size={18} />
            New Sale
          </button>
        </div>
      </main>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .receipt-print, .receipt-print * { visibility: visible; }
          .receipt-print { position: fixed; left: 0; top: 0; }
        }
      `}</style>
    </div>
  );
}
