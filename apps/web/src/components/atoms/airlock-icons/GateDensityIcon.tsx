interface Props {
  size: number;
  className?: string;
}
export default function GateDensityIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <rect
        x="4"
        y="14"
        width="3"
        height="7"
        rx="1"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.15"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
      />
      <rect
        x="10.5"
        y="8"
        width="3"
        height="13"
        rx="1"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.15"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
      />
      <rect
        x="17"
        y="4"
        width="3"
        height="17"
        rx="1"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.15"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
      />
      <path
        d="M2 11H22"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeDasharray="2 2"
        strokeOpacity="0.5"
      />
    </svg>
  );
}
