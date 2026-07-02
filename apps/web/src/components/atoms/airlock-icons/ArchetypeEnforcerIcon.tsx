interface Props {
  size: number;
  className?: string;
}
export default function ArchetypeEnforcerIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M12 3L20 7V13C20 17.4 16.4 20.5 12 22C7.6 20.5 4 17.4 4 13V7L12 3Z"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.06"
      />
      <path
        d="M6 12H18"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.6"
      />
      <path
        d="M6 12H18"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeOpacity="0.08"
      />
      <circle
        cx="12"
        cy="12"
        r="2"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.15"
      />
      <path
        d="M12 3L20 7V13C20 17.4 16.4 20.5 12 22C7.6 20.5 4 17.4 4 13V7L12 3Z"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
