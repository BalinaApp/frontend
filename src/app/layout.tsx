import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { AuthGuard } from '@/components/providers/AuthGuard';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'WooCommerce Analytics Dashboard',
  description:
    'Multi-store WooCommerce analytics dashboard for e-commerce businesses',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <QueryProvider>
          <AuthGuard>{children}</AuthGuard>
          <Toaster position="top-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
