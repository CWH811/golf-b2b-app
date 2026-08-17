"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShoppingCart, ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useCartStore } from "@/lib/store";

export default function CartPage() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const getTotal = useCartStore((state) => state.getTotal);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = getTotal();

  const handleCheckout = async () => {
    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            sku: item.sku,
            quantity: item.quantity,
            price: item.price,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Checkout failed.");
      }

      clearCart();
      router.push("/history");
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error ? checkoutError.message : "Checkout failed. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#161719] p-4 text-white">
      <div className="mx-auto max-w-md space-y-5 pb-8">
        <div className="flex items-center justify-between pt-2">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#39FF14]">
            <ArrowLeft className="h-4 w-4" />
            Continue scanning
          </Link>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-300">
            <ShoppingCart className="h-4 w-4 text-[#39FF14]" />
            {items.length} item{items.length === 1 ? "" : "s"}
          </div>
        </div>

        <Card className="border-white/10 bg-[#1b1d20]/90">
          <CardHeader>
            <CardTitle className="text-xl font-black uppercase tracking-[0.2em] text-white">
              Cart
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.length === 0 ? (
              <div className="space-y-4 text-center">
                <p className="text-slate-300">Your cart is empty.</p>
                <Link href="/">
                  <Button className="w-full bg-[#39FF14] text-black font-bold uppercase tracking-widest hover:bg-[#32e012]">
                    Start scanning
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.sku}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3"
                    >
                      <div>
                        <p className="font-semibold text-white">{item.name}</p>
                        <p className="text-sm text-slate-400">SKU: {item.sku}</p>
                        <p className="mt-1 text-[#39FF14] font-bold">
                          ${item.price.toFixed(2)} each
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-md bg-white/5 px-2 py-1 text-sm text-slate-200">
                          Qty {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove ${item.name}`}
                          onClick={() => removeItem(item.sku)}
                          className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-red-300 transition hover:bg-red-500/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>Subtotal</span>
                    <span className="font-semibold text-white">${subtotal.toFixed(2)}</span>
                  </div>
                </div>

                {error && (
                  <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                    {error}
                  </p>
                )}

                <Button
                  onClick={handleCheckout}
                  disabled={isSubmitting}
                  className="w-full bg-[#39FF14] text-black font-bold uppercase tracking-widest hover:bg-[#32e012] disabled:opacity-60"
                >
                  {isSubmitting ? "Processing..." : "Checkout"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
