'use client';

import { useState, useRef, useEffect } from 'react';
import { Smile, Hand, PartyPopper, Heart, ThumbsUp, ThumbsDown, UserPlus, Sparkles } from 'lucide-react';

interface ReactionsProps {
    onReaction: (emoji: string) => void;
    onRaiseHand: () => void;
    isHandRaised: boolean;
}

export default function Reactions({ onReaction, onRaiseHand, isHandRaised }: ReactionsProps) {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const emojis = ['👍', '👎', '👏', '🎉', '❤️', '😂', '😮', '🤔', '😢'];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2.5 sm:p-3.5 rounded-full bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 transition-all text-white"
                title="Réactions"
            >
                <Smile size={18} className="sm:w-[22px] sm:h-[22px]" />
            </button>

            {/* Emoji Picker */}
            {showEmojiPicker && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-2 min-w-[280px] animate-scale-in">
                    <div className="grid grid-cols-5 gap-1 mb-2">
                        {emojis.map((emoji) => (
                            <button
                                key={emoji}
                                onClick={() => {
                                    onReaction(emoji);
                                    setShowEmojiPicker(false);
                                }}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-xl transition-transform hover:scale-125"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between items-center px-1">
                        <button
                            onClick={() => {
                                onRaiseHand();
                                setShowEmojiPicker(false);
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors font-medium text-sm ${isHandRaised
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                        >
                            <Hand size={16} className={isHandRaised ? 'fill-current' : ''} />
                            {isHandRaised ? 'Baisser la main' : 'Lever la main'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
