interface Props {
  size: number;
  className?: string;
}
export default function TriptychOrchestrateIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <circle
        cx="10"
        cy="10"
        r="4"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.06"
      />
      <circle cx="10" cy="10" r="1.5" fill="url(#gradient-cyan-glow)" />
      <path
        d="M10 5.5V4"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10 16V14.5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M5.5 10H4"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M16 10H14.5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="17"
        cy="16"
        r="3"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeOpacity="0.6"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.04"
      />
      <circle
        cx="17"
        cy="16"
        r="1"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.6"
      />
      <path
        d="M13 13L14.5 14.5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1"
        strokeOpacity="0.4"
        strokeDasharray="2 1"
      />
      <circle
        cx="10"
        cy="10"
        r="4"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
