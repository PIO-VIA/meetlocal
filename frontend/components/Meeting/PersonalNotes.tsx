'use client';

import { useState, useEffect } from 'react';
import { Download, StickyNote } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/contexts/ToastContext';

interface PersonalNotesProps {
    roomId: string;
}

export default function PersonalNotes({ roomId }: PersonalNotesProps) {
    const { t } = useTranslation();
    const toast = useToast();
    const [notes, setNotes] = useState('');

    // Charger les notes (persistantes par chambre)
    useEffect(() => {
        const savedNotes = localStorage.getItem(`meetlocal_notes_${roomId}`);
        if (savedNotes) {
            setNotes(savedNotes);
        }
    }, [roomId]);

    // Sauvegarder les changements
    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newNotes = e.target.value;
        setNotes(newNotes);
        localStorage.setItem(`meetlocal_notes_${roomId}`, newNotes);
    };

    // Exporter en .txt
    const handleExport = () => {
        if (!notes.trim()) {
            toast.warning(t('notes.empty_export'));
            return;
        }

        const blob = new Blob([notes], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `notes_meeting_${roomId}.txt`;
        document.body.appendChild(a);
        a.click();

        // Nettoyage
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 pt-2 sm:pt-4">
            <div className="px-4 pb-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-gray-900 dark:text-white font-semibold flex items-center gap-2">
                    <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-lg">
                        <StickyNote size={18} />
                    </div>
                    {t('notes.title')}
                </h3>
                <button
                    onClick={handleExport}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1"
                    title={t('notes.export')}
                >
                    <Download size={18} />
                </button>
            </div>

            <div className="flex-1 p-3">
                <textarea
                    value={notes}
                    onChange={handleNotesChange}
                    placeholder={t('notes.placeholder')}
                    className="w-full h-full p-3 resize-none bg-yellow-50/50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                />
            </div>
        </div>
    );
}
