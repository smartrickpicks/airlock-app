interface Props {
  size: number;
  className?: string;
}
export default function ModuleTriageIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M10 21H14L13 12H11L10 21Z"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.06"
      />
      <rect
        x="10"
        y="9"
        width="4"
        height="3"
        rx="0.5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.1"
      />
      <path
        d="M12 9V5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="4" r="1" fill="url(#gradient-cyan-glow)" />
      <path
        d="M8 7C8 7 9.5 5 12 5C14.5 5 16 7 16 7"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.6"
        fill="none"
      />
      <path
        d="M5.5 5C5.5 5 7.5 2 12 2C16.5 2 18.5 5 18.5 5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.3"
        fill="none"
      />
      <path
        d="M10 21H14L13 12H11L10 21Z"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
