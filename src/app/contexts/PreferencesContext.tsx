"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Preferences = {
  locale: string;
  currency: string;
  setLocale: (l: string) => void;
  setCurrency: (c: string) => void;
};

const defaultLocale = "fr-FR";
const defaultCurrency = "EUR";

const PreferencesContext = createContext<Preferences | undefined>(undefined);

export const PreferencesProvider = ({ children }: { children: React.ReactNode }) => {
  const [locale, setLocaleState] = useState<string>(() => {
    try {
      return (localStorage.getItem("locale") as string) || defaultLocale;
    } catch {
      return defaultLocale;
    }
  });
  const [currency, setCurrencyState] = useState<string>(() => {
    try {
      return (localStorage.getItem("currency") as string) || defaultCurrency;
    } catch {
      return defaultCurrency;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("locale", locale);
    } catch {}
  }, [locale]);

  useEffect(() => {
    try {
      localStorage.setItem("currency", currency);
    } catch {}
  }, [currency]);

  const setLocale = (l: string) => {
    setLocaleState(l);
    try { localStorage.setItem('locale', l); } catch {}
    try { window.dispatchEvent(new CustomEvent('preferences:localeChanged', { detail: { locale: l } })); } catch {}
  };

  const setCurrency = (c: string) => {
    setCurrencyState(c);
    try { localStorage.setItem('currency', c); } catch {}
    try { window.dispatchEvent(new CustomEvent('preferences:currencyChanged', { detail: { currency: c } })); } catch {}
  };

  // Listen for external preference change events and storage events (cross-tab / server-driven)
  React.useEffect(() => {
    const onCurrencyChanged = (e: any) => {
      try {
        const newCurrency = (e?.detail?.currency ?? null) as string | null;
        if (newCurrency) setCurrencyState(prev => prev === newCurrency ? prev : String(newCurrency));
      } catch (err) {
        // ignore
      }
    };
    const onLocaleChanged = (e: any) => {
      try {
        const newLocale = (e?.detail?.locale ?? null) as string | null;
        if (newLocale) setLocaleState(prev => prev === newLocale ? prev : String(newLocale));
      } catch (err) {}
    };

    const onStorage = (e: StorageEvent) => {
      try {
        if (e.key === 'currency' && e.newValue) {
          setCurrencyState(prev => prev === e.newValue ? prev : e.newValue);
        }
        if (e.key === 'locale' && e.newValue) {
          setLocaleState(prev => prev === e.newValue ? prev : e.newValue);
        }
      } catch (err) {}
    };

    window.addEventListener('preferences:currencyChanged', onCurrencyChanged as EventListener);
    window.addEventListener('preferences:localeChanged', onLocaleChanged as EventListener);
    window.addEventListener('storage', onStorage as EventListener);

    return () => {
      window.removeEventListener('preferences:currencyChanged', onCurrencyChanged as EventListener);
      window.removeEventListener('preferences:localeChanged', onLocaleChanged as EventListener);
      window.removeEventListener('storage', onStorage as EventListener);
    };
  }, []);

  return (
    <PreferencesContext.Provider value={{ locale, currency, setLocale, setCurrency }}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
};

export const LANGUAGE_OPTIONS: { label: string; value: string }[] = [
  { label: "Français", value: "fr-FR" },
  { label: "English (US)", value: "en-US" },
  { label: "Español", value: "es-ES" },
];

export const CURRENCY_OPTIONS: { label: string; value: string }[] = [
  { label: "Euro (EUR)", value: "EUR" },
  { label: "Franc CFA (XOF)", value: "XOF" },
  { label: "US Dollar (USD)", value: "USD" },
  { label: "Livre (GBP)", value: "GBP" },
];
