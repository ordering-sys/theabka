import type { Metadata } from "next";
import { LegalPage } from "@/modules/legal/components/LegalPage";
import { termsContent } from "@/modules/legal/content";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for creating, paying for and sharing TheabKa invitations.",
};

export default function TermsPage() {
  return <LegalPage kind="terms" content={termsContent} />;
}
