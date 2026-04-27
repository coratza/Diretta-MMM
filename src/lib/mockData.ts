import type { CleanedRow, DailyAggregateRow, DailyPivotRow, DataQualityIssue } from "./types";
import { aggregateDaily, buildDailyPivot, getChannelLabel, getFunnelFlow, getProductType } from "./dataProcessing";

const channels = [
  { group: "SEA", sub: null, weight: 35, webPrefix: "SEA" },
  { group: "Bing", sub: null, weight: 10, webPrefix: "BING" },
  { group: "Organico", sub: null, weight: 20, webPrefix: "GORG" },
  { group: "Discovery", sub: null, weight: 8, webPrefix: "DISC" },
  { group: "PMC", sub: "Cart Rec", weight: 15, webPrefix: "PMC" },
  { group: "PMC", sub: "CTC", weight: 7, webPrefix: "PMC" },
  { group: "Non assegnabile", sub: null, weight: 3, webPrefix: "STND" },
  { group: "Da verificare", sub: null, weight: 2, webPrefix: "" },
];

const projects = ["Progetto Alpha", "Progetto Beta", "Progetto Gamma"];
const productSuffixes = ["C", "S", "L"];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateMockData(): {
  cleanedRows: CleanedRow[];
  dailyAggregates: DailyAggregateRow[];
  dailyPivot: DailyPivotRow[];
  issues: DataQualityIssue[];
} {
  const rand = seededRandom(42);
  const cleanedRows: CleanedRow[] = [];
  let id = 0;

  for (let year = 2023; year <= 2024; year++) {
    for (let month = 1; month <= 12; month++) {
      if (year === 2024 && month > 9) continue;
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const dayOfWeek = new Date(year, month - 1, day).getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const seasonality = 1 + 0.3 * Math.sin(((month - 1) / 12) * Math.PI * 2);

        for (const ch of channels) {
          const baseSoci = ch.weight * seasonality * (isWeekend ? 0.6 : 1);
          const soci = Math.max(0, Math.round(baseSoci + (rand() - 0.5) * baseSoci * 0.8));
          if (soci === 0 && rand() > 0.3) continue;

          const project = projects[Math.floor(rand() * projects.length)];
          const suffix = ch.webPrefix === "PMC" || !ch.webPrefix ? "" : productSuffixes[Math.floor(rand() * productSuffixes.length)];
          const webCode = ch.webPrefix ? `${ch.webPrefix}_${String(rand()).slice(2, 6)}${suffix}` : "";
          const funnelFlow = getFunnelFlow(webCode);
          const productType = getProductType(webCode, funnelFlow);

          cleanedRows.push({
            cleanRowId: `mock-${++id}`,
            importId: "mock-import",
            sourceFile: "demo_data.xlsx",
            sourceSheet: `Sheet_${year}`,
            sourceRowIndex: id,
            projectName: project,
            month,
            day,
            year,
            date,
            promotionActionName: `Campagna ${ch.group} ${month}`,
            webCodeEcom: webCode || null,
            webCodeClean: ch.group.toUpperCase(),
            promoClean: null,
            channelGroup: ch.group,
            channelSubgroup: ch.sub,
            channelLabel: getChannelLabel(ch.group),
            funnelFlow,
            productType,
            soci,
            dataQualityStatus: "valid",
            classificationReason: "Mock data",
            isDuplicateCandidate: false,
            excludedTotalRow: false,
            exclusionReason: null,
          });
        }
      }
    }
  }

  const issues: DataQualityIssue[] = [
    {
      issueId: "mock-iss-1",
      importId: "mock-import",
      sourceFile: "demo_data.xlsx",
      sourceSheet: "Sheet_2024",
      sourceRowIndex: 42,
      issueType: "invalid_soci",
      issueSeverity: "warning",
      issueMessage: 'Values Net non numerico: "N/A"',
      rawPayload: { "Values Net": "N/A" },
      resolvedFlag: false,
    },
    {
      issueId: "mock-iss-2",
      importId: "mock-import",
      sourceFile: "demo_data.xlsx",
      sourceSheet: "Sheet_2023",
      sourceRowIndex: 105,
      issueType: "Da verificare",
      issueSeverity: "info",
      issueMessage: "Classificazione non riconosciuta",
      rawPayload: { "Web Code Ecom": "UNKNOWN_123" },
      resolvedFlag: false,
    },
  ];

  const dailyAggregates = aggregateDaily(cleanedRows);
  const dailyPivot = buildDailyPivot(dailyAggregates);

  return { cleanedRows, dailyAggregates, dailyPivot, issues };
}
