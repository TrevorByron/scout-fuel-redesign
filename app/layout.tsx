// For adding custom fonts with other frameworks, see:
// https://tailwindcss.com/docs/font-family
import type { Metadata } from "next";
import { Inter, Geist_Mono, Nunito } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { StyleProvider } from "@/components/style-provider";
import { StyleSwitcher } from "@/components/style-switcher";
import "./globals.css";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontGeistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const fontNunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "FuelCommand",
  description: "Fleet fuel management dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontSans.variable} ${fontGeistMono.variable} ${fontNunito.variable} font-sans antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var s=localStorage.getItem("style-template");if(s==="1"||s==="2"||s==="3"||s==="4")document.documentElement.setAttribute("data-style",s);})();`,
          }}
        />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <StyleProvider>
            <TooltipProvider>
              {children}
              <Toaster />
            </TooltipProvider>
            <StyleSwitcher />
          </StyleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
