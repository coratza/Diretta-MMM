// === Core Data Types ===

export type DataQualitySeverity = "info" | "warning" | "error";
export type ClassificationConfidence = "high" | "medium" | "low";

export interface UploadedSheet {
  fileName: string;
  sheetName: string;
  rows: Record<string, unknown>[];
}

export interface RawImport {
  importId: string;
  fileName: string;
  uploadedAt: Date;
  fileType: string;
  sheetCount: number;
  status: "pending" | "processing" | "completed" | "error";
  sheets: UploadedSheet[];
}

export interface DataQualityIssue {
  issueId: string;
  importId: string;
  sourceFile: string;
  sourceSheet: string;
  sourceRowIndex: number;
  issueType: string;
  issueSeverity: DataQualitySeverity;
  issueMessage: string;
  rawPayload: Record<string, unknown>;
  resolvedFlag: boolean;
}

export interface ChannelClassification {
  channelGroup: string;
  channelSubgroup: string | null;
  classificationReason: string;
  confidence: ClassificationConfidence;
}

export interface CleanedRow {
  cleanRowId: string;
  importId: string;
  sourceFile: string;
  sourceSheet: string;
  sourceRowIndex: number;
  projectName: string | null;
  month: number | null;
  day: number | null;
  year: number | null;
  date: string | null;
  promotionActionName: string | null;
  webCodeEcom: string | null;
  webCodeClean: string | null;
  promoClean: string | null;
  channelGroup: string;
  channelSubgroup: string | null;
  channelLabel: string;
  funnelFlow: "Digital" | "Call Center" | "Da verificare";
  productType: string | null;
  soci: number | null;
  dataQualityStatus: "valid" | "warning" | "error";
  classificationReason: string;
  isDuplicateCandidate: boolean;
  excludedTotalRow: boolean;
  exclusionReason: string | null;
}

export interface DailyAggregateRow {
  aggId: string;
  date: string;
  year: number;
  month: number;
  day: number;
  projectName: string | null;
  channelGroup: string;
  channelSubgroup: string | null;
  channelLabel: string;
  funnelFlow: "Digital" | "Call Center" | "Da verificare";
  productType: string | null;
  sociTotal: number;
  rowCount: number;
}

export interface DailyPivotRow {
  date: string;
  year: number;
  month: number;
  day: number;
  SEA: number;
  Bing: number;
  Organico: number;
  Discovery: number;
  PMC_Cart_Rec: number;
  PMC_CTC: number;
  PMC_Da_verificare: number;
  Non_assegnabile: number;
  GOMX: number;
  WIN: number;
  ACRDP: number;
  YOUT: number;
  CRITP: number;
  Da_verificare: number;
  soci_totali: number;
}

export interface MappingRule {
  id: string;
  priority: number;
  fieldName: "webCodeEcom" | "promotionActionName";
  matchType: "startsWith" | "contains" | "regex";
  matchValue: string;
  outputChannelGroup: string;
  outputChannelSubgroup?: string | null;
  requiresSecondaryField?: boolean;
  secondaryFieldName?: "promotionActionName";
  secondaryMatchType?: "contains" | "regex";
  secondaryMatchValue?: string;
}

// Future economic types
export interface BudgetRow {
  date: string;
  year: number;
  month: number;
  channelGroup: string;
  channelSubgroup: string | null;
  projectName: string | null;
  plannedBudget: number;
}

export interface SpendRow {
  date: string;
  year: number;
  month: number;
  channelGroup: string;
  channelSubgroup: string | null;
  campaignName: string | null;
  actualSpend: number;
}

export interface RevenueRow {
  date: string;
  year: number;
  month: number;
  channelGroup: string;
  channelSubgroup: string | null;
  recognizedRevenue: number;
}

export interface EconomicFactRow {
  date: string;
  channelGroup: string;
  channelSubgroup: string | null;
  sociTotal: number;
  plannedBudget: number | null;
  actualSpend: number | null;
  recognizedRevenue: number | null;
  remunerationAmount: number | null;
  grossMargin: number | null;
  grossMarginPct: number | null;
  cpa: number | null;
  roas: number | null;
}

export interface FilterState {
  years: number[];
  months: number[];
  dateRange: [string | null, string | null];
  projectNames: string[];
  channelGroups: string[];
  channelSubgroups: string[];
  channelLabels: string[];
  funnelFlows: string[];
  productTypes: string[];
  sourceFiles: string[];
  sourceSheets: string[];
}

export interface PerformanceFact {
  factId: string;
  importId: string;
  sourceFile: string;
  date: string;
  year: number;
  month: number;
  day: number;
  sociCartRec: number | null;
  sociCtc: number | null;
  chiamateCartRec: number | null;
  chiamateCtc: number | null;
  redCartRec: number | null; // Retention percentage as decimal 0.XX
  redCtc: number | null;     // Retention percentage as decimal 0.XX
}

export interface AppState {
  imports: RawImport[];
  cleanedRows: CleanedRow[];
  performanceFacts: PerformanceFact[];
  dailyAggregates: DailyAggregateRow[];
  dailyPivot: DailyPivotRow[];
  dataQualityIssues: DataQualityIssue[];
  filters: FilterState;
  isProcessing: boolean;
  isQuotaExceeded: boolean;
  mappingRules: MappingRule[];
}

export const CHANNEL_LABEL_MAP: Record<string, string> = {
  SEA: "Search",
  Bing: "Bing",
  Organico: "Organico (SEO)",
  Discovery: "Discovery",
  PMC: "PMC",
  "Non assegnabile": "Non allocabile",
  GOMX: "Google Pmax",
  WIN: "Marketing Automation",
  ACRDP: "Across",
  YOUT: "Youtube",
  CRITP: "Criteo",
  "Da verificare": "Da verificare",
};

export const CHANNEL_COLORS: Record<string, string> = {
  SEA: "hsl(217, 70%, 45%)",
  Bing: "hsl(280, 60%, 50%)",
  Organico: "hsl(160, 50%, 42%)",
  Discovery: "hsl(38, 92%, 50%)",
  PMC: "hsl(0, 72%, 55%)",
  "Non assegnabile": "hsl(220, 10%, 60%)",
  GOMX: "hsl(4, 82%, 56%)",
  WIN: "hsl(45, 97%, 50%)",
  ACRDP: "hsl(217, 89%, 61%)",
  YOUT: "hsl(0, 100%, 50%)",
  CRITP: "hsl(24, 100%, 50%)",
  "Da verificare": "hsl(220, 10%, 75%)",
};

export const CHANNEL_COLOR_MAP: Record<string, string> = {
  SEA: "#2563EB",
  Bing: "#8B5CF6",
  Organico: "#10B981",
  Discovery: "#F59E0B",
  PMC_Cart_Rec: "#EF4444",
  PMC_CTC: "#EC4899",
  PMC_Da_verificare: "#F97316",
  Non_assegnabile: "#94A3B8",
  GOMX: "#EA4335",
  WIN: "#FBBC05",
  ACRDP: "#4285F4",
  YOUT: "#FF0000",
  CRITP: "#FF6600",
  Da_verificare: "#CBD5E1",
};

export const FUNNEL_COLOR_MAP: Record<string, string> = {
  Digital: "#2563EB",
  "Call Center": "#EF4444",
  "Da verificare": "#94A3B8",
};

export const PRODUCT_COLOR_MAP: Record<string, string> = {
  Acquisti: "#10B981",
  Superior: "#8B5CF6",
  Legal: "#F59E0B",
  "Da verificare": "#94A3B8",
};
