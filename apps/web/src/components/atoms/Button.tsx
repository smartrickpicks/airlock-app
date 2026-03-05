import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-accent-primary text-text-inverse hover:bg-accent-primary-hover",
  secondary:
    "border border-surface-border text-text-secondary hover:bg-surface-overlay hover:text-text-primary",
  ghost: "text-text-muted hover:bg-surface-overlay hover:text-text-primary",
  danger:
    "bg-accent-danger/15 text-accent-danger border border-accent-danger/30 hover:bg-accent-danger/25",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
};

export default function Button({
  variant = "primary",
  size = "md",
  className,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md font-medium transition-colors duration-fast ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${disabled ? "cursor-not-allowed opacity-40" : ""} ${className ?? ""}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
