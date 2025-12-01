import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ABA Analytics Dashboard",
  description: "Comprehensive analytics for ABA client programs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
