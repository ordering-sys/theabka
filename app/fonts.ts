import { Inter, Kantumruy_Pro, Moul, Playfair_Display } from "next/font/google";

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter-face",
  display: "swap",
});

export const kantumruy = Kantumruy_Pro({
  subsets: ["khmer", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-kantumruy-face",
  display: "swap",
});

// Decorative Khmer titles only.
export const moul = Moul({
  subsets: ["khmer"],
  weight: "400",
  variable: "--font-moul-face",
  display: "swap",
});

// English invitation titles.
export const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair-face",
  display: "swap",
});

export const fontVariables = [inter, kantumruy, moul, playfair]
  .map((f) => f.variable)
  .join(" ");
