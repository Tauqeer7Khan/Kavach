import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toast";

const spaceGrotesk = Space_Grotesk({ 
  subsets: ["latin"], 
  weight: ["600", "700"],
  variable: "--font-heading" 
});

const inter = Inter({ 
  subsets: ["latin"], 
  weight: ["400", "500", "600"],
  variable: "--font-body" 
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono"
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--font-accent"
});

export const metadata: Metadata = {
  title: "KAVACH — AI Code Security Analyzer",
  description: "Scan and fix security vulnerabilities in your AI-generated code.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("dark", spaceGrotesk.variable, inter.variable, jetbrainsMono.variable, instrumentSerif.variable)}>
      <body
        className="bg-[#09090B] text-[#FAFAF9] font-body min-h-screen antialiased"
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
