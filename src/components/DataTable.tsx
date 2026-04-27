import { useMemo, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { exportToCSV } from "@/lib/dataProcessing";

const PAGE_SIZE = 25;

export function DataTable() {
  const { filteredAggregates } = useAppContext();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<string>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    let rows = filteredAggregates;
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.date.includes(s) ||
          r.channelGroup.toLowerCase().includes(s) ||
          r.channelLabel.toLowerCase().includes(s) ||
          r.funnelFlow.toLowerCase().includes(s) ||
          (r.productType?.toLowerCase().includes(s)) ||
          (r.channelSubgroup?.toLowerCase().includes(s)) ||
          (r.projectName?.toLowerCase().includes(s))
      );
    }
    rows = [...rows].sort((a, b) => {
      const av = (a as any)[sortKey];
      const bv = (b as any)[sortKey];
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [filteredAggregates, search, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const columns = [
    { key: "date", label: "Data" },
    { key: "channelLabel", label: "Canale" },
    { key: "channelSubgroup", label: "Sotto-canale" },
    { key: "funnelFlow", label: "Funnel" },
    { key: "productType", label: "Prodotto" },
    { key: "projectName", label: "Progetto" },
    { key: "sociTotal", label: "Soci" },
    { key: "rowCount", label: "Righe" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Dati Aggregati Giornalieri</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Cerca..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-8 h-8 w-48 text-sm"
              />
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs"
              onClick={() => exportToCSV(filtered as any[], "aggregati_giornalieri.csv")}>
              <Download className="w-3 h-3 mr-1" /> CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="text-left px-4 py-2.5 font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors text-xs uppercase tracking-wider"
                    onClick={() => toggleSort(col.key)}
                  >
                    {col.label}
                    {sortKey === col.key && (sortDir === "asc" ? " ↑" : " ↓")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.map((row) => (
                <tr key={row.aggId} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2 font-mono text-xs">{row.date}</td>
                  <td className="px-4 py-2">{row.channelLabel}</td>
                  <td className="px-4 py-2 text-muted-foreground">{row.channelSubgroup ?? "—"}</td>
                  <td className="px-4 py-2">{row.funnelFlow}</td>
                  <td className="px-4 py-2">{row.productType ?? "—"}</td>
                  <td className="px-4 py-2">{row.projectName ?? "—"}</td>
                  <td className="px-4 py-2 font-semibold">{row.sociTotal.toLocaleString("it-IT")}</td>
                  <td className="px-4 py-2 text-muted-foreground">{row.rowCount}</td>
                </tr>
              ))}
              {pageData.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Nessun dato</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-xs text-muted-foreground">
              {filtered.length.toLocaleString("it-IT")} righe
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <span className="text-xs">{page + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" className="h-7" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
