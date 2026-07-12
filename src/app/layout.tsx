import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AssetFlow — Enterprise Asset & Resource Management',
  description: 'Track, allocate, and maintain physical assets and shared bookable resources across your organization.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
