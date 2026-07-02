import type { Metadata } from "next";
import { Fira_Sans, Fira_Code } from "next/font/google";
import "@/styles/globals.css";
import AuthProvider from "@/providers/AuthProvider";

const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-fira-sans",
  display: "swap",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-fira-code",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Airlock",
  description: "Enterprise data operations platform",
  icons: {
    icon: "/assets/brand/airlock-256.png",
    apple: "/assets/brand/airlock-512.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${firaSans.variable} ${firaCode.variable}`}
    >
      <body className="bg-surface-base text-text-primary min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
