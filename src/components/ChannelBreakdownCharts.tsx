import { useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import { FUNNEL_COLOR_MAP, PRODUCT_COLOR_MAP } from "@/lib/types";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ChannelBreakdownCharts() {
  const { filteredAggregates } = useAppContext();

  const channelTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of filteredAggregates) {
      const key = row.channelLabel;
      map.set(key, (map.get(key) ?? 0) + row.sociTotal);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredAggregates]);

  const funnelTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of filteredAggregates) {
      map.set(row.funnelFlow, (map.get(row.funnelFlow) ?? 0) + row.sociTotal);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value, fill: FUNNEL_COLOR_MAP[name] || "#94A3B8" }))
      .sort((a, b) => b.value - a.value);
  }, [filteredAggregates]);

  const productTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of filteredAggregates) {
      const pt = row.productType ?? "N/A";
      map.set(pt, (map.get(pt) ?? 0) + row.sociTotal);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value, fill: PRODUCT_COLOR_MAP[name] || "#94A3B8" }))
      .sort((a, b) => b.value - a.value);
  }, [filteredAggregates]);

  const monthlyStacked = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    for (const row of filteredAggregates) {
      const key = `${row.year}-${String(row.month).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, { month: parseInt(key.slice(5)) } as any);
      const entry = map.get(key)!;
      const pt = row.productType ?? "N/A";
      entry[pt] = (entry[pt] ?? 0) + row.sociTotal;
      (entry as any).monthLabel = key;
    }
    return Array.from(map.values()).sort((a: any, b: any) => a.monthLabel.localeCompare(b.monthLabel));
  }, [filteredAggregates]);

  const productKeys = [...new Set(filteredAggregates.map((r) => r.productType ?? "N/A"))];
  const COLORS = ["#2563EB", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#94A3B8", "#CBD5E1"];

  if (channelTotals.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Soci per Canale</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={channelTotals} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)", fontSize: 12 }} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                {channelTotals.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Soci per Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelTotals} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)", fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {funnelTotals.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Soci per Prodotto</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={productTotals} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)", fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {productTotals.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Distribuzione Mensile per Prodotto</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyStacked}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => v.slice(2)} />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {productKeys.map((pk, i) => (
                <Bar key={pk} dataKey={pk} stackId="a" fill={PRODUCT_COLOR_MAP[pk] || COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
