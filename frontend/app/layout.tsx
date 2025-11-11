import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

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
    <html lang="fr">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}