'use client';

import { useState, type ChangeEvent } from 'react';
import type { GolfCartFleetRow, GolfCartStatus } from '@/src/lib/types/golfCart';

type FleetTableProps = {
  fleet: GolfCartFleetRow[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  searchQuery: string;
};

const VALID_CART_STATUSES: GolfCartStatus[] = ['available', 'in_use', 'maintenance', 'out_of_service'];

export function AdminFleetTable({ fleet, loading, onRefresh, searchQuery }: FleetTableProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ battery_level: number; odometer_miles: number; location: string; assigned_to: string }>({
    battery_level: 0,
    odometer_miles: 0,
    location: '',
    assigned_to: '',
  });
  const [toast, setToast] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ cart_number: '', model: '', location: '' });
  const [creating, setCreating] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreateCart = async () => {
    if (!addForm.cart_number.trim() || !addForm.model.trim()) {
      showToast('Cart number and model are required');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/fleet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create cart');
      }
      showToast(`Cart "${addForm.cart_number}" added to the fleet`);
      setAddForm({ cart_number: '', model: '', location: '' });
      setShowAddForm(false);
      await onRefresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to create cart');
    } finally {
      setCreating(false);
    }
  };

  const filtered = fleet.filter((cart) =>
    cart.cart_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cart.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cart.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cart.assigned_to ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const patchCart = async (id: string, updates: Record<string, unknown>, successMessage: string) => {
    try {
      const res = await fetch(`/api/admin/fleet/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update cart');
      }
      showToast(successMessage);
      await onRefresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update cart');
    }
  };

  const handleStatusChange = async (id: string, nextStatus: GolfCartStatus) => {
    setUpdatingId(id);
    await patchCart(id, { status: nextStatus }, `Cart status updated to "${nextStatus}"`);
    setUpdatingId(null);
  };

  const startEditing = (cart: GolfCartFleetRow) => {
    setEditingId(cart.id);
    setEditForm({
      battery_level: cart.battery_level,
      odometer_miles: cart.odometer_miles,
      location: cart.location,
      assigned_to: cart.assigned_to ?? '',
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({ battery_level: 0, odometer_miles: 0, location: '', assigned_to: '' });
  };

  const handleSave = async (id: string) => {
    setUpdatingId(id);
    await patchCart(
      id,
      {
        battery_level: editForm.battery_level,
        odometer_miles: editForm.odometer_miles,
        location: editForm.location,
        assigned_to: editForm.assigned_to || null,
      },
      'Cart details updated'
    );
    setUpdatingId(null);
    cancelEditing();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-[#39FF14]/10 text-[#39FF14] border-[#39FF14]/20';
      case 'in_use': return 'bg-[#007BFF]/10 text-[#007BFF] border-[#007BFF]/20';
      case 'maintenance': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'out_of_service': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-white/10 text-slate-400 border-white/10';
    }
  };

  const getBatteryColor = (level: number) => {
    if (level <= 20) return 'text-red-400';
    if (level <= 50) return 'text-amber-400';
    return 'text-[#39FF14]';
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#1b1d20]/95 shadow-[0_12px_45px_rgba(0,0,0,0.35)]">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-xl border border-[#39FF14]/30 bg-[#1b1d20]/95 px-4 py-3 text-sm text-[#dfffe2] shadow-lg backdrop-blur">
          {toast}
        </div>
      )}

      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Golf Cart Fleet</h2>
            <p className="mt-1 text-sm text-slate-400">Track cart status, battery level, and service schedule across the fleet.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="rounded-full bg-[#39FF14] px-4 py-2 text-sm font-semibold text-[#101210] transition hover:bg-[#2edb0d]"
          >
            {showAddForm ? 'Cancel' : '+ Add Cart'}
          </button>
        </div>
        {showAddForm ? (
          <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-[#161719] p-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cart #</label>
              <input
                type="text"
                value={addForm.cart_number}
                onChange={(e) => setAddForm({ ...addForm, cart_number: e.target.value })}
                placeholder="CART-01"
                className="w-32 rounded-lg border border-white/10 bg-[#1b1d20] px-3 py-2 text-sm text-white placeholder:text-slate-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Model</label>
              <input
                type="text"
                value={addForm.model}
                onChange={(e) => setAddForm({ ...addForm, model: e.target.value })}
                placeholder="E-Z-GO RXV"
                className="w-40 rounded-lg border border-white/10 bg-[#1b1d20] px-3 py-2 text-sm text-white placeholder:text-slate-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location (optional)</label>
              <input
                type="text"
                value={addForm.location}
                onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                placeholder="fleet-yard"
                className="w-36 rounded-lg border border-white/10 bg-[#1b1d20] px-3 py-2 text-sm text-white placeholder:text-slate-500"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleCreateCart()}
              disabled={creating}
              className="rounded-lg bg-[#007BFF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0069d9] disabled:opacity-60"
            >
              {creating ? 'Adding…' : 'Add Cart'}
            </button>
          </div>
        ) : null}
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
            {searchQuery ? 'No carts match your search.' : 'No golf carts are registered in the fleet yet.'}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
            <thead className="bg-white/5 text-slate-300">
              <tr>
                <th className="px-5 py-3 font-medium">Cart #</th>
                <th className="px-5 py-3 font-medium">Model</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Battery</th>
                <th className="px-5 py-3 font-medium">Odometer</th>
                <th className="px-5 py-3 font-medium">Location</th>
                <th className="px-5 py-3 font-medium">Assigned To</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-[#17191c]">
              {filtered.map((cart) => (
                <tr key={cart.id} className="hover:bg-white/5">
                  <td className="px-5 py-3 font-mono text-xs text-slate-300">{cart.cart_number}</td>
                  <td className="px-5 py-3 text-slate-300">{cart.model}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={cart.status}
                        onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                          const nextStatus = event.target.value as GolfCartStatus;
                          if (!VALID_CART_STATUSES.includes(nextStatus)) return;
                          void handleStatusChange(cart.id, nextStatus);
                        }}
                        disabled={updatingId === cart.id}
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide appearance-none cursor-pointer disabled:opacity-60 ${getStatusColor(cart.status)}`}
                      >
                        {VALID_CART_STATUSES.map((s) => (
                          <option key={s} value={s} className="bg-[#17191c] text-slate-200">
                            {s.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                      {updatingId === cart.id && (
                        <span className="inline-block w-3 h-3 rounded-full border-2 border-[#39FF14] border-t-transparent animate-spin" />
                      )}
                    </div>
                  </td>
                  {editingId === cart.id ? (
                    <>
                      <td className="px-5 py-3">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={editForm.battery_level}
                          onChange={(e) => setEditForm({ ...editForm, battery_level: Number(e.target.value) })}
                          className="w-20 rounded-lg border border-white/10 bg-[#161719] px-2 py-1 text-sm text-white"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="number"
                          min={0}
                          value={editForm.odometer_miles}
                          onChange={(e) => setEditForm({ ...editForm, odometer_miles: Number(e.target.value) })}
                          className="w-24 rounded-lg border border-white/10 bg-[#161719] px-2 py-1 text-sm text-white"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="text"
                          value={editForm.location}
                          onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                          className="w-28 rounded-lg border border-white/10 bg-[#161719] px-2 py-1 text-sm text-white"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="text"
                          value={editForm.assigned_to}
                          onChange={(e) => setEditForm({ ...editForm, assigned_to: e.target.value })}
                          placeholder="Unassigned"
                          className="w-28 rounded-lg border border-white/10 bg-[#161719] px-2 py-1 text-sm text-white placeholder:text-slate-500"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void handleSave(cart.id)}
                            disabled={updatingId === cart.id}
                            className="rounded-lg bg-[#39FF14] px-3 py-1.5 text-xs font-semibold text-[#101210] transition hover:bg-[#2edb0d] disabled:opacity-60"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={`px-5 py-3 font-semibold ${getBatteryColor(cart.battery_level)}`}>{cart.battery_level}%</td>
                      <td className="px-5 py-3 text-slate-300">{cart.odometer_miles.toLocaleString()} mi</td>
                      <td className="px-5 py-3 text-slate-300">{cart.location}</td>
                      <td className="px-5 py-3 text-slate-300">{cart.assigned_to ?? '—'}</td>
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() => startEditing(cart)}
                          className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
                        >
                          Edit
                        </button>
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
