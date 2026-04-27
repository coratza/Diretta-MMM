import { useAppContext } from "@/context/AppContext";
import { FileUploadPanel } from "@/components/FileUploadPanel";
import { KpiCardsGrid } from "@/components/KpiCardsGrid";
import { GlobalFiltersBar } from "@/components/GlobalFiltersBar";
import { TimeSeriesChart } from "@/components/TimeSeriesChart";
import { ChannelBreakdownCharts } from "@/components/ChannelBreakdownCharts";
import { DataTable } from "@/components/DataTable";
import { DataQualityPanel } from "@/components/DataQualityPanel";
import { PivotView } from "@/components/PivotView";
import { MmmPerformanceView } from "@/components/MmmPerformanceView";
import { MappingRulesPanel } from "@/components/MappingRulesPanel";
import { ModelingReadinessPanel } from "@/components/ModelingReadinessPanel";
import { FutureUploadGrid } from "@/components/FutureUploadGrid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart3, Trash2 } from "lucide-react";

export default function Index() {
  const { state, clearAll } = useAppContext();
  const hasSalesData = state.cleanedRows.length > 0;
  const hasPerfData = state.performanceFacts.length > 0;
  const hasAnyData = hasSalesData || hasPerfData;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        {state.isQuotaExceeded && (
          <div className="bg-destructive text-destructive-foreground py-2 px-4 text-center text-xs font-bold animate-pulse">
            ATTENZIONE: Quota Firebase esaurita per oggi. I dati salvati potrebbero non essere visibili fino al reset di domani. 
            Puoi comunque caricare nuovi file o usare i dati demo in questa sessione.
          </div>
        )}
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Marketing Data Foundation</h1>
              <p className="text-[11px] text-muted-foreground">Dashboard analitica · Fase 1</p>
            </div>
          </div>
          {hasAnyData && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs text-muted-foreground">
              <Trash2 className="w-3 h-3 mr-1" /> Reset dati
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <FileUploadPanel />

        {hasAnyData ? (
          <>
            {hasSalesData && <KpiCardsGrid />}
            <GlobalFiltersBar />

            <Tabs defaultValue={hasSalesData ? "dashboard" : "performance"} className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto">
                {hasSalesData && <TabsTrigger value="dashboard">Dashboard</TabsTrigger>}
                {hasPerfData && <TabsTrigger value="performance">Metrica Call Center</TabsTrigger>}
                {hasSalesData && <TabsTrigger value="table">Tabella</TabsTrigger>}
                {hasSalesData && <TabsTrigger value="pivot">Pivot</TabsTrigger>}
                <TabsTrigger value="quality">
                  Qualità Dati
                  {state.dataQualityIssues.length > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                      {state.dataQualityIssues.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="mapping">Mapping</TabsTrigger>
                <TabsTrigger value="readiness">Readiness</TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="space-y-6 mt-4">
                <TimeSeriesChart />
                <ChannelBreakdownCharts />
              </TabsContent>

              <TabsContent value="performance" className="mt-4">
                <MmmPerformanceView />
              </TabsContent>

              <TabsContent value="table" className="mt-4">
                <DataTable />
              </TabsContent>

              <TabsContent value="pivot" className="mt-4">
                <PivotView />
              </TabsContent>

              <TabsContent value="quality" className="mt-4">
                <DataQualityPanel />
              </TabsContent>

              <TabsContent value="mapping" className="mt-4">
                <MappingRulesPanel />
              </TabsContent>

              <TabsContent value="readiness" className="space-y-6 mt-4">
                <ModelingReadinessPanel />
                <FutureUploadGrid />
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">
              Carica un file Excel (Vendite o Performance) per iniziare l'analisi.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
