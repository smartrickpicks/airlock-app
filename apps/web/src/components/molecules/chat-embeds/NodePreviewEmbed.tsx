"use client";

interface NodePreviewEmbedProps {
  nodeName: string;
  nodeType: string;
  assignee?: string;
  status: "pending" | "active" | "complete" | "blocked";
  chamber?: string;
}

const NODE_STATUS_COLOR: Record<string, string> = {
  pending: "bg-text-muted",
  active: "bg-accent-primary",
  complete: "bg-accent-success",
  blocked: "bg-accent-danger",
};

export default function NodePreviewEmbed({
  nodeName,
  nodeType,
  assignee,
  status,
  chamber,
}: NodePreviewEmbedProps) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
          Playbook Node
        </span>
        <span className="flex items-center gap-1">
          <span
            className={`h-1.5 w-1.5 rounded-full ${NODE_STATUS_COLOR[status] || "bg-text-muted"}`}
          />
          <span className="text-[10px] text-text-muted capitalize">
            {status}
          </span>
        </span>
      </div>

      <p className="text-sm font-semibold text-text-primary">{nodeName}</p>
      <div className="mt-1 flex items-center gap-2 text-[11px] text-text-muted">
        <span className="capitalize">{nodeType}</span>
        {chamber && (
          <>
            <span>&middot;</span>
            <span className="capitalize">{chamber}</span>
          </>
        )}
        {assignee && (
          <>
            <span>&middot;</span>
            <span>{assignee}</span>
          </>
        )}
      </div>
    </div>
  );
}
