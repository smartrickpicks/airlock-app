interface Props {
  size: number;
  className?: string;
}
export default function ChamberDiscoverIcon({ size, className }: Props) {
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
        r="10"
        stroke="url(#gradient-discover)"
        strokeWidth="1.5"
        strokeOpacity="0.3"
      />
      <circle
        cx="12"
        cy="12"
        r="6.5"
        stroke="url(#gradient-discover)"
        strokeWidth="1.5"
        strokeOpacity="0.5"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="url(#gradient-discover)"
        strokeWidth="1.5"
        strokeOpacity="0.7"
      />
      <circle cx="12" cy="12" r="1.5" fill="url(#gradient-discover)" />
      <path
        d="M12 12L18 4"
        stroke="url(#gradient-discover)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
