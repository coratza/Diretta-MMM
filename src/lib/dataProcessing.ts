import * as XLSX from "xlsx";
import type {
  UploadedSheet,
  CleanedRow,
  DailyAggregateRow,
  DailyPivotRow,
  DataQualityIssue,
  ChannelClassification,
  MappingRule,
} from "./types";
import { CHANNEL_LABEL_MAP } from "./types";

// === String Utilities ===

export function cleanString(value: unknown): string | null {
  if (value == null || value === "") return null;
  return String(value).trim().replace(/\s+/g, " ");
}

export function normalizeForMatch(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ");
}

// === Total/Subtotal Row Detection ===

const TOTAL_PATTERNS = ["TOT", "TOTAL", "GRAND TOTAL", "SUBTOTAL", "TOTALE"];

export function isTotalRow(row: Record<string, unknown>): { excluded: boolean; reason: string | null } {
  const values = Object.values(row)
    .map(normalizeForMatch)
    .filter(Boolean);

  for (const cell of values) {
    for (const pattern of TOTAL_PATTERNS) {
      if (cell.includes(pattern)) {
        return {
          excluded: true,
          reason: `Riga di totale/subtotale rilevata: ${pattern}`,
        };
      }
    }
  }
  return { excluded: false, reason: null };
}

// === Channel Label ===

export function getChannelLabel(channelGroup: string): string {
  return CHANNEL_LABEL_MAP[channelGroup] || channelGroup;
}

// === Funnel Flow ===

export function getFunnelFlow(webCodeEcom: unknown): "Digital" | "Call Center" | "Da verificare" {
  const web = normalizeForMatch(webCodeEcom);
  if (!web) return "Da verificare";
  if (web.startsWith("PMC")) return "Call Center";
  return "Digital";
}

// === Product Type ===

export function getProductType(
  webCodeEcom: unknown,
  funnelFlow: "Digital" | "Call Center" | "Da verificare"
): string | null {
  if (funnelFlow !== "Digital") return null;
  const web = normalizeForMatch(webCodeEcom);
  if (!web) return "Da verificare";
  const lastChar = web.slice(-1);
  if (lastChar === "C") return "Acquisti";
  if (lastChar === "S") return "Superior";
  if (lastChar === "L") return "Legal";
  return "Da verificare";
}

// === Column Name Normalization ===

const COLUMN_ALIASES: Record<string, string[]> = {
  projectName: ["project - name", "project name", "projectname", "project_name"],
  month: ["product acquisition - month", "product acquisition month", "month", "mese"],
  day: ["product acquisition - day", "product acquisition day", "day", "giorno"],
  promotionActionName: [
    "promotion action - name",
    "promotion action name",
    "promotionactionname",
    "promotion_action_name",
  ],
  webCodeEcom: ["web code ecom", "webcodeecom", "web_code_ecom", "web code"],
  valuesNet: ["values net", "valuesnet", "values_net", "net values", "soci", "net"],
};

const PERFORMANCE_ALIASES: Record<string, string[]> = {
  date: ["data", "date", "giorno"],
  sociCartRec: ["soci cart rec", "soci cartrec", "soci_cart_rec"],
  sociCtc: ["soci ctc", "soci_ctc"],
  chiamateCartRec: ["chiamate cart rec", "chiamate cartrec", "chiamate_cart_rec", "chiamate e cart rec"],
  chiamateCtc: ["chiamate ctc", "chiamate_ctc", "chiamate e ctc"],
  redCartRec: ["red cart rec", "red_cart_rec", "retention cart rec", "red cartrec"],
  redCtc: ["red ctc", "red_ctc", "retention ctc"],
};

export function normalizeColumnNames(
  row: Record<string, unknown>,
  targetAliases: Record<string, string[]> = COLUMN_ALIASES
): { normalized: Record<string, unknown>; aliasesUsed: Record<string, string> } {
  const normalized: Record<string, unknown> = {};
  const aliasesUsed: Record<string, string> = {};
  const keys = Object.keys(row);

  for (const [canonical, aliases] of Object.entries(targetAliases)) {
    for (const key of keys) {
      const norm = key.trim().toLowerCase().replace(/[_\-]+/g, " ").replace(/\s+/g, " ");
      if (aliases.includes(norm)) {
        normalized[canonical] = row[key];
        aliasesUsed[canonical] = key;
        break;
      }
    }
  }
  for (const key of keys) {
    normalized[`_raw_${key}`] = row[key];
  }
  return { normalized, aliasesUsed };
}

