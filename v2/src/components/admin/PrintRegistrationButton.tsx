"use client";

import { btnSecondary } from "./ui";

export interface PrintableRegistration {
  teamName: string;
  clubName: string;
  tournamentName: string;
  categoryLabel: string;
  registeredAt: string;
  fee: string;
  approvalLabel: string;
  paymentLabel: string;
  repLine: string;
  coachLine: string;
  assistantLine?: string;
  signatureName: string;
  comments?: string;
  players: {
    jerseyNumber: string;
    name: string;
    birthDate: string;
    affiliationNumber: string;
  }[];
}

/** Abre una constancia de inscripción lista para imprimir o guardar como PDF. */
export default function PrintRegistrationButton({ data }: { data: PrintableRegistration }) {
  function print() {
    const esc = (v: string) =>
      v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const playerRows = data.players
      .map(
        (p) => `<tr>
          <td>${esc(p.jerseyNumber)}</td>
          <td>${esc(p.name)}</td>
          <td>${esc(p.birthDate)}</td>
          <td>${esc(p.affiliationNumber)}</td>
        </tr>`,
      )
      .join("");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8">
      <title>Inscripción — ${esc(data.teamName)}</title>
      <style>
        body { font-family: system-ui, sans-serif; color: #18181b; margin: 40px; }
        h1 { font-size: 20px; margin: 0; }
        h2 { font-size: 14px; margin: 24px 0 8px; border-bottom: 1px solid #d4d4d8; padding-bottom: 4px; }
        .sub { color: #71717a; font-size: 13px; margin: 4px 0 0; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 13px; }
        .grid dt { color: #71717a; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
        .grid dd { margin: 2px 0 0; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
        th, td { border: 1px solid #d4d4d8; padding: 6px 8px; text-align: left; }
        th { background: #f4f4f5; }
        .firma { margin-top: 40px; font-size: 13px; }
        .firma .linea { margin-top: 32px; border-top: 1px solid #18181b; width: 280px; padding-top: 4px; }
      </style></head><body>
      <h1>Constancia de inscripción — VolleyHub PR</h1>
      <p class="sub">${esc(data.tournamentName)} · ${esc(data.categoryLabel)}</p>

      <h2>Equipo</h2>
      <dl class="grid">
        <div><dt>Equipo</dt><dd>${esc(data.teamName)}</dd></div>
        <div><dt>Club</dt><dd>${esc(data.clubName)}</dd></div>
        <div><dt>Fecha de inscripción</dt><dd>${esc(data.registeredAt)}</dd></div>
        <div><dt>Tarifa</dt><dd>${esc(data.fee)}</dd></div>
        <div><dt>Aprobación</dt><dd>${esc(data.approvalLabel)}</dd></div>
        <div><dt>Pago</dt><dd>${esc(data.paymentLabel)}</dd></div>
      </dl>

      <h2>Contactos</h2>
      <dl class="grid">
        <div><dt>Apoderado/a</dt><dd>${esc(data.repLine)}</dd></div>
        <div><dt>Coach</dt><dd>${esc(data.coachLine)}</dd></div>
        ${data.assistantLine ? `<div><dt>Asistente</dt><dd>${esc(data.assistantLine)}</dd></div>` : ""}
      </dl>

      <h2>Roster (${data.players.length})</h2>
      <table><thead><tr>
        <th style="width:60px">Camisa</th><th>Nombre completo</th>
        <th style="width:120px">Nacimiento</th><th style="width:120px">Afiliación</th>
      </tr></thead><tbody>${playerRows}</tbody></table>

      ${data.comments ? `<h2>Comentarios</h2><p style="font-size:13px">${esc(data.comments)}</p>` : ""}

      <div class="firma">
        <div class="linea">${esc(data.signatureName)} — Firma del apoderado/a</div>
      </div>
      </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <button type="button" className={btnSecondary} onClick={print}>
      🖨 Imprimir / PDF
    </button>
  );
}
