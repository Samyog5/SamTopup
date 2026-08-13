import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { GAMES } from "@/config/constants";
import { cn } from "@/lib/utils";

export default function TopupSelectionPage() {
  const freeFire = GAMES.FREE_FIRE_BD;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Game Top-Up</h1>
        <p className="mt-1 text-muted-foreground">
          Select a game to view available diamond packages and membership passes
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Free Fire Bangladesh Card */}
        <Card className="group overflow-hidden border-emerald-500/30 bg-card transition-all hover:border-emerald-500/60 hover:shadow-xl relative flex flex-col justify-between">
          <div>
            <div className="h-36 w-full overflow-hidden relative">
              <img
                src="/images/free-fire-banner.jpg"
                alt={freeFire.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
              <Badge className="absolute top-3 right-3 bg-emerald-500 text-white font-semibold text-xs shadow-md">
                Popular
              </Badge>
            </div>
            <CardHeader className="pt-4">
              <CardTitle className="text-xl font-bold">{freeFire.name}</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                {freeFire.description}
              </CardDescription>
            </CardHeader>
          </div>
          <CardContent className="pt-2 pb-6">
            <Link
              href="/dashboard/topup/free-fire"
              className={cn(
                buttonVariants(),
                "w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-md font-semibold"
              )}
            >
              Select Game & Top Up →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
