import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

import { GlobalStateProvider } from "./(main)/context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Base Chat",
  description: "Base Chat powered by Ragie",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SessionProvider>
      <GlobalStateProvider>
        <html lang="en" className="h-full w-full">
          <body className={`${inter.className} antialiased h-full w-full bg-white`}>
            {children}
            <Toaster position="bottom-center" />
          </body>
        </html>
      </GlobalStateProvider>
    </SessionProvider>
  );
}
