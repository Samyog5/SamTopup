import Link from "next/link";
import Image from "next/image";
import { APP_NAME } from "@/config/constants";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/50 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/images/logo.png"
                alt={`${APP_NAME} Logo`}
                width={28}
                height={28}
                className="h-7 w-7 rounded-md object-contain border border-emerald-500/20 bg-background/50"
              />
              <span className="text-base font-bold">{APP_NAME}</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Fast and reliable Free Fire Bangladesh top-up service.
              Instant delivery at competitive prices.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold">Quick Links</h3>
            <ul className="mt-3 space-y-2">
              {[
                { label: "Home", href: "/" },
                { label: "Top Up", href: "/dashboard/topup/free-fire" },
                { label: "My Orders", href: "/dashboard/orders" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold">Support</h3>
            <ul className="mt-3 space-y-2">
              {[
                { label: "Contact Us", href: "/contact" },
                { label: "FAQ", href: "/faq" },
                { label: "Terms of Service", href: "/terms" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Currency */}
          <div>
            <h3 className="text-sm font-semibold">Payment</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              All transactions in <span className="font-medium text-foreground">NPR (Rs.)</span>
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Wallet-based instant checkout
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-border/50 pt-6">
          <p className="text-center text-xs text-muted-foreground">
            © {currentYear} {APP_NAME}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
