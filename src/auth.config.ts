import type { NextAuthConfig } from "next-auth";

/**
 * Auth.js base configuration.
 *
 * This file is kept minimal and edge-compatible so it can be used
 * in proxy.ts (Next.js 16's replacement for middleware.ts).
 *
 * Providers and database adapter are configured in auth.ts.
 */
export const authConfig = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "samtopup_secret_key_development_2026_replace_in_production",
  pages: {
    signIn: "/login",
    // signUp: "/register", // Auth.js doesn't have a built-in signUp page
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      // Protected routes: dashboard
      if (pathname.startsWith("/dashboard")) {
        return isLoggedIn;
      }

      // Protected routes: admin (role check happens in layout, proxy just checks auth)
      if (pathname.startsWith("/admin")) {
        return isLoggedIn;
      }

      // Auth pages: redirect to dashboard if already logged in
      if (pathname === "/login" || pathname === "/register") {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }

      // All other routes are public
      return true;
    },
  },
  providers: [], // Configured in auth.ts
} satisfies NextAuthConfig;
