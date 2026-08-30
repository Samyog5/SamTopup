import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { APP_NAME } from "@/config/constants";

export const metadata: Metadata = {
  title: "Authentication",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Minimal header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/logo.png"
              alt={`${APP_NAME} Logo`}
              width={28}
              height={28}
              className="h-7 w-7 rounded-md object-contain border border-emerald-500/20 bg-background/50"
              priority
            />
            <span className="text-base font-bold">{APP_NAME}</span>
          </Link>
        </div>
      </header>

      {/* Centered content */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="relative w-full max-w-md">
          {/* Background decoration */}
          <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-400/10 to-teal-400/10 blur-3xl" />
          <div className="relative">{children}</div>
        </div>
      </main>
    </div>
  );
}
