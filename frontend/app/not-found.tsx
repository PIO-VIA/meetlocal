'use client';

import Link from 'next/link';
import { Home, ArrowLeft, Ghost } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6 relative overflow-hidden text-gray-900 dark:text-white">
            {/* Background blobs for depth */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

            <div className="relative flex flex-col items-center text-center max-w-lg">
                {/* Animated Ghost Icon */}
                <div className="mb-8 animate-bounce">
                    <div className="relative">
                        <Ghost size={120} className="text-blue-500 dark:text-blue-400 opacity-80" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white dark:bg-gray-950 rounded-full blur-[2px] animate-pulse"></div>
                    </div>
                </div>

                {/* 404 Text with Gradient */}
                <h1 className="text-9xl font-black mb-4 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 animate-gradient-x">
                    404
                </h1>

                <h2 className="text-3xl font-bold mb-4">
                    Oups ! Page égarée
                </h2>

                <p className="text-gray-600 dark:text-gray-400 mb-10 text-lg leading-relaxed">
                    Il semble que vous ayez navigué vers un espace qui n&apos;existe pas encore.
                    Peut-être une mauvaise adresse, ou un salon de réunion qui a déjà fermé ses portes.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <Link
                        href="/"
                        className="flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-1 active:scale-95 group"
                    >
                        <Home size={20} className="group-hover:scale-110 transition-transform" />
                        Retour à l&apos;accueil
                    </Link>

                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-2xl transition-all hover:-translate-y-1 active:scale-95"
                    >
                        <ArrowLeft size={20} />
                        Page précédente
                    </button>
                </div>

                {/* Helpful Tip */}
                <div className="mt-16 p-4 rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                    <p className="text-sm text-gray-500 dark:text-gray-500 flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                        Astuce : Vérifiez l&apos;orthographe de l&apos;URL ou créez un nouveau salon depuis l&apos;accueil.
                    </p>
                </div>
            </div>

            <style jsx global>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 5s ease infinite;
        }
      `}</style>
        </div>
    );
}
