import type { NextAuthConfig } from "next-auth";

export type UserRole = "USER" | "ADMIN";

declare module "next-auth" {
  interface User {
    role?: UserRole;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      name?: string | null;
      email: string;
      image?: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
  }
}

/**
 * Check if an email address matches the configured admin email(s).
 */
export function isEmailAdmin(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  const adminEmails = (process.env.ADMIN_EMAIL ?? process.env.ADMIN_EMAILS ?? "")
    .toLowerCase()
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  return adminEmails.includes(normalized);
}

/**
 * Auth.js base configuration.
 *
 * Minimal and edge-compatible so it can be used in proxy.ts.
 * Providers and database adapter are configured in auth.ts.
 */
export const authConfig = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "samtopup_secret_key_development_2026_replace_in_production",
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        const email = user.email ?? token.email;
        if (isEmailAdmin(email)) {
          token.role = "ADMIN";
        } else {
          token.role = (user.role as UserRole) ?? "USER";
        }
      } else if (token.email && isEmailAdmin(token.email)) {
        token.role = "ADMIN";
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = isEmailAdmin(token.email) ? "ADMIN" : (token.role ?? "USER");
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      // Protected routes: dashboard
      if (pathname.startsWith("/dashboard")) {
        return isLoggedIn;
      }

      // Protected routes: admin (requires ADMIN role or matching admin email)
      if (pathname.startsWith("/admin")) {
        if (!isLoggedIn) return false;
        const role = auth?.user?.role;
        const email = auth?.user?.email;
        return role === "ADMIN" || isEmailAdmin(email);
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

