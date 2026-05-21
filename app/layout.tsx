import type { Metadata } from "next";
import { VT323, ZCOOL_QingKe_HuangYou } from "next/font/google";
import "./globals.css";

/** Pixel CRT stack — closest legal webfont to kaisermann.me’s “VCR OSD Mono”. */
const vcrLike = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vcr",
  display: "swap",
});

/** Chinese display — swap for your font pack via --font-zh in globals.css (e.g. public/fonts/*.woff2). */
const fontZh = ZCOOL_QingKe_HuangYou({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-zh",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Afu's secret space",
  description: "VHS/CRT portfolio — Liu Nengfu (Afu), filmmaker & AIGC product intern at the Beijing Film Academy.",
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
