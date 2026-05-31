import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

// Outfit — modern geometric font that feels attractive and refined.
// Highly readable for data-heavy interfaces. Used by premium SaaS products.
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "ChronoSheet — Spreadsheets That Remember",
  description: "ChronoSheet is the intelligent history layer for your spreadsheets. Every change, every reason, every time — preserved forever.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
