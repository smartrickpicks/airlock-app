import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";
import AuthProvider from "@/providers/AuthProvider";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Airlock",
  description: "Making complex systems legible.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-surface-base text-text-primary min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
