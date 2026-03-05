interface BadgeProps {
  count?: number;
  className?: string;
}

export default function Badge({ count, className }: BadgeProps) {
  // Dot mode: no count provided (or undefined)
  if (count === undefined) {
    return (
      <span
        className={`
          inline-flex w-2.5 h-2.5 rounded-full
          bg-accent-danger
          ${className ?? ""}
        `}
      />
    );
  }

  // Hidden when count is 0
  if (count === 0) {
    return null;
  }

  const displayText = count > 99 ? "99+" : String(count);

  return (
    <span
      className={`
        inline-flex items-center justify-center
        min-w-[18px] h-[18px] px-1
        rounded-full
        bg-accent-danger text-white
        text-[10px] font-bold leading-none
        ${className ?? ""}
      `}
    >
      {displayText}
    </span>
  );
}
