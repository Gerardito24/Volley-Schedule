"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegistroPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", displayName: "", phone: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("Las contraseñas no coinciden"); return; }
    if (form.password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/client/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          displayName: form.displayName,
          phone: form.phone,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al crear cuenta"); return; }
      router.push("/cuenta");
      router.refresh();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-extrabold text-zinc-100 mb-2">Crear cuenta</h1>
      <p className="text-zinc-400 mb-8">
        ¿Ya tienes cuenta?{" "}
        <Link href="/cuenta/login" className="text-amber-400 hover:underline">
          Inicia sesión
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Nombre completo</label>
          <input
            type="text" required value={form.displayName} onChange={set("displayName")}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="Nombre del representante / club"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Correo electrónico</label>
          <input
            type="email" required value={form.email} onChange={set("email")}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="tu@correo.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Teléfono <span className="text-zinc-500">(opcional)</span></label>
          <input
            type="tel" value={form.phone} onChange={set("phone")}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="787-000-0000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Contraseña</label>
          <input
            type="password" required value={form.password} onChange={set("password")}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="Mínimo 8 caracteres"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Confirmar contraseña</label>
          <input
            type="password" required value={form.confirm} onChange={set("confirm")}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit" disabled={loading}
          className="w-full rounded-xl bg-amber-400 px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300 disabled:opacity-50"
        >
          {loading ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>
    </div>
  );
}
