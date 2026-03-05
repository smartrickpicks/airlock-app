import type { Metadata } from "next";
import "@/styles/globals.css";

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
    <html lang="en" className="dark">
      <body className="bg-surface-base text-text-primary min-h-screen">
        {/* Shell: Module bar (left) + Sidebar + Main content */}
        <div className="flex h-screen overflow-hidden">
          {/* Module bar — 72px fixed width */}
          <aside
            className="flex-shrink-0 bg-surface-sunken border-r border-surface-border"
            style={{ width: "var(--module-bar-width)" }}
          >
            <div className="flex flex-col items-center py-4 gap-2">
              <div className="w-10 h-10 rounded-xl bg-accent-primary flex items-center justify-center text-sm font-bold">
                A
              </div>
            </div>
          </aside>

          {/* Sidebar + Page content */}
          <div className="flex flex-1 overflow-hidden">{children}</div>
        </div>
      </body>
    </html>
  );
}
