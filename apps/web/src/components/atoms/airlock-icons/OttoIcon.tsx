interface Props {
  size: number;
  className?: string;
}
export default function OttoIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M12 2.5L20 7.25V16.75L12 21.5L4 16.75V7.25L12 2.5Z"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.06"
      />
      <circle cx="9" cy="11" r="1.5" fill="url(#gradient-cyan-glow)" />
      <circle cx="15" cy="11" r="1.5" fill="url(#gradient-cyan-glow)" />
      <path
        d="M9.5 15C9.5 15 10.5 16.5 12 16.5C13.5 16.5 14.5 15 14.5 15"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 2.5L20 7.25V16.75L12 21.5L4 16.75V7.25L12 2.5Z"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
