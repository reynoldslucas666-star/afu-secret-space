import type { Metadata } from "next";
import localFont from "next/font/local";
import { VT323 } from "next/font/google";
import "./globals.css";

/** Pixel CRT stack — closest legal webfont to kaisermann.me’s “VCR OSD Mono”. */
const vcrLike = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vcr",
  display: "swap",
});

/** Chinese pixel font — FZXIANGSU12 (方正像素12). */
const fontZh = localFont({
  src: "../public/fonts/FZXIANGSU12.ttf",
  variable: "--font-zh",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Afu's secret space",
  description:
    "VHS/CRT portfolio — Liu Nengfu (Afu), filmmaker exploring AIGC product & lens-based work at the Beijing Film Academy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${vcrLike.variable} ${fontZh.variable} h-full`}>
      <body className="min-h-dvh overflow-x-hidden antialiased">{children}</body>
    </html>
  );
}
