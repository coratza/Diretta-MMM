import { useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Minus } from "lucide-react";

interface ReadinessCheck {
  label: string;
  status: "ready" | "partial" | "missing" | "na";
  detail: string;
}

export function ModelingReadinessPanel() {
  const { state, filteredRows } = useAppContext();

  const checks = useMemo((): ReadinessCheck[] => {
    const rows = state.cleanedRows;
    const totalRows = rows.length;
    const validDates = rows.filter((r) => r.date).length;
    const classified = rows.filter((r) => r.channelGroup !== "Da verificare").length;
    const duplicates = rows.filter((r) => r.isDuplicateCandidate).length;
    const dates = [...new Set(rows.map((r) => r.date).filter(Boolean))].sort();
    const channels = [...new Set(rows.map((r) => r.channelGroup))];

    const dateCoverage = totalRows > 0 ? (validDates / totalRows) * 100 : 0;
    const classifiedPct = totalRows > 0 ? (classified / totalRows) * 100 : 0;
    const duplicatePct = totalRows > 0 ? (duplicates / totalRows) * 100 : 0;

    // Check temporal continuity
    let gapDays = 0;
    if (dates.length > 1) {
      for (let i = 1; i < dates.length; i++) {
        const d1 = new Date(dates[i - 1]!);
        const d2 = new Date(dates[i]!);
        const diff = (d2.getTime() - d1.getTime()) / 86400000;
        if (diff > 1) gapDays += diff - 1;
      }
    }

    return [
      {
        label: "Date valide",
        status: dateCoverage >= 95 ? "ready" : dateCoverage >= 80 ? "partial" : "missing",
        detail: `${dateCoverage.toFixed(1)}% delle righe hanno data valida`,
      },
      {
        label: "Performance Call Center",
        status: state.performanceFacts.length > 0 ? "ready" : "missing",
        detail: state.performanceFacts.length > 0 ? `${state.performanceFacts.length} giorni di performance caricati` : "Mancano Chiamate e Retention (RED)",
      },
      {
        label: "Classificazione canali",
        status: classifiedPct >= 90 ? "ready" : classifiedPct >= 70 ? "partial" : "missing",
        detail: `${classifiedPct.toFixed(1)}% classificati (${channels.length} canali)`,
      },
      {
        label: "Duplicati candidati",
        status: duplicatePct < 2 ? "ready" : duplicatePct < 10 ? "partial" : "missing",
        detail: `${duplicatePct.toFixed(1)}% possibili duplicati (${duplicates} righe)`,
      },
      {
        label: "Continuità temporale",
        status: gapDays === 0 ? "ready" : gapDays < 10 ? "partial" : "missing",
        detail: gapDays === 0 ? "Nessun gap temporale" : `${gapDays} giorni mancanti`,
      },
      {
        label: "Copertura temporale",
        status: dates.length > 180 ? "ready" : dates.length > 30 ? "partial" : "missing",
        detail: `${dates.length} giorni coperti`,
      },
      { label: "Media spend (Ads)", status: "na", detail: "Da caricare nella Fase 3" },
      { label: "Revenue & ROI", status: "na", detail: "Da caricare nella Fase 4" },
    ];
  }, [state.cleanedRows, state.performanceFacts.length]);

  const readyCount = checks.filter((c) => c.status === "ready").length;
  const applicableChecks = checks.filter((c) => c.status !== "na").length;
  const overallStatus = readyCount === applicableChecks
    ? "Ready for economic analysis"
    : readyCount >= applicableChecks * 0.6
    ? "Partially ready"
    : "Not ready";

  const STATUS_ICON = {
    ready: <CheckCircle2 className="w-4 h-4 text-success" />,
    partial: <AlertTriangle className="w-4 h-4 text-warning" />,
    missing: <XCircle className="w-4 h-4 text-destructive" />,
    na: <Minus className="w-4 h-4 text-muted-foreground" />,
  };

  const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    "Ready for economic analysis": "default",
    "Partially ready": "secondary",
    "Not ready": "destructive",
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Modeling Readiness</CardTitle>
          <Badge variant={STATUS_BADGE[overallStatus] || "outline"} className="text-xs">
            {overallStatus}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Questa app costruisce una base dati affidabile. Solo dopo l'integrazione di spend, revenue e variabili di controllo
          si potrà parlare di dataset pronto per MMM.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {checks.map((check) => (
            <div key={check.label} className="flex items-center gap-3">
              {STATUS_ICON[check.status]}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{check.label}</p>
                <p className="text-xs text-muted-foreground">{check.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
