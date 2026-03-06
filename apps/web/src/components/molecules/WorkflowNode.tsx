"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
import {
  Zap,
  GitBranch,
  Timer,
  Globe,
  Brain,
  Sparkles,
  Shuffle,
  Repeat,
  Send,
  PlusSquare,
  UserPlus,
  Bell,
  Users,
  Save,
  Clock,
  FileText,
  Play,
  Gauge,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { WorkflowNodeData } from "@/lib/mock-workflows";
import { NODE_CATEGORY_CONFIG } from "@/lib/mock-workflows";

const ICON_MAP: Record<string, LucideIcon> = {
  Zap,
  GitBranch,
  Timer,
  Globe,
  Brain,
  Sparkles,
  Shuffle,
  Repeat,
  Send,
  PlusSquare,
  UserPlus,
  Bell,
  Users,
  Save,
  Clock,
  FileText,
  Play,
  Gauge,
};

const NODE_TYPE_ICONS: Record<string, string> = {
  trigger: "Zap",
  branch: "GitBranch",
  delay: "Timer",
  fetch: "Globe",
  ai_classify: "Brain",
  ai_generate: "Sparkles",
  transform: "Shuffle",
  loop: "Repeat",
  send_message: "Send",
  create_task: "PlusSquare",
  assign: "UserPlus",
  notify: "Bell",
  route_to_pool: "Users",
  update_record: "Save",
  set_sla: "Clock",
  log_event: "FileText",
  start_workflow: "Play",
  batch: "Gauge",
  throttle: "Gauge",
  experiment: "Gauge",
  create_vault: "FileText",
  conversational_ask: "Send",
};

function WorkflowNodeComponent({
  data,
  selected,
}: NodeProps<Node<WorkflowNodeData>>) {
  const categoryCfg = NODE_CATEGORY_CONFIG[data.category];
  const iconName = NODE_TYPE_ICONS[data.nodeType] || "Zap";
  const Icon = ICON_MAP[iconName] || Zap;

  return (
    <div
      className={`
        min-w-[160px] rounded-lg border-2 px-3 py-2
        ${categoryCfg.bgColor} ${categoryCfg.borderColor}
        ${selected ? "ring-2 ring-accent-primary ring-offset-1 ring-offset-surface-base" : ""}
        transition-shadow
      `}
    >
      {/* Input handle */}
      {data.nodeType !== "trigger" && (
        <Handle
          type="target"
          position={Position.Top}
          className="!h-2.5 !w-2.5 !border-2 !border-surface-base !bg-text-muted"
        />
      )}

      {/* Node content */}
      <div className="flex items-center gap-2">
        <div
          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded ${categoryCfg.bgColor}`}
        >
          <Icon size={14} className={categoryCfg.color} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-text-primary">
            {data.label}
          </p>
          {data.description && (
            <p className="truncate text-[10px] text-text-muted">
              {data.description}
            </p>
          )}
        </div>
      </div>

      {/* Output handle(s) */}
      {data.nodeType === "branch" ? (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="path-0"
            className="!h-2.5 !w-2.5 !border-2 !border-surface-base !bg-accent-success"
            style={{ left: "30%" }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="path-1"
            className="!h-2.5 !w-2.5 !border-2 !border-surface-base !bg-accent-error"
            style={{ left: "70%" }}
          />
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!h-2.5 !w-2.5 !border-2 !border-surface-base !bg-text-muted"
        />
      )}
    </div>
  );
}

export default memo(WorkflowNodeComponent);
