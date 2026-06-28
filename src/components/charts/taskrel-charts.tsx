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

const palette = ["#8ea8ff", "#6ea8c7", "#72c48f", "#a8a1c7", "#d56d62"];

function formatAxisCurrency(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "$0";
  const absolute = Math.abs(amount);

  if (absolute >= 1_000_000) {
    const compact = amount / 1_000_000;
    return `$${Number.isInteger(compact) ? compact.toFixed(0) : compact.toFixed(1)}m`;
  }

  if (absolute >= 1_000) {
    const compact = amount / 1_000;
    return `$${Number.isInteger(compact) ? compact.toFixed(0) : compact.toFixed(1)}k`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function tooltipStyle() {
  return {
    background: "oklch(0.155 0.02 255)",
    border: "1px solid rgba(226,232,240,.16)",
    borderRadius: 8,
    color: "oklch(0.955 0.006 255)",
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
        <h3 className="text-base font-bold text-[var(--tr-text)]">{title}</h3>
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
        <CartesianGrid stroke="rgba(226,232,240,.11)" vertical={false} />
        <XAxis dataKey="label" stroke="#8793a8" tickLine={false} axisLine={false} />
        <YAxis stroke="#8793a8" tickLine={false} axisLine={false} tickFormatter={formatAxisCurrency} width={54} />
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
        <CartesianGrid stroke="rgba(226,232,240,.11)" vertical={false} />
        <XAxis dataKey="label" stroke="#8793a8" tickLine={false} axisLine={false} />
        <YAxis stroke="#8793a8" tickLine={false} axisLine={false} tickFormatter={value => currency ? formatAxisCurrency(value) : String(value)} width={54} />
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
      <div className="grid h-full place-items-center rounded-lg border border-dashed border-[var(--tr-border)] text-sm text-[var(--tr-text-faint)]">
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
