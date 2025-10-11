import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { TenantProvider } from '@/context/TenantContext';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'OrderWeb - Restaurant Management Platform',
  description: 'Multi-tenant restaurant ordering and management platform',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@400;700&family=Belleza&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased">
        <TenantProvider>
          {children}
          <Toaster />
        </TenantProvider>
      </body>
    </html>
  );
}
