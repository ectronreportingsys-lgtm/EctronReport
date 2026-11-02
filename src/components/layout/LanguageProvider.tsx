'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import clsx from 'clsx';
import { arabicTranslations } from '@/lib/translations';

export type Language = 'en' | 'ar';

interface LanguageContextType {
  lang: Language;
  toggleLang: () => void;
  setLang: (lang: Language) => void;
  t: (en: string, ar?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  toggleLang: () => {},
  setLang: () => {},
  t: (en: string, ar?: string) => en,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('en');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ectron-lang') as Language | null;
      if (saved === 'en' || saved === 'ar') {
        setLangState(saved);
        document.documentElement.lang = saved;
      } else {
        setLangState('en');
        document.documentElement.lang = 'en';
      }
    } catch {
      setLangState('en');
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem('ectron-lang', newLang);
      document.documentElement.lang = newLang;
    } catch {}
  };

  const toggleLang = () => {
    const next = lang === 'en' ? 'ar' : 'en';
    setLang(next);
  };

  const t = (en: string, ar?: string): string => {
    if (lang === 'ar') {
      const trimmed = typeof en === 'string' ? en.trim() : en;
      const dictVal = arabicTranslations[en] ?? arabicTranslations[trimmed];

      // 1. إذا كانت القيمة في القاموس مترجمة ومختلفة عن الإنجليزية
      if (dictVal !== undefined && dictVal.trim() !== '' && dictVal !== en && dictVal !== trimmed) {
        return dictVal;
      }

      // 2. إذا توفرت ترجمة عربية ممررة محلياً
      if (ar && ar.trim() !== '') {
        return ar;
      }

      // 3. إذا كانت القيمة في القاموس حتى لو مطابقة للإنجليزية
      if (dictVal !== undefined && dictVal.trim() !== '') {
        return dictVal;
      }
    }
    return en;
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageToggleSwitch() {
  const { lang, toggleLang } = useLanguage();
  const isArabic = lang === 'ar';

  return (
    <button
      type="button"
      onClick={toggleLang}
      role="switch"
      aria-checked={isArabic}
      title={isArabic ? 'Switch to English' : 'التبديل إلى العربية (Switch to Arabic)'}
      className={clsx(
        "relative inline-flex items-center h-9 w-[76px] rounded-full p-1 transition-all duration-300 cursor-pointer border shadow-inner select-none",
        isArabic
          ? "bg-gradient-to-r from-[#173B63] to-[#0F766E] border-[#14B8A6]/40 shadow-[0_2px_10px_rgba(20,184,166,0.25)]"
          : "bg-zinc-900 border-zinc-700 hover:border-zinc-600"
      )}
    >
      {/* Background Labels */}
      <span className="flex items-center justify-between w-full px-2 pointer-events-none text-[11px] font-bold">
        <span
          className={clsx(
            "transition-all duration-300",
            !isArabic ? "text-white opacity-90" : "text-zinc-500 opacity-50"
          )}
        >
          EN
        </span>
        <span
          className={clsx(
            "transition-all duration-300",
            isArabic ? "text-white opacity-90" : "text-zinc-500 opacity-50"
          )}
        >
          عربي
        </span>
      </span>

      {/* Sliding Knob */}
      <span
        className={clsx(
          "absolute top-1 left-1 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 shadow-md text-xs font-bold",
          isArabic
            ? "translate-x-[40px] bg-white text-[#0F766E]"
            : "translate-x-0 bg-gradient-to-tr from-[#1b497f] to-[#00a99d] text-white"
        )}
      >
        {isArabic ? 'ع' : 'EN'}
      </span>
    </button>
  );
}
