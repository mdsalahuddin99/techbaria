import { create } from "zustand";
import { persist } from "zustand/middleware";
import { translations, type Lang, type TranslationKey } from "./translations";

interface LanguageState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

/** Persisted UI language store. Separate from PosStore so it survives data resets. */
export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      lang: "en",
      setLang: (lang) => set({ lang }),
    }),
    { name: "shopflow-lang-v1" }
  )
);

/** `t("nav.dashboard")` → translated string for the active language. */
export function useT() {
  const lang = useLanguageStore((s) => s.lang);
  return (key: TranslationKey, fallback?: string): string => {
    const entry = translations[key];
    if (!entry) return fallback ?? key;
    return entry[lang] ?? entry.en ?? fallback ?? key;
  };
}

export function useLanguage() {
  return useLanguageStore();
}

/** BCP-47 locale matching the active UI language — for `toLocaleDateString` etc. */
export function useLocale(): string {
  const lang = useLanguageStore((s) => s.lang);
  return lang === "bn" ? "bn-BD" : "en-GB";
}
