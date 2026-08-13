import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your SamTopup account to access Free Fire top-up services.",
};

export default function LoginPage() {
  return <LoginForm />;
}
