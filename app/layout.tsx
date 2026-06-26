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
      <body>{children}</body>
    </html>
  );
}
