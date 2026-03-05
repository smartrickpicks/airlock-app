import type { Metadata } from "next";
import { Fira_Sans, Fira_Code } from "next/font/google";
import "@/styles/globals.css";
import ShellLayout from "@/components/templates/ShellLayout";

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
        <ShellLayout>{children}</ShellLayout>
      </body>
    </html>
  );
}
