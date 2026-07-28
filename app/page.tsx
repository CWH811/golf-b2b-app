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

  return (
    <main
      className="min-h-[100dvh] flex flex-col items-center p-4 relative font-sans overflow-hidden"
      style={emulatedConcreteStyle}
    >
      {/* Branded Header Area */}
      <div className="w-full max-w-sm flex flex-col items-center mb-6 relative z-10">
        <div
          className="relative w-full max-w-[280px] aspect-video overflow-hidden mb-2"
          style={{
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 70%)",
          }}
        >
          <Image
            src="/logo.jpg"
            alt="GCore Logo"
            fill
            sizes="280px"
            className="object-cover"
          />
        </div>
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#007BFF] to-[#39FF14] tracking-widest uppercase drop-shadow-md">
          GCORE
        </h1>
        <p className="text-gray-400 text-[10px] font-bold tracking-widest uppercase mt-2 text-center">
          Golf Course Operations Resource Engine
        </p>
      </div>

      {/* 3D Golf Ball Scanner Button */}
      <div className="relative my-6 z-10">
        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative cursor-pointer"
          style={{ perspective: "1000px" }}
        >
          <div
            className="w-56 h-56 rounded-full transition-transform duration-300 hover:scale-105"
            style={{
              background:
                "radial-gradient(circle at 25% 25%, #2a2a2a 0%, #0a0a0a 45%, #000000 100%)",
              boxShadow:
                "inset 0 0 40px rgba(0,0,0,0.9), 0 0 50px rgba(57,255,20,0.08), 0 20px 60px rgba(0,0,0,0.6)",
              transform: "rotateX(25deg) rotateY(-15deg)",
            }}
          >
            {/* Golf ball dimples */}
            <div className="w-full h-full rounded-full relative">
              {/* Dimple layer 1 */}
              <div
                className="absolute rounded-full bg-black/60"
                style={{
                  width: "14px",
                  height: "14px",
                  top: "15%",
                  left: "25%",
                  boxShadow: "0 0 3px rgba(0,0,0,0.6)",
                }}
              />
              <div
                className="absolute rounded-full bg-black/60"
                style={{
                  width: "12px",
                  height: "12px",
                  top: "20%",
                  left: "60%",
                  boxShadow: "0 0 3px rgba(0,0,0,0.6)",
                }}
              />
              <div
                className="absolute rounded-full bg-black/60"
                style={{
                  width: "16px",
                  height: "16px",
                  top: "35%",
                  left: "15%",
                  boxShadow: "0 0 3px rgba(0,0,0,0.6)",
                }}
              />
              <div
                className="absolute rounded-full bg-black/60"
                style={{
                  width: "10px",
                  height: "10px",
                  top: "30%",
                  left: "70%",
                  boxShadow: "0 0 3px rgba(0,0,0,0.6)",
                }}
              />
              <div
                className="absolute rounded-full bg-black/60"
                style={{
                  width: "14px",
                  height: "14px",
                  top: "50%",
                  left: "20%",
                  boxShadow: "0 0 3px rgba(0,0,0,0.6)",
                }}
              />
              <div
                className="absolute rounded-full bg-black/60"
                style={{
                  width: "12px",
                  height: "12px",
                  top: "55%",
                  left: "55%",
                  boxShadow: "0 0 3px rgba(0,0,0,0.6)",
                }}
              />
              <div
                className="absolute rounded-full bg-black/60"
                style={{
                  width: "16px",
                  height: "16px",
                  top: "70%",
                  left: "30%",
                  boxShadow: "0 0 3px rgba(0,0,0,0.6)",
                }}
              />
              <div
                className="absolute rounded-full bg-black/60"
                style={{
                  width: "10px",
                  height: "10px",
                  top: "65%",
                  left: "75%",
                  boxShadow: "0 0 3px rgba(0,0,0,0.6)",
                }}
              />
              <div
                className="absolute rounded-full bg-black/60"
                style={{
                  width: "14px",
                  height: "14px",
                  top: "80%",
                  left: "45%",
                  boxShadow: "0 0 3px rgba(0,0,0,0.6)",
                }}
              />
              <div
                className="absolute rounded-full bg-black/60"
                style={{
                  width: "12px",
                  height: "12px",
                  top: "40%",
                  left: "40%",
                  boxShadow: "0 0 3px rgba(0,0,0,0.6)",
                }}
              />
              <div
                className="absolute rounded-full bg-black/60"
                style={{
                  width: "10px",
                  height: "10px",
                  top: "10%",
                  left: "45%",
                  boxShadow: "0 0 3px rgba(0,0,0,0.6)",
                }}
              />
              <div
                className="absolute rounded-full bg-black/60"
                style={{
                  width: "14px",
                  height: "14px",
                  top: "85%",
                  left: "15%",
                  boxShadow: "0 0 3px rgba(0,0,0,0.6)",
                }}
              />
              <div
                className="absolute rounded-full bg-black/60"
                style={{
                  width: "12px",
                  height: "12px",
                  top: "25%",
                  left: "85%",
                  boxShadow: "0 0 3px rgba(0,0,0,0.6)",
                }}
              />

              {/* Highlight for 3D effect */}
              <div className="absolute top-[15%] left-[20%] w-10 h-10 rounded-full bg-white/15 blur-sm" />
            </div>

            {/* Scanning ring */}
            <div
              className={`absolute -inset-3 rounded-full border-2 animate-pulse ${
                isScanning ? "border-[#39FF14] opacity-100" : "border-[#39FF14]/30"
              }`}
            />
          </div>
        </div>

        {/* Scanner label */}
        <p className="text-center text-xs font-bold text-gray-500 uppercase tracking-widest mt-4">
          {isScanning ? "Scanning..." : "Tap to Scan Product"}
        </p>
      </div>

      {/* Scan Action Button */}
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={isScanning}
        className="mb-6 h-12 w-full max-w-sm bg-[#39FF14] text-black font-extrabold uppercase tracking-widest hover:bg-[#32e012] shadow-[0_0_15px_rgba(57,255,20,0.2)] transition-all disabled:opacity-50"
      >
        {isScanning ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin text-black mr-2" />
            Scanning...
          </>
        ) : (
          <>
            <Upload className="w-6 h-6 mr-2" />
            Scan Product
          </>
        )}
      </Button>

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
