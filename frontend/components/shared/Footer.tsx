'use client';

import React from 'react';
import { Heart, Github, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Footer = () => {
    const currentYear = new Date().getFullYear();
    const { t } = useTranslation();

    return (
        <footer className="w-full py-6 mt-12 border-t border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">

                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span>{t('footer.rights', { year: currentYear })}</span>
                        <span className="hidden md:inline">•</span>
                        <span className="flex items-center gap-1">
                            {t('footer.made_with')} <Heart size={14} className="text-red-500 fill-red-500" /> {t('footer.by')}
                        </span>
                    </div>

                    <div className="flex items-center gap-6">
                        <a
                            href="https://github.com/PIO-VIA/meetlocal"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors flex items-center gap-2 text-sm"
                        >
                            <Github size={18} />
                            <span className="hidden sm:inline">GitHub</span>
                        </a>
                        <a
                            href="#"
                            className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors flex items-center gap-2 text-sm"
                        >
                            <Globe size={18} />
                            <span className="hidden sm:inline">{t('footer.website')}</span>
                        </a>
                    </div>

                </div>
            </div>
        </footer>
    );
};

export default Footer;
