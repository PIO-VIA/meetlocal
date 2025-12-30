'use client';

import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
    const { i18n } = useTranslation();

    const toggleLanguage = () => {
        const newLang = i18n.language === 'fr' ? 'en' : 'fr';
        i18n.changeLanguage(newLang);
    };

    return (
        <button
            onClick={toggleLanguage}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-1.5"
            aria-label="Change language"
            title={i18n.language === 'fr' ? 'Switch to English' : 'Passer en français'}
        >
            <Globe size={20} />
            <span className="text-sm font-medium uppercase">{i18n.language}</span>
        </button>
    );
}
