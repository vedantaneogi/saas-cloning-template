import type { Metadata } from "next";
import type { ReactNode } from "react";
import Providers from "./providers";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Docusign",
  description: "Electronic Signature and Intelligent Agreement Management",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/favicon.svg",
  },
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        {/* DS Indigo — DocuSign's proprietary font family */}
        <style>{`
          @font-face {
            font-family: 'DS Indigo';
            src: url('https://docucdn-a.akamaihd.net/www-static/assets/fonts/dsindigo-light.woff2') format('woff2');
            font-weight: 300;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'DS Indigo';
            src: url('https://docucdn-a.akamaihd.net/www-static/assets/fonts/dsindigo-regular.woff2') format('woff2');
            font-weight: 400;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'DS Indigo';
            src: url('https://docucdn-a.akamaihd.net/www-static/assets/fonts/dsindigo-medium.woff2') format('woff2');
            font-weight: 500;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'DS Indigo';
            src: url('https://docucdn-a.akamaihd.net/www-static/assets/fonts/dsindigo-semibold.woff2') format('woff2');
            font-weight: 600;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'DSIndigo';
            src: url('https://docucdn-a.akamaihd.net/www-static/assets/fonts/dsindigo-light.woff2') format('woff2');
            font-weight: 300;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'DSIndigo';
            src: url('https://docucdn-a.akamaihd.net/www-static/assets/fonts/dsindigo-regular.woff2') format('woff2');
            font-weight: 400;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'DSIndigo';
            src: url('https://docucdn-a.akamaihd.net/www-static/assets/fonts/dsindigo-medium.woff2') format('woff2');
            font-weight: 500;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'DSIndigo';
            src: url('https://docucdn-a.akamaihd.net/www-static/assets/fonts/dsindigo-semibold.woff2') format('woff2');
            font-weight: 600;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'DSIndigo';
            src: url('https://docucdn-a.akamaihd.net/www-static/assets/fonts/dsindigo-bold.woff2') format('woff2');
            font-weight: 700;
            font-style: normal;
            font-display: swap;
          }
        `}</style>
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
