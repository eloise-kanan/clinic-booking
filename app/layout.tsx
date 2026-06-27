import type { Metadata, Viewport } from "next";
import "./globals.css";
import { loadBranding, brandingToCss, fontStylesheetUrl } from "@/lib/branding-server";
import { loadTerminalConfig, themeToCss } from "@/lib/terminal-theme";

export const metadata: Metadata = {
  title: "Clinic Booking",
  description: "Book your appointment online",
  appleWebApp: {
    capable: true,
    title: "Clinic",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d9488",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const branding = await loadBranding();
  const terminalCfg = await loadTerminalConfig();
  const css = `${brandingToCss(branding)}\n${themeToCss(terminalCfg.theme)}`;
  const fontUrl = fontStylesheetUrl(branding.font_family);

  return (
    <html lang="en">
      <head>
        {fontUrl && <link rel="stylesheet" href={fontUrl} />}
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>
        {children}
        {/* Fixed footer attribution — sits in the bottom-right of every
            page, dims into the background so it doesn't compete with
            content but stays available as a credit + link out. */}
        <div className="fixed bottom-2 right-3 z-40 pointer-events-none">
          <a
            href="https://kanan.my"
            target="_blank"
            rel="noreferrer"
            className="pointer-events-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/80 backdrop-blur-md border border-stone-200 shadow-sm text-[10px] text-stone-500 hover:text-stone-900 hover:bg-white"
          >
            Powered by <span className="font-medium" style={{ color: "#1B2A4A" }}>Kanan</span>
          </a>
        </div>
      </body>
    </html>
  );
}
