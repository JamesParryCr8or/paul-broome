import type { Metadata } from 'next';
import { Cormorant_Garamond, Manrope } from 'next/font/google';
import './globals.css';
import './readability.css';

const cormorant = Cormorant_Garamond({ subsets: ['latin'], variable: '--font-cormorant', weight: ['500', '600', '700'], display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });

export const metadata: Metadata = {
  title: 'Are You Making This £660K Sales Mistake? | Paul Broome Sales Mastery',
  description: 'Take the two-minute Sales Leak Assessment for UK home improvement businesses and discover where valuable sales opportunities are slipping away.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: {
    children: React.ReactNode;
}) { return <html lang="en-GB" className={`${cormorant.variable} ${manrope.variable}`}><body>{children}</body></html>; }
