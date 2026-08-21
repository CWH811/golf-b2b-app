import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#161719] text-slate-100">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex md:w-56 flex-col border-r border-white/10 bg-[#1b1d20]/95 min-h-screen p-4 gap-2">
          <div className="mb-6 px-2">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#39FF14]">GCore</p>
            <p className="text-lg font-semibold text-white mt-1">Admin</p>
          </div>
          <nav className="flex flex-col gap-1">
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              ← Back to Scanner
            </Link>
            <div className="border-t border-white/10 my-3" />
            <span className="px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Management
            </span>
            <Link
              href="/admin"
              className="rounded-lg px-3 py-2 text-sm text-white bg-[#39FF14]/10 border border-[#39FF14]/20"
            >
              Dashboard
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}