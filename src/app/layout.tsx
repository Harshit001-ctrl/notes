import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { NotesProvider } from '@/contexts/NotesContext';
import { AppHeader } from '@/components/AppHeader';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Markdown Notes Sync',
  description: 'A Markdown-based Notes Application that works offline and syncs data.',
  manifest: '/manifest.json',
  applicationName: 'Markdown Notes Sync',
  appleWebApp: {
    capable: true,
    title: 'NotesSync', // From <meta name="apple-mobile-web-app-title" content="NotesSync" />
    statusBarStyle: 'default', // From <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  },
  formatDetection: {
    telephone: false, // From <meta name="format-detection" content="telephone=no" />
  },
  themeColor: '#64B5F6', // From <meta name="theme-color" content="#64B5F6" />
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    // apple: [ // You can add specific apple-touch-icons here if needed, e.g.:
    //   { url: '/icons/apple-touch-icon.png', sizes: '180x180' },
    // ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* These tags are kept manually as they might not be fully covered by the Metadata API */}
        {/* or are for specific MS application configurations. */}
        {/* Ensure no whitespace is rendered between these tags or around them. */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#64B5F6" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NotesProvider>
          <div className="flex flex-col min-h-screen">
            <AppHeader />
            <main className="flex-grow container mx-auto px-4 py-8">
              {children}
            </main>
          </div>
          <Toaster />
        </NotesProvider>
      </body>
    </html>
  );
}
