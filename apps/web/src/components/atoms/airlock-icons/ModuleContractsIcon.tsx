interface Props {
  size: number;
  className?: string;
}
export default function ModuleContractsIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M7 3C5.9 3 5 3.9 5 5V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V8L14 3H7Z"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.06"
      />
      <path
        d="M14 3V8H19"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="15"
        r="2.5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.15"
      />
      <circle cx="12" cy="15" r="1" fill="url(#gradient-cyan-glow)" />
      <path
        d="M8 11H13"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1"
        strokeLinecap="round"
        strokeOpacity="0.4"
      />
      <path
        d="M8 13H11"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1"
        strokeLinecap="round"
        strokeOpacity="0.3"
      />
      <path
        d="M7 3C5.9 3 5 3.9 5 5V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V8L14 3H7Z"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
