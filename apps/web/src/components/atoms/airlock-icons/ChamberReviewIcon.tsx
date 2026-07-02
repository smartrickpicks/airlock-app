interface Props {
  size: number;
  className?: string;
}
export default function ChamberReviewIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z"
        stroke="url(#gradient-review)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="url(#gradient-review)"
        fillOpacity="0.05"
      />
      <path
        d="M12 8L15.5 10V13.5C15.5 15 14 16.5 12 17C10 16.5 8.5 15 8.5 13.5V10L12 8Z"
        stroke="url(#gradient-review)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="url(#gradient-review)"
        fillOpacity="0.15"
      />
      <circle cx="12" cy="12.5" r="1.5" fill="url(#gradient-review)" />
      <path
        d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
