interface Props {
  size: number;
  className?: string;
}
export default function ChamberShipIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M12 3L17 10H14V18H10V10H7L12 3Z"
        stroke="url(#gradient-ship)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="url(#gradient-ship)"
        fillOpacity="0.1"
      />
      <path
        d="M9 18C9 18 8 21 7 22"
        stroke="url(#gradient-ship)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.5"
      />
      <path
        d="M15 18C15 18 16 21 17 22"
        stroke="url(#gradient-ship)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.5"
      />
      <path
        d="M12 18V22"
        stroke="url(#gradient-ship)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.3"
      />
      <path
        d="M12 3L17 10H14V18H10V10H7L12 3Z"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
