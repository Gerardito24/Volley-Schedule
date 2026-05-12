"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  appendImportBatch,
  deleteImportBatch,
  parseCsv,
  readStoredImportBatches,
  LOCAL_IMPORT_BATCHES_KEY,
  type ImportBatch,
} from "@/lib/local-import-batches";

export default function ImportRegistrationsPage() {
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewBatch, setPreviewBatch] = useState<ImportBatch | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => setBatches(readStoredImportBatches());

  useEffect(() => {
    refresh();
    const bump = () => refresh();
    window.addEventListener("volleyschedule-import-changed", bump);
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_IMPORT_BATCHES_KEY) bump();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("volleyschedule-import-changed", bump);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const handleFile = async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      let csvText: string;

      if (file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls")) {
        const XLSX = await import("xlsx").catch(() => null);
        if (!XLSX) {
          setError(
            "Para importar Excel instala la dependencia: npm install xlsx  (luego recarga).",
          );
          setLoading(false);
          return;
        }
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheetName = wb.SheetNames[0];
        csvText = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName]);
      } else {
        csvText = await file.text();
      }

      const { headers, rows } = parseCsv(csvText);
      if (headers.length === 0) {
        setError("El archivo no tiene filas válidas.");
        setLoading(false);
        return;
      }

      const batch: ImportBatch = {
        id: crypto.randomUUID(),
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        headers,
        rows,
      };
      appendImportBatch(batch);
      setPreviewBatch(batch);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setError(`Error al leer el archivo: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <main className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/admin/registrations"
          className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          ← Inscripciones
        </Link>
        <span className="text-zinc-400">/</span>
        <span className="text-sm text-zinc-500">Importar</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Importar tabla de inscripciones
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Cargá un archivo <strong>CSV</strong> o <strong>Excel (.xlsx)</strong> con
          inscripciones existentes. Las filas se guardan en este navegador y en una
          próxima fase podrás mapear las columnas a los campos del sistema (torneo,
          club, equipo, categoría…).
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center dark:border-zinc-700 dark:bg-zinc-900/40"
      >
        <svg
          className="h-10 w-10 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.3}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Arrastrá un archivo aquí o hacé clic para elegir
        </p>
        <label className="cursor-pointer rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
          Elegir archivo
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="sr-only"
            onChange={handleInputChange}
          />
        </label>
        <p className="text-xs text-zinc-400">CSV o Excel (.xlsx, .xls)</p>
        {loading ? (
          <p className="text-sm text-zinc-500">Procesando…</p>
        ) : null}
        {error ? (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : null}
      </div>

      {/* Preview of latest upload */}
      {previewBatch ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-semibold text-emerald-900 dark:text-emerald-100">
                {previewBatch.fileName}
              </h2>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                {previewBatch.rows.length} filas · {previewBatch.headers.length} columnas
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
              Guardado ✓
            </span>
          </div>
          <div className="mt-4 overflow-x-auto rounded-lg border border-emerald-200 dark:border-emerald-800">
            <table className="min-w-full text-xs">
              <thead className="bg-emerald-100 dark:bg-emerald-900/60">
                <tr>
                  {previewBatch.headers.map((h, i) => (
                    <th
                      key={i}
                      className="px-3 py-2 text-left font-semibold text-emerald-900 dark:text-emerald-100"
                    >
                      {h || `Columna ${i + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100 bg-white dark:divide-emerald-900 dark:bg-zinc-950">
                {previewBatch.rows.slice(0, 8).map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
                {previewBatch.rows.length > 8 ? (
                  <tr>
                    <td
                      colSpan={previewBatch.headers.length}
                      className="px-3 py-1.5 text-center text-zinc-400"
                    >
                      … {previewBatch.rows.length - 8} filas más
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/60 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/20">
            <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
              Mapeo de columnas — próximo paso
            </p>
            <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
              Una vez que tengas las columnas identificadas, aquí podrás asignar
              cada columna a un campo del sistema (torneo, club, equipo, categoría,
              tarifa…) y convertir las filas en inscripciones reales.
            </p>
          </div>
        </section>
      ) : null}

      {/* History */}
      {batches.length > 0 ? (
        <section>
          <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Archivos importados ({batches.length})
          </h2>
          <div className="flex flex-col gap-3">
            {batches.map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {b.fileName}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {b.rows.length} filas · {b.headers.length} columnas ·{" "}
                    {new Date(b.uploadedAt).toLocaleString("es-PR")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewBatch(b)}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Ver
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      deleteImportBatch(b.id);
                      if (previewBatch?.id === b.id) setPreviewBatch(null);
                    }}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
