'use client';

import { useState } from 'react';
import type { AdminCatalogRecord } from '@/src/lib/types/admin';

type CatalogTableProps = {
  catalog: AdminCatalogRecord[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  searchQuery: string;
};

export function AdminCatalogTable({ catalog, loading, onRefresh, searchQuery }: CatalogTableProps) {
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; base_price: number; quantity_on_hand: number }>({ name: '', base_price: 0, quantity_on_hand: 0 });
  const [deletingSku, setDeletingSku] = useState<string | null>(null);
  const [confirmDeleteSku, setConfirmDeleteSku] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = catalog.filter((item) =>
    item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startEditing = (item: AdminCatalogRecord) => {
    setEditingSku(item.sku);
    setEditForm({
      name: item.name,
      base_price: item.base_price,
      quantity_on_hand: item.quantity_on_hand ?? 0,
    });
  };

  const cancelEditing = () => {
    setEditingSku(null);
    setEditForm({ name: '', base_price: 0, quantity_on_hand: 0 });
  };

  const handleSave = async (sku: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/catalog/${encodeURIComponent(sku)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update product');
      }
      showToast(`Product "${sku}" updated`);
      cancelEditing();
      await onRefresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sku: string) => {
    setDeletingSku(sku);
    try {
      const res = await fetch(`/api/admin/catalog/${encodeURIComponent(sku)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to archive product');
      }
      showToast(`Product "${sku}" archived`);
      setConfirmDeleteSku(null);
      await onRefresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to archive product');
    } finally {
      setDeletingSku(null);
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

      {/* Confirmation dialog */}
      {confirmDeleteSku && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1b1d20]/95 p-6 shadow-[0_12px_45px_rgba(0,0,0,0.5)]">
            <h3 className="text-lg font-semibold text-white">Archive Product</h3>
            <p className="mt-2 text-sm text-slate-400">
              Are you sure you want to archive <span className="font-mono text-[#39FF14]">{confirmDeleteSku}</span>? It will be hidden from the active catalog.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteSku(null)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDeleteSku)}
                disabled={deletingSku === confirmDeleteSku}
                className="flex-1 rounded-xl bg-red-500/20 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/30 transition disabled:opacity-60"
              >
                {deletingSku === confirmDeleteSku ? 'Archiving…' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border-b border-white/10 px-5 py-4">
        <h2 className="text-lg font-semibold text-white">Master Catalog</h2>
        <p className="mt-1 text-sm text-slate-400">Current product inventory and pricing available to the field team.</p>
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
            {searchQuery ? 'No catalog items match your search.' : 'No catalog rows have been imported yet.'}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
            <thead className="bg-white/5 text-slate-300">
              <tr>
                <th className="px-5 py-3 font-medium">SKU</th>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Base Price</th>
                <th className="px-5 py-3 font-medium">In Stock</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-[#17191c]">
              {filtered.map((item) => (
                <tr key={item.sku} className="hover:bg-white/5">
                  {editingSku === item.sku ? (
                    <>
                      <td className="px-5 py-3 font-mono text-xs text-slate-400">{item.sku}</td>
                      <td className="px-5 py-3">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          className="w-full rounded-lg border border-white/10 bg-[#161719] px-2 py-1 text-sm text-white"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.base_price}
                          onChange={(e) => setEditForm((f) => ({ ...f, base_price: parseFloat(e.target.value) || 0 }))}
                          className="w-24 rounded-lg border border-white/10 bg-[#161719] px-2 py-1 text-sm text-white"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="number"
                          min="0"
                          value={editForm.quantity_on_hand}
                          onChange={(e) => setEditForm((f) => ({ ...f, quantity_on_hand: parseInt(e.target.value) || 0 }))}
                          className="w-20 rounded-lg border border-white/10 bg-[#161719] px-2 py-1 text-sm text-white"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSave(item.sku)}
                            disabled={saving}
                            className="rounded-lg bg-[#39FF14]/20 px-3 py-1.5 text-xs font-semibold text-[#39FF14] hover:bg-[#39FF14]/30 transition disabled:opacity-60"
                          >
                            {saving ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/20 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-3 font-mono text-xs text-slate-400">{item.sku}</td>
                      <td className="px-5 py-3 text-slate-200">{item.name}</td>
                      <td className="px-5 py-3 text-slate-300">${item.base_price}</td>
                      <td className="px-5 py-3">
                        <span className={`font-semibold ${(item.quantity_on_hand ?? 0) > 0 ? 'text-[#39FF14]' : 'text-red-400'}`}>
                          {item.quantity_on_hand ?? 0}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEditing(item)}
                            className="rounded-lg bg-[#007BFF]/20 px-3 py-1.5 text-xs font-semibold text-[#007BFF] hover:bg-[#007BFF]/30 transition"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteSku(item.sku)}
                            className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/30 transition"
                          >
                            Archive
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}