import { useAppContext } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_MAPPING_RULES } from "@/lib/dataProcessing";

export function MappingRulesPanel() {
  const rules = DEFAULT_MAPPING_RULES;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Regole di Classificazione</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Queste regole determinano come i codici Web Code Ecom vengono classificati in canali.
          La logica è coerente con una pipeline di tipo Power Query.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 text-xs uppercase text-muted-foreground">Priorità</th>
                <th className="text-left px-4 py-2 text-xs uppercase text-muted-foreground">Campo</th>
                <th className="text-left px-4 py-2 text-xs uppercase text-muted-foreground">Tipo Match</th>
                <th className="text-left px-4 py-2 text-xs uppercase text-muted-foreground">Valore</th>
                <th className="text-left px-4 py-2 text-xs uppercase text-muted-foreground">Canale</th>
                <th className="text-left px-4 py-2 text-xs uppercase text-muted-foreground">Sotto-canale</th>
                <th className="text-left px-4 py-2 text-xs uppercase text-muted-foreground">Secondario</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-2 text-center font-mono text-xs">{rule.priority}</td>
                  <td className="px-4 py-2 text-xs font-mono">{rule.fieldName}</td>
                  <td className="px-4 py-2">
                    <Badge variant="outline" className="text-xs">{rule.matchType}</Badge>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs font-semibold">{rule.matchValue}</td>
                  <td className="px-4 py-2 text-xs">{rule.outputChannelGroup}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{rule.outputChannelSubgroup ?? "—"}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {rule.requiresSecondaryField
                      ? `${rule.secondaryFieldName} ${rule.secondaryMatchType} "${rule.secondaryMatchValue}"`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
