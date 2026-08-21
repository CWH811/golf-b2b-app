import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { PwaStatus } from "./PwaStatus";
import "./globals.css";

// Load the GCore brand font
const montserrat = Montserrat({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GCore | B2B Portal",
  description: "Golf Course Operations Resource Engine",
  applicationName: "GCore",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/logo.jpg", type: "image/jpeg" }],
    apple: [{ url: "/logo.jpg", type: "image/jpeg" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "theme-color": "#161719",
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
        <meta name="theme-color" content="#161719" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/logo.jpg" />
        <link rel="apple-touch-icon" href="/logo.jpg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </head>
      <body className={montserrat.className}>
        {children}
        <PwaStatus />
        <Analytics />
      </body>
    </html>
  );
}