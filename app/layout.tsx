import './globals.css';
import type { Metadata } from 'next';
import FacebookPixel from './components/FacebookPixel';

export const metadata: Metadata = {
  title: 'Shopifyy',
  description: 'Projeto Shopifyy',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt">
      <body>
        {children}
        <FacebookPixel />
      </body>
    </html>
  );
}