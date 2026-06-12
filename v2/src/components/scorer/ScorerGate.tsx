"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  token: string;
  operatorName: string;
}

export default function ScorerGate({ token, operatorName }: Props) {
  const router = useRouter();
  const [pin, setPin] = useState(["", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  function handleDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...pin];
    next[index] = digit;
    setPin(next);
    if (digit && index < 3) {
      refs[index + 1].current?.focus();
    }
    if (next.every((d) => d)) {
      submit(next.join(""));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      refs[index - 1].current?.focus();
    }
  }

  async function submit(pinValue: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/scorer/${token}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinValue }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "PIN incorrecto. Intenta de nuevo.");
        setPin(["", "", "", ""]);
        refs[0].current?.focus();
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600">
            <svg viewBox="0 0 24 24" className="h-8 w-8 fill-white" aria-hidden="true">
              <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2ZM4 20a8 8 0 0 1 16 0H4Z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-zinc-900">Mesa de anotación</h1>
          <p className="mt-1 text-sm text-zinc-500">{operatorName}</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="mb-6 text-center text-sm font-medium text-zinc-700">
            Ingresa tu PIN de 4 dígitos
          </p>
          <div className="flex justify-center gap-3">
            {pin.map((digit, i) => (
              <input
                key={i}
                ref={refs[i]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                autoFocus={i === 0}
                onChange={(e) => handleDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={busy}
                className="h-14 w-14 rounded-xl border-2 border-zinc-300 bg-zinc-50 text-center text-2xl font-bold text-zinc-900 outline-none transition focus:border-indigo-500 focus:bg-white disabled:opacity-50"
              />
            ))}
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700">
              {error}
            </p>
          )}

          {busy && (
            <p className="mt-4 text-center text-sm text-zinc-400">Verificando…</p>
          )}
        </div>
      </div>
    </div>
  );
}
