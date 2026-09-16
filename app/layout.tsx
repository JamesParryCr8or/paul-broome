import type { Metadata } from 'next';
import Script from 'next/script';
import { Cormorant_Garamond, Manrope } from 'next/font/google';
import './globals.css';
import './readability.css';

const cormorant = Cormorant_Garamond({ subsets: ['latin'], variable: '--font-cormorant', weight: ['500', '600', '700'], display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });

export const metadata: Metadata = {
  title: 'Are You Making This £660K Sales Mistake? | Paul Broome Sales Mastery',
  description: 'Take the two-minute Sales Leak Assessment for UK home improvement businesses and discover where valuable sales opportunities are slipping away.',
  robots: { index: false, follow: false },
  icons: {
    icon: 'https://paul-broome.vercel.app/_next/image?url=https%3A%2F%2Fres.cloudinary.com%2Fdzaleq73i%2Fimage%2Fupload%2Fq_auto%2Ff_auto%2Fv1778512410%2F6865401885221373497a2d33_hk2yba.png&w=750&q=75',
    shortcut: 'https://paul-broome.vercel.app/_next/image?url=https%3A%2F%2Fres.cloudinary.com%2Fdzaleq73i%2Fimage%2Fupload%2Fq_auto%2Ff_auto%2Fv1778512410%2F6865401885221373497a2d33_hk2yba.png&w=750&q=75',
  },
};
export default function RootLayout({ children }: {
    children: React.ReactNode;
}) { return <html lang="en-GB" className={`${cormorant.variable} ${manrope.variable}`}><body>{children}<Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','24080705154882371');fbq('track','PageView');`}</Script></body></html>; }
