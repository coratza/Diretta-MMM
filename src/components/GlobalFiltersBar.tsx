import { useAppContext } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, RotateCcw, Download } from "lucide-react";
import { exportToCSV } from "@/lib/dataProcessing";

export function GlobalFiltersBar() {
  const { state, setFilters, resetFilters, filteredRows, availableFilterValues } = useAppContext();
  const f = state.filters;
  const hasFilters = f.years.length || f.months.length || f.projectNames.length ||
    f.channelGroups.length || f.channelSubgroups.length || f.channelLabels.length ||
    f.funnelFlows.length || f.productTypes.length ||
    f.sourceFiles.length || f.sourceSheets.length ||
    f.dateRange[0] || f.dateRange[1];

  const toggleFilter = (key: keyof typeof f, value: any) => {
    const current = f[key] as any[];
    if (Array.isArray(current)) {
      const next = current.includes(value) ? current.filter((v: any) => v !== value) : [...current, value];
      setFilters({ [key]: next });
    }
  };

  const FilterSection = ({ label, options, filterKey }: { label: string; options: (string | number)[]; filterKey: keyof typeof f }) => {
    if (options.length <= 1) return null;
    const active = f[filterKey] as any[];
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-muted-foreground mr-1">{label}:</span>
        {options.slice(0, 10).map((opt) => (
          <Badge
            key={String(opt)}
            variant={active.includes(opt) ? "default" : "outline"}
            className="cursor-pointer text-xs py-0.5 px-2 transition-colors"
            onClick={() => toggleFilter(filterKey, opt)}
          >
            {String(opt)}
          </Badge>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-2 p-3 bg-card rounded-lg border">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Filtri</span>
        <div className="flex gap-2">
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-xs">
              <RotateCcw className="w-3 h-3 mr-1" /> Reset
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-7 text-xs"
            onClick={() => exportToCSV(filteredRows as any[], "vista_filtrata.csv")}>
            <Download className="w-3 h-3 mr-1" /> Export
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <FilterSection label="Anno" options={availableFilterValues.years} filterKey="years" />
        <FilterSection label="Canale" options={availableFilterValues.channelLabels} filterKey="channelLabels" />
        <FilterSection label="Funnel" options={availableFilterValues.funnelFlows} filterKey="funnelFlows" />
        <FilterSection label="Prodotto" options={availableFilterValues.productTypes} filterKey="productTypes" />
        <FilterSection label="Sotto-canale" options={availableFilterValues.channelSubgroups} filterKey="channelSubgroups" />
        <FilterSection label="Progetto" options={availableFilterValues.projectNames} filterKey="projectNames" />
      </div>
      {hasFilters && (
        <div className="flex flex-wrap gap-1 pt-1">
          {Object.entries(f).map(([key, val]) => {
            if (!Array.isArray(val) || val.length === 0) return null;
            return val.map((v: any) => (
              <Badge key={`${key}-${v}`} variant="secondary" className="text-xs gap-1">
                {String(v)}
                <X className="w-3 h-3 cursor-pointer" onClick={() => toggleFilter(key as any, v)} />
              </Badge>
            ));
          })}
        </div>
      )}
    </div>
  );
}