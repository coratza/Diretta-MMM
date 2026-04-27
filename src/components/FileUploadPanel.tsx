import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, AlertCircle, Trash2 } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function FileUploadPanel() {
  const { uploadFile, removeImport, state, loadMockData } = useAppContext();
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    setError(null);
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["xlsx", "xls", "csv"].includes(ext || "")) {
        setError(`Formato non supportato: ${file.name}. Usa .xlsx, .xls o .csv`);
        continue;
      }
      try {
        await uploadFile(file);
      } catch (e: any) {
        setError(`Errore nel parsing di ${file.name}: ${e.message}`);
      }
    }
  }, [uploadFile]);

  const hasData = state.cleanedRows.length > 0;

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, imp: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm(`Sei sicuro di voler eliminare i dati di ${imp.fileName}?`)) {
      return;
    }

    setDeletingId(imp.importId);
    try {
      await removeImport(imp.importId);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Errore durante l'eliminazione.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card className="border-dashed border-2 transition-colors duration-200"
      style={{ borderColor: dragOver ? "hsl(var(--primary))" : undefined }}>
    <CardContent className="p-6">
        <div
          className="flex flex-col items-center gap-4 py-8 cursor-pointer"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.multiple = true;
            input.accept = ".xlsx,.xls,.csv";
            input.onchange = () => handleFiles(input.files);
            input.click();
          }}
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">
              {state.isProcessing ? "Elaborazione in corso..." : "Carica file Excel o CSV"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Trascina qui i file o clicca per selezionarli
            </p>
            <p className="text-xs text-muted-foreground mt-1">.xlsx, .xls, .csv</p>
          </div>
          {state.isProcessing && (
            <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse-subtle" style={{ width: "60%" }} />
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {state.imports.length > 0 && (
          <div className="mt-6 space-y-2 border-t pt-4">
            <p className="text-sm font-semibold text-muted-foreground mb-3">File caricati:</p>
            {state.imports.map((imp) => {
              const isDeleting = imp.status === "deleting" || deletingId === imp.importId;
              return (
                <div 
                  key={imp.importId} 
                  className={`group flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-accent/50 transition-all ${isDeleting ? "opacity-50 grayscale animate-pulse pointer-events-none" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-primary/5">
                      <FileSpreadsheet className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">
                        {imp.fileName}
                        {imp.status === "deleting" && <span className="ml-2 text-[8px] uppercase tracking-widest text-destructive">Rimozione in corso...</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {imp.uploadedAt.toLocaleString("it-IT", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} • {imp.rowCount} righe
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    disabled={isDeleting}
                    className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-destructive transition-all shrink-0"
                    onClick={(e) => handleDelete(e, imp)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {!hasData && !state.isProcessing && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); loadMockData(); }}>
              Carica dati demo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
