interface Props {
  size: number;
  className?: string;
}
export default function TriptychSignalIcon({ size, className }: Props) {
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
        d="M13 5L9 13H12L11 19L15 11H12L13 5Z"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.15"
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
