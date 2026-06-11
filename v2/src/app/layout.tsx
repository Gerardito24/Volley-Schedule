import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "VolleyHub PR",
    template: "%s · VolleyHub PR",
  },
  description:
    "Torneos de voleibol juvenil en Puerto Rico: calendario, inscripciones y resultados en vivo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
