import { useMemo, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { CHANNEL_COLOR_MAP } from "@/lib/types";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Brush, Area, AreaChart,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PRESETS = [
  { label: "30gg", days: 30 },
  { label: "90gg", days: 90 },
  { label: "YTD", days: -1 },
  { label: "Tutto", days: 0 },
];

export function TimeSeriesChart() {
  const { filteredPivot } = useAppContext();
  const [preset, setPreset] = useState(0); // all
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  const data = useMemo(() => {
    if (filteredPivot.length === 0) return [];
    let rows = [...filteredPivot];
    const p = PRESETS[preset];
    if (p.days > 0) {
      const last = rows[rows.length - 1]?.date;
      if (last) {
        const cutoff = new Date(last);
        cutoff.setDate(cutoff.getDate() - p.days);
        const cutoffStr = cutoff.toISOString().slice(0, 10);
        rows = rows.filter((r) => r.date >= cutoffStr);
      }
    } else if (p.days === -1) {
      const last = rows[rows.length - 1];
      if (last) {
        rows = rows.filter((r) => r.year === last.year);
      }
    }
    return rows;
  }, [filteredPivot, preset]);

  const series = ["SEA", "Bing", "Organico", "Discovery", "PMC_Cart_Rec", "PMC_CTC", "Non_assegnabile", "Da_verificare"];

  const toggleSeries = (key: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Trend Soci per Canale</CardTitle>
          <div className="flex gap-1">
            {PRESETS.map((p, i) => (
              <Button
                key={p.label}
                variant={preset === i ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs px-3"
                onClick={() => setPreset(i)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => v.slice(5)}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
                fontSize: 12,
              }}
            />
            <Legend
              onClick={(e) => toggleSeries(e.dataKey as string)}
              wrapperStyle={{ cursor: "pointer", fontSize: 12 }}
            />
            {series
              .filter((s) => !hiddenSeries.has(s))
              .map((s) => (
                <Area
                  key={s}
                  type="monotone"
                  dataKey={s}
                  stroke={CHANNEL_COLOR_MAP[s] || "#94A3B8"}
                  fill={CHANNEL_COLOR_MAP[s] || "#94A3B8"}
                  fillOpacity={0.1}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            <Brush
              dataKey="date"
              height={30}
              stroke="hsl(var(--primary))"
              tickFormatter={(v) => v.slice(5)}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
