import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <SiteHeader />
      <div className="flex min-h-0 w-full flex-1 flex-col px-4 sm:px-6 lg:px-8 xl:px-12">
        {children}
      </div>
      <footer className="mt-auto border-t border-zinc-100 px-4 py-5 text-center text-xs text-zinc-400 sm:px-6 lg:px-8 xl:px-12 dark:border-zinc-800 dark:text-zinc-600">
        VolleySchedule ·{" "}
        <Link
          href="/admin"
          className="hover:text-zinc-600 underline underline-offset-2 dark:hover:text-zinc-400"
        >
          Organizadores
        </Link>
      </footer>
    </div>
  );
}
