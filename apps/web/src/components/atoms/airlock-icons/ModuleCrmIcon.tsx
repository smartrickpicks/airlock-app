interface Props {
  size: number;
  className?: string;
}
export default function ModuleCrmIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M12 8L6 14"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeOpacity="0.4"
      />
      <path
        d="M12 8L18 14"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeOpacity="0.4"
      />
      <path
        d="M12 8L12 18"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeOpacity="0.4"
      />
      <path
        d="M6 14L12 18"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeOpacity="0.3"
      />
      <path
        d="M18 14L12 18"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeOpacity="0.3"
      />
      <circle
        cx="12"
        cy="6"
        r="3"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.12"
      />
      <circle
        cx="6"
        cy="14"
        r="2.5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.08"
      />
      <circle
        cx="18"
        cy="14"
        r="2.5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.08"
      />
      <circle
        cx="12"
        cy="19"
        r="2"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.08"
      />
      <circle cx="12" cy="6" r="1.2" fill="url(#gradient-cyan-glow)" />
    </svg>
  );
}
