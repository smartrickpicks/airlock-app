interface Props {
  size: number;
  className?: string;
}
export default function LockmarkIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.04"
      />
      <rect
        x="8"
        y="11"
        width="8"
        height="7"
        rx="1.5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.1"
      />
      <path
        d="M9.5 11V8.5C9.5 7.12 10.62 6 12 6C13.38 6 14.5 7.12 14.5 8.5V11"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="14" r="1" fill="url(#gradient-cyan-glow)" />
      <path
        d="M12 15V16.5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
