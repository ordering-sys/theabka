import type { Metadata, Viewport } from "next";
import { fontVariables } from "./fonts";
import { LanguageProvider } from "@/lib/i18n";
import { ToastProvider } from "@/components/ui/Toast";
import { MotionProvider } from "@/components/motion/Motion";
import "./globals.css";

export const metadata: Metadata = {
  // Absolute base for Open Graph URLs. Set NEXT_PUBLIC_SITE_URL in production.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "ធៀបការ TheabKa: Digital wedding invitations",
    template: "%s · TheabKa",
  },
  description:
    "Create a Khmer and English wedding or engagement invitation, share one link, and collect RSVPs. Pay once by KHQR.",
};

export const viewport: Viewport = {
  themeColor: "#7A1F2B",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="km" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-ivory text-charcoal">
        <LanguageProvider>
          <MotionProvider>
            <ToastProvider>{children}</ToastProvider>
          </MotionProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
