// For adding custom fonts with other frameworks, see:
// https://tailwindcss.com/docs/font-family
import type { Metadata } from "next";
import { Inter, Geist, Geist_Mono, Raleway } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { StyleProvider } from "@/components/style-provider";
import { StyleSwitcher } from "@/components/style-switcher";
import "./globals.css";
import "./styles/style-5-font-override.css";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontGeist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const fontGeistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const fontRaleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway",
});

export const metadata: Metadata = {
  title: "FuelCommand",
  description: "Fleet fuel management dashboard",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-style="5" suppressHydrationWarning>
      <body className={`${fontSans.variable} ${fontGeist.variable} ${fontGeistMono.variable} ${fontRaleway.variable} font-sans antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var v="2";if(localStorage.getItem("style-version")!==v){localStorage.removeItem("style-template");localStorage.setItem("style-version",v);}var s=localStorage.getItem("style-template");s=(s==="1"||s==="2"||s==="3"||s==="4"||s==="5")?s:"5";document.documentElement.setAttribute("data-style",s);document.body.setAttribute("data-font",s==="5"?"system":"default");})();`,
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
