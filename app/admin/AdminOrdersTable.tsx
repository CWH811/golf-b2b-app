'use client';

import { useState } from 'react';
import type { AdminOrderSummary } from '@/src/lib/types/admin';

type OrdersTableProps = {
  orders: AdminOrderSummary[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  searchQuery: string;
};

const VALID_STATUSES = ['pending', 'fulfilled', 'shipped', 'cancelled'];

export function AdminOrdersTable({ orders, loading, onRefresh, searchQuery }: OrdersTableProps) {
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update status');
      }
      showToast(`Order status updated to "${newStatus}"`);
      await onRefresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update order');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const filtered = orders.filter((order) =>
    order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'fulfilled': return 'bg-[#39FF14]/10 text-[#39FF14] border-[#39FF14]/20';
      case 'shipped': return 'bg-[#007BFF]/10 text-[#007BFF] border-[#007BFF]/20';
      case 'cancelled': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-white/10 text-slate-400 border-white/10';
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#1b1d20]/95 shadow-[0_12px_45px_rgba(0,0,0,0.35)]">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-xl border border-[#39FF14]/30 bg-[#1b1d20]/95 px-4 py-3 text-sm text-[#dfffe2] shadow-lg backdrop-blur">
          {toast}
        </div>
      )}

      <div className="border-b border-white/10 px-5 py-4">
        <h2 className="text-lg font-semibold text-white">Incoming Orders</h2>
        <p className="mt-1 text-sm text-slate-400">A consolidated view of orders submitted by customers and the items requested.</p>
      </div>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="space-y-3 p-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-sm text-slate-400">
            {searchQuery ? 'No orders match your search.' : 'No orders have been submitted yet.'}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
            <thead className="bg-white/5 text-slate-300">
              <tr>
                <th className="px-5 py-3 font-medium">Order ID</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Items</th>
                <th className="px-5 py-3 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-[#17191c]">
              {filtered.map((order) => (
                <tr key={order.id} className="hover:bg-white/5">
                  <td className="px-5 py-3 font-mono text-xs text-slate-400">{order.id.slice(0, 8)}</td>
                  <td className="px-5 py-3 text-slate-200">{order.user_id}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        disabled={updatingOrderId === order.id}
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide appearance-none cursor-pointer disabled:opacity-60 ${getStatusColor(order.status)}`}
                      >
                        {VALID_STATUSES.map((s) => (
                          <option key={s} value={s} className="bg-[#17191c] text-slate-200">
                            {s}
                          </option>
                        ))}
                      </select>
                      {updatingOrderId === order.id && (
                        <span className="inline-block w-3 h-3 rounded-full border-2 border-[#39FF14] border-t-transparent animate-spin" />
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-300">
                    <div className="space-y-1">
                      {order.order_items.map((item) => (
                        <div key={`${order.id}-${item.sku}`} className="text-sm">
                          {item.sku} × {item.quantity} • ${item.price_at_purchase}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-400">
                    {new Date(order.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}