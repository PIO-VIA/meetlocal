import type { Metadata } from 'next';
import { Inter, Roboto_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/contexts/ToastContext';
import ThemeProvider from '@/components/providers/ThemeProvider';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter', 
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto-mono',
});

export const metadata: Metadata = {
  title: 'LOCAL MEET - Visioconférence Locale',
  description: 'Solution de visioconférence sécurisée en réseau local',
  keywords: ['visioconférence', 'local', 'mediasoup', 'meeting'],
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // On ajoute les variables ici pour qu'elles soient accessibles partout
    <html lang="fr" className={`${inter.variable} ${robotoMono.variable}`} suppressHydrationWarning>
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