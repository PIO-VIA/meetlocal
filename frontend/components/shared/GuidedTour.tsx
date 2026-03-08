'use client';

import {
    useEffect,
    useState,
    useCallback,
    useRef,
    type ReactNode,
} from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

/* ─────────────────────────────────────── types ──────────────────────────── */

export interface TourStep {
    /** data-tour="your-id" attribute on the target element */
    targetId: string;
    title: string;
    description: string | ReactNode;
    /** Where the tooltip appears relative to the highlighted element */
    placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface Rect {
    top: number;
    left: number;
    width: number;
    height: number;
}

interface GuidedTourProps {
    steps: TourStep[];
    onClose: () => void;
    /** Called when the last step is finished */
    onFinish?: () => void;
    labels?: {
        next?: string;
        prev?: string;
        finish?: string;
        skip?: string;
        of?: string;
    };
}

/* ─────────────────────────────────── constants ──────────────────────────── */

const PADDING = 8;           // px around the highlighted element
const TOOLTIP_W = 320;       // max tooltip width
const TOOLTIP_H_APPROX = 170; // rough tooltip height for positioning

/* ─────────────────────────────────── component ──────────────────────────── */

export default function GuidedTour({
    steps,
    onClose,
    onFinish,
    labels = {},
}: GuidedTourProps) {
    const [stepIndex, setStepIndex] = useState(0);
    const [rect, setRect] = useState<Rect | null>(null);
    const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const [entering, setEntering] = useState(true);
    const rafRef = useRef<number | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    const step = steps[stepIndex];
    const isLast = stepIndex === steps.length - 1;

    /* ── Find the target element & compute coordinates ── */
    const computeRect = useCallback(() => {
        const el = document.querySelector<HTMLElement>(`[data-tour="${step.targetId}"]`);
        if (!el) {
            setRect(null);
            return;
        }

        // Scroll into view smoothly if partially off-screen
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

        // Slight delay to wait for scroll to settle
        setTimeout(() => {
            const r = el.getBoundingClientRect();
            const highlightRect: Rect = {
                top: r.top - PADDING,
                left: r.left - PADDING,
                width: r.width + PADDING * 2,
                height: r.height + PADDING * 2,
            };
            setRect(highlightRect);
            setTooltipPos(calcTooltipPos(highlightRect, step.placement ?? 'bottom'));
        }, 120);
    }, [step]);

    /* ── Recalculate on step change, resize, scroll ── */
    useEffect(() => {
        setEntering(true);
        const t = setTimeout(() => setEntering(false), 350);
        computeRect();

        const onResize = () => computeRect();
        window.addEventListener('resize', onResize, { passive: true });
        window.addEventListener('scroll', onResize, { passive: true, capture: true });

        return () => {
            clearTimeout(t);
            window.removeEventListener('resize', onResize);
            window.removeEventListener('scroll', onResize, true);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [stepIndex, computeRect]);

    /* ── Navigation ── */
    const goNext = () => {
        if (isLast) {
            handleFinish();
        } else {
            setStepIndex(i => i + 1);
        }
    };

    const goPrev = () => {
        if (stepIndex > 0) setStepIndex(i => i - 1);
    };

    const handleFinish = () => {
        localStorage.setItem('meetlocal_onboarding_done', '1');
        onFinish?.();
        onClose();
    };

    /* ── Keyboard support ── */
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === 'Enter') goNext();
            if (e.key === 'ArrowLeft') goPrev();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps

    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

    /* ── Overlay: 4 semi-transparent panes around the highlight ── */
    const overlayPanes = rect
        ? [
            // top
            { top: 0, left: 0, width: vw, height: rect.top },
            // bottom
            { top: rect.top + rect.height, left: 0, width: vw, height: vh - rect.top - rect.height },
            // left
            { top: rect.top, left: 0, width: rect.left, height: rect.height },
            // right
            { top: rect.top, left: rect.left + rect.width, width: vw - rect.left - rect.width, height: rect.height },
        ]
        : [{ top: 0, left: 0, width: vw, height: vh }];

    return (
        <>
            {/* ── Overlay panes ── */}
            {overlayPanes.map((pane, i) => (
                <div
                    key={i}
                    className="fixed z-[9998] bg-black/70 transition-all duration-300 ease-in-out"
                    style={{
                        top: pane.top,
                        left: pane.left,
                        width: pane.width,
                        height: pane.height,
                    }}
                    onClick={onClose}
                    aria-hidden
                />
            ))}

            {/* ── Spotlight border ring ── */}
            {rect && (
                <div
                    className={`fixed z-[9999] pointer-events-none rounded-lg border-2 border-blue-400 shadow-[0_0_0_2px_rgba(96,165,250,0.3),0_0_20px_rgba(96,165,250,0.4)] transition-all duration-300 ease-in-out ${entering ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                        }`}
                    style={{
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height,
                    }}
                    aria-hidden
                />
            )}

            {/* ── Tooltip card ── */}
            <div
                className={`fixed z-[10000] w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300 ease-in-out ${entering ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
                    }`}
                style={{
                    top: tooltipPos.top,
                    left: tooltipPos.left,
                }}
                role="dialog"
                aria-label={step.title}
            >
                {/* Color accent bar */}
                <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

                {/* Header row */}
                <div className="flex items-start justify-between px-4 pt-3 gap-2">
                    <div className="flex items-center gap-2">
                        {/* Step number badge */}
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold flex-shrink-0">
                            {stepIndex + 1}
                        </span>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                            {step.title}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
                        aria-label={labels.skip ?? 'Skip tour'}
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Description */}
                <p className="px-4 pt-2 pb-3 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {step.description}
                </p>

                {/* Progress dots */}
                <div className="flex justify-center gap-1.5 pb-2">
                    {steps.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setStepIndex(i)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === stepIndex
                                    ? 'w-5 bg-blue-500'
                                    : i < stepIndex
                                        ? 'w-2 bg-blue-300 dark:bg-blue-700'
                                        : 'w-2 bg-gray-200 dark:bg-gray-700'
                                }`}
                            aria-label={`Step ${i + 1}`}
                        />
                    ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <button
                        onClick={goPrev}
                        disabled={stepIndex === 0}
                        className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-0 disabled:pointer-events-none transition-all px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <ChevronLeft size={14} />
                        {labels.prev ?? 'Back'}
                    </button>

                    <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                        {stepIndex + 1} {labels.of ?? '/'} {steps.length}
                    </span>

                    <button
                        onClick={goNext}
                        className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${isLast
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm shadow-blue-500/30'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                            }`}
                    >
                        {isLast ? (
                            <>
                                <Check size={13} />
                                {labels.finish ?? 'Finish'}
                            </>
                        ) : (
                            <>
                                {labels.next ?? 'Next'}
                                <ChevronRight size={14} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </>
    );
}

/* ─────────────────────────────── tooltip positioning ───────────────────── */

function calcTooltipPos(
    rect: Rect,
    placement: TourStep['placement'],
): { top: number; left: number } {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 16;

    let top = 0;
    let left = 0;

    switch (placement) {
        case 'top':
            top = rect.top - TOOLTIP_H_APPROX - margin;
            left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
            break;
        case 'bottom':
            top = rect.top + rect.height + margin;
            left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
            break;
        case 'left':
            top = rect.top + rect.height / 2 - TOOLTIP_H_APPROX / 2;
            left = rect.left - TOOLTIP_W - margin;
            break;
        case 'right':
            top = rect.top + rect.height / 2 - TOOLTIP_H_APPROX / 2;
            left = rect.left + rect.width + margin;
            break;
        case 'center':
        default:
            top = vh / 2 - TOOLTIP_H_APPROX / 2;
            left = vw / 2 - TOOLTIP_W / 2;
    }

    // Clamp to viewport
    left = Math.max(margin, Math.min(left, vw - TOOLTIP_W - margin));
    top = Math.max(margin, Math.min(top, vh - TOOLTIP_H_APPROX - margin));

    return { top, left };
}
