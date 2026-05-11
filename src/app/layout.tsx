import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { AuthGuard } from '@/components/providers/AuthGuard';
import { SuppressBenignErrors } from '@/components/providers/SuppressBenignErrors';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { Toast } from '@heroui/react';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'BalinaOS',
    template: '%s · BalinaOS',
  },
  description:
    'Çok mağazalı WooCommerce analitik dashboardu — BalinaOS',
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png' }],
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className={`${inter.variable} select-none font-sans antialiased`}
        suppressHydrationWarning
      >
        <SuppressBenignErrors />
        <ThemeProvider>
          <QueryProvider>
            <AuthGuard>{children}</AuthGuard>
            <Toast.Provider />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
