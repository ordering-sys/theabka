import type { Metadata } from "next";
import { SignIn } from "@/modules/auth/components/SignIn";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return <SignIn />;
}
