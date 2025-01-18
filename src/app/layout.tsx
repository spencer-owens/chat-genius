import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner'
import { Providers } from '@/components/providers/Providers'
import { Sidebar } from '@/components/layout/Sidebar'
import { AuthInit } from '@/components/auth/AuthInit'
import { LayoutContent } from '@/components/layout/LayoutContent'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Chat Genius",
  description: "A modern chat application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <AuthInit>
            <LayoutContent>{children}</LayoutContent>
          </AuthInit>
        </Providers>
        <Toaster theme="dark" position="top-center" />
      </body>
    </html>
  );
}
