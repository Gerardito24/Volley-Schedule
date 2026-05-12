"use client";

import { useEffect, useRef, useState } from "react";
import type { CoachEntry } from "@/lib/mock-data";

export const registrationInputCls =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100";

const registrationLabelCls =
  "block text-sm font-semibold text-zinc-800 dark:text-zinc-200";

export function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={registrationLabelCls}>
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="mt-1">{children}</div>
      {hint ? <p className="mt-1 text-xs text-zinc-400">{hint}</p> : null}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 border-b border-zinc-200 pb-2 dark:border-zinc-700">
      {children}
    </h2>
  );
}

export function SignaturePad({
  onChange,
}: {
  onChange: (dataUrl: string | null) => void;
}) {
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typedName, setTypedName] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasDrawn = useRef(false);
  const dpr = useRef(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    dpr.current = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr.current;
    canvas.height = rect.height * dpr.current;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr.current, dpr.current);
  }, []);

  function getPos(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const t = (e as React.TouchEvent).touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    const me = e as React.MouseEvent;
    return { x: me.clientX - rect.left, y: me.clientY - rect.top };
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasDrawn.current = true;
  }

  function stopDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if (!drawing.current) return;
    drawing.current = false;
    if (hasDrawn.current) {
      onChange(canvasRef.current!.toDataURL());
    }
  }

  function clearDraw() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width / dpr.current, canvas.height / dpr.current);
    hasDrawn.current = false;
    onChange(null);
  }

  const typeCanvasRef = useRef<HTMLCanvasElement>(null);

  function renderTypedSignature(name: string): string | null {
    const canvas = typeCanvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!name.trim()) return null;
    ctx.font = "italic 48px Georgia, 'Times New Roman', serif";
    ctx.fillStyle = "#1a1a1a";
    ctx.textBaseline = "middle";
    ctx.fillText(name.trim(), 20, canvas.height / 2);
    return canvas.toDataURL();
  }

  function handleTypedChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setTypedName(v);
    onChange(renderTypedSignature(v));
  }

  function switchMode(m: "draw" | "type") {
    setMode(m);
    onChange(null);
    setTypedName("");
    if (m === "draw") {
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        dpr.current = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr.current;
        canvas.height = rect.height * dpr.current;
        const ctx = canvas.getContext("2d")!;
        ctx.scale(dpr.current, dpr.current);
        hasDrawn.current = false;
      }, 0);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 w-fit dark:border-zinc-700 dark:bg-zinc-800">
        {(["draw", "type"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={[
              "rounded-md px-4 py-1 text-xs font-semibold transition",
              mode === m
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200",
            ].join(" ")}
          >
            {m === "draw" ? "Dibujar" : "Escribir nombre"}
          </button>
        ))}
      </div>

      {mode === "draw" ? (
        <div className="space-y-2">
          <p className="text-xs text-zinc-400">Firma con el mouse o dedo en el recuadro de abajo.</p>
          <canvas
            ref={canvasRef}
            style={{ height: 140 }}
            className="w-full rounded-lg border border-zinc-300 bg-white touch-none cursor-crosshair dark:border-zinc-600 dark:bg-zinc-950"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
          <button
            type="button"
            onClick={clearDraw}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-800 underline underline-offset-2 dark:hover:text-zinc-200"
          >
            Borrar firma
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-zinc-400">Escribe tu nombre completo. Se guardará como firma.</p>
          <input
            type="text"
            placeholder="Nombre Completo"
            value={typedName}
            onChange={handleTypedChange}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontSize: 24 }}
          />
          {typedName.trim() ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-xs text-zinc-400 mb-1">Vista previa:</p>
              <p
                style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontSize: 28 }}
                className="text-zinc-900 dark:text-zinc-100"
              >
                {typedName}
              </p>
            </div>
          ) : null}
          <canvas ref={typeCanvasRef} width={600} height={100} className="hidden" />
        </div>
      )}
    </div>
  );
}

export function PhotoUpload({
  value,
  onChange,
  label,
}: {
  value: string | null | undefined;
  onChange: (dataUrl: string | null) => void;
  label: string;
}) {
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex items-center gap-4">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="preview"
          className="h-16 w-16 rounded-lg border border-zinc-200 object-cover dark:border-zinc-700"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 text-zinc-400 dark:border-zinc-600 dark:bg-zinc-900">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path
              d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
      <div>
        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</p>
        <label className="mt-1 cursor-pointer rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800">
          Subir foto
          <input type="file" accept="image/*" className="sr-only" onChange={handleFile} />
        </label>
        {value ? (
          <button type="button" onClick={() => onChange(null)} className="ml-2 text-xs text-red-500 hover:underline">
            Quitar
          </button>
        ) : null}
      </div>
    </div>
  );
}

const COACH_LEVELS = ["Nacional I", "Nacional II", "Regional", "Instructor", "Auxiliar"];

export function CoachSection({
  title,
  subtitle,
  value,
  onChange,
  required,
}: {
  title: string;
  subtitle?: string;
  value: CoachEntry;
  onChange: (v: CoachEntry) => void;
  required?: boolean;
}) {
  function set<K extends keyof CoachEntry>(key: K, val: CoachEntry[K]) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className="space-y-4">
      <SectionTitle>{title}</SectionTitle>
      {subtitle ? <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">{subtitle}</p> : null}
      <PhotoUpload
        value={value.photoDataUrl}
        onChange={(v) => set("photoDataUrl", v)}
        label="Licencia / Carné FPV o DRD"
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <Field label="Nombre Completo" required={required}>
            <input
              className={registrationInputCls}
              placeholder="Nombre Completo"
              value={value.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Número de Afiliación" required={required}>
          <input
            className={registrationInputCls}
            placeholder="Número de Afiliación"
            value={value.affiliationNumber}
            onChange={(e) => set("affiliationNumber", e.target.value)}
          />
        </Field>
        <Field label="Nivel" required={required}>
          <select
            className={registrationInputCls}
            value={value.nivel}
            onChange={(e) => set("nivel", e.target.value)}
          >
            <option value="">— Nivel —</option>
            {COACH_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Teléfono" required={required}>
          <input
            type="tel"
            className={registrationInputCls}
            placeholder="787-555-0100"
            value={value.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Email (Opcional)">
            <input
              type="email"
              className={registrationInputCls}
              placeholder="Email Coach (Opcional)"
              value={value.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
