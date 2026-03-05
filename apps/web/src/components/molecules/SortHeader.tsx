interface SortHeaderProps {
  label: string;
  field: string;
  activeSortKey: string;
  sortDir: "asc" | "desc";
  onSort: (field: string) => void;
  className?: string;
}

export default function SortHeader({
  label,
  field,
  activeSortKey,
  sortDir,
  onSort,
  className,
}: SortHeaderProps) {
  return (
    <th
      className={`cursor-pointer px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted hover:text-text-primary ${className ?? ""}`}
      onClick={() => onSort(field)}
    >
      {label}
      {activeSortKey === field && (
        <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>
      )}
    </th>
  );
}
