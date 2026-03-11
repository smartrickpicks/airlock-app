interface Props {
  size: number;
  className?: string;
}
export default function ArchetypeDriverIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M13 2L4 14H11L10 22L20 10H13L13 2Z"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.1"
      />
      <path
        d="M2 8H6"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1"
        strokeLinecap="round"
        strokeOpacity="0.3"
      />
      <path
        d="M1 12H5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1"
        strokeLinecap="round"
        strokeOpacity="0.2"
      />
      <path
        d="M3 16H6"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1"
        strokeLinecap="round"
        strokeOpacity="0.15"
      />
      <path
        d="M13 2L4 14H11L10 22L20 10H13L13 2Z"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
