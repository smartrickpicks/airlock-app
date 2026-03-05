import type { LucideIcon } from "lucide-react";

type IconSize = "sm" | "md" | "lg" | "xl";

interface IconProps {
  icon: LucideIcon;
  size?: IconSize;
  className?: string;
}

const sizeMap: Record<IconSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 48,
};

export default function Icon({
  icon: LucideComponent,
  size = "md",
  className,
}: IconProps) {
  const pixelSize = sizeMap[size];

  return <LucideComponent size={pixelSize} className={className} />;
}
