'use client';

import { useEffect, useState } from 'react';

type OrderItemSummary = {
  sku: string;
  quantity: number;
  price_at_purchase: number;
};

type OrderSummary = {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  order_items: OrderItemSummary[];
};

type CatalogRecord = {
  sku: string;
  name: string;
  base_price: number;
};

export function AdminDashboardClient() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [catalog, setCatalog] = useState<CatalogRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'catalog'>('orders');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const [ordersResponse, catalogResponse] = await Promise.all([
        fetch('/api/admin/orders'),
        fetch('/api/admin/catalog'),
      ]);

      if (!ordersResponse.ok) {
        throw new Error('Unable to load orders');
      }
      if (!catalogResponse.ok) {
        throw new Error('Unable to load catalog');
      }

      const ordersData = await ordersResponse.json();
      const catalogData = await catalogResponse.json();

      setOrders(ordersData.orders ?? []);
      setCatalog(catalogData.catalog ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleCatalogUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const text = await file.text();
      const isJson = file.name.toLowerCase().endsWith('.json');
      const response = await fetch('/api/admin/catalog', {
        method: 'POST',
        headers: {
          'Content-Type': isJson ? 'application/json' : 'text/csv',
        },
        body: isJson ? JSON.stringify(JSON.parse(text)) : text,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Catalog import failed');
      }

      setMessage(`Imported ${data.imported ?? 0} catalog rows`);
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Catalog import failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <main className="min-h-screen bg-[#161719] text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-white/10 bg-[#1b1d20]/95 p-6 shadow-[0_12px_45px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#39FF14]">Admin Operations</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">GCore Command Center</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Monitor incoming orders, manage the master catalog, and keep the golf course operation running from the field.
              </p>
            </div>
            <div className="rounded-xl border border-[#007BFF]/30 bg-[#007BFF]/10 px-4 py-3 text-sm text-slate-300">
              <div className="font-semibold text-[#39FF14]">Live inventory lens</div>
              <div className="mt-1">Orders and catalog sync through the secure admin API.</div>
            </div>
          </div>
        </header>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === 'orders' ? 'bg-[#007BFF] text-white shadow-[0_0_20px_rgba(0,123,255,0.18)]' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
          >
            Orders
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === 'catalog' ? 'bg-[#39FF14] text-[#101210] shadow-[0_0_20px_rgba(57,255,20,0.18)]' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
          >
            Catalog Manager
          </button>
        </div>

        {message ? (
          <div className="rounded-xl border border-[#39FF14]/30 bg-[#39FF14]/10 px-4 py-3 text-sm text-[#dfffe2]">
            {message}
          </div>
        ) : null}

        {activeTab === 'orders' ? (
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#1b1d20]/95 shadow-[0_12px_45px_rgba(0,0,0,0.35)]">
            <div className="border-b border-white/10 px-5 py-4">
              <h2 className="text-lg font-semibold text-white">Incoming Orders</h2>
              <p className="mt-1 text-sm text-slate-400">A consolidated view of orders submitted by customers and the items requested.</p>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 text-sm text-slate-400">Loading orders…</div>
              ) : orders.length === 0 ? (
                <div className="p-8 text-sm text-slate-400">No orders have been submitted yet.</div>
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
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-white/5">
                        <td className="px-5 py-3 font-mono text-xs text-slate-400">{order.id.slice(0, 8)}</td>
                        <td className="px-5 py-3 text-slate-200">{order.user_id}</td>
                        <td className="px-5 py-3">
                          <span className="rounded-full bg-[#39FF14]/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-[#39FF14]">
                            {order.status}
                          </span>
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
                        <td className="px-5 py-3 text-slate-400">{new Date(order.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#1b1d20]/95 shadow-[0_12px_45px_rgba(0,0,0,0.35)]">
              <div className="border-b border-white/10 px-5 py-4">
                <h2 className="text-lg font-semibold text-white">Master Catalog</h2>
                <p className="mt-1 text-sm text-slate-400">Current product inventory and pricing available to the field team.</p>
              </div>
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="p-8 text-sm text-slate-400">Loading catalog…</div>
                ) : catalog.length === 0 ? (
                  <div className="p-8 text-sm text-slate-400">No catalog rows have been imported yet.</div>
                ) : (
                  <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                    <thead className="bg-white/5 text-slate-300">
                      <tr>
                        <th className="px-5 py-3 font-medium">SKU</th>
                        <th className="px-5 py-3 font-medium">Name</th>
                        <th className="px-5 py-3 font-medium">Base Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 bg-[#17191c]">
                      {catalog.map((item) => (
                        <tr key={item.sku} className="hover:bg-white/5">
                          <td className="px-5 py-3 font-mono text-xs text-slate-400">{item.sku}</td>
                          <td className="px-5 py-3 text-slate-200">{item.name}</td>
                          <td className="px-5 py-3 text-slate-300">${item.base_price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#1b1d20]/95 p-6 shadow-[0_12px_45px_rgba(0,0,0,0.35)]">
              <div className="rounded-2xl border border-dashed border-[#007BFF]/40 bg-[#007BFF]/10 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#39FF14]">Upload CSV Catalog</p>
                <h3 className="mt-3 text-xl font-semibold text-white">Bulk import product inventory</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Drop a CSV or JSON catalog file to upsert the master products table directly through the admin API.
                </p>
                <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#161719] px-4 py-8 text-center text-sm text-slate-300 transition hover:border-[#39FF14]/40 hover:text-white">
                  <span className="text-lg font-semibold text-white">Choose a catalog file</span>
                  <span className="mt-2 text-slate-400">CSV or JSON • up to the size your browser allows</span>
                  <input type="file" accept=".csv,.json" className="sr-only" onChange={handleCatalogUpload} />
                </label>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => document.querySelector('input[type="file"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))}
                  className="mt-4 w-full rounded-xl bg-[#39FF14] px-4 py-3 text-sm font-semibold text-[#101210] transition hover:bg-[#2edb0d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploading ? 'Importing…' : 'Upload Catalog'}
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
