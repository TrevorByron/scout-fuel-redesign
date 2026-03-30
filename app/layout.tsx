// For adding custom fonts with other frameworks, see:
// https://tailwindcss.com/docs/font-family
import type { Metadata } from "next";
import { Inter, Geist, Geist_Mono, Raleway } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { StyleProvider } from "@/components/style-provider";
import "./globals.css";
import "./styles/style-uber-font-override.css";

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
  title: "ScoutFuel",
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontSans.variable} ${fontGeist.variable} ${fontGeistMono.variable} ${fontRaleway.variable} font-sans antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var v="3";if(localStorage.getItem("style-version")!==v){localStorage.setItem("style-version",v);var r=localStorage.getItem("style-template");var m=r==="teal"||r==="glass"||r==="uber"?r:r==="2"?"teal":r==="4"?"glass":r==="5"?"uber":"uber";localStorage.setItem("style-template",m);}var s=localStorage.getItem("style-template");if(s!=="teal"&&s!=="glass"&&s!=="uber"){s=s==="2"?"teal":s==="4"?"glass":s==="5"?"uber":"uber";localStorage.setItem("style-template",s);}document.documentElement.setAttribute("data-style",s);document.body.setAttribute("data-font",s==="uber"?"system":"default");})();`,
          }}
        />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <StyleProvider>
            <TooltipProvider>
              {children}
              <Toaster />
            </TooltipProvider>
          </StyleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
