import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";
import { Toaster } from 'sonner'
import { Providers } from '@/components/providers/Providers'
import { Sidebar } from '@/components/layout/Sidebar'
import { UnreadCountsProvider } from '@/components/providers/UnreadCountsProvider'

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
        <AuthProvider>
          <Providers>
            <UnreadCountsProvider>
              <div className="flex h-screen">
                <Sidebar />
                <main className="flex-1 overflow-y-auto bg-gray-900">
                  {children}
                </main>
              </div>
            </UnreadCountsProvider>
          </Providers>
        </AuthProvider>
        <Toaster theme="dark" position="top-center" />
      </body>
    </html>
  );
}
