import ShellLayout from "@/components/templates/ShellLayout";

export default function ShellRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ShellLayout>{children}</ShellLayout>;
}
