import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Conflict Resolver",
  description: "Merge conflict resolution dashboard powered by IBM Bob",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-text-primary font-sans">
        <Navbar />
        <main className="flex-1 max-w-screen-2xl mx-auto w-full px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
