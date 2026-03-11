interface Props {
  size: number;
  className?: string;
}
export default function ChamberBuildIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M5 16H19L21 20H3L5 16Z"
        stroke="url(#gradient-build)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="url(#gradient-build)"
        fillOpacity="0.08"
      />
      <path
        d="M7 16V13C7 12 8 11 10 11H14C16 11 17 12 17 13V16"
        stroke="url(#gradient-build)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 11V6"
        stroke="url(#gradient-build)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect
        x="9"
        y="3"
        width="6"
        height="3"
        rx="1"
        stroke="url(#gradient-build)"
        strokeWidth="1.5"
        fill="url(#gradient-build)"
        fillOpacity="0.15"
      />
      <circle cx="7" cy="8" r="0.8" fill="url(#gradient-build)" />
      <circle cx="17" cy="7" r="0.6" fill="url(#gradient-build)" />
      <circle
        cx="5"
        cy="6"
        r="0.5"
        fill="url(#gradient-build)"
        fillOpacity="0.6"
      />
      <path
        d="M5 16H19L21 20H3L5 16Z"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
