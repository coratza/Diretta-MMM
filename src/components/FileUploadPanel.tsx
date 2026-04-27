import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, AlertCircle, Trash2, BarChart3, Loader2, CheckCircle2 } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function FileUploadPanel() {
  const { uploadFile, removeImport, state } = useAppContext();
  const [salesDragOver, setSalesDragOver] = useState(false);
  const [perfDragOver, setPerfDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    setError(null);
    for (const file of Array.from(files)) {
      try {
        await uploadFile(file);
      } catch (e: any) {
        setError(`Errore nel caricamento di ${file.name}: ${e.message}`);
      }
    }
  }, [uploadFile]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sales Dropzone */}
        <Card 
          className={cn(
            "border-dashed border-2 transition-all duration-200 cursor-pointer overflow-hidden group",
            salesDragOver ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/50"
          )}
          onDragOver={(e) => { e.preventDefault(); setSalesDragOver(true); }}
          onDragLeave={() => setSalesDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setSalesDragOver(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.multiple = true;
            input.accept = ".xlsx,.xls,.csv";
            input.onchange = () => handleFiles(input.files);
            input.click();
          }}
        >
          <CardContent className="p-8 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-base">Update Vendite (Aggiornamento Diretta)</h4>
              <p className="text-sm text-muted-foreground mt-1">Carica qui il file con i dati vendita 2023-2026</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-2">.xlsx, .xls, .csv</p>
            </div>
          </CardContent>
        </Card>

        {/* Performance Dropzone */}
        <Card 
          className={cn(
            "border-dashed border-2 transition-all duration-200 cursor-pointer overflow-hidden group",
            perfDragOver ? "border-orange-500 bg-orange-500/5 ring-2 ring-orange-500/20" : "border-muted-foreground/20 hover:border-orange-500/50 hover:bg-muted/50"
          )}
          onDragOver={(e) => { e.preventDefault(); setPerfDragOver(true); }}
          onDragLeave={() => setPerfDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setPerfDragOver(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.multiple = true;
            input.accept = ".xlsx,.xls,.csv";
            input.onchange = () => handleFiles(input.files);
            input.click();
          }}
        >
          <CardContent className="p-8 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-base">Performance Call Center (RED)</h4>
              <p className="text-sm text-muted-foreground mt-1">Carica qui Chiamate, Retention e Conversioni</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-2">.xlsx, .xls, .csv</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {state.isProcessing && (
        <Card className="border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-2 duration-300">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm font-medium">Elaborazione file in corso...</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Fase: Caricamento Cloud</span>
            </div>
            <Progress value={undefined} className="h-1.5" />
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20 animate-in shake duration-500">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {state.imports.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Cronologia Caricamenti ({state.imports.length})
            </h4>
          </div>
          <div className="grid gap-2">
            {state.imports.map((imp) => {
              const isDeleting = imp.status === "deleting";
              return (
                <div 
                  key={imp.importId} 
                  className={cn(
                    "group flex items-center justify-between p-3 rounded-lg border bg-card/50 transition-all hover:bg-card hover:shadow-sm",
                    isDeleting ? "opacity-40 grayscale pointer-events-none" : ""
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "p-2 rounded shrink-0",
                      imp.fileType === "standard_sales" ? "bg-blue-500/10 text-blue-600" : "bg-orange-500/10 text-orange-600"
                    )}>
                      {imp.fileType === "standard_sales" ? <FileSpreadsheet className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate flex items-center gap-2">
                        {imp.fileName}
                        {imp.status === "completed" && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {imp.uploadedAt.toLocaleDateString("it-IT", { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} 
                        <span className="mx-1">•</span> 
                        {imp.rowCount.toLocaleString()} record
                      </p>
                    </div>
                  </div>
                  {!isDeleting && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImport(imp.importId)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
