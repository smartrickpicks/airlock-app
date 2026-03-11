interface Props {
  size: number;
  className?: string;
}
export default function ModuleDocumentsIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <rect
        x="6"
        y="2"
        width="14"
        height="18"
        rx="2"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeOpacity="0.3"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.03"
      />
      <rect
        x="5"
        y="3.5"
        width="14"
        height="18"
        rx="2"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeOpacity="0.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.05"
      />
      <rect
        x="4"
        y="5"
        width="14"
        height="18"
        rx="2"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.08"
      />
      <path
        d="M7 10H15"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1"
        strokeLinecap="round"
        strokeOpacity="0.4"
      />
      <path
        d="M7 13H13"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1"
        strokeLinecap="round"
        strokeOpacity="0.3"
      />
      <path
        d="M7 16H11"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1"
        strokeLinecap="round"
        strokeOpacity="0.2"
      />
      <rect
        x="4"
        y="5"
        width="14"
        height="18"
        rx="2"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
