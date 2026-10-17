"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Boxes,
  FolderTree,
  MapPin,
  Menu,
  PackageCheck,
  QrCode,
  X,
} from "lucide-react";

const links = [
  { href: "/dashboard", label: "Overview", icon: Boxes, exact: true },
  { href: "/dashboard/assets", label: "Assets", icon: PackageCheck },
  { href: "/dashboard/categories", label: "Categories", icon: FolderTree },
  { href: "/dashboard/locations", label: "Locations", icon: MapPin },
  { href: "/dashboard/tags", label: "QR labels", icon: QrCode },
];

export function MobileDashboardNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="relative z-30 mx-auto max-w-7xl px-5 pt-4 lg:hidden">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="mobile-dashboard-menu"
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-[#0d121d] px-4 text-sm font-medium text-slate-200 hover:bg-white/[.06]"
      >
        {isOpen ? <X size={18} /> : <Menu size={18} />}
        {isOpen ? "Close menu" : "Menu"}
      </button>

      {isOpen && (
        <nav
          id="mobile-dashboard-menu"
          aria-label="Dashboard navigation"
          className="absolute left-5 right-5 top-[calc(100%+0.5rem)] rounded-2xl border border-white/10 bg-[#0d121d] p-2 shadow-2xl"
        >
          {links.map(({ href, label, icon: Icon, exact }) => {
            const active = exact
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={() => setIsOpen(false)}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm ${
                  active
                    ? "bg-blue-500/10 font-medium text-blue-300"
                    : "text-slate-300 hover:bg-white/[.05] hover:text-white"
                }`}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
