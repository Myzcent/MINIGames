import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FarmVille 3D: Sunny Meadow Farm",
  description: "A 3D Farming Simulator and Tycoon Game built with Next.js 16 and Three.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body>{children}</body>
    </html>
  );
}
