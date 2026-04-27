import { useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { CHANNEL_COLOR_MAP } from "@/lib/types";
import { exportToCSV } from "@/lib/dataProcessing";

export function PivotView() {
  const { filteredPivot } = useAppContext();

  const columns = ["SEA", "Bing", "Organico", "Discovery", "PMC_Cart_Rec", "PMC_CTC", "PMC_Da_verificare", "Non_assegnabile", "GOMX", "WIN", "ACRDP", "YOUT", "CRITP", "Da_verificare", "soci_totali"];

  if (filteredPivot.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Vista Pivot Giornaliera</CardTitle>
          <Button variant="outline" size="sm" className="h-7 text-xs"
            onClick={() => exportToCSV(filteredPivot as any[], "pivot_giornaliera.csv")}>
            <Download className="w-3 h-3 mr-1" /> CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto scrollbar-thin max-h-[500px]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur">
              <tr>
                <th className="text-left px-3 py-2 uppercase text-muted-foreground font-medium sticky left-0 bg-muted/80">Data</th>
                {columns.map((col) => (
                  <th key={col} className="text-right px-3 py-2 uppercase text-muted-foreground font-medium whitespace-nowrap">
                    {col.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPivot.slice(0, 200).map((row) => (
                <tr key={row.date} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-1.5 font-mono sticky left-0 bg-card">{row.date}</td>
                  {columns.map((col) => {
                    const val = (row as any)[col] as number;
                    return (
                      <td key={col} className={`px-3 py-1.5 text-right ${col === "soci_totali" ? "font-bold" : ""}`}>
                        {val > 0 ? val.toLocaleString("it-IT") : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
