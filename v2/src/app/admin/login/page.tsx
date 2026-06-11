import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionAdmin } from "@/lib/auth";
import LoginForm from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Portal de Administrador",
};

export default async function AdminLoginPage() {
  const admin = await getSessionAdmin();
  if (admin) redirect("/admin");

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            VolleyHub PR
          </p>
          <h1 className="mt-1 text-xl font-semibold text-zinc-900">Portal de Administrador</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Ingresa tus credenciales para administrar torneos e inscripciones.
          </p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-zinc-500">
          Demo local: usuario <span className="font-mono text-zinc-300">admin</span> · contraseña{" "}
          <span className="font-mono text-zinc-300">volley2026</span>
        </p>
      </div>
    </main>
  );
}
