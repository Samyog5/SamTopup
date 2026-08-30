import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { buttonVariants } from "@/components/ui/button";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { Badge } from "@/components/ui/badge";
import { APP_NAME } from "@/config/constants";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* Esports Gaming Hero Section */}
        <section className="relative overflow-hidden bg-slate-950 py-16 sm:py-24 lg:py-32 text-white">
          {/* Ambient Glow Effects */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 right-1/4 h-[600px] w-[600px] rounded-full bg-emerald-500/15 blur-[120px]" />
            <div className="absolute bottom-0 left-10 h-[500px] w-[500px] rounded-full bg-teal-500/10 blur-[140px]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              {/* Left Column: Hero Copy & Actions */}
              <div className="space-y-6 lg:col-span-7 text-center lg:text-left">
                <div className="inline-flex items-center gap-2.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs sm:text-sm font-semibold text-emerald-400 backdrop-blur-md shadow-sm">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                  ⚡ Instant Auto-Fulfillment Active • Nepal&apos;s #1 Hub
                </div>

                <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl text-white leading-none">
                  Free Fire{" "}
                  <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-300 bg-clip-text text-transparent drop-shadow-sm">
                    Bangladesh
                  </span>{" "}
                  Top-Up
                </h1>

                <p className="text-base sm:text-lg leading-relaxed text-slate-300 max-w-2xl mx-auto lg:mx-0">
                  Fast, reliable, and automated Free Fire diamond top-ups & membership passes.
                  Instant delivery directly to your In-Game Player UID with NPR wallet checkout.
                </p>

                {/* Hero Stats Pill Row */}
                <div className="py-2 flex flex-wrap justify-center lg:justify-start gap-4 text-xs font-semibold text-slate-300">
                  <div className="flex items-center gap-2 rounded-xl bg-slate-900/80 px-3.5 py-2 border border-slate-800 backdrop-blur-sm">
                    <span className="text-base">💎</span>
                    <span>100% Direct UID Credit</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-slate-900/80 px-3.5 py-2 border border-slate-800 backdrop-blur-sm">
                    <span className="text-base">⚡</span>
                    <span>Automated Supplier Dispatch</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-slate-900/80 px-3.5 py-2 border border-slate-800 backdrop-blur-sm">
                    <span className="text-base">🇳🇵</span>
                    <span>Best NPR (Rs.) Rates</span>
                  </div>
                </div>

                {/* Call To Action Buttons */}
                <div className="pt-2 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
                  {isLoggedIn ? (
                    <Link
                      href="/dashboard/topup/free-fire"
                      className={cn(
                        buttonVariants({ size: "lg" }),
                        "h-13 bg-gradient-to-r from-emerald-500 to-teal-600 px-8 text-base text-white shadow-xl shadow-emerald-500/25 transition-all hover:from-emerald-600 hover:to-teal-700 hover:shadow-2xl hover:shadow-emerald-500/35 font-extrabold rounded-xl"
                      )}
                    >
                      Free Fire Top Up Catalogue →
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/register"
                        className={cn(
                          buttonVariants({ size: "lg" }),
                          "h-13 bg-gradient-to-r from-emerald-500 to-teal-600 px-8 text-base text-white shadow-xl shadow-emerald-500/25 transition-all hover:from-emerald-600 hover:to-teal-700 hover:shadow-2xl hover:shadow-emerald-500/35 font-extrabold rounded-xl"
                        )}
                      >
                        Create Free Account
                      </Link>
                      <Link
                        href="/login"
                        className={cn(
                          buttonVariants({ variant: "outline", size: "lg" }),
                          "h-13 px-8 text-base font-bold border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white rounded-xl"
                        )}
                      >
                        Sign In
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* Right Column: High-End Gaming Showcase Card */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative group max-w-md w-full overflow-hidden rounded-3xl border border-emerald-500/40 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-3 shadow-2xl transition-all duration-500 hover:border-emerald-500/80 hover:shadow-emerald-500/20 hover:-translate-y-1">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-slate-800">
                    <img
                      src="/images/free-fire-banner.jpg"
                      alt="Free Fire Bangladesh Top Up"
                      className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

                    <Badge className="absolute top-4 right-4 bg-emerald-500 text-white font-extrabold text-xs px-3 py-1 shadow-lg border-0">
                      OFFICIAL CATALOGUE
                    </Badge>

                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        Featured Game
                      </div>
                      <div className="text-2xl font-black drop-shadow-md tracking-tight">
                        Free Fire Bangladesh
                      </div>
                    </div>
                  </div>

                  <div className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-slate-400 font-medium">Starting From</div>
                      <div className="text-xl font-black text-emerald-400 tracking-tight">
                        Rs. 30.00 <span className="text-xs font-normal text-slate-400">(25 Diamonds)</span>
                      </div>
                    </div>

                    <Link
                      href={isLoggedIn ? "/dashboard/topup/free-fire" : "/login"}
                      className={cn(
                        buttonVariants({ size: "default" }),
                        "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold shadow-md px-5 rounded-xl"
                      )}
                    >
                      {isLoggedIn ? "Top Up Now" : "Sign In to Top Up"}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-t border-border/50 bg-muted/30 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center space-y-2">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold text-xs">
                PLATFORM ADVANTAGES
              </Badge>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Why Top Up with {APP_NAME}?
              </h2>
              <p className="text-base text-muted-foreground">
                Built specifically for gamers in Nepal seeking instant, transparent Free Fire top-ups.
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all duration-300 hover:border-emerald-500/40 hover:shadow-xl hover:-translate-y-1"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h3 className="mt-4 text-lg font-extrabold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-950 border border-emerald-500/30 px-8 py-16 text-center shadow-2xl sm:px-16 text-white">
              <div className="relative z-10 space-y-4">
                <Badge className="bg-emerald-500 text-white font-bold text-xs px-3 py-1">
                  GET STARTED IN SECONDS
                </Badge>
                <h2 className="text-3xl font-black sm:text-4xl">
                  Ready to Top Up Your Free Fire Account?
                </h2>
                <p className="mx-auto max-w-xl text-base text-slate-300">
                  {isLoggedIn
                    ? "Go straight to the catalogue, enter your UID, and pay instantly from your wallet."
                    : "Create your account, fund your wallet, and start topping up your Free Fire account instantly."}
                </p>
                <div className="pt-4">
                  {isLoggedIn ? (
                    <Link
                      href="/dashboard/topup/free-fire"
                      className={cn(
                        buttonVariants({ size: "lg" }),
                        "bg-gradient-to-r from-emerald-500 to-teal-600 px-8 text-base font-extrabold text-white shadow-xl hover:from-emerald-600 hover:to-teal-700 rounded-xl"
                      )}
                    >
                      Free Fire Top Up Catalogue →
                    </Link>
                  ) : (
                    <Link
                      href="/register"
                      className={cn(
                        buttonVariants({ size: "lg" }),
                        "bg-gradient-to-r from-emerald-500 to-teal-600 px-8 text-base font-extrabold text-white shadow-xl hover:from-emerald-600 hover:to-teal-700 rounded-xl"
                      )}
                    >
                      Create Free Account Now
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

const features = [
  {
    title: "Instant Automated Delivery",
    description:
      "Top-ups are processed and dispatched automatically to your Free Fire Player UID with live status updates.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    title: "NPR Wallet Checkout",
    description:
      "Fund your wallet once and top up seamlessly in Nepalese Rupees (Rs.). Includes an immutable ledger for full transaction transparency.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
      </svg>
    ),
  },
  {
    title: "Guaranteed Refund Protection",
    description:
      "If a supplier command fails or cannot be delivered, your wallet is automatically refunded with zero penalty.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
];
