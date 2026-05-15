import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Funk Lab",
  description:
    "Home of the Brasilian Funk Community",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-[var(--funk-border)] py-6 text-center text-sm text-zinc-500">
            <span className="text-[var(--funk-yellow)] font-bold">Funk Lab</span>{" "}
            © {new Date().getFullYear()} · Join the Funk Community
          </footer>
        </Providers>
      </body>
    </html>
  );
}
