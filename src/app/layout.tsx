import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { ThemeProvider } from "~/components/providers/ThemeProvider";
import MobileBottomNav from "~/components/layout/MobileBottomNav";

export const metadata: Metadata = {
  title: "MCP Client",
  description: "Model Context Protocol client",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={geist.variable}>
      <body className="min-h-screen">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TRPCReactProvider>
            {/* Page-level is responsible for rendering Header to prevent duplicates and layout-specific variants */}
            <div className="flex min-h-screen flex-col">
              <main className="flex flex-1 overflow-hidden">
                {children}
              </main>
            </div>
            {/* Do NOT render MobileBottomNav at root: it contains RightPanel which uses ResizablePanel and must live within a ResizablePanelGroup.
               It will be rendered by pages that have the correct context (e.g., home page). */}
          </TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
