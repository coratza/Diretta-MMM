// @refresh reset
import React, { createContext, useContext, useReducer, useCallback, useMemo, useEffect } from "react";
import type {
  AppState,
  CleanedRow,
  DailyAggregateRow,
  DailyPivotRow,
  DataQualityIssue,
  FilterState,
  RawImport,
  MappingRule,
  PerformanceFact,
} from "@/lib/types";
import {
  parseWorkbook,
  processSheet,
  detectFileType,
  processPerformanceSheet,
  detectDuplicateCandidates,
  aggregateDaily,
  buildDailyPivot,
  DEFAULT_MAPPING_RULES,
} from "@/lib/dataProcessing";
import { generateMockData } from "@/lib/mockData";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs, 
  writeBatch 
} from "firebase/firestore";

type Action =
  | { type: "SET_PROCESSING"; payload: boolean }
  | { type: "SET_QUOTA_EXCEEDED"; payload: boolean }
  | { type: "SET_IMPORTS"; payload: RawImport[] }
  | { type: "SET_CLEANED_ROWS"; payload: CleanedRow[] }
  | { type: "SET_PERFORMANCE_FACTS"; payload: PerformanceFact[] }
  | { type: "SET_DATA"; payload: { imports: RawImport[]; cleanedRows: CleanedRow[] } }
  | { type: "SET_FILTERS"; payload: Partial<FilterState> }
  | { type: "RESET_FILTERS" }
  | { type: "LOAD_MOCK" }
  | { type: "CLEAR_ALL" };

const initialFilters: FilterState = {
  years: [],
  months: [],
  dateRange: [null, null],
  projectNames: [],
  channelGroups: [],
  channelSubgroups: [],
  channelLabels: [],
  funnelFlows: [],
  productTypes: [],
  sourceFiles: [],
  sourceSheets: [],
};

const initialState: AppState = {
  imports: [],
  cleanedRows: [],
  performanceFacts: [],
  dailyAggregates: [],
  dailyPivot: [],
  dataQualityIssues: [],
  filters: initialFilters,
  isProcessing: false,
  isQuotaExceeded: false,
  mappingRules: DEFAULT_MAPPING_RULES,
};

function recomputeAggregates(cleanedRows: CleanedRow[]) {
  const dailyAggregates = aggregateDaily(cleanedRows);
  const dailyPivot = buildDailyPivot(dailyAggregates);
  return { dailyAggregates, dailyPivot };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_PROCESSING":
      return { ...state, isProcessing: action.payload };
    case "SET_QUOTA_EXCEEDED":
      return { ...state, isQuotaExceeded: action.payload, isProcessing: false };
    case "SET_IMPORTS":
      // Save metadata to cache
      localStorage.setItem("mdf_cache_imports", JSON.stringify(action.payload));
      return { ...state, imports: action.payload };
    case "SET_CLEANED_ROWS": {
      const allCleaned = [...action.payload];
      detectDuplicateCandidates(allCleaned);
      const { dailyAggregates, dailyPivot } = recomputeAggregates(allCleaned);
      return {
        ...state,
        cleanedRows: allCleaned,
        dailyAggregates,
        dailyPivot,
      };
    }
    case "SET_PERFORMANCE_FACTS":
      return { ...state, performanceFacts: action.payload };
    case "SET_DATA": {
      const allCleaned = [...action.payload.cleanedRows];
      detectDuplicateCandidates(allCleaned);
      const { dailyAggregates, dailyPivot } = recomputeAggregates(allCleaned);
      return {
        ...state,
        imports: action.payload.imports,
        cleanedRows: allCleaned,
        dailyAggregates,
        dailyPivot,
        isProcessing: false,
      };
    }
    case "SET_FILTERS":
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case "RESET_FILTERS":
      return { ...state, filters: initialFilters };
    case "LOAD_MOCK": {
      const mock = generateMockData();
      return {
        ...state,
        imports: [{
          importId: "mock-import",
          fileName: "demo_data.xlsx",
          uploadedAt: new Date(),
          fileType: "xlsx",
          sheetCount: 2,
          status: "completed",
          sheets: [],
        }],
        cleanedRows: mock.cleanedRows,
        dailyAggregates: mock.dailyAggregates,
        dailyPivot: mock.dailyPivot,
        dataQualityIssues: mock.issues,
      };
    }
    case "CLEAR_ALL":
      return initialState;
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  filteredRows: CleanedRow[];
  filteredAggregates: DailyAggregateRow[];
  filteredPivot: DailyPivotRow[];
  uploadFile: (file: File) => Promise<void>;
  removeImport: (importId: string) => Promise<void>;
  setFilters: (f: Partial<FilterState>) => void;
  resetFilters: () => void;
  loadMockData: () => void;
  clearAll: () => void;
  availableFilterValues: {
    years: number[];
    months: number[];
    projectNames: string[];
    channelGroups: string[];
    channelSubgroups: string[];
    channelLabels: string[];
    funnelFlows: string[];
    productTypes: string[];
    sourceFiles: string[];
    sourceSheets: string[];
  };
}

