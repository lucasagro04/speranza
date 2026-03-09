import type { Metadata, Viewport } from "next";
import { Barlow, Orbitron, Space_Mono } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Speranza",
  description: "Your command center for Arc Raiders events, news, and community updates",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0b10",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${orbitron.variable} ${barlow.variable} ${spaceMono.variable}`} style={{ background: "#0a0b10", color: "#ffffff" }}>
      <head>
        <script async src="https://platform.twitter.com/widgets.js" charSet="utf-8"></script>
      </head>
      <body
        className={`${orbitron.variable} ${barlow.variable} ${spaceMono.variable} antialiased`}
        style={{ background: "#0a0b10", color: "#ffffff" }}
      >
        {children}
      </body>
    </html>
  );
}
