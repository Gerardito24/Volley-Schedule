export const LOCAL_IMPORT_BATCHES_KEY = "volleyschedule-import-batches-v1";

export type ImportBatch = {
  id: string;
  fileName: string;
  uploadedAt: string;
  headers: string[];
  rows: string[][];
};

function notify(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("volleyschedule-import-changed"));
}

export function readStoredImportBatches(): ImportBatch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_IMPORT_BATCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isImportBatch) as ImportBatch[];
  } catch {
    return [];
  }
}

export function appendImportBatch(batch: ImportBatch): void {
  const existing = readStoredImportBatches();
  window.localStorage.setItem(
    LOCAL_IMPORT_BATCHES_KEY,
    JSON.stringify([...existing, batch]),
  );
  notify();
}

export function deleteImportBatch(id: string): void {
  const existing = readStoredImportBatches();
  window.localStorage.setItem(
    LOCAL_IMPORT_BATCHES_KEY,
    JSON.stringify(existing.filter((b) => b.id !== id)),
  );
  notify();
}

/** Parse a raw CSV text into a headers + rows tuple. */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };

  const splitLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        result.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    result.push(cur);
    return result;
  };

  const [headerLine, ...rest] = lines;
  const headers = splitLine(headerLine);
  const rows = rest.map(splitLine);
  return { headers, rows };
}

function isImportBatch(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.fileName === "string" &&
    typeof o.uploadedAt === "string" &&
    Array.isArray(o.headers) &&
    Array.isArray(o.rows)
  );
}
