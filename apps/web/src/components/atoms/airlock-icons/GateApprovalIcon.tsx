interface Props {
  size: number;
  className?: string;
}
export default function GateApprovalIcon({ size, className }: Props) {
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
        r="7"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.06"
      />
      <circle
        cx="12"
        cy="12"
        r="4"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.1"
      />
      <path
        d="M10 12L11.5 13.5L14 10.5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 2V4"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.4"
      />
      <path
        d="M12 20V22"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.4"
      />
      <path
        d="M2 12H4"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.4"
      />
      <path
        d="M20 12H22"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.4"
      />
      <circle
        cx="12"
        cy="12"
        r="7"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
