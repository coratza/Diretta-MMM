import { useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from "recharts";
import { Phone, Users, Zap, TrendingUp } from "lucide-react";

export function MmmPerformanceView() {
  const { state } = useAppContext();
  const facts = state.performanceFacts;

  const sortedFacts = useMemo(() => {
    return [...facts].sort((a, b) => a.date.localeCompare(b.date));
  }, [facts]);

  const stats = useMemo(() => {
    if (facts.length === 0) return null;
    const totalSoci = facts.reduce((acc, f) => acc + (f.sociCartRec || 0) + (f.sociCtc || 0), 0);
    const totalCalls = facts.reduce((acc, f) => acc + (f.chiamateCartRec || 0) + (f.chiamateCtc || 0), 0);
    const avgRed = totalCalls > 0 ? (totalSoci / totalCalls) * 100 : 0;
    
    return {
      totalSoci,
      totalCalls,
      avgRed: avgRed.toFixed(1) + "%",
      days: facts.length
    };
  }, [facts]);

  if (facts.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <p className="text-muted-foreground">Nessun dato di performance trovato. Carica il file Excel con Chiamate e Retention per visualizzare queste analisi.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-full bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Soci Totali (Call Center)</p>
              <h4 className="text-xl font-bold">{stats?.totalSoci.toLocaleString()}</h4>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-full bg-orange-500/10">
              <Phone className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Chiamate Gestite</p>
              <h4 className="text-xl font-bold">{stats?.totalCalls.toLocaleString()}</h4>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-full bg-emerald-500/10">
              <Zap className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Average Retention (RED)</p>
              <h4 className="text-xl font-bold text-emerald-600">{stats?.avgRed}</h4>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-full bg-blue-500/10">
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Periodo Coperto</p>
              <h4 className="text-xl font-bold">{stats?.days} Giorni</h4>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cart Rec Vertical */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Cart Rec: Chiamate vs Soci
            </CardTitle>
            <CardDescription>Correlazione tra volumi di chiamate e conversioni</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={sortedFacts}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }} 
                    minTickGap={30}
                    tickFormatter={(v) => v.slice(5)} 
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} orientation="left" />
                  <YAxis yAxisId="right" tick={{ fontSize: 10 }} orientation="right" unit="%" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", color: "#fff" }}
                    itemStyle={{ fontSize: "12px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Bar yAxisId="left" dataKey="chiamateCartRec" name="Chiamate" fill="#e2e8f0" radius={[4, 4, 0, 0]} opacity={0.5} />
                  <Line yAxisId="left" type="monotone" dataKey="sociCartRec" name="Soci" stroke="#2563eb" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="redCartRec" name="RED %" stroke="#10b981" strokeWidth={1} dot={false} strokeDasharray="5 5" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* CTC Vertical */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              CTC: Chiamate vs Soci
            </CardTitle>
            <CardDescription>Performance del canale CTC</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={sortedFacts}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }} 
                    minTickGap={30}
                    tickFormatter={(v) => v.slice(5)} 
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} orientation="left" />
                  <YAxis yAxisId="right" tick={{ fontSize: 10 }} orientation="right" unit="%" />
                  <Tooltip 
                     contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", color: "#fff" }}
                     itemStyle={{ fontSize: "12px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Bar yAxisId="left" dataKey="chiamateCtc" name="Chiamate" fill="#fef3c7" radius={[4, 4, 0, 0]} opacity={0.8} />
                  <Line yAxisId="left" type="monotone" dataKey="sociCtc" name="Soci" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="redCtc" name="RED %" stroke="#10b981" strokeWidth={1} dot={false} strokeDasharray="5 5" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration check */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base italic">Verso il Marketing Mix Modeling (MMM)</CardTitle>
          <CardDescription>In questa vista integreremo Prossimamente: Spesa Media, Click, Impression e Sessioni Piattaforma.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 opacity-50 grayscale pointer-events-none">
             {["Google Ads Spend", "Meta Ads Click", "Organic Search", "Web Sessions", "Offline TV", "Weather Data"].map(tag => (
               <span key={tag} className="px-3 py-1 bg-muted rounded-full text-[10px] font-medium border border-border">
                 {tag} - In attesa dati
               </span>
             ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
