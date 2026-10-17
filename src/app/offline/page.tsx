import Link from "next/link";
import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = {
  title: "You're offline",
};

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center px-5">
      <div className="max-w-sm text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-blue-500/10 text-blue-300">
          <WifiOff size={24} />
        </div>
        <h1 className="mt-5 text-2xl font-semibold">You&apos;re offline</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Assetly needs a connection to load your inventory. Reconnect and try
          again.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold"
        >
          Try again
        </Link>
      </div>
    </main>
  );
}
