import Link from "next/link";
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
        {/* Hero Section featuring Free Fire Banner Image */}
        <section className="relative overflow-hidden py-16 sm:py-24 lg:py-32">
          {/* Ambient Glows */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/20 via-slate-950/40 to-background dark:from-emerald-950/40 dark:via-slate-950/80 dark:to-background" />
            <div className="absolute right-1/4 top-10 h-[500px] w-[500px] rounded-full bg-emerald-500/15 blur-3xl" />
            <div className="absolute left-1/4 bottom-10 h-[400px] w-[400px] rounded-full bg-teal-500/15 blur-3xl" />
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              {/* Left Column: Hero Text & Dynamic Action Buttons */}
              <div className="space-y-6 lg:col-span-7 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 backdrop-blur-md">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Instant Delivery • Live System
                </div>

                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-foreground">
                  Free Fire{" "}
                  <span className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
                    Bangladesh
                  </span>{" "}
                  Top-Up
                </h1>

                <p className="text-lg leading-relaxed text-muted-foreground sm:text-xl max-w-2xl mx-auto lg:mx-0">
                  Fast, reliable, and affordable diamond top-ups & membership passes for Free Fire.
                  Instant delivery with wallet-based checkout at the best prices in{" "}
                  <span className="font-bold text-foreground">NPR (Rs.)</span>.
                </p>

                {/* Conditional Buttons: Logged In vs Logged Out */}
                <div className="pt-2 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
                  {isLoggedIn ? (
                    <Link
                      href="/dashboard/topup/free-fire"
                      className={cn(
                        buttonVariants({ size: "lg" }),
                        "bg-gradient-to-r from-emerald-500 to-teal-600 px-8 text-base text-white shadow-xl shadow-emerald-500/25 transition-all hover:from-emerald-600 hover:to-teal-700 hover:shadow-2xl hover:shadow-emerald-500/35 font-bold"
                      )}
                    >
                      Free Fire Top Up →
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/register"
                        className={cn(
                          buttonVariants({ size: "lg" }),
                          "bg-gradient-to-r from-emerald-500 to-teal-600 px-8 text-base text-white shadow-xl shadow-emerald-500/25 transition-all hover:from-emerald-600 hover:to-teal-700 hover:shadow-2xl hover:shadow-emerald-500/35 font-bold"
                        )}
                      >
                        Get Started Free
                      </Link>
                      <Link
                        href="/login"
                        className={cn(
                          buttonVariants({ variant: "outline", size: "lg" }),
                          "px-8 text-base font-semibold border-border/80 hover:bg-accent"
                        )}
                      >
                        Sign In
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* Right Column: Free Fire Banner Image Showcase Card */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative group max-w-md w-full overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-card to-muted p-2 shadow-2xl transition-all duration-300 hover:border-emerald-500/60 hover:shadow-emerald-500/20">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
                    <img
                      src="/images/free-fire-banner.jpg"
                      alt="Free Fire Bangladesh Top Up"
                      className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                    <Badge className="absolute top-4 right-4 bg-emerald-500 text-white font-bold text-xs px-3 py-1 shadow-lg">
                      Official Catalogue
                    </Badge>

                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                        Featured Game
                      </div>
                      <div className="text-xl font-extrabold drop-shadow-md">
                        Free Fire Bangladesh
                      </div>
                    </div>
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground font-medium">Starting From</div>
                      <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                        Rs. 30.00 <span className="text-xs font-normal text-muted-foreground">(25 Diamonds)</span>
                      </div>
                    </div>

                    <Link
                      href={isLoggedIn ? "/dashboard/topup/free-fire" : "/login"}
                      className={cn(
                        buttonVariants({ size: "sm" }),
                        "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md"
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
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Why Choose {APP_NAME}?
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                The simplest way to top up your Free Fire account
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-xl border border-border/50 bg-card p-6 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md dark:hover:border-emerald-800"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400">
                    {feature.icon}
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
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
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 px-8 py-16 text-center shadow-2xl sm:px-16">
              <div className="relative z-10">
                <h2 className="text-2xl font-bold text-white sm:text-3xl">
                  Ready to Top Up Free Fire?
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-base text-white/80">
                  {isLoggedIn
                    ? "Go straight to the catalogue, enter your UID, and pay instantly from your wallet."
                    : "Create your account, fund your wallet, and start topping up your Free Fire account instantly."}
                </p>
                <div className="mt-8">
                  {isLoggedIn ? (
                    <Link
                      href="/dashboard/topup/free-fire"
                      className={cn(
                        buttonVariants({ size: "lg" }),
                        "bg-white px-8 text-base font-bold text-emerald-600 shadow-lg hover:bg-white/90 hover:text-emerald-700"
                      )}
                    >
                      Free Fire Top Up →
                    </Link>
                  ) : (
                    <Link
                      href="/register"
                      className={cn(
                        buttonVariants({ size: "lg" }),
                        "bg-white px-8 text-base font-bold text-emerald-600 shadow-lg hover:bg-white/90 hover:text-emerald-700"
                      )}
                    >
                      Create Free Account
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
    title: "Instant Delivery",
    description:
      "Top-ups are processed and delivered to your Free Fire account within minutes through our automated system.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    title: "Wallet System",
    description:
      "Fund your wallet once and top up multiple times. All transactions are tracked with a detailed ledger for transparency.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
      </svg>
    ),
  },
  {
    title: "Best Prices in NPR",
    description:
      "Competitive pricing on all Free Fire packages. Pay in Nepalese Rupees (Rs.) with no hidden fees.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
];
