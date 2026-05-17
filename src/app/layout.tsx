import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { AuthGuard } from '@/components/providers/AuthGuard';
import { SuppressBenignErrors } from '@/components/providers/SuppressBenignErrors';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ServiceWorkerRegister } from '@/components/providers/ServiceWorkerRegister';
import { Toast } from '@heroui/react';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'balinaOS',
    template: '%s · balinaOS',
  },
  description:
    'Çok mağazalı WooCommerce analitik dashboardu — balinaOS',
  // Next App Router otomatik olarak app/manifest.ts → /manifest.webmanifest.
  manifest: '/manifest.webmanifest',
  applicationName: 'balinaOS',
  appleWebApp: {
    capable: true,
    title: 'balinaOS',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png' }],
    shortcut: '/favicon.png',
    apple: [{ url: '/icons/icon-192-v3.png', sizes: '192x192', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#18181b',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
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
        <ServiceWorkerRegister />
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
