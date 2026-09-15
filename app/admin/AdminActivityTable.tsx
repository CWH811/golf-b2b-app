'use client';

import type { AdminAuditLogEntry } from '@/app/api/admin/auditLog';

type ActivityTableProps = {
  entries: AdminAuditLogEntry[];
  loading: boolean;
  searchQuery: string;
};

export function AdminActivityTable({ entries, loading, searchQuery }: ActivityTableProps) {
  const filtered = entries.filter((entry) =>
    entry.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.entity_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.entity_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (entry.admin_email ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#1b1d20]/95 shadow-[0_12px_45px_rgba(0,0,0,0.35)]">
      <div className="border-b border-white/10 px-5 py-4">
        <h2 className="text-lg font-semibold text-white">Admin Activity</h2>
        <p className="mt-1 text-sm text-slate-400">A read-only audit trail of catalog, order, and fleet changes made through this dashboard.</p>
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
            {searchQuery ? 'No activity matches your search.' : 'No admin actions have been recorded yet.'}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
            <thead className="bg-white/5 text-slate-300">
              <tr>
                <th className="px-5 py-3 font-medium">When</th>
                <th className="px-5 py-3 font-medium">Admin</th>
                <th className="px-5 py-3 font-medium">Action</th>
                <th className="px-5 py-3 font-medium">Entity</th>
                <th className="px-5 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-[#17191c]">
              {filtered.map((entry) => (
                <tr key={entry.id} className="hover:bg-white/5">
                  <td className="px-5 py-3 text-slate-400">{new Date(entry.created_at).toLocaleString()}</td>
                  <td className="px-5 py-3 text-slate-200">{entry.admin_email ?? '—'}</td>
                  <td className="px-5 py-3 text-slate-200">{entry.action.replace(/_/g, ' ')}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-400">{entry.entity_type}:{entry.entity_id}</td>
                  <td className="px-5 py-3 text-xs text-slate-400">
                    {entry.details ? JSON.stringify(entry.details) : '—'}
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
