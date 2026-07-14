import type { Metadata } from "next";
import "./globals.css";

import ClientBootstrap from "@/components/client-bootstrap";

export const metadata: Metadata = {
  title: "Gan Downloader",
  description: "Modern, local-first media downloader dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="dark h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ClientBootstrap>
          {children}
        </ClientBootstrap>
      </body>
    </html>
  );
}
