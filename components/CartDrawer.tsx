"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { state, dispatch, total, itemCount } = useCart();
  const router = useRouter();

  function checkout() {
    onClose();
    router.push("/receipt");
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-[#0f1a17] border-l border-white/10 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-[#00C896]" />
                <h2 className="font-semibold text-white text-lg">Cart</h2>
                <span className="text-xs bg-[#00C896]/20 text-[#00C896] px-2 py-0.5 rounded-full font-medium">
                  {itemCount} items
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-xl transition"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
              {state.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <ShoppingBag size={48} className="text-gray-700" />
                  <p className="text-gray-500 text-sm">Cart is empty. Start scanning!</p>
                </div>
              ) : (
                state.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 bg-white/5 rounded-2xl p-3"
                  >
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        item.emoji || "📦"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{item.name}</p>
                      <p className="text-gray-400 text-xs">₦{item.price.toLocaleString()} each</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => dispatch({ type: "UPDATE_QTY", payload: { id: item.id, quantity: item.quantity - 1 } })}
                        className="w-7 h-7 bg-white/10 rounded-lg text-white flex items-center justify-center hover:bg-white/20 transition text-sm"
                      >
                        −
                      </button>
                      <span className="text-white text-sm font-medium w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => dispatch({ type: "UPDATE_QTY", payload: { id: item.id, quantity: item.quantity + 1 } })}
                        className="w-7 h-7 bg-white/10 rounded-lg text-white flex items-center justify-center hover:bg-white/20 transition text-sm"
                      >
                        +
                      </button>
                      <button
                        onClick={() => dispatch({ type: "REMOVE_ITEM", payload: item.id })}
                        className="w-7 h-7 bg-red-900/30 rounded-lg text-red-400 flex items-center justify-center hover:bg-red-900/50 transition ml-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {state.items.length > 0 && (
              <div className="p-5 border-t border-white/10 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Total</span>
                  <span className="text-white text-xl font-semibold">₦{total.toLocaleString()}</span>
                </div>
                <button
                  onClick={checkout}
                  className="w-full py-4 bg-[#00C896] text-black font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-[#00A87E] transition"
                >
                  View Receipt
                  <ArrowRight size={18} />
                </button>
                <button
                  onClick={() => dispatch({ type: "CLEAR_CART" })}
                  className="w-full py-3 text-gray-500 text-sm hover:text-red-400 transition"
                >
                  Clear cart
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
