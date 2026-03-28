"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Zap, ScanBarcode, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { lookupBarcode, ScannedProduct } from "@/lib/aiScan";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useCart } from "@/context/CartContext";

// TensorFlow JS
import * as tf from "@tensorflow/tfjs";
import * as tmImage from "@teachablemachine/image";

type ScanMode = "ai" | "barcode";

function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    noodles: "🍜", drinks: "🥤", dairy: "🥛", snacks: "🍟",
    beverage: "☕", food: "🍱", "personal care": "🧴",
    cleaning: "🧹", frozen: "🧊", cereals: "🥣", default: "📦",
  };
  const lower = category.toLowerCase();
  for (const [key, emoji] of Object.entries(map)) {
    if (lower.includes(key)) return emoji;
  }
  return map.default;
}

export default function Scanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const barcodeReaderRef = useRef<any>(null);
  const tmModelRef = useRef<tmImage.CustomMobileNet | null>(null);

  const [mode, setMode] = useState<ScanMode>("ai");
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [result, setResult] = useState<ScannedProduct | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const { dispatch, itemCount } = useCart();

  // Load Custom AI Model
  const loadAIModel = async () => {
    if (tmModelRef.current) return;
    try {
      const URL = "/tm-my-image-model (3)/";
      const modelURL = URL + "model.json";
      const metadataURL = URL + "metadata.json";
      tmModelRef.current = await tmImage.load(modelURL, metadataURL);
      setModelLoaded(true);
    } catch (err) {
      console.error("Failed to load local AI model", err);
      toast.error("Failed to boot local AI model. Refresh page.");
    }
  };

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);

      // Async boot the TFJS model in the background
      loadAIModel();

      if (mode === "barcode") startBarcodeScanning();
    } catch (err) {
      toast.error("Camera access denied. Please allow camera permissions.");
      console.error(err);
    }
  }, [mode]);

  // Stop camera
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    barcodeReaderRef.current?.reset?.();
    setCameraActive(false);
    setResult(null);
    setScanning(false);
  }, []);

  // Barcode scanning loop
  const startBarcodeScanning = useCallback(async () => {
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      barcodeReaderRef.current = reader;

      if (!videoRef.current) return;

      reader.decodeFromVideoElement(videoRef.current, async (res, err) => {
        if (res && !scanning) {
          setScanning(true);
          const barcode = res.getText();
          toast("Barcode found! Looking up product...", { icon: "🔍" });

          const fbProduct = await searchFirebase("barcode", barcode);
          if (fbProduct) {
            setResult(fbProduct);
            setPriceInput(String(fbProduct.estimatedPrice));
            setScanning(false);
            return;
          }

          const apiProduct = await lookupBarcode(barcode);
          if (apiProduct) {
            setResult(apiProduct);
            setPriceInput(String(apiProduct.estimatedPrice || ""));
            toast.success("Product found via barcode!");
          } else {
            toast.error("Product not found via DB.");
          }
          setScanning(false);
        }
      });
    } catch (err) {
      console.error("Barcode error:", err);
    }
  }, [scanning]);

  // Capture frame and predict using LOCAL TensorFlow model
  const captureAndScan = useCallback(async () => {
    if (!videoRef.current || !tmModelRef.current || scanning) return;
    setScanning(true);
    setResult(null);

    try {
      toast("AI analyzing offline...", { icon: "⚡" });
      
      // Predict 50x faster directly on local video element
      let predictionResult;
      try {
         // Some versions of tmImage.predict require testing all classes, 
         // so we sort to find top class manually just in case
         const predictions = await tmModelRef.current.predict(videoRef.current);
         predictions.sort((a, b) => b.probability - a.probability);
         predictionResult = predictions[0];
      } catch(e) {
         console.warn("Falling back to predictTopClass", e);
         const top = await (tmModelRef.current as any).predictTopClass(videoRef.current);
         predictionResult = { className: top.className, probability: top.probability };
      }

      if (!predictionResult) throw new Error("No prediction");

      const productName = predictionResult.className;
      const confidence = predictionResult.probability;

      if (confidence < 0.6) {
        toast.error(`Recognized ${productName} but it's blurry/unclear.`);
        setScanning(false);
        return;
      }

      // Fast lookup in Mogshops Firebase database
      const fbProduct = await searchFirebase("name", productName);
      
      if (fbProduct) {
        setResult({ ...fbProduct, source: "firebase" });
        setPriceInput(String(fbProduct.estimatedPrice));
        toast.success(`Found ${fbProduct.name} in Mogshops in milliseconds!`);
      } else {
        toast.error(`"${productName}" is not registered in your Mogshops store.`);
        setScanning(false);
        return;
      }
    } catch (err) {
      toast.error("Scan failed. Ensure model is loaded.");
      console.error(err);
    } finally {
      setScanning(false);
    }
  }, [scanning]);

  // Search Firebase products collection
  async function searchFirebase(field: "name" | "barcode", value: string): Promise<ScannedProduct | null> {
    try {
      const q = query(
        collection(db, "products"),
        where(field, "==", value)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        if (field === "name") {
          const allQ = query(collection(db, "products"));
          const allSnap = await getDocs(allQ);
          const lower = value.toLowerCase();
          const match = allSnap.docs.find((d) =>
            d.data().name?.toLowerCase().includes(lower.split(" ")[0])
          );
          if (match) {
            const d = match.data();
            return {
              name: d.name,
              category: d.category || "General",
              estimatedPrice: d.price || 0,
              brand: d.brand || "",
              description: d.description || "",
              confidence: "medium",
              source: "firebase",
              image: d.images?.[0] || d.image || d.imageUrl || undefined,
            };
          }
        }
        return null;
      }
      const d = snap.docs[0].data();
      return {
        name: d.name,
        category: d.category || "General",
        estimatedPrice: d.price || 0,
        brand: d.brand || "",
        description: d.description || "",
        confidence: "high",
        source: "firebase",
        image: d.images?.[0] || d.image || d.imageUrl || undefined,
      };
    } catch (err) {
      console.error("Firebase search error:", err);
      return null;
    }
  }

  // Add scanned product to cart
  function addToCart() {
    if (!result) return;
    const price = parseFloat(priceInput) || result.estimatedPrice;
    if (!price) {
      toast.error("Please enter a price before adding to cart.");
      return;
    }
    dispatch({
      type: "ADD_ITEM",
      payload: {
        id: `${result.name}-${Date.now()}`,
        name: result.name,
        price,
        quantity: 1,
        category: result.category,
        brand: result.brand,
        emoji: getCategoryEmoji(result.category),
        source: result.source,
        image: result.image,
      },
    });
    toast.success(`${result.name} added to cart!`);
    setResult(null);
    setPriceInput("");
  }

  useEffect(() => {
    if (!cameraActive) return;
    barcodeReaderRef.current?.reset?.();
    if (mode === "barcode") startBarcodeScanning();
  }, [mode, cameraActive, startBarcodeScanning]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const sourceLabel = {
    firebase: { text: "In your store", color: "bg-emerald-900/60 text-emerald-300" },
    ai: { text: "AI recognised", color: "bg-blue-900/60 text-blue-300" },
    barcode_api: { text: "Barcode DB", color: "bg-amber-900/60 text-amber-300" },
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 p-1 bg-white/5 rounded-2xl">
        {(["ai", "barcode"] as ScanMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
              mode === m
                ? "bg-[#00C896] text-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {m === "ai" ? <Zap size={16} /> : <ScanBarcode size={16} />}
            {m === "ai" ? "Local AI Scan" : "Barcode"}
          </button>
        ))}
      </div>

      <div className="relative w-full aspect-[4/3] bg-black rounded-3xl overflow-hidden border border-white/10">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />

        {cameraActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-56 h-56">
              {[["top-0 left-0", "border-t-2 border-l-2 rounded-tl-xl"],
                ["top-0 right-0", "border-t-2 border-r-2 rounded-tr-xl"],
                ["bottom-0 left-0", "border-b-2 border-l-2 rounded-bl-xl"],
                ["bottom-0 right-0", "border-b-2 border-r-2 rounded-br-xl"],
              ].map(([pos, cls], i) => (
                <div key={i} className={`absolute w-8 h-8 border-[#00C896] ${pos} ${cls}`} />
              ))}
              {mode === "barcode" && (
                <motion.div
                  className="absolute left-2 right-2 h-0.5 bg-[#00C896]"
                  animate={{ top: ["15%", "85%", "15%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </div>
          </div>
        )}

        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Camera size={48} className="text-gray-600" />
            <p className="text-gray-500 text-sm">Camera is off</p>
          </div>
        )}

        {scanning && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
            <Loader2 size={36} className="text-[#00C896] animate-spin" />
            <p className="text-white text-sm font-medium">
              {mode === "ai" ? "Offline AI identification..." : "Reading barcode..."}
            </p>
          </div>
        )}

        {cameraActive && (
          <button
            onClick={stopCamera}
            className="absolute top-3 right-3 p-2 bg-black/60 rounded-full text-white hover:bg-black/80 transition"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {!cameraActive ? (
        <button
          onClick={startCamera}
          className="w-full py-4 bg-[#00C896] text-black font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-[#00A87E] transition active:scale-95"
        >
          <Camera size={20} />
          Start Camera
        </button>
      ) : mode === "ai" ? (
        <button
          onClick={captureAndScan}
          disabled={scanning || !modelLoaded}
          className="w-full py-4 bg-[#00C896] text-black font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-[#00A87E] transition active:scale-95 disabled:opacity-50"
        >
          {scanning || !modelLoaded ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} />}
          {!modelLoaded ? "Loading Local AI..." : scanning ? "Identifying..." : "Instant Capture & Identify"}
        </button>
      ) : (
        <div className="w-full py-4 bg-white/5 border border-white/10 text-gray-400 rounded-2xl flex items-center justify-center gap-2 text-sm">
          <ScanBarcode size={18} />
          Point camera at barcode — auto scans
        </div>
      )}

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-4"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-3xl shrink-0 overflow-hidden">
                {result.image ? (
                  <img src={result.image} alt="Product" className="w-full h-full object-cover" />
                ) : (
                  getCategoryEmoji(result.category)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-base leading-tight">{result.name}</p>
                {result.brand && <p className="text-gray-400 text-sm mt-0.5">{result.brand}</p>}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300`}>
                    In your store
                  </span>
                  <span className="text-xs text-gray-500">{result.category}</span>
                  {result.confidence === "low" && (
                    <span className="flex items-center gap-1 text-xs text-amber-400">
                      <AlertCircle size={12} /> Low confidence
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                Price (₦)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₦</span>
                <input
                  type="number"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  placeholder="Enter price"
                  className="w-full pl-8 pr-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#00C896] transition"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setResult(null)}
                className="flex-1 py-3 bg-white/5 border border-white/10 text-gray-400 rounded-xl text-sm font-medium hover:bg-white/10 transition"
              >
                Discard
              </button>
              <button
                onClick={addToCart}
                className="flex-[2] py-3 bg-[#00C896] text-black rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#00A87E] transition"
              >
                <CheckCircle size={16} />
                Add to Cart
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
