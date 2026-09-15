import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Navigation } from "@/components/navigation/navigation";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "ASCEND — Your training. Your career.",
    template: "%s | ASCEND",
  },
  description:
    "Build your player through real-world training. ASCEND Phase 1 visual prototype.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0c0e10",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="topbar">
          <Link href="/" className="brand" aria-label="ASCEND home">
            <svg width="27" height="30" viewBox="0 0 28 30" aria-hidden="true">
              <path
                d="M14 1 27 28 19 25 14 13 9 25 1 28Z M14 20l4 9-4-2-4 2Z"
                fill="currentColor"
              />
            </svg>
            ASCEND
            <span className="brand-divider" />
            <span className="brand-caption">PERSONAL TRAINING FACILITY</span>
          </Link>
          <div className="topbar-status">
            <span className="status-dot" />
            PHASE 01 <span className="prototype-tag">PROTOTYPE</span>
          </div>
        </header>
        <main id="main" className="app-main">
          {children}
        </main>
        <footer className="site-footer">
          <span>REAL EFFORT. LASTING PROGRESS.</span>
          <span>ASCEND // FOUNDATION 01</span>
        </footer>
        <Navigation />
      </body>
    </html>
  );
}
