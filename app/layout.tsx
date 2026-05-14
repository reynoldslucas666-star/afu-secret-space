import type { Metadata } from "next";
import { VT323 } from "next/font/google";
import "./globals.css";

/** Pixel CRT stack — closest legal webfont to kaisermann.me’s “VCR OSD Mono”. */
const vcrLike = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vcr",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Afu Archive — Liu Nengfu",
  description: "VHS/CRT portfolio — filmmaker & AIGC product intern at the Beijing Film Academy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${vcrLike.variable} h-full`}>
      <body className="min-h-dvh overflow-x-hidden antialiased">{children}</body>
    </html>
  );
}
