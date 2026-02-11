import React, { createContext, useState, useContext, useEffect } from 'react';
import { zhCN, enUS } from '../locales';

type Language = 'zh-CN' | 'en-US';
type Translations = typeof zhCN;

// Helper function to access nested properties by dot notation
function getNestedValue(obj: any, path: string): string {
    let res = ''
    return path.split('.').reduce((prev, curr) => {
        return prev ? prev[curr] : null;
    }, obj) || path;
}

interface I18nContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: Translations;
    $l: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
    language: 'en-US',
    setLanguage: () => {},
    t: enUS,
    $l: (key: string) => key,
});
const LANGUAGE_KEY = 'seedance_language';
export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>(() => {
        const saved = localStorage.getItem(LANGUAGE_KEY);
        return (saved === 'zh-CN' || saved === 'en-US') ? saved : 'en-US';
    });

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem(LANGUAGE_KEY, lang);
    };

    const t = language === 'zh-CN' ? zhCN : enUS;
    const $l = (key: string) => {
        const v = t[key]
        if (typeof v === 'string') {
            return v;
        }
        return getNestedValue(t, key);
    };

    return (
        <I18nContext.Provider value={{ language, setLanguage, t, $l }}>
            {children}
        </I18nContext.Provider>
    );
};

export const useI18n = () => useContext(I18nContext);
