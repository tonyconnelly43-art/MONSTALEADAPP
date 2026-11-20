import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { ProspectsProvider } from "@/components/ProspectsProvider";

export const metadata: Metadata = {
  title: "MONSTA Lead Hunter",
  description: "Find and qualify home-service businesses for Monsta Media & Design.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <ProspectsProvider>
          <Header />
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
        </ProspectsProvider>
      </body>
    </html>
  );
}