const AppContext = createContext<AppContextType | null>(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Sync with Firestore
  useEffect(() => {
    // Only subscribe to collections if user is logged in
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        dispatch({ type: "SET_IMPORTS", payload: [] });
        dispatch({ type: "SET_CLEANED_ROWS", payload: [] });
        dispatch({ type: "SET_PERFORMANCE_FACTS", payload: [] });
        return;
      }

      console.log(`[AUTH] Utente autenticato: ${user.email}`);

      // 1. Listen for imports (metadata is small, so snapshot is fine)
      const qImports = query(collection(db, "imports"), where("ownerEmail", "==", user.email));
      const unsubImports = onSnapshot(qImports, (snapshot) => {
        console.log(`[SYNC] Ricevuti ${snapshot.size} metadati import.`);
        const imports = snapshot.docs.map(d => {
          const data = d.data();
          return {
            ...data,
            uploadedAt: data.uploadedAt?.toDate() || new Date(),
            sheets: []
          } as RawImport;
        });
        dispatch({ type: "SET_IMPORTS", payload: imports });
      }, (err) => {
        if (err.message.includes("Quota exceeded") || (err as any).code === "resource-exhausted") {
          dispatch({ type: "SET_QUOTA_EXCEEDED", payload: true });
          console.error("Quota Firebase esaurita per oggi (Letture Imports).");
        }
      });

      // 2. Fetch rows by reading chunks
      const fetchInitialData = async () => {
        try {
          console.log("[SYNC] Recupero ottimizzato righe e fatti...");
          // READ CHUNKS & PERFORMANCE FACTS IN PARALLEL filtered by owner
          const qChunks = query(
            collection(db, "dataChunks"), 
            where("ownerEmail", "==", user.email)
          );
          const qPerf = query(
            collection(db, "performanceFacts"), 
            where("ownerEmail", "==", user.email)
          );

          const [chunkSnapshot, perfSnapshot] = await Promise.all([
            getDocs(qChunks),
            getDocs(qPerf)
          ]);

          const allRows: CleanedRow[] = [];
          chunkSnapshot.docs.forEach(d => {
            const data = d.data();
            if (data.rows && Array.isArray(data.rows)) {
              allRows.push(...data.rows);
            }
          });
          
          const allPerf = perfSnapshot.docs.map(d => d.data() as PerformanceFact);
          
          dispatch({ type: "SET_CLEANED_ROWS", payload: allRows });
          dispatch({ type: "SET_PERFORMANCE_FACTS", payload: allPerf });
        } catch (err: any) {
          console.error("[SYNC ERRORE] Fetch data:", err);
          dispatch({ type: "SET_PROCESSING", payload: false });
        }
      };

      fetchInitialData();
      return () => unsubImports();
    });

    return () => unsubAuth();
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    const userEmail = auth.currentUser?.email;
    if (!userEmail) {
      alert("Operazione non autorizzata: utente non loggato.");
      return;
    }

    dispatch({ type: "SET_PROCESSING", payload: true });
    try {
      const sheets = await parseWorkbook(file);
      const importId = `imp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      const firstSheetRows = sheets[0]?.rows || [];
      const fileType = detectFileType(firstSheetRows);
      
      if (fileType === "unknown") {
        alert("Formato file non riconosciuto. Assicurati che le intestazioni siano corrette.");
        return;
      }

      if (fileType === "standard") {
        let allCleaned: CleanedRow[] = [];
        for (const sheet of sheets) {
          const result = processSheet(sheet, importId);
          allCleaned = [...allCleaned, ...result.cleanedRows];
        }

        const importData = {
          importId,
          fileName: file.name,
          uploadedAt: new Date(),
          fileType: "standard_sales",
          sheetCount: sheets.length,
          status: "completed",
          rowCount: allCleaned.length,
          ownerEmail: userEmail,
        };

        await setDoc(doc(db, "imports", importId), importData);
        
        const CHUNK_SIZE = 500;
        const uploadPromises = [];
        for (let i = 0; i < allCleaned.length; i += CHUNK_SIZE) {
          const chunk = allCleaned.slice(i, i + CHUNK_SIZE);
          const chunkId = `${importId}-c-${i / CHUNK_SIZE}`;
          uploadPromises.push(setDoc(doc(db, "dataChunks", chunkId), {
            importId,
            rows: chunk,
            ownerEmail: userEmail,
          }));
        }
        await Promise.all(uploadPromises);
      } else {
        let allFacts: PerformanceFact[] = [];
        for (const sheet of sheets) {
          const result = processPerformanceSheet(sheet, importId);
          allFacts = [...allFacts, ...result.performanceFacts];
        }

        const importData = {
          importId,
          fileName: file.name,
          uploadedAt: new Date(),
          fileType: "performance_callcenter",
          sheetCount: sheets.length,
          status: "completed",
          rowCount: allFacts.length,
          ownerEmail: userEmail,
        };

        await setDoc(doc(db, "imports", importId), importData);
        
        const uploadPromises = allFacts.map((fact) => {
          return setDoc(doc(db, "performanceFacts", fact.factId), {
            ...fact,
            ownerEmail: userEmail
          });
        });
        await Promise.all(uploadPromises);
      }
    } catch (e: any) {
      console.error("[UPLOAD ERROR]", e);
      alert(`Errore caricamento: ${e.message}`);
    } finally {
      dispatch({ type: "SET_PROCESSING", payload: false });
    }
  }, []);

  const removeImport = useCallback(async (importId: string) => {
    if (!confirm("Eliminare definitivamente questo file?")) return;
    
    const userEmail = auth.currentUser?.email;
    if (!userEmail) return;

    dispatch({ type: "SET_PROCESSING", payload: true });
    try {
      // 1. Mark status
      await setDoc(doc(db, "imports", importId), { status: "deleting" }, { merge: true });

      // 2. Delete chunks
      const chunkQ = query(
        collection(db, "dataChunks"), 
        where("importId", "==", importId),
        where("ownerEmail", "==", userEmail)
      );
      const chunkSnapshot = await getDocs(chunkQ);
      const chunkPromises = chunkSnapshot.docs.map(d => deleteDoc(d.ref));
      
      // 3. Delete facts
      const perfQ = query(
        collection(db, "performanceFacts"), 
        where("importId", "==", importId),
        where("ownerEmail", "==", userEmail)
      );
      const perfSnapshot = await getDocs(perfQ);
      const perfPromises = perfSnapshot.docs.map(d => deleteDoc(d.ref));

      await Promise.all([...chunkPromises, ...perfPromises]);

      // 4. Metadata
      await deleteDoc(doc(db, "imports", importId));
    } catch (e: any) {
      console.error("[REMOVE ERROR]", e);
      alert(`Errore rimozione: ${e.message}`);
    } finally {
      dispatch({ type: "SET_PROCESSING", payload: false });
    }
  }, []);

  const clearAll = useCallback(async () => {
    if (!confirm("ATTENZIONE: Cancellare TUTTI i tuoi dati?")) return;
    
    const userEmail = auth.currentUser?.email;
    if (!userEmail) return;

    dispatch({ type: "SET_PROCESSING", payload: true });
    try {
      const qImp = query(collection(db, "imports"), where("ownerEmail", "==", userEmail));
      const qChu = query(collection(db, "dataChunks"), where("ownerEmail", "==", userEmail));
      const qPer = query(collection(db, "performanceFacts"), where("ownerEmail", "==", userEmail));

      const [sImp, sChu, sPer] = await Promise.all([
        getDocs(qImp),
        getDocs(qChu),
        getDocs(qPer)
      ]);

      const pImp = sImp.docs.map(d => deleteDoc(d.ref));
      const pChu = sChu.docs.map(d => deleteDoc(d.ref));
      const pPer = sPer.docs.map(d => deleteDoc(d.ref));
      
      await Promise.all([...pImp, ...pChu, ...pPer]);
      
      localStorage.removeItem("mdf_cache_rows");
      localStorage.removeItem("mdf_cache_perf");
      localStorage.removeItem("mdf_cache_imports");
      
      dispatch({ type: "CLEAR_ALL" });
    } catch (e: any) {
      console.error("[CLEAR ALL ERROR]", e);
      alert("Errore durante la pulizia totale.");
    } finally {
      dispatch({ type: "SET_PROCESSING", payload: false });
    }
  }, []);

  // Filter rows: exclude total rows from main views
  const filteredRows = useMemo(() => {
    const f = state.filters;
    return state.cleanedRows.filter((r) => {
      if (r.excludedTotalRow) return false;
      if (f.years.length && r.year && !f.years.includes(r.year)) return false;
      if (f.months.length && r.month && !f.months.includes(r.month)) return false;
      if (f.dateRange[0] && r.date && r.date < f.dateRange[0]) return false;
      if (f.dateRange[1] && r.date && r.date > f.dateRange[1]) return false;
      if (f.projectNames.length && r.projectName && !f.projectNames.includes(r.projectName)) return false;
      if (f.channelGroups.length && !f.channelGroups.includes(r.channelGroup)) return false;
      if (f.channelSubgroups.length && r.channelSubgroup && !f.channelSubgroups.includes(r.channelSubgroup)) return false;
      if (f.channelLabels.length && !f.channelLabels.includes(r.channelLabel)) return false;
      if (f.funnelFlows.length && !f.funnelFlows.includes(r.funnelFlow)) return false;
      if (f.productTypes.length && r.productType && !f.productTypes.includes(r.productType)) return false;
      if (f.sourceFiles.length && !f.sourceFiles.includes(r.sourceFile)) return false;
      if (f.sourceSheets.length && !f.sourceSheets.includes(r.sourceSheet)) return false;
      return true;
    });
  }, [state.cleanedRows, state.filters]);

  const filteredAggregates = useMemo(() => aggregateDaily(filteredRows), [filteredRows]);
  const filteredPivot = useMemo(() => buildDailyPivot(filteredAggregates), [filteredAggregates]);

  const availableFilterValues = useMemo(() => {
    const rows = state.cleanedRows.filter((r) => !r.excludedTotalRow);
    return {
      years: [...new Set(rows.map((r) => r.year).filter(Boolean) as number[])].sort(),
      months: [...new Set(rows.map((r) => r.month).filter(Boolean) as number[])].sort((a, b) => a - b),
      projectNames: [...new Set(rows.map((r) => r.projectName).filter(Boolean) as string[])].sort(),
      channelGroups: [...new Set(rows.map((r) => r.channelGroup))].sort(),
      channelSubgroups: [...new Set(rows.map((r) => r.channelSubgroup).filter(Boolean) as string[])].sort(),
      channelLabels: [...new Set(rows.map((r) => r.channelLabel))].sort(),
      funnelFlows: [...new Set(rows.map((r) => r.funnelFlow))].sort(),
      productTypes: [...new Set(rows.map((r) => r.productType).filter(Boolean) as string[])].sort(),
      sourceFiles: [...new Set(rows.map((r) => r.sourceFile))].sort(),
      sourceSheets: [...new Set(rows.map((r) => r.sourceSheet))].sort(),
    };
  }, [state.cleanedRows]);

  const value: AppContextType = {
    state,
    filteredRows,
    filteredAggregates,
    filteredPivot,
    uploadFile,
    removeImport,
    clearAll,
    setFilters: (f) => dispatch({ type: "SET_FILTERS", payload: f }),
    resetFilters: () => dispatch({ type: "RESET_FILTERS" }),
    loadMockData: () => dispatch({ type: "LOAD_MOCK" }),
    clearAll: () => dispatch({ type: "CLEAR_ALL" }),
    availableFilterValues,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
