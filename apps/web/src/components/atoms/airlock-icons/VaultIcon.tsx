interface Props {
  size: number;
  className?: string;
}
export default function VaultIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 2L21 7V17L12 22L3 17V7L12 2Z"
        stroke="url(#gradient-vault)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="url(#gradient-vault)"
        fillOpacity="0.08"
      />
      <path
        d="M12 2L21 7V17L12 22L3 17V7L12 2Z"
        fill="url(#gradient-glass)"
        fillOpacity="0.5"
      />
      <circle
        cx="12"
        cy="10"
        r="2.5"
        stroke="url(#gradient-vault)"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M12 12.5V16"
        stroke="url(#gradient-vault)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
