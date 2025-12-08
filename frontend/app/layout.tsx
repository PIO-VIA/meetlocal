import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/contexts/ToastContext';
import ThemeProvider from '@/components/providers/ThemeProvider';

const inter = Inter({
  subsets: ['latin'],
  preload: false,
});

export const metadata: Metadata = {
  title: 'LOCAL MEET - Visioconférence Locale',
  description: 'Solution de visioconférence sécurisée en réseau local',
  keywords: ['visioconférence', 'local', 'mediasoup', 'meeting'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}