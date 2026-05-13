import { Resend } from "resend";
import { NextResponse } from "next/server";

/** Límite de adjunto decodificado (bytes). */
const MAX_PDF_BYTES = 2 * 1024 * 1024;

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const { to, pdfBase64, filename } = body as Record<string, unknown>;

  if (typeof to !== "string" || !emailRe.test(to.trim())) {
    return NextResponse.json({ error: "Correo no válido" }, { status: 400 });
  }

  if (typeof pdfBase64 !== "string" || pdfBase64.length === 0) {
    return NextResponse.json({ error: "Falta el PDF" }, { status: 400 });
  }

  const safeName =
    typeof filename === "string" &&
    filename.toLowerCase().endsWith(".pdf") &&
    filename.length < 200
      ? filename.replace(/[^a-zA-Z0-9._-]/g, "_")
      : `inscripcion-${Date.now()}.pdf`;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    return NextResponse.json(
      { error: "El envío por correo no está configurado en el servidor." },
      { status: 503 },
    );
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(pdfBase64, "base64");
  } catch {
    return NextResponse.json({ error: "PDF en formato inválido" }, { status: 400 });
  }

  if (buffer.length > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "PDF demasiado grande" }, { status: 400 });
  }
  if (buffer.length < 80) {
    return NextResponse.json({ error: "PDF inválido" }, { status: 400 });
  }

  const resend = new Resend(apiKey);
  const bccRaw = process.env.ORGANIZER_BCC?.trim();
  const toNorm = to.trim().toLowerCase();
  const bcc =
    bccRaw && emailRe.test(bccRaw) && bccRaw.toLowerCase() !== toNorm ? [bccRaw] : undefined;

  const { error } = await resend.emails.send({
    from,
    to: to.trim(),
    ...(bcc ? { bcc } : {}),
    subject: "Constancia de registro de club — Volley Schedule",
    text:
      "Adjuntamos la constancia en PDF de tu registro de club.\n\nSi no ves el adjunto, revisa la carpeta de spam.\n\n— Volley Schedule",
    attachments: [{ filename: safeName, content: buffer }],
  });

  if (error) {
    console.error("[club-registration/send-pdf]", error);
    return NextResponse.json({ error: "No se pudo enviar el correo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
