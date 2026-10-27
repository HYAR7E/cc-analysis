import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PDF CC Tracker",
  description: "Credit card statement ingest and spending analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <header className="border-b border-black/10 dark:border-white/10">
          <nav className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
            <Link href="/" className="font-semibold">
              PDF CC Tracker
            </Link>
            <div className="flex gap-4 text-sm">
              <Link href="/" className="hover:underline">
                Dashboard
              </Link>
              <Link href="/upload" className="hover:underline">
                Upload
              </Link>
              <Link href="/files" className="hover:underline">
                Files
              </Link>
              <Link href="/categories" className="hover:underline">
                Categories
              </Link>
              <Link href="/yearly" className="hover:underline">
                Yearly report
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
