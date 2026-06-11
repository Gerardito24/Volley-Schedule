"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "./ConfirmDialog";
import ActionsMenu from "./ActionsMenu";

interface DeleteButtonProps {
  /** Endpoint que recibe el DELETE, p. ej. /api/clubs/mi-club */
  url: string;
  confirmTitle: string;
  confirmDescription: string;
  /** A dónde navegar después de borrar */
  redirectTo: string;
  /** Etiqueta de la acción en el menú */
  actionLabel: string;
}

/** Menú ⋯ con una acción destructiva confirmada (para encabezados de página). */
export default function DeleteButton({
  url,
  confirmTitle,
  confirmDescription,
  redirectTo,
  actionLabel,
}: DeleteButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "No se pudo eliminar.");
        setBusy(false);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setBusy(false);
    }
  }

  return (
    <>
      <ActionsMenu
        actions={[{ label: actionLabel, danger: true, onSelect: () => setConfirming(true) }]}
      />
      <ConfirmDialog
        open={confirming}
        title={confirmTitle}
        description={error ? `${confirmDescription}\n\n${error}` : confirmDescription}
        confirmLabel="Eliminar"
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => {
          setConfirming(false);
          setError(null);
        }}
      />
    </>
  );
}
