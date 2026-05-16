"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { productTranslations, translations, type Language } from "@/lib/i18n";

type LanguageContextValue = {
  language: Language;
  t: (key: keyof typeof translations.en) => string;
  productName: (name: string) => string;
  toggleLanguage: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      t: (key) => translations[language][key],
      productName: (name) => (language === "bn" ? productTranslations[name] ?? name : name),
      toggleLanguage: () => setLanguage((current) => (current === "en" ? "bn" : "en"))
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider.");
  }

  return context;
}
