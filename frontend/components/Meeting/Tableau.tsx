'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Download, Trash2, ClipboardList, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/contexts/ToastContext';
import type { Socket } from 'socket.io-client';

interface TableauProps {
    socket: Socket | null;
    roomId: string;
    isAdmin: boolean;
}

export default function Tableau({ socket, roomId, isAdmin }: TableauProps) {
    const { t } = useTranslation();
    const toast = useToast();
    const [content, setContent] = useState('');
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── On mount: request the current state from the server ──
    useEffect(() => {
        if (!socket) return;

        socket.emit('tableau:getState', { roomId });

        const onState = ({ content }: { content: string }) => {
            setContent(content);
        };

        const onUpdate = ({ content }: { content: string }) => {
            setContent(content);
        };

        socket.on('tableau:state', onState);
        socket.on('tableau:update', onUpdate);

        return () => {
            socket.off('tableau:state', onState);
            socket.off('tableau:update', onUpdate);
        };
    }, [socket, roomId]);

    // ── Admin typing: debounce 300 ms before emitting ──
    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const value = e.target.value;
            setContent(value);

            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            debounceTimer.current = setTimeout(() => {
                socket?.emit('tableau:update', { roomId, content: value });
            }, 300);
        },
        [socket, roomId]
    );

    // ── Admin clear ──
    const handleClear = () => {
        if (!socket) return;
        socket.emit('tableau:clear', { roomId });
        // Optimistic local update
        setContent('');
    };

    // ── Export as .txt ──
    const handleExport = () => {
        if (!content.trim()) {
            toast.warning(t('tableau.empty_export'));
            return;
        }
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tableau_${roomId}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 pt-2 sm:pt-4">
            {/* ── Header ── */}
            <div className="px-4 pb-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <h3 className="text-gray-900 dark:text-white font-semibold flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                        <ClipboardList size={18} />
                    </div>
                    {t('tableau.title')}
                    {!isAdmin && (
                        <span className="ml-1 text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full flex items-center gap-1">
                            <Lock size={10} />
                            {t('tableau.read_only')}
                        </span>
                    )}
                </h3>

                <div className="flex items-center gap-1">
                    {/* Export: available to everyone */}
                    <button
                        onClick={handleExport}
                        title={t('tableau.export')}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <Download size={18} />
                    </button>

                    {/* Clear: admin only */}
                    {isAdmin && (
                        <button
                            onClick={handleClear}
                            title={t('tableau.clear')}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Text area ── */}
            <div className="flex-1 p-3 min-h-0">
                <textarea
                    value={content}
                    onChange={isAdmin ? handleChange : undefined}
                    readOnly={!isAdmin}
                    placeholder={
                        isAdmin
                            ? t('tableau.placeholder_admin')
                            : t('tableau.placeholder_viewer')
                    }
                    className={`w-full h-full p-3 resize-none rounded-xl border text-sm leading-relaxed
                        bg-blue-50/40 dark:bg-gray-900
                        border-gray-200 dark:border-gray-700
                        text-gray-800 dark:text-gray-100
                        placeholder-gray-400 dark:placeholder-gray-500
                        focus:outline-none focus:ring-2 focus:ring-blue-500
                        transition-colors
                        ${!isAdmin ? 'cursor-default select-text opacity-90' : ''}
                    `}
                />
            </div>

            {/* ── Footer hint ── */}
            {isAdmin && (
                <div className="px-4 pb-3 text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                    {t('tableau.admin_hint')}
                </div>
            )}
        </div>
    );
}
