import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Lock } from "lucide-react";

interface FutureUploadCardProps {
  title: string;
  phase: string;
  description: string;
}

export function FutureUploadCard({ title, phase, description }: FutureUploadCardProps) {
  return (
    <Card className="border-dashed opacity-60 hover:opacity-80 transition-opacity">
      <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <Lock className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-sm text-foreground">{title}</p>
          <Badge variant="outline" className="text-[10px] mt-1">{phase}</Badge>
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function FutureUploadGrid() {
  const items = [
    { title: "Budget Pianificato", phase: "Fase 2", description: "Budget per canale/verticale/mese" },
    { title: "Media Spend", phase: "Fase 3", description: "Spesa Google per campagne/canali" },
    { title: "Remunerazione", phase: "Fase 4", description: "Regole di remunerazione per verticale" },
    { title: "Revenue Cliente", phase: "Fase 4", description: "Fatturato riconosciuto dal cliente" },
  ];

  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
        Upload Futuri (prossime fasi)
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((item) => (
          <FutureUploadCard key={item.title} {...item} />
        ))}
      </div>
    </div>
  );
}
