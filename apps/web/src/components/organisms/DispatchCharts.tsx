"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, Metric, Text, Flex, ProgressBar } from "@tremor/react";

const PIPELINE_DATA = [
  { stage: "Prospect", count: 2, fill: "var(--color-accent-primary)" },
  { stage: "Discovery", count: 2, fill: "var(--color-accent-secondary)" },
  { stage: "Proposal", count: 1, fill: "var(--color-chamber-review)" },
  { stage: "Negotiate", count: 0, fill: "var(--color-accent-warning)" },
  { stage: "Close", count: 1, fill: "var(--color-accent-success)" },
];

const CHAMBER_DATA = [
  { name: "Discover", value: 4, color: "var(--color-chamber-discover)" },
  { name: "Build", value: 2, color: "var(--color-chamber-build)" },
  { name: "Review", value: 1, color: "var(--color-chamber-review)" },
  { name: "Ship", value: 1, color: "var(--color-chamber-ship)" },
];

const TASK_COMPLETION = { completed: 18, total: 24 };

export default function DispatchCharts() {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        Analytics
      </div>

      {/* Task Completion KPI */}
      <Card className="!bg-surface-raised !border-surface-border !ring-0">
        <Text className="!text-text-muted">Task Completion</Text>
        <Metric className="!text-text-primary">
          {TASK_COMPLETION.completed}/{TASK_COMPLETION.total}
        </Metric>
        <Flex className="mt-2">
          <Text className="!text-text-muted">
            {Math.round(
              (TASK_COMPLETION.completed / TASK_COMPLETION.total) * 100,
            )}
            %
          </Text>
        </Flex>
        <ProgressBar
          value={(TASK_COMPLETION.completed / TASK_COMPLETION.total) * 100}
          className="mt-2"
        />
      </Card>

      {/* Pipeline Bar Chart */}
      <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
        <div className="mb-2 text-xs font-medium text-text-secondary">
          Pipeline by Stage
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={PIPELINE_DATA} barSize={18}>
            <XAxis
              dataKey="stage"
              tick={{ fill: "var(--color-text-muted)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                background: "var(--color-surface-overlay)",
                border: "1px solid var(--color-surface-border)",
                borderRadius: 8,
                color: "var(--color-text-primary)",
                fontSize: 12,
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {PIPELINE_DATA.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chamber Donut */}
      <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
        <div className="mb-2 text-xs font-medium text-text-secondary">
          Vaults by Chamber
        </div>
        <div className="flex items-center justify-between">
          <ResponsiveContainer width={100} height={100}>
            <PieChart>
              <Pie
                data={CHAMBER_DATA}
                dataKey="value"
                innerRadius={28}
                outerRadius={42}
                paddingAngle={3}
                strokeWidth={0}
              >
                {CHAMBER_DATA.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1.5 text-[11px]">
            {CHAMBER_DATA.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-text-secondary">{d.name}</span>
                <span className="ml-auto font-medium text-text-primary">
                  {d.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
