'use client';

import { useState, useEffect } from 'react';
import {
    X,
    ChevronRight,
    ChevronLeft,
    Plus,
    Users,
    Hash,
    Copy,
    Shuffle,
    LogIn,
    Mic,
    MicOff,
    Video,
    VideoOff,
    Monitor,
    MessageCircle,
    StickyNote,
    PhoneOff,
    Check,
    Sparkles
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface OnboardingModalProps {
    onClose: () => void;
}

export default function OnboardingModal({ onClose }: OnboardingModalProps) {
    const [step, setStep] = useState(0);
    const [visible, setVisible] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        // Animate in
        const timer = setTimeout(() => setVisible(true), 50);
        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 300);
    };

    const handleFinish = () => {
        localStorage.setItem('meetlocal_onboarding_done', '1');
        handleClose();
    };

    const steps = [
        {
            id: 'home',
            title: t('onboarding.step1.title'),
            subtitle: t('onboarding.step1.subtitle'),
            content: <HomeStep />,
        },
        {
            id: 'room',
            title: t('onboarding.step2.title'),
            subtitle: t('onboarding.step2.subtitle'),
            content: <RoomStep />,
        },
    ];

    const current = steps[step];

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${visible ? 'opacity-100' : 'opacity-0'
                }`}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div
                className={`relative w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${visible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
                    }`}
            >
                {/* Gradient header bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

                {/* Header */}
                <div className="flex items-start justify-between p-5 sm:p-6 pb-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0">
                            <Sparkles size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                                {current.title}
                            </h2>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                {current.subtitle}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Step indicators */}
                <div className="flex items-center justify-center gap-2 mt-4 px-6">
                    {steps.map((s, i) => (
                        <button
                            key={s.id}
                            onClick={() => setStep(i)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === step
                                    ? 'w-8 bg-blue-500'
                                    : i < step
                                        ? 'w-4 bg-blue-300 dark:bg-blue-700'
                                        : 'w-4 bg-gray-200 dark:bg-gray-700'
                                }`}
                            aria-label={`Step ${i + 1}`}
                        />
                    ))}
                </div>

                {/* Content */}
                <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-4 overflow-y-auto max-h-[65vh]">
                    <div
                        key={step}
                        className="animate-fade-in"
                    >
                        {current.content}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <button
                        onClick={() => setStep(s => s - 1)}
                        disabled={step === 0}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-0 disabled:pointer-events-none"
                    >
                        <ChevronLeft size={16} />
                        {t('onboarding.prev')}
                    </button>

                    <span className="text-xs text-gray-400 dark:text-gray-500">
                        {step + 1} / {steps.length}
                    </span>

                    {step < steps.length - 1 ? (
                        <button
                            onClick={() => setStep(s => s + 1)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                        >
                            {t('onboarding.next')}
                            <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={handleFinish}
                            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium rounded-lg transition-all shadow-sm shadow-blue-500/30"
                        >
                            <Check size={16} />
                            {t('onboarding.finish')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ───────────── STEP 1: Home page ───────────── */
function HomeStep() {
    const { t } = useTranslation();

    const sections = [
        {
            icon: <Plus size={18} className="text-blue-600 dark:text-blue-400" />,
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            border: 'border-blue-200 dark:border-blue-800',
            title: t('onboarding.step1.create.title'),
            desc: t('onboarding.step1.create.desc'),
            details: [
                { icon: <span className="text-base">✍️</span>, text: t('onboarding.step1.create.name') },
                { icon: <span className="text-base">🏷️</span>, text: t('onboarding.step1.create.meeting_name') },
                { icon: <span className="text-base">🚀</span>, text: t('onboarding.step1.create.launch') },
            ],
        },
        {
            icon: <Hash size={18} className="text-purple-600 dark:text-purple-400" />,
            bg: 'bg-purple-50 dark:bg-purple-900/20',
            border: 'border-purple-200 dark:border-purple-800',
            title: t('onboarding.step1.code.title'),
            desc: t('onboarding.step1.code.desc'),
            details: [
                {
                    icon: <Shuffle size={14} className="text-purple-500" />,
                    text: t('onboarding.step1.code.generate'),
                },
                {
                    icon: <Copy size={14} className="text-purple-500" />,
                    text: t('onboarding.step1.code.copy'),
                },
            ],
            preview: (
                <div className="mt-3 flex items-center gap-2 p-2.5 bg-white dark:bg-gray-800 rounded-lg border border-purple-100 dark:border-purple-800/50">
                    <code className="flex-1 text-sm font-mono text-purple-700 dark:text-purple-300">
                        ax3k9b
                    </code>
                    <button className="p-1.5 rounded bg-purple-100 dark:bg-purple-800/50 text-purple-600 dark:text-purple-300">
                        <Copy size={12} />
                    </button>
                    <button className="p-1.5 rounded bg-purple-100 dark:bg-purple-800/50 text-purple-600 dark:text-purple-300">
                        <Shuffle size={12} />
                    </button>
                </div>
            ),
        },
        {
            icon: <LogIn size={18} className="text-green-600 dark:text-green-400" />,
            bg: 'bg-green-50 dark:bg-green-900/20',
            border: 'border-green-200 dark:border-green-800',
            title: t('onboarding.step1.join.title'),
            desc: t('onboarding.step1.join.desc'),
            details: [
                { icon: <span className="text-base">🔢</span>, text: t('onboarding.step1.join.enter_code') },
                { icon: <span className="text-base">📋</span>, text: t('onboarding.step1.join.active_list') },
            ],
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {sections.map((s, i) => (
                <div
                    key={i}
                    className={`rounded-xl border p-4 ${s.bg} ${s.border}`}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1.5 rounded-lg bg-white dark:bg-gray-800 shadow-sm`}>
                            {s.icon}
                        </div>
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-white">{s.title}</h3>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{s.desc}</p>
                    <ul className="space-y-1.5">
                        {s.details.map((d, j) => (
                            <li key={j} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                                <span className="flex-shrink-0">{d.icon}</span>
                                <span>{d.text}</span>
                            </li>
                        ))}
                    </ul>
                    {s.preview}
                </div>
            ))}
        </div>
    );
}

/* ───────────── STEP 2: Room page ───────────── */
function RoomStep() {
    const { t } = useTranslation();

    const controls = [
        {
            icons: [<Mic key="on" size={16} className="text-green-500" />, <MicOff key="off" size={16} className="text-red-400" />],
            label: t('onboarding.step2.controls.mic'),
            color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
        },
        {
            icons: [<Video key="on" size={16} className="text-blue-500" />, <VideoOff key="off" size={16} className="text-red-400" />],
            label: t('onboarding.step2.controls.camera'),
            color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
        },
        {
            icons: [<Monitor key="share" size={16} className="text-indigo-500" />],
            label: t('onboarding.step2.controls.screen'),
            color: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
        },
        {
            icons: [<PhoneOff key="leave" size={16} className="text-red-500" />],
            label: t('onboarding.step2.controls.leave'),
            color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
        },
    ];

    const panels = [
        {
            icon: <Users size={15} className="text-blue-500" />,
            title: t('onboarding.step2.panels.participants.title'),
            desc: t('onboarding.step2.panels.participants.desc'),
            color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
        },
        {
            icon: <MessageCircle size={15} className="text-purple-500" />,
            title: t('onboarding.step2.panels.chat.title'),
            desc: t('onboarding.step2.panels.chat.desc'),
            color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
        },
        {
            icon: <StickyNote size={15} className="text-amber-500" />,
            title: t('onboarding.step2.panels.notes.title'),
            desc: t('onboarding.step2.panels.notes.desc'),
            color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
        },
    ];

    return (
        <div className="space-y-4">
            {/* Controls section */}
            <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                    {t('onboarding.step2.controls_title')}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {controls.map((c, i) => (
                        <div key={i} className={`rounded-xl border p-3 text-center ${c.color}`}>
                            <div className="flex items-center justify-center gap-1 mb-1.5">
                                {c.icons.map((ic, j) => (
                                    <span key={j} className="p-1.5 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                                        {ic}
                                    </span>
                                ))}
                            </div>
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{c.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Panels section */}
            <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                    {t('onboarding.step2.panels_title')}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {panels.map((p, i) => (
                        <div key={i} className={`rounded-xl border p-3 flex items-start gap-2.5 ${p.color}`}>
                            <div className="p-1.5 rounded-lg bg-white dark:bg-gray-800 shadow-sm flex-shrink-0 mt-0.5">
                                {p.icon}
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-800 dark:text-white">{p.title}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{p.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tip banner */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/50">
                <span className="text-base flex-shrink-0 mt-0.5">💡</span>
                <p className="text-xs text-gray-700 dark:text-gray-300">
                    {t('onboarding.step2.tip')}
                </p>
            </div>
        </div>
    );
}
