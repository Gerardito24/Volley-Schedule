"use client";

import { useRef, useState } from "react";
import { labelClass } from "./ui";

const MAX_WIDTH = 1600;
const JPEG_QUALITY = 0.82;
/** Tope duro tras compresión (~700 KB de imagen real). */
const MAX_DATA_URL_LENGTH = 1_000_000;

/**
 * Sube la imagen promocional del torneo. La imagen se redimensiona y
 * comprime en el navegador y se guarda como data URL dentro del torneo
 * (JSONB en Postgres) — no requiere almacenamiento de archivos aparte.
 */
export default function TournamentImageInput({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen (JPG, PNG, etc.).");
      return;
    }
    setProcessing(true);
    try {
      const dataUrl = await compressImage(file);
      if (dataUrl.length > MAX_DATA_URL_LENGTH) {
        setError("La imagen es demasiado grande incluso comprimida. Usa una más pequeña.");
        return;
      }
      onChange(dataUrl);
    } catch {
      setError("No se pudo procesar la imagen. Intenta con otro archivo.");
    } finally {
      setProcessing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <label className={labelClass}>Imagen del torneo</label>
      <p className="mb-2 text-xs text-zinc-400">
        Aparece en el website público (tarjeta y página del torneo). Recomendado: horizontal,
        mínimo 1200px de ancho.
      </p>

      {value ? (
        <div className="overflow-hidden rounded-xl border border-zinc-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Imagen del torneo" className="h-44 w-full object-cover" />
          <div className="flex items-center justify-between gap-2 border-t border-zinc-200 bg-zinc-50 px-3 py-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={processing}
              className="text-xs font-medium text-indigo-600 hover:underline disabled:opacity-50"
            >
              {processing ? "Procesando…" : "Cambiar imagen"}
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-xs font-medium text-red-600 hover:underline"
            >
              Quitar imagen
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={processing}
          className="flex h-32 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-zinc-300 text-sm text-zinc-500 transition-colors hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-50"
        >
          <span className="text-2xl" aria-hidden="true">🖼</span>
          {processing ? "Procesando…" : "Subir imagen del torneo"}
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      {error && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_WIDTH / img.width);
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("load"));
    };
    img.src = url;
  });
}
