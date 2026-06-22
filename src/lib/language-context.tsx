"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { loadSettings, saveSettings } from "@/lib/settings";
import { translations, type TranslationKey } from "./translations";

interface LanguageContextProps {
  language: "pt" | "en";
  setLanguage: (lang: "pt" | "en") => void;
  t: (key: TranslationKey, params?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<"pt" | "en">("pt");

  useEffect(() => {
    const settings = loadSettings();
    if (settings && settings.language) {
      setLanguageState(settings.language);
    }
  }, []);

  function setLanguage(lang: "pt" | "en") {
    setLanguageState(lang);
    const currentSettings = loadSettings();
    const updated = { ...currentSettings, language: lang };
    saveSettings(updated);
  }

  function t(key: TranslationKey, params?: Record<string, string>): string {
    const langDict = translations[language] || translations.pt;
    const value = langDict[key];
    if (value === undefined) {
      // Fallback to Portuguese key
      const fallbackValue = translations.pt[key];
      if (fallbackValue === undefined) return String(key);
      return interpolate(fallbackValue, params);
    }
    return interpolate(value, params);
  }

  function interpolate(text: string, params?: Record<string, string>): string {
    if (!params) return text;
    let result = text;
    for (const [k, v] of Object.entries(params)) {
      result = result.replace(new RegExp(`{${k}}`, "g"), String(v));
    }
    return result;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
