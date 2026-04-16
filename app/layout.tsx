import type { Metadata } from "next";
import { Newsreader, Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default:
      "ML Book — Machine Learning and Artificial Intelligence",
    template: "%s — ML Book Reader",
  },
  description:
    "An interactive web reader for 'Machine Learning and Artificial Intelligence: Concepts, Algorithms and Models' by Prof. Reza Rawassizadeh, Boston University.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${inter.variable} h-full`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-full flex flex-col bg-cream-50 text-ink-900 antialiased">
        {/* Site header */}
        <header className="sticky top-0 z-40 bg-cream-50/80 backdrop-blur-md border-b border-ink-500/10">
          <div className="max-w-screen-2xl mx-auto flex items-center justify-between px-6 md:px-8 h-16">
            <Link
              href="/"
              className="font-sans text-[10px] font-bold tracking-[0.3em] text-ink-500 uppercase hover:text-ink-900 transition-colors"
            >
              ML Book
            </Link>
            <nav className="flex items-center gap-6">
              <a
                href="https://github.com/Amith71965/MLBook"
                target="_blank"
                rel="noreferrer"
                className="font-sans text-[10px] font-bold tracking-[0.2em] text-ink-400 uppercase hover:text-ink-900 transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://a.co/d/bT92nVX"
                target="_blank"
                rel="noreferrer"
                className="font-sans text-[10px] font-bold tracking-[0.2em] uppercase bg-ink-900 text-cream-50 px-4 py-1.5 rounded-full hover:opacity-80 transition-opacity"
              >
                Purchase
              </a>
            </nav>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="border-t border-ink-500/10 py-8 px-6 md:px-8">
          <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="font-sans text-[10px] tracking-[0.15em] text-ink-400 uppercase">
              Prof. Reza Rawassizadeh · Boston University
            </p>
            <p className="font-sans text-[10px] tracking-[0.15em] text-ink-400">
              Open-source textbook companion · Built for students
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
