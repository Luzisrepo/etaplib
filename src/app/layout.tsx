import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ETAP Biblioteca",
  description: "Biblioteca digital para materiais de estudo da ETAP."
};

export const viewport: Viewport = {
  themeColor: "#0d1117",
  colorScheme: "dark"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}