export function detectFileType(rows: Record<string, unknown>[]): "standard" | "performance" | "unknown" {
  if (rows.length === 0) return "unknown";
  
  const std = detectRequiredColumns(rows);
  if (std.found.length >= 4) return "standard";

  const perf = normalizeColumnNames(rows[0], PERFORMANCE_ALIASES);
  const foundPerf = Object.keys(perf.aliasesUsed);
  if (foundPerf.length >= 4) return "performance";

  return "unknown";
}

export function detectRequiredColumns(rows: Record<string, unknown>[]): {
  found: string[];
  missing: string[];
  aliasesUsed: Record<string, string>;
} {
  if (rows.length === 0) return { found: [], missing: Object.keys(COLUMN_ALIASES), aliasesUsed: {} };
  const { aliasesUsed } = normalizeColumnNames(rows[0]);
  const found = Object.keys(aliasesUsed);
  const missing = Object.keys(COLUMN_ALIASES).filter((k) => !aliasesUsed[k]);
  return { found, missing, aliasesUsed };
}

// === Year Inference ===

export function inferYearFromSheetName(
  sheetName: string
): { inferredYear: number | null; confidence: "high" | "medium" | "low"; reason: string } {
  const match4 = sheetName.match(/\b(19|20)\d{2}\b/);
  if (match4) {
    return {
      inferredYear: parseInt(match4[0]),
      confidence: "high",
      reason: `Anno a 4 cifre trovato nel nome del foglio: ${match4[0]}`,
    };
  }
  const match2 = sheetName.match(/\b(\d{2})\b/);
  if (match2) {
    const twoDigit = parseInt(match2[1]);
    if (twoDigit >= 10 && twoDigit <= 30) {
      return {
        inferredYear: 2000 + twoDigit,
        confidence: "medium",
        reason: `Anno a 2 cifre inferito: ${match2[1]} → ${2000 + twoDigit}`,
      };
    }
  }
  return { inferredYear: null, confidence: "low", reason: "Impossibile dedurre l'anno dal nome del foglio" };
}

// === Fill Down ===

export function fillDown<T extends Record<string, any>>(rows: T[], field: keyof T): T[] {
  let lastValue: any = null;
  return rows.map((row) => {
    const val = row[field];
    if (val != null && val !== "") {
      lastValue = val;
      return row;
    }
    return { ...row, [field]: lastValue };
  });
}

export function fillDownMultiple<T extends Record<string, any>>(rows: T[], fields: (keyof T)[]): T[] {
  let result = [...rows];
  for (const field of fields) {
    result = fillDown(result, field);
  }
  return result;
}

// === Numeric / Date ===

export function parseExcelDate(value: any): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const str = String(value).trim();
  
  // Handle gg/mm/aaaa
  const matchIt = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (matchIt) {
    return `${matchIt[3]}-${matchIt[2].padStart(2, '0')}-${matchIt[1].padStart(2, '0')}`;
  }

  // Handle aaaa-mm-gg
  const matchIso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (matchIso) {
    return `${matchIso[1]}-${matchIso[2].padStart(2, '0')}-${matchIso[3].padStart(2, '0')}`;
  }

  return null;
}

export function parseNumeric(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return value;
  
  let str = String(value).trim().replace(/[^0-9,.\-]/g, "");
  
  // Handle Italian decimal comma if present
  if (str.includes(",") && !str.includes(".")) {
    str = str.replace(",", ".");
  } else if (str.includes(",") && str.includes(".")) {
    const parts = str.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
       str = str.replace(".", "").replace(",", ".");
    }
  }

  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

// === Processing Performance Sheets ===

