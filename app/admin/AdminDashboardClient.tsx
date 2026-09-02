'use client';

import { useEffect, useState, useCallback } from 'react';
import { AdminOrdersTable } from './AdminOrdersTable';
import { AdminCatalogTable } from './AdminCatalogTable';
import { ProductScanner } from './ProductScanner';
import type { AdminOrderSummary, AdminCatalogRecord } from '@/src/lib/types/admin';
import type { OrderStatus } from '@/src/lib/types/orders';

const ORDER_FILTERS: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Fulfilled', value: 'fulfilled' },
  { label: 'Cancelled', value: 'cancelled' },
];

export function AdminDashboardClient() {
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [catalog, setCatalog] = useState<AdminCatalogRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'catalog' | 'scanner'>('orders');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    try {
      const statusQuery = statusFilter === 'all' ? '' : `?status=${statusFilter}`;
      const [ordersResponse, catalogResponse] = await Promise.all([
        fetch(`/api/admin/orders${statusQuery}`),
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
  }, [statusFilter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

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

      {/* Tab bar + search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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
          <button
            type="button"
            onClick={() => setActiveTab('scanner')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === 'scanner' ? 'bg-[#007BFF] text-white shadow-[0_0_20px_rgba(0,123,255,0.18)]' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
          >
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              AI Scanner
            </span>
          </button>
        </div>

        {/* Search bar */}
        <div className="relative w-full max-w-xs">
          <input
            type="text"
            placeholder={`Search ${activeTab === 'orders' ? 'orders…' : 'catalog…'}`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#1b1d20]/80 px-4 py-2.5 pl-9 text-sm text-white placeholder:text-slate-500 focus:border-[#39FF14]/40 focus:outline-none"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {message ? (
        <div className="rounded-xl border border-[#39FF14]/30 bg-[#39FF14]/10 px-4 py-3 text-sm text-[#dfffe2]">
          {message}
        </div>
      ) : null}

      {/* Status filter bar (Orders tab) */}
      {activeTab === 'orders' ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Filter:</span>
          {ORDER_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                statusFilter === filter.value
                  ? 'bg-[#007BFF] text-white shadow-[0_0_16px_rgba(0,123,255,0.18)]'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      ) : null}

      {activeTab === 'orders' ? (
        <AdminOrdersTable
          orders={orders}
          loading={loading}
          onRefresh={loadData}
          searchQuery={searchQuery}
        />
      ) : activeTab === 'scanner' ? (
        <ProductScanner />
      ) : (
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <AdminCatalogTable
            catalog={catalog}
            loading={loading}
            onRefresh={loadData}
            searchQuery={searchQuery}
          />

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
  );
}