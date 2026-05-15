"use client";

import { useEffect, useState } from "react";

export function AdminStorageOriginHint() {
  const [origin, setOrigin] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (!origin) return null;

  return (
    <p className="mt-4 text-xs text-zinc-500">
      Datos de admin guardados solo en este navegador y URL:{" "}
      <span className="font-mono text-zinc-600">{origin}</span>
    </p>
  );
}
