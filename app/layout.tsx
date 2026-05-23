import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Allo Inventory — Reserve & Shop",
  description:
    "Real-time inventory reservation platform for multi-warehouse retail. Reserve products with live stock tracking across all warehouses.",
  keywords: ["inventory", "reservations", "e-commerce", "stock tracking"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <div className="min-h-screen bg-background">
          <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex h-16 items-center justify-between">
                <a href="/" className="flex items-center gap-3 group">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25 transition-all duration-300 group-hover:shadow-violet-500/40 group-hover:scale-105">
                    <svg
                      className="h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                  </div>
                  <div>
                    <span className="text-lg font-bold tracking-tight text-foreground">
                      Allo
                    </span>
                    <span className="text-lg font-light text-muted-foreground">
                      {" "}
                      Inventory
                    </span>
                  </div>
                </a>
                <nav className="flex items-center gap-6">
                  <a
                    href="/"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Products
                  </a>
                  <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                    <span className="text-xs font-medium text-emerald-400">
                      Live Stock
                    </span>
                  </div>
                </nav>
              </div>
            </div>
          </header>
          <main>{children}</main>
        </div>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
