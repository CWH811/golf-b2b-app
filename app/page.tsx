"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useCartStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart, Upload } from "lucide-react";

type ScanResult = {
  match_found: boolean;
  matched_sku: string | null;
  confidence: number;
  reasoning: string;
  product_details?: {
    sku: string;
    name: string;
    base_price: number;
  };
  error?: string;
};

export default function ScannerPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const getTotal = useCartStore((state) => state.getTotal);
  const clearCart = useCartStore((state) => state.clearCart);

  // Reusing your custom procedural concrete texture
  const emulatedConcreteStyle = {
    backgroundColor: "#161719",
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.06'/%3E%3C/svg%3E")`,
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanResult(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/scan", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as ScanResult;
      setScanResult(result);
    } catch {
      setScanResult({
        match_found: false,
        matched_sku: null,
        confidence: 0,
        reasoning: "Failed to scan image. Please try again.",
        error: "Failed to scan image",
      });
    } finally {
      setIsScanning(false);
      event.target.value = "";
    }
  };

  const handleAddToCart = () => {
    if (scanResult?.product_details) {
      addItem({
        sku: scanResult.product_details.sku,
        name: scanResult.product_details.name,
        price: scanResult.product_details.base_price,
        quantity: 1,
      });
    }
  };

  const getDimpleStyle = (index: number) => {
    const positions = [
      { top: "18%", left: "28%", size: "12px" },
      { top: "24%", left: "64%", size: "10px" },
      { top: "38%", left: "18%", size: "14px" },
      { top: "32%", left: "72%", size: "10px" },
      { top: "55%", left: "22%", size: "14px" },
      { top: "57%", left: "55%", size: "12px" },
      { top: "72%", left: "28%", size: "16px" },
      { top: "66%", left: "76%", size: "10px" },
      { top: "82%", left: "45%", size: "14px" },
      { top: "42%", left: "42%", size: "12px" },
      { top: "12%", left: "45%", size: "10px" },
      { top: "86%", left: "15%", size: "14px" },
      { top: "26%", left: "85%", size: "12px" },
      { top: "50%", left: "50%", size: "16px" },
    ];

    const position = positions[index % positions.length];
    return {
      position: "absolute",
      width: position.size,
      height: position.size,
      top: position.top,
      left: position.left,
      borderRadius: "9999px",
      backgroundColor: "rgba(0,0,0,0.55)",
      boxShadow: "0 0 8px rgba(0,0,0,0.35)",
    } as const;
  };

  return (
    <main
      className="min-h-[100dvh] flex flex-col items-center justify-between p-4 relative font-sans overflow-hidden"
      style={emulatedConcreteStyle}
    >
      {/* Top-right Cart Button */}
      <button
        onClick={() => {}}
        aria-label="Cart"
        className="fixed top-4 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-black/60 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-sm"
      >
        <ShoppingCart className="h-6 w-6 text-[#39FF14]" />
      </button>

      {/* Branded Header Area */}
      <div className="w-full max-w-lg flex flex-col items-center mb-6 relative z-10">
        <div
          className="relative w-full max-w-[680px] aspect-[16/9] overflow-hidden rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
          style={{
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 70%)",
          }}
        >
          <Image
            src="/logo.jpg"
            alt="GCore Logo"
            fill
            sizes="720px"
            className="object-cover"
            loading="eager"
          />
        </div>
      </div>

      {/* 3D Golf Ball Scanner Button */}
      <div className="relative my-6 z-10 flex flex-col items-center">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full border border-[#39FF14]/20 shadow-[0_20px_60px_rgba(0,0,0,0.45)] transition-transform duration-300 hover:scale-105 overflow-hidden"
          style={{
            background: "radial-gradient(circle at 35% 35%, #202020 0%, #0b0b0b 60%, #030303 100%)",
            boxShadow: "0 0 0 1px rgba(57,255,20,0.12), inset 0 0 40px rgba(0,0,0,0.45)",
          }}
          aria-label="Take Photo"
        >
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_20%,rgba(57,255,20,0.18),transparent_35%)]" />
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_60%,rgba(255,255,255,0.06),transparent_45%)]" />
          <div className="absolute inset-0 rounded-full border-2 border-white/5" />

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-[#111111]/80 border border-white/5 flex items-center justify-center shadow-inner shadow-black/50">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="url(#cameraGradient)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-white">
                <defs>
                  <linearGradient id="cameraGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#39FF14" />
                    <stop offset="100%" stopColor="#0FB2FF" />
                  </linearGradient>
                </defs>
                <path d="M4.5 7.5h3l1.5-2h6l1.5 2h3a1.5 1.5 0 011.5 1.5v9a1.5 1.5 0 01-1.5 1.5H4.5A1.5 1.5 0 013 16.5v-9A1.5 1.5 0 014.5 7.5z" />
                <path d="M12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" />
              </svg>
            </div>
          </div>

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-center">
            <span className="block text-[11px] uppercase tracking-[0.35em] text-[#39FF14]/90 drop-shadow-[0_0_20px_rgba(57,255,20,0.35)]">
              {isScanning ? "Scanning..." : "TAKE PHOTO"}
            </span>
          </div>

          <div className="absolute inset-0 rounded-full pointer-events-none">
            {Array.from({ length: 14 }).map((_, index) => (
              <span
                key={index}
                className="absolute block rounded-full bg-black/50"
                style={getDimpleStyle(index)}
              />
            ))}
          </div>
        </button>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Scan Results */}
      {scanResult && (
        <Card className="w-full max-w-sm bg-[#000000]/80 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative z-10 mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-extrabold text-center uppercase tracking-widest text-white">
              Scan Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {scanResult.error ? (
              <p className="text-red-400 text-center text-sm">{scanResult.error}</p>
            ) : scanResult.match_found && scanResult.product_details ? (
              <>
                <div className="text-center">
                  <p className="text-[#39FF14] font-bold text-xl">
                    {scanResult.product_details.name}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    SKU: {scanResult.product_details.sku}
                  </p>
                  <p className="text-[#39FF14] font-bold text-2xl mt-2">
                    ${scanResult.product_details.base_price}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Confidence: {scanResult.confidence}%
                  </p>
                </div>
                <p className="text-xs text-gray-400 text-center">
                  {scanResult.reasoning}
                </p>
                <Button
                  onClick={handleAddToCart}
                  className="w-full h-10 bg-[#007BFF] text-white font-bold uppercase hover:bg-[#0062cc]"
                >
                  Add to Cart
                </Button>
              </>
            ) : (
              <div className="text-center">
                <p className="text-gray-400 text-sm">No match found.</p>
                <p className="text-xs text-gray-500 mt-2">{scanResult.reasoning}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cart Summary (floating) */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-4 right-4 z-20">
          <Card className="bg-[#000000]/80 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="w-5 h-5 text-[#39FF14]" />
                <span className="text-white font-bold">{cartItems.length} items</span>
              </div>
              <p className="text-[#39FF14] font-bold text-xl">
                ${getTotal().toFixed(2)}
              </p>
              <Button
                onClick={clearCart}
                size="sm"
                className="w-full mt-2 h-8 bg-red-500/20 text-red-400 hover:bg-red-500/30"
              >
                Clear Cart
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
