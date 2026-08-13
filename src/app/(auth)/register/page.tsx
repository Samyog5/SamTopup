import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create a SamTopup account to start topping up your Free Fire account.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
