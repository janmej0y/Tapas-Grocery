"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { LanguageProvider } from "@/components/language-provider";
import { StoreProvider } from "@/components/store-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <LanguageProvider>
        <StoreProvider>
          {children}
          <Toaster position="top-right" toastOptions={{ duration: 2800 }} />
        </StoreProvider>
      </LanguageProvider>
    </SessionProvider>
  );
}
