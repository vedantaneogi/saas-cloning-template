import type { Metadata } from "next";
import { ReactNode } from "react";
import Providers from "./providers";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Google Slides",
  description: "Collaborative presentation editor",
  icons: {
    icon: "/images/favicon.ico",
  },
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
