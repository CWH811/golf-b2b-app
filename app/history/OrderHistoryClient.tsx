'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { OrderHistoryRecord, OrderStatus } from '@/src/lib/types/orders';

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  fulfilled: 'bg-[#39FF14]/10 text-[#39FF14] border-[#39FF14]/20',
  shipped: 'bg-[#007BFF]/10 text-[#007BFF] border-[#007BFF]/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export function OrderHistoryClient() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load order history');
      }
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load order history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const handleReorder = async (orderId: string) => {
    setReorderingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/reorder`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reorder');
      }
      showToast('Order reordered — a new PO has been created');
      await loadOrders();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to reorder');
    } finally {
      setReorderingId(null);
    }
  };

  const emulatedConcreteStyle = {
    backgroundColor: '#161719',
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.06'/%3E%3C/svg%3E")`,
  };

  return (
    <main
      className="min-h-[100dvh] p-4 sm:p-6 relative overflow-hidden"
      style={emulatedConcreteStyle}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute top-0 right-0 w-96 h-96 bg-[#007BFF]/5 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 w-96 h-96 bg-[#39FF14]/5 rounded-full blur-3xl" />

      <div className="relative z-10 mx-auto max-w-3xl">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#39FF14]">GCore</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Order History</h1>
            <p className="mt-1 text-sm text-slate-400">Your past purchase orders and their current status.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/60 text-[#007BFF] shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-sm transition hover:bg-black/80"
            aria-label="Back to scanner"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </header>

        {/* Toast */}
        {toast && (
          <div className="fixed top-4 right-4 z-50 rounded-xl border border-[#39FF14]/30 bg-[#1b1d20]/95 px-4 py-3 text-sm text-[#dfffe2] shadow-lg backdrop-blur">
            {toast}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-[#1b1d20]/95 p-6 text-center shadow-[0_12px_45px_rgba(0,0,0,0.35)]">
            <p className="text-sm text-red-400">{error}</p>
            <button
              type="button"
              onClick={() => void loadOrders()}
              className="mt-4 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/15"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl border border-white/10 bg-[#1b1d20]/95 p-5 animate-pulse">
                <div className="h-4 w-1/3 rounded bg-white/10" />
                <div className="mt-3 h-3 w-2/3 rounded bg-white/5" />
                <div className="mt-3 h-3 w-1/2 rounded bg-white/5" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && orders.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-[#1b1d20]/95 p-8 text-center shadow-[0_12px_45px_rgba(0,0,0,0.35)]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#39FF14]/10">
              <svg className="h-7 w-7 text-[#39FF14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white">No orders yet</h2>
            <p className="mt-2 text-sm text-slate-400">Scan a product to place your first purchase order.</p>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="mt-5 rounded-xl bg-[#39FF14] px-6 py-3 text-sm font-semibold text-[#101210] transition hover:bg-[#2edb0d]"
            >
              Start Scanning
            </button>
          </div>
        )}

        {/* Order list */}
        {!loading && !error && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-[#1b1d20]/95 shadow-[0_12px_45px_rgba(0,0,0,0.35)]"
              >
                {/* Order header */}
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                  className="w-full p-5 text-left transition hover:bg-white/5"
                  aria-expanded={expandedId === order.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-400">#{order.id.slice(0, 8)}</span>
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${STATUS_COLORS[order.status] ?? 'bg-white/10 text-slate-400 border-white/10'}`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-300">
                        {new Date(order.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                        {' · '}
                        {new Date(order.created_at).toLocaleTimeString(undefined, {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-white">${order.total.toFixed(2)}</p>
                      <p className="text-xs text-slate-400">{order.item_count} item{order.item_count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </button>

                {/* Expandable items */}
                {expandedId === order.id && (
                  <div className="border-t border-white/10 bg-[#17191c] px-5 py-4">
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                          <div className="min-w-0">
                            <p className="truncate text-slate-200">{item.name}</p>
                            <p className="font-mono text-xs text-slate-500">{item.sku}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-slate-300">
                              {item.quantity} × ${item.price_at_purchase.toFixed(2)}
                            </p>
                            <p className="text-xs text-slate-500">
                              ${(item.quantity * item.price_at_purchase).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Reorder button */}
                    <button
                      type="button"
                      onClick={() => void handleReorder(order.id)}
                      disabled={reorderingId === order.id}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#39FF14] px-4 py-3 text-sm font-semibold text-[#101210] transition hover:bg-[#2edb0d] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {reorderingId === order.id ? (
                        <>
                          <span className="inline-block h-4 w-4 rounded-full border-2 border-[#101210] border-t-transparent animate-spin" />
                          Reordering…
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Reorder
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}