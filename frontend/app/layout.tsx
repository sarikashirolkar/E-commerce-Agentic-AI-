import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GharSe Global",
  description: "Global Indian shopping platform for NRIs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
