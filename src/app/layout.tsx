import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Bengali } from "next/font/google";
import type { ReactNode } from "react";
import { AppProviders } from "@/components/app-providers";
import { LoginPromptModal } from "@/components/login-prompt-modal";
import { Navbar } from "@/components/navbar";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
});

const bengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-bengali"
});

export const metadata: Metadata = {
  title: "Tapas Grocery Store",
  description: "A modern local e-commerce app for groceries and household essentials.",
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  themeColor: "#047857"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${inter.variable} ${bengali.variable} font-sans antialiased`}>
        <AppProviders>
          <PwaRegister />
          <Navbar />
          <LoginPromptModal />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
