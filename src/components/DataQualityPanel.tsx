import { useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, AlertTriangle, AlertCircle, Info, Ban } from "lucide-react";
import { exportToCSV } from "@/lib/dataProcessing";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SEVERITY_ICON: Record<string, React.ReactNode> = {
  error: <AlertCircle className="w-4 h-4 text-destructive" />,
  warning: <AlertTriangle className="w-4 h-4 text-warning" />,
  info: <Info className="w-4 h-4 text-info" />,
};

const SEVERITY_VARIANT: Record<string, "destructive" | "secondary" | "outline"> = {
  error: "destructive",
  warning: "secondary",
  info: "outline",
};

export function DataQualityPanel() {
  const { state } = useAppContext();
  const issues = state.dataQualityIssues;
  const unclassified = state.cleanedRows.filter((r) => r.channelGroup === "Da verificare" && !r.excludedTotalRow);
  const duplicates = state.cleanedRows.filter((r) => r.isDuplicateCandidate && !r.excludedTotalRow);
  const excludedRows = state.cleanedRows.filter((r) => r.excludedTotalRow);
  const noProduct = state.cleanedRows.filter((r) => !r.excludedTotalRow && r.funnelFlow === "Digital" && r.productType === "Da verificare");

  const summary = useMemo(() => ({
    errors: issues.filter((i) => i.issueSeverity === "error").length,
    warnings: issues.filter((i) => i.issueSeverity === "warning").length,
    infos: issues.filter((i) => i.issueSeverity === "info").length,
    unclassified: unclassified.length,
    duplicates: duplicates.length,
    excluded: excludedRows.length,
    noProduct: noProduct.length,
  }), [issues, unclassified, duplicates, excludedRows, noProduct]);

  if (issues.length === 0 && unclassified.length === 0 && excludedRows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Nessun problema di qualità dati rilevato ✓</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        {summary.errors > 0 && <Badge variant="destructive">{summary.errors} errori</Badge>}
        {summary.warnings > 0 && <Badge variant="secondary">{summary.warnings} avvisi</Badge>}
        {summary.unclassified > 0 && <Badge variant="outline">{summary.unclassified} non classificati</Badge>}
        {summary.duplicates > 0 && <Badge variant="outline">{summary.duplicates} possibili duplicati</Badge>}
        {summary.excluded > 0 && <Badge variant="outline">{summary.excluded} righe escluse (totali)</Badge>}
        {summary.noProduct > 0 && <Badge variant="outline">{summary.noProduct} prodotto non derivabile</Badge>}
      </div>

      <Tabs defaultValue="issues">
        <TabsList>
          <TabsTrigger value="issues">Problemi ({issues.length})</TabsTrigger>
          <TabsTrigger value="unclassified">Non classificati ({unclassified.length})</TabsTrigger>
          <TabsTrigger value="excluded">Righe Escluse ({excludedRows.length})</TabsTrigger>
          <TabsTrigger value="noProduct">Prodotto N/D ({noProduct.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="issues">
          {issues.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Problemi di Qualità Dati</CardTitle>
                  <Button variant="outline" size="sm" className="h-7 text-xs"
                    onClick={() => exportToCSV(issues as any[], "data_quality_issues.csv")}>
                    <Download className="w-3 h-3 mr-1" /> CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto scrollbar-thin max-h-96">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs uppercase text-muted-foreground">Severità</th>
                        <th className="text-left px-4 py-2 text-xs uppercase text-muted-foreground">Tipo</th>
                        <th className="text-left px-4 py-2 text-xs uppercase text-muted-foreground">Messaggio</th>
                        <th className="text-left px-4 py-2 text-xs uppercase text-muted-foreground">File</th>
                        <th className="text-left px-4 py-2 text-xs uppercase text-muted-foreground">Sheet</th>
                        <th className="text-left px-4 py-2 text-xs uppercase text-muted-foreground">Riga</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issues.slice(0, 100).map((issue) => (
                        <tr key={issue.issueId} className="border-t border-border hover:bg-muted/30">
                          <td className="px-4 py-2">{SEVERITY_ICON[issue.issueSeverity]}</td>
                          <td className="px-4 py-2">
                            <Badge variant={SEVERITY_VARIANT[issue.issueSeverity]} className="text-xs">{issue.issueType}</Badge>
                          </td>
                          <td className="px-4 py-2 text-xs">{issue.issueMessage}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground font-mono">{issue.sourceFile}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">{issue.sourceSheet}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">{issue.sourceRowIndex}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="unclassified">
          {unclassified.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Record Non Classificati ({unclassified.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto scrollbar-thin max-h-64">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs uppercase text-muted-foreground">Data</th>
                        <th className="text-left px-4 py-2 text-xs uppercase text-muted-foreground">Web Code</th>
                        <th className="text-left px-4 py-2 text-xs uppercase text-muted-foreground">Promozione</th>
                        <th className="text-left px-4 py-2 text-xs uppercase text-muted-foreground">Motivo</th>
                        <th className="text-left px-4 py-2 text-xs uppercase text-muted-foreground">Soci</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unclassified.slice(0, 50).map((row) => (
                        <tr key={row.cleanRowId} className="border-t border-border hover:bg-muted/30">
                          <td className="px-4 py-2 font-mono text-xs">{row.date ?? "—"}</td>
                          <td className="px-4 py-2 text-xs">{row.webCodeEcom ?? "—"}</td>
                          <td className="px-4 py-2 text-xs">{row.promotionActionName ?? "—"}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">{row.classificationReason}</td>
                          <td className="px-4 py-2 text-xs font-semibold">{row.soci ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="excluded">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Ban className="w-4 h-4" /> Righe Escluse — Totali / Subtotali ({excludedRows.length})
                </CardTitle>
                <Button variant="outline" size="sm" className="h-7 text-xs"
                  onClick={() => exportToCSV(excludedRows as any[], "righe_escluse_totali.csv")}>
                  <Download className="w-3 h-3 mr-1" /> CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto scrollbar-thin max-h-96">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs uppercase text-muted-foreground">File</th>
                      <th className="text-left px-4 py-2 text-xs uppercase text-muted-foreground">Sheet</th>
                      <th className="text-left px-4 py-2 text-xs uppercase text-muted-foreground">Riga</th>
                      <th className="text-left px-4 py-2 text-xs uppercase text-muted-foreground">Motivo esclusione</th>
                      <th className="text-left px-4 py-2 text-xs uppercase text-muted-foreground">Progetto</th>
                      <th className="text-left px-4 py-2 text-xs uppercase text-muted-foreground">Soci</th>
                    </tr>
                  </thead>
                  <tbody>
                    {excludedRows.slice(0, 100).map((row) => (
                      <tr key={row.cleanRowId} className="border-t border-border hover:bg-muted/30">
                        <td className="px-4 py-2 text-xs font-mono text-muted-foreground">{row.sourceFile}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{row.sourceSheet}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{row.sourceRowIndex}</td>
                        <td className="px-4 py-2 text-xs">{row.exclusionReason}</td>
                        <td className="px-4 py-2 text-xs">{row.projectName ?? "—"}</td>
                        <td className="px-4 py-2 text-xs font-semibold">{row.soci ?? "—"}</td>
                      </tr>
                    ))}
                    {excludedRows.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Nessuna riga esclusa</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="noProduct">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Prodotto Non Derivabile ({noProduct.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto scrollbar-thin max-h-64">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs uppercase text-muted-foreground">Data</th>
                      <th className="text-left px-4 py-2 text-xs uppercase text-muted-foreground">Canale</th>
                      <th className="text-left px-4 py-2 text-xs uppercase text-muted-foreground">Web Code</th>
                      <th className="text-left px-4 py-2 text-xs uppercase text-muted-foreground">Funnel</th>
                      <th className="text-left px-4 py-2 text-xs uppercase text-muted-foreground">Soci</th>
                    </tr>
                  </thead>
                  <tbody>
                    {noProduct.slice(0, 50).map((row) => (
                      <tr key={row.cleanRowId} className="border-t border-border hover:bg-muted/30">
                        <td className="px-4 py-2 font-mono text-xs">{row.date ?? "—"}</td>
                        <td className="px-4 py-2 text-xs">{row.channelLabel}</td>
                        <td className="px-4 py-2 text-xs">{row.webCodeEcom ?? "—"}</td>
                        <td className="px-4 py-2 text-xs">{row.funnelFlow}</td>
                        <td className="px-4 py-2 text-xs font-semibold">{row.soci ?? "—"}</td>
                      </tr>
                    ))}
                    {noProduct.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Nessuna riga</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}