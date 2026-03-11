interface Props {
  size: number;
  className?: string;
}
export default function ArchetypeInterpreterIcon({ size, className }: Props) {
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
        r="9"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.06"
      />
      <path
        d="M12 3V7"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 17V21"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M3 12H7"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M17 12H21"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 8L14.5 12L12 16L9.5 12L12 8Z"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.15"
      />
      <circle
        cx="5.5"
        cy="5.5"
        r="0.8"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.4"
      />
      <circle
        cx="18.5"
        cy="5.5"
        r="0.8"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.4"
      />
      <circle
        cx="5.5"
        cy="18.5"
        r="0.8"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.4"
      />
      <circle
        cx="18.5"
        cy="18.5"
        r="0.8"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.4"
      />
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
