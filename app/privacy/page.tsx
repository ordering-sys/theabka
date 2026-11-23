import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { privacyContent } from "@/components/legal/content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What information TheabKa collects, including Google sign-in data, how it is used, and your choices.",
};

export default function PrivacyPage() {
  return <LegalPage kind="privacy" content={privacyContent} />;
}