export function processPerformanceSheet(
  sheet: UploadedSheet,
  importId: string
): { performanceFacts: PerformanceFact[]; issues: DataQualityIssue[] } {
  const facts: PerformanceFact[] = [];
  const issues: DataQualityIssue[] = [];

  for (let i = 0; i < sheet.rows.length; i++) {
    const rawRow = sheet.rows[i];
    const { normalized } = normalizeColumnNames(rawRow, PERFORMANCE_ALIASES);
    
    const dateStr = parseExcelDate(normalized.date);
    if (!dateStr) continue;

    const dt = new Date(dateStr);
    const fact: PerformanceFact = {
      factId: `fact-${importId}-${sheet.sheetName.replace(/\s+/g, "_")}-${i}`,
      importId,
      sourceFile: sheet.fileName,
      date: dateStr,
      year: dt.getFullYear(),
      month: dt.getMonth() + 1,
      day: dt.getDate(),
      sociCartRec: parseNumeric(normalized.sociCartRec),
      sociCtc: parseNumeric(normalized.sociCtc),
      chiamateCartRec: parseNumeric(normalized.chiamateCartRec),
      chiamateCtc: parseNumeric(normalized.chiamateCtc),
      redCartRec: parseNumeric(normalized.redCartRec),
      redCtc: parseNumeric(normalized.redCtc),
    };

    facts.push(fact);
  }

  return { performanceFacts: facts, issues };
}

