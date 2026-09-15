import './globals.css';
import type { Metadata } from 'next';
import { FacebookPixel, PixelPageView } from 'next-pixels';

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
        <FacebookPixel pixelId={process.env.NEXT_PUBLIC_FB_PIXEL_ID!} />
        <PixelPageView />
      </body>
    </html>
  );
}