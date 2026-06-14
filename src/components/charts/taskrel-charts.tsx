"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Surface } from "@/components/ui/surface";
import { formatCurrency } from "@/lib/format";
import type { ChartPoint } from "@/lib/insights";

const palette = ["#8fb3ff", "#66d19e", "#f5b86b", "#a78bfa", "#f87171"];

function tooltipStyle() {
  return {
    background: "#111827",
    border: "1px solid rgba(148,163,184,.26)",
    borderRadius: 10,
    color: "#f8fafc",
  };
}

export function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Surface className="p-4">
      <div className="mb-4">
        <h3 className="text-base font-bold text-white">{title}</h3>
        {subtitle && <p className="text-sm text-[var(--tr-text-muted)]">{subtitle}</p>}
      </div>
      <div className="h-56 min-w-0">{children}</div>
    </Surface>
  );
}

export function RevenueAreaChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="#66d19e" stopOpacity={0.46} />
            <stop offset="95%" stopColor="#66d19e" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(148,163,184,.13)" vertical={false} />
        <XAxis dataKey="label" stroke="#7c879d" tickLine={false} axisLine={false} />
        <YAxis stroke="#7c879d" tickLine={false} axisLine={false} tickFormatter={value => `$${Number(value) / 1000}k`} width={42} />
        <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={tooltipStyle()} />
        <Area type="monotone" dataKey="value" stroke="#66d19e" strokeWidth={3} fill="url(#revenueGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ValueBarChart({ data, currency = true }: { data: ChartPoint[]; currency?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid stroke="rgba(148,163,184,.13)" vertical={false} />
        <XAxis dataKey="label" stroke="#7c879d" tickLine={false} axisLine={false} />
        <YAxis stroke="#7c879d" tickLine={false} axisLine={false} tickFormatter={value => currency ? `$${Number(value) / 1000}k` : String(value)} width={42} />
        <Tooltip formatter={(value) => currency ? formatCurrency(Number(value)) : Number(value)} contentStyle={tooltipStyle()} />
        <Bar dataKey="value" radius={[8, 8, 3, 3]}>
          {data.map((_, index) => (
            <Cell key={index} fill={palette[index % palette.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PipelineDonut({ data }: { data: ChartPoint[] }) {
  const filtered = data.filter(point => point.value > 0);
  if (filtered.length === 0) {
    return (
      <div className="grid h-full place-items-center rounded-xl border border-dashed border-[var(--tr-border)] text-sm text-[var(--tr-text-faint)]">
        No quote value yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={filtered} dataKey="value" nameKey="label" innerRadius="58%" outerRadius="82%" paddingAngle={3}>
          {filtered.map((_, index) => (
            <Cell key={index} fill={palette[index % palette.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={tooltipStyle()} />
      </PieChart>
    </ResponsiveContainer>
  );
}
