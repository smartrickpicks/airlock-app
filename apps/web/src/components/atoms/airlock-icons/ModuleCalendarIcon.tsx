interface Props {
  size: number;
  className?: string;
}
export default function ModuleCalendarIcon({ size, className }: Props) {
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
        r="8"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.06"
      />
      <path
        d="M12 8V12L14.5 14"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="1" fill="url(#gradient-cyan-glow)" />
      <ellipse
        cx="12"
        cy="12"
        rx="11"
        ry="4"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1"
        strokeOpacity="0.25"
        strokeDasharray="3 2"
        transform="rotate(-30 12 12)"
      />
      <circle
        cx="21"
        cy="8"
        r="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.6"
      />
      <circle
        cx="12"
        cy="12"
        r="8"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
