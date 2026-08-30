import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { GAMES } from "@/config/constants";
import { cn } from "@/lib/utils";

export default function TopupSelectionPage() {
  const freeFire = GAMES.FREE_FIRE_BD;

  const upcomingGames = [
    {
      id: "pubg_mobile",
      name: "PUBG Mobile UC",
      region: "Global / Nepal",
      image: "/images/free-fire-banner.jpg", // Fallback banner
      badge: "Coming Soon",
    },
    {
      id: "mobile_legends",
      name: "Mobile Legends Diamonds",
      region: "Global",
      image: "/images/free-fire-banner.jpg",
      badge: "Coming Soon",
    },
  ];

  return (
    <div className="space-y-10">
      {/* Topup Portal Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-slate-900 via-emerald-950/80 to-slate-950 p-8 text-white shadow-2xl">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-400 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Gaming Store Portal
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Select Your Game
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Choose your game to view real-time diamond packages, weekly membership passes, and instant NPR wallet checkout.
          </p>

          <div className="pt-2 flex flex-wrap gap-4 text-xs font-medium text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Instant Automated Delivery
            </span>
            <span className="flex items-center gap-1.5 text-teal-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              100% Secure & Verified
            </span>
          </div>
        </div>
      </div>

      {/* Available Games Catalog Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
          <span>🎮</span> Active Games
        </h2>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Free Fire Bangladesh Featured Card */}
          <Card className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border-emerald-500/30 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/60 hover:shadow-2xl hover:shadow-emerald-500/10">
            <div>
              <div className="relative h-48 w-full overflow-hidden">
                <img
                  src="/images/free-fire-banner.jpg"
                  alt={freeFire.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                <div className="absolute top-3 right-3 flex gap-2">
                  <Badge className="bg-emerald-500 text-white font-bold text-xs shadow-md border-0 px-3 py-1">
                    🔥 Hot & Popular
                  </Badge>
                </div>
                <div className="absolute bottom-3 left-4 right-4">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                    Garena Free Fire
                  </span>
                  <h3 className="text-xl font-extrabold text-white drop-shadow-md">
                    {freeFire.name}
                  </h3>
                </div>
              </div>

              <CardHeader className="pt-3 pb-2">
                <CardDescription className="text-xs sm:text-sm leading-relaxed">
                  {freeFire.description} Instant top-up using Player UID.
                </CardDescription>
              </CardHeader>
            </div>

            <CardContent className="pt-2 pb-5 space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-3">
                <span>Region: <strong className="text-foreground font-semibold">Bangladesh (BD)</strong></span>
                <span>Currency: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">NPR (Rs.)</strong></span>
              </div>

              <Link
                href="/dashboard/topup/free-fire"
                className={cn(
                  buttonVariants({ size: "default" }),
                  "w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-md font-bold text-sm transition-all"
                )}
              >
                Top Up Free Fire Now →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upcoming Games Section */}
      <div className="space-y-4 pt-4 border-t border-border/50">
        <h2 className="text-lg font-bold text-muted-foreground flex items-center gap-2">
          <span>⏳</span> Coming Soon to SamTopup
        </h2>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 opacity-75">
          {upcomingGames.map((game) => (
            <Card key={game.id} className="relative overflow-hidden rounded-2xl border-border/40 bg-card/50 grayscale transition-all hover:grayscale-0 hover:opacity-100">
              <div className="relative h-36 w-full overflow-hidden bg-muted">
                <img
                  src={game.image}
                  alt={game.name}
                  className="h-full w-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                <Badge variant="outline" className="absolute top-3 right-3 bg-background/80 text-muted-foreground text-xs font-semibold">
                  {game.badge}
                </Badge>
              </div>

              <CardHeader className="py-4">
                <CardTitle className="text-base font-bold text-muted-foreground">{game.name}</CardTitle>
                <CardDescription className="text-xs">
                  Region: {game.region} • Adding support soon
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