export function isValidDateParts(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

export function buildIsoDate(year: number | null, month: unknown, day: unknown): string | null {
  if (year == null) return null;
  const m = parseNumeric(month);
  const d = parseNumeric(day);
  if (m == null || d == null) return null;
  if (!isValidDateParts(year, m, d)) return null;
  return `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// === Channel Classification ===

export function classifyChannel(
  webCodeEcom: unknown,
  promotionActionName: unknown
): ChannelClassification {
  const web = normalizeForMatch(webCodeEcom);
  const promo = normalizeForMatch(promotionActionName);

  if (!web) {
    return { channelGroup: "Da verificare", channelSubgroup: null, classificationReason: "Web Code Ecom mancante", confidence: "low" };
  }
  if (web.startsWith("SEA")) {
    return { channelGroup: "SEA", channelSubgroup: null, classificationReason: "Prefisso SEA", confidence: "high" };
  }
  if (web.startsWith("BING")) {
    return { channelGroup: "Bing", channelSubgroup: null, classificationReason: "Prefisso BING", confidence: "high" };
  }
  if (web.startsWith("GORG")) {
    return { channelGroup: "Organico", channelSubgroup: null, classificationReason: "Prefisso GORG", confidence: "high" };
  }
  if (web.startsWith("STND")) {
    return { channelGroup: "Non assegnabile", channelSubgroup: null, classificationReason: "Prefisso STND", confidence: "high" };
  }
  if (web.includes("DISC")) {
    return { channelGroup: "Discovery", channelSubgroup: null, classificationReason: "Presenza token DISC", confidence: "medium" };
  }
  if (web.startsWith("PMC")) {
    if (promo.includes("CART REC") || promo.includes("CARTREC")) {
      return { channelGroup: "PMC", channelSubgroup: "Cart Rec", classificationReason: "PMC + cart rec", confidence: "high" };
    }
    if (promo.includes("CTC")) {
      return { channelGroup: "PMC", channelSubgroup: "CTC", classificationReason: "PMC + CTC", confidence: "high" };
    }
    return { channelGroup: "PMC", channelSubgroup: "Da verificare", classificationReason: "PMC senza sottocategoria", confidence: "medium" };
  }
  if (web.startsWith("GOMX")) {
    return { channelGroup: "GOMX", channelSubgroup: null, classificationReason: "Prefisso GOMX", confidence: "high" };
  }
  if (web.startsWith("WIN")) {
    return { channelGroup: "WIN", channelSubgroup: null, classificationReason: "Prefisso WIN", confidence: "high" };
  }
  if (web.startsWith("ACRDP")) {
    return { channelGroup: "ACRDP", channelSubgroup: null, classificationReason: "Prefisso ACRDP", confidence: "high" };
  }
  if (web.startsWith("YOUT")) {
    return { channelGroup: "YOUT", channelSubgroup: null, classificationReason: "Prefisso YOUT", confidence: "high" };
  }
  if (web.startsWith("CRITP")) {
    return { channelGroup: "CRITP", channelSubgroup: null, classificationReason: "Prefisso CRITP", confidence: "high" };
  }
  return { channelGroup: "Da verificare", channelSubgroup: null, classificationReason: "Nessuna regola soddisfatta", confidence: "low" };
}

// === File Parsing ===

export async function parseWorkbook(file: File): Promise<UploadedSheet[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  return wb.SheetNames.map((sheetName) => {
    const sheet = wb.Sheets[sheetName];
    const aoa: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    const knownHeaders = [
      "project - name", "product acquisition - month", "product acquisition - day",
      "promotion action - name", "web code ecom", "values net", "net",
      "project name", "month", "day", "soci"
    ];
    let headerRowIndex = 0;
    // Increase search range and handle cases where headers might be slightly lower
    for (let i = 0; i < Math.min(aoa.length, 50); i++) {
      const rowValues = (aoa[i] || []).map((v) =>
        String(v ?? "").trim().toLowerCase().replace(/[_\-]+/g, " ")
      );
      const matchCount = knownHeaders.filter((h) => 
        rowValues.some(rv => rv === h || rv.includes(h))
      ).length;
      if (matchCount >= 2) { // Loosen requirement to 2 matches to catch more sheets
        headerRowIndex = i;
        break;
      }
    }
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
      range: headerRowIndex,
    });
    return { fileName: file.name, sheetName, rows };
  });
}

// === Full Processing Pipeline ===

let rowCounter = 0;
let issueCounter = 0;

export function processSheet(
  sheet: UploadedSheet,
  importId: string,
  yearOverride?: number
): { cleanedRows: CleanedRow[]; issues: DataQualityIssue[] } {
  const cleanedRows: CleanedRow[] = [];
  const issues: DataQualityIssue[] = [];

  if (sheet.rows.length === 0) return { cleanedRows, issues };

  const { missing } = detectRequiredColumns(sheet.rows);
  if (missing.includes("valuesNet") && missing.includes("webCodeEcom")) {
    issues.push({
      issueId: `iss-${++issueCounter}`,
      importId,
      sourceFile: sheet.fileName,
      sourceSheet: sheet.sheetName,
      sourceRowIndex: 0,
      issueType: "missing_columns",
      issueSeverity: "error",
      issueMessage: `Colonne mancanti: ${missing.join(", ")}`,
      rawPayload: {},
      resolvedFlag: false,
    });
    return { cleanedRows, issues };
  }

  // Infer year
  let year = yearOverride ?? null;
  if (year == null) {
    const inferred = inferYearFromSheetName(sheet.sheetName);
    year = inferred.inferredYear;
    if (year == null) {
      issues.push({
        issueId: `iss-${++issueCounter}`,
        importId,
        sourceFile: sheet.fileName,
        sourceSheet: sheet.sheetName,
        sourceRowIndex: 0,
        issueType: "year_not_inferred",
        issueSeverity: "error",
        issueMessage: inferred.reason,
        rawPayload: { sheetName: sheet.sheetName },
        resolvedFlag: false,
      });
    }
  }

  // Normalize columns
  const normalizedRows = sheet.rows.map((r) => normalizeColumnNames(r).normalized);

  // Fill down month and day
  const filled = fillDownMultiple(normalizedRows, ["month", "day"]);

  for (let i = 0; i < filled.length; i++) {
    const row = filled[i];
    const rowIssues: DataQualityIssue[] = [];

    // Check for total/subtotal rows
    const totalCheck = isTotalRow(row);

    const projectName = cleanString(row.projectName);
    const month = parseNumeric(row.month);
    const day = parseNumeric(row.day);
    const promotionActionName = cleanString(row.promotionActionName);
    const webCodeEcom = cleanString(row.webCodeEcom);
    const soci = parseNumeric(row.valuesNet);
    const webCodeClean = webCodeEcom ? normalizeForMatch(webCodeEcom) : null;
    const promoClean = promotionActionName ? normalizeForMatch(promotionActionName) : null;

    // Validate soci
    if (soci == null && row.valuesNet != null && row.valuesNet !== "") {
      rowIssues.push({
        issueId: `iss-${++issueCounter}`,
        importId,
        sourceFile: sheet.fileName,
        sourceSheet: sheet.sheetName,
        sourceRowIndex: i + 1,
        issueType: "invalid_soci",
        issueSeverity: "warning",
        issueMessage: `Values Net non numerico: "${row.valuesNet}"`,
        rawPayload: row,
        resolvedFlag: false,
      });
    }

    // Build date
    const date = buildIsoDate(year, month, day);
    if (date == null && year != null && month != null && day != null) {
      rowIssues.push({
        issueId: `iss-${++issueCounter}`,
        importId,
        sourceFile: sheet.fileName,
        sourceSheet: sheet.sheetName,
        sourceRowIndex: i + 1,
        issueType: "invalid_date",
        issueSeverity: "warning",
        issueMessage: `Data non valida: ${year}-${month}-${day}`,
        rawPayload: row,
        resolvedFlag: false,
      });
    }

    // Classify
    const classification = classifyChannel(webCodeEcom, promotionActionName);
    const channelLabel = getChannelLabel(classification.channelGroup);
    const funnelFlow = getFunnelFlow(webCodeEcom);
    const productType = getProductType(webCodeEcom, funnelFlow);

    const status: CleanedRow["dataQualityStatus"] =
      rowIssues.some((i) => i.issueSeverity === "error")
        ? "error"
        : rowIssues.length > 0
        ? "warning"
        : "valid";

    issues.push(...rowIssues);

    cleanedRows.push({
      cleanRowId: `${importId}-${sheet.sheetName.replace(/\s+/g, "_")}-${i}`,
      importId,
      sourceFile: sheet.fileName,
      sourceSheet: sheet.sheetName,
      sourceRowIndex: i + 1,
      projectName,
      month,
      day,
      year,
      date,
      promotionActionName,
      webCodeEcom,
      webCodeClean,
      promoClean,
      channelGroup: classification.channelGroup,
      channelSubgroup: classification.channelSubgroup,
      channelLabel,
      funnelFlow,
      productType,
      soci,
      dataQualityStatus: status,
      classificationReason: classification.classificationReason,
      isDuplicateCandidate: false,
      excludedTotalRow: totalCheck.excluded,
      exclusionReason: totalCheck.reason,
    });
  }

  return { cleanedRows, issues };
}

// === Duplicate Detection ===

export function detectDuplicateCandidates(rows: CleanedRow[]): CleanedRow[] {
  const seen = new Map<string, number>();
  const duplicates: CleanedRow[] = [];

  for (const row of rows) {
    const key = `${row.date}|${row.projectName}|${row.promotionActionName}|${row.webCodeEcom}|${row.soci}`;
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count > 1) {
      row.isDuplicateCandidate = true;
      duplicates.push(row);
    }
  }
  for (const row of rows) {
    const key = `${row.date}|${row.projectName}|${row.promotionActionName}|${row.webCodeEcom}|${row.soci}`;
    if ((seen.get(key) ?? 0) > 1) {
      row.isDuplicateCandidate = true;
    }
  }
  return rows.filter((r) => r.isDuplicateCandidate);
}

// === Aggregations ===

let aggCounter = 0;

export function aggregateDaily(rows: CleanedRow[]): DailyAggregateRow[] {
  // Exclude total rows from aggregations
  const activeRows = rows.filter((r) => !r.excludedTotalRow);
  const map = new Map<string, DailyAggregateRow>();
  for (const row of activeRows) {
    if (!row.date || row.soci == null) continue;
    const key = `${row.date}|${row.channelGroup}|${row.channelSubgroup ?? ""}|${row.projectName ?? ""}|${row.funnelFlow}|${row.productType ?? ""}`;
    const existing = map.get(key);
    if (existing) {
      existing.sociTotal += row.soci;
      existing.rowCount++;
    } else {
      map.set(key, {
        aggId: `agg-${++aggCounter}`,
        date: row.date,
        year: row.year!,
        month: row.month!,
        day: row.day!,
        projectName: row.projectName,
        channelGroup: row.channelGroup,
        channelSubgroup: row.channelSubgroup,
        channelLabel: row.channelLabel,
        funnelFlow: row.funnelFlow,
        productType: row.productType,
        sociTotal: row.soci,
        rowCount: 1,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function buildDailyPivot(rows: DailyAggregateRow[]): DailyPivotRow[] {
  const map = new Map<string, DailyPivotRow>();

  const emptyPivot = (date: string, year: number, month: number, day: number): DailyPivotRow => ({
    date, year, month, day,
    SEA: 0, Bing: 0, Organico: 0, Discovery: 0,
    PMC_Cart_Rec: 0, PMC_CTC: 0, PMC_Da_verificare: 0,
    Non_assegnabile: 0, GOMX: 0, WIN: 0, ACRDP: 0, YOUT: 0, CRITP: 0,
    Da_verificare: 0, soci_totali: 0,
  });

  for (const row of rows) {
    if (!map.has(row.date)) {
      map.set(row.date, emptyPivot(row.date, row.year, row.month, row.day));
    }
    const pivot = map.get(row.date)!;
    const key = row.channelGroup === "PMC" && row.channelSubgroup
      ? `PMC_${row.channelSubgroup.replace(/\s+/g, "_")}`
      : row.channelGroup === "Non assegnabile"
      ? "Non_assegnabile"
      : row.channelGroup === "Da verificare"
      ? "Da_verificare"
      : row.channelGroup;

    if (key in pivot) {
      (pivot as any)[key] += row.sociTotal;
    }
    pivot.soci_totali += row.sociTotal;
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// === Default Mapping Rules ===

export const DEFAULT_MAPPING_RULES: MappingRule[] = [
  { id: "r1", priority: 1, fieldName: "webCodeEcom", matchType: "startsWith", matchValue: "SEA", outputChannelGroup: "SEA" },
  { id: "r2", priority: 2, fieldName: "webCodeEcom", matchType: "startsWith", matchValue: "BING", outputChannelGroup: "Bing" },
  { id: "r3", priority: 3, fieldName: "webCodeEcom", matchType: "startsWith", matchValue: "GORG", outputChannelGroup: "Organico" },
  { id: "r4", priority: 4, fieldName: "webCodeEcom", matchType: "startsWith", matchValue: "STND", outputChannelGroup: "Non assegnabile" },
  { id: "r5", priority: 5, fieldName: "webCodeEcom", matchType: "contains", matchValue: "DISC", outputChannelGroup: "Discovery" },
  { id: "r9", priority: 9, fieldName: "webCodeEcom", matchType: "startsWith", matchValue: "GOMX", outputChannelGroup: "GOMX" },
  { id: "r10", priority: 10, fieldName: "webCodeEcom", matchType: "startsWith", matchValue: "WIN", outputChannelGroup: "WIN" },
  { id: "r11", priority: 11, fieldName: "webCodeEcom", matchType: "startsWith", matchValue: "ACRDP", outputChannelGroup: "ACRDP" },
  { id: "r12", priority: 12, fieldName: "webCodeEcom", matchType: "startsWith", matchValue: "YOUT", outputChannelGroup: "YOUT" },
  { id: "r13", priority: 13, fieldName: "webCodeEcom", matchType: "startsWith", matchValue: "CRITP", outputChannelGroup: "CRITP" },
  {
    id: "r6", priority: 6, fieldName: "webCodeEcom", matchType: "startsWith", matchValue: "PMC",
    outputChannelGroup: "PMC", outputChannelSubgroup: "Cart Rec",
    requiresSecondaryField: true, secondaryFieldName: "promotionActionName",
    secondaryMatchType: "contains", secondaryMatchValue: "CART REC",
  },
  {
    id: "r7", priority: 7, fieldName: "webCodeEcom", matchType: "startsWith", matchValue: "PMC",
    outputChannelGroup: "PMC", outputChannelSubgroup: "CTC",
    requiresSecondaryField: true, secondaryFieldName: "promotionActionName",
    secondaryMatchType: "contains", secondaryMatchValue: "CTC",
  },
  {
    id: "r8", priority: 8, fieldName: "webCodeEcom", matchType: "startsWith", matchValue: "PMC",
    outputChannelGroup: "PMC", outputChannelSubgroup: "Da verificare",
  },
];

// === Export Utilities ===

export function exportToCSV(data: Record<string, any>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers.map((h) => {
        const val = row[h];
        if (val == null) return "";
        const str = String(val);
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
