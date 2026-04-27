import { useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Users, CalendarDays, Layers, AlertTriangle, FileSpreadsheet, TrendingUp, CheckCircle2, BarChart3, Globe, Phone, ShoppingCart, Award, Scale, Ban } from "lucide-react";

interface KpiItem {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  sub?: string;
}

export function KpiCardsGrid() {
  const { filteredRows, state } = useAppContext();

  const kpis = useMemo((): KpiItem[] => {
    const totalSoci = filteredRows.reduce((s, r) => s + (r.soci ?? 0), 0);
    const uniqueDates = new Set(filteredRows.map((r) => r.date).filter(Boolean));
    const channels = new Set(filteredRows.map((r) => r.channelGroup));
    const classified = filteredRows.filter((r) => r.channelGroup !== "Da verificare").length;
    const pctClassified = filteredRows.length > 0 ? Math.round((classified / filteredRows.length) * 100) : 0;
    const unclassified = filteredRows.filter((r) => r.channelGroup === "Da verificare").length;

    const sociDigital = filteredRows.filter((r) => r.funnelFlow === "Digital").reduce((s, r) => s + (r.soci ?? 0), 0);
    const sociCallCenter = filteredRows.filter((r) => r.funnelFlow === "Call Center").reduce((s, r) => s + (r.soci ?? 0), 0);
    const sociAcquisti = filteredRows.filter((r) => r.productType === "Acquisti").reduce((s, r) => s + (r.soci ?? 0), 0);
    const sociSuperior = filteredRows.filter((r) => r.productType === "Superior").reduce((s, r) => s + (r.soci ?? 0), 0);
    const sociLegal = filteredRows.filter((r) => r.productType === "Legal").reduce((s, r) => s + (r.soci ?? 0), 0);

    const excludedTotal = state.cleanedRows.filter((r) => r.excludedTotalRow).length;
    const pctExcluded = state.cleanedRows.length > 0 ? Math.round((excludedTotal / state.cleanedRows.length) * 100) : 0;

    const dates = [...uniqueDates].filter(Boolean).sort();
    const last30 = dates.length > 0 ? dates[dates.length - 1] : null;
    let soci30 = 0;
    if (last30) {
      const cutoff = new Date(last30);
      cutoff.setDate(cutoff.getDate() - 30);
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      soci30 = filteredRows.filter((r) => r.date && r.date >= cutoffStr).reduce((s, r) => s + (r.soci ?? 0), 0);
    }

    return [
      { label: "Soci Totali", value: totalSoci.toLocaleString("it-IT"), icon: <Users className="w-5 h-5" />, color: "text-primary", sub: "conversioni nette" },
      { label: "Ultimi 30 gg", value: soci30.toLocaleString("it-IT"), icon: <TrendingUp className="w-5 h-5" />, color: "text-accent" },
      { label: "Digital", value: sociDigital.toLocaleString("it-IT"), icon: <Globe className="w-5 h-5" />, color: "text-primary", sub: "funnel sito" },
      { label: "Call Center", value: sociCallCenter.toLocaleString("it-IT"), icon: <Phone className="w-5 h-5" />, color: "text-destructive", sub: "funnel CC" },
      { label: "Acquisti", value: sociAcquisti.toLocaleString("it-IT"), icon: <ShoppingCart className="w-5 h-5" />, color: "text-success" },
      { label: "Superior", value: sociSuperior.toLocaleString("it-IT"), icon: <Award className="w-5 h-5" />, color: "text-accent" },
      { label: "Legal", value: sociLegal.toLocaleString("it-IT"), icon: <Scale className="w-5 h-5" />, color: "text-warning" },
      { label: "Giorni Coperti", value: uniqueDates.size, icon: <CalendarDays className="w-5 h-5" />, color: "text-info" },
      { label: "Canali", value: channels.size, icon: <Layers className="w-5 h-5" />, color: "text-info" },
      { label: "Classificati", value: `${pctClassified}%`, icon: <CheckCircle2 className="w-5 h-5" />, color: "text-success" },
      { label: "Da Verificare", value: unclassified, icon: <AlertTriangle className="w-5 h-5" />, color: "text-warning" },
      { label: "Righe Escluse", value: `${excludedTotal} (${pctExcluded}%)`, icon: <Ban className="w-5 h-5" />, color: "text-muted-foreground", sub: "totali/subtotali" },
      { label: "File Caricati", value: state.imports.length, icon: <FileSpreadsheet className="w-5 h-5" />, color: "text-muted-foreground" },
      { label: "Sheet Importati", value: state.imports.reduce((s, i) => s + i.sheetCount, 0), icon: <BarChart3 className="w-5 h-5" />, color: "text-muted-foreground" },
    ];
  }, [filteredRows, state.imports, state.cleanedRows]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="animate-fade-in">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className={kpi.color}>{kpi.icon}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
            {kpi.sub && <p className="text-[10px] text-muted-foreground">{kpi.sub}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}