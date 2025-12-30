'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .use(resourcesToBackend((language: string, namespace: string) => import(`../locales/${language}/${namespace}.json`)))
    .init({
        fallbackLng: 'fr',
        supportedLngs: ['fr', 'en'],
        defaultNS: 'common',
        interpolation: {
            escapeValue: false, // React handles XSS
        },
        detection: {
            order: ['queryString', 'cookie', 'localStorage', 'navigator'],
            caches: ['localStorage'],
        },
        react: {
            useSuspense: false, // Avoid suspense for now to prevent hydration issues if data isn't ready
        },
    });

export default i18n;
