"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { MOCK_DOSSIERS, type MemberDossier } from "@/lib/mock-dossier";

// Hex values for SVG contexts where CSS vars don't resolve (Recharts limitation)
const ARCHETYPE_HEX: Record<string, string> = {
  driver: "#6366F1",
  enforcer: "#F59E0B",
  interpreter: "#22C55E",
};

interface StarPoint {
  x: number;
  y: number;
  name: string;
  profile: string;
  archetype: string;
  confidence: number;
  size: number;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: StarPoint }>;
}) {
  if (!active || !payload?.[0]) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised px-3 py-2 shadow-lg">
      <p className="text-sm font-semibold text-text-primary">{data.name}</p>
      <p className="text-xs capitalize text-text-secondary">
        {data.profile} &middot; {data.archetype}
      </p>
      <p className="text-[10px] text-text-muted">
        D:{data.x} E:{data.y} &middot; {Math.round(data.confidence * 100)}%
      </p>
    </div>
  );
}

export default function ConstellationMap() {
  const dossiers = Object.values(MOCK_DOSSIERS);

  const data: StarPoint[] = dossiers.map((d: MemberDossier) => ({
    x: d.drives.dominance,
    y: d.drives.extraversion,
    name: d.name,
    profile: d.piProfile,
    archetype: d.metaArchetype,
    confidence: d.confidence,
    size: Math.max(80, d.confidence * 200),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Team Constellation
          </h2>
          <p className="mt-0.5 text-sm text-text-secondary">
            {dossiers.length} members mapped by behavioral drives
          </p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4">
          {Object.entries(ARCHETYPE_HEX).map(([arch, color]) => (
            <div key={arch} className="flex items-center gap-1.5">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs capitalize text-text-muted">{arch}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="rounded-lg border border-surface-border bg-surface-raised p-4"
        style={{ height: 500 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
            />
            <XAxis
              type="number"
              dataKey="x"
              name="Dominance"
              domain={[0, 10]}
              ticks={[0, 2, 4, 6, 8, 10]}
              tick={{ fill: "#64748B", fontSize: 11 }}
              label={{
                value: "Dominance",
                position: "bottom",
                fill: "#64748B",
                fontSize: 12,
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Extraversion"
              domain={[0, 10]}
              ticks={[0, 2, 4, 6, 8, 10]}
              tick={{ fill: "#64748B", fontSize: 11 }}
              label={{
                value: "Extraversion",
                angle: -90,
                position: "insideLeft",
                fill: "#64748B",
                fontSize: 12,
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Scatter data={data}>
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={ARCHETYPE_HEX[entry.archetype] || "#6366F1"}
                  r={Math.sqrt(entry.size / Math.PI)}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
