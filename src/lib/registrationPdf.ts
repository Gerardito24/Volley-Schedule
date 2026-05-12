import { jsPDF } from "jspdf";
import type { RegistrationRowMock } from "@/lib/mock-data";

const statusLabels: Record<RegistrationRowMock["status"], string> = {
  draft: "Borrador",
  pending_payment: "Pago pendiente",
  paid: "Pagado",
  under_review: "En revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
  waitlisted: "Lista de espera",
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-PR", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

/** Genera y descarga un PDF de la hoja de inscripción (una fila). */
export function downloadRegistrationPdf(row: RegistrationRowMock): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 18;
  const left = 14;
  const valueX = 52;
  const maxW = 140;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Hoja de inscripción", left, y);
  y += 10;

  doc.setFontSize(10);
  const pair = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, left, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value, maxW);
    doc.text(lines, valueX, y);
    y += Math.max(6, 5 * lines.length) + 2;
    if (y > 270) {
      doc.addPage();
      y = 18;
    }
  };

  pair("ID registro", row.id);
  pair("Torneo", row.tournamentName);
  pair("Slug torneo", row.tournamentSlug);
  pair("División", row.divisionLabel);
  pair("Equipo", row.teamName);
  pair("Estado", statusLabels[row.status]);
  pair("Tarifa", formatMoney(row.feeCents));
  pair("Registrado", row.registeredAt);
  pair("Última actualización", row.updatedAt);
  pair("Categoría (id)", row.categoryId);
  pair(
    "Subdivisión",
    row.subdivisionId != null && row.subdivisionId !== ""
      ? row.subdivisionId
      : "—",
  );

  y += 6;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Generado ${new Date().toLocaleString("es-PR")} · Volley Schedule (demo)`,
    left,
    y,
  );

  const safeTeam = row.teamName.replace(/[^\w\-]+/g, "-").slice(0, 24);
  doc.save(`inscripcion-${safeTeam}-${row.id}.pdf`);
}
