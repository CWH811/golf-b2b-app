"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, ClipboardList, LayoutGrid } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Scanner", icon: Camera },
  { href: "/history", label: "Orders", icon: ClipboardList },
  { href: "/admin", label: "Admin", icon: LayoutGrid },
] as const;

export function BottomNav({ className = "" }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      className={`fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around gap-1 border-t border-white/10 bg-[#0b0c0d]/95 px-2 pt-2 backdrop-blur-md ${className}`}
      style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 transition-colors ${
              isActive
                ? "bg-[#39FF14] shadow-[0_0_20px_rgba(57,255,20,0.35)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Icon
              className={`h-5 w-5 ${isActive ? "text-black" : "text-slate-400"}`}
              strokeWidth={2.25}
            />
            <span
              className={`text-[0.65rem] font-bold uppercase tracking-[0.14em] ${
                isActive ? "text-black" : "text-slate-400"
              }`}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
