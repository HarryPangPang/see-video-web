import React, { createContext, useContext } from 'react';
import { enUS } from '../locales';

type Translations = typeof enUS;

// Helper function to access nested properties by dot notation
function getNestedValue(obj: any, path: string): string {
    return path.split('.').reduce((prev: any, curr) => (prev ? prev[curr] : null), obj) || path;
}

interface I18nContextType {
    language: 'en-US';
    t: Translations;
    $l: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
    language: 'en-US',
    t: enUS,
    $l: (key: string) => key,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const t = enUS;
    const $l = (key: string) => {
        const v = t[key]
        if (typeof v === 'string') {
            return v;
        }
        return getNestedValue(t, key);
    };

    return (
        <I18nContext.Provider value={{ language: 'en-US', t, $l }}>
            {children}
        </I18nContext.Provider>
    );
};

export const useI18n = () => useContext(I18nContext);
