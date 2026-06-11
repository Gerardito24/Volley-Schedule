import type { ReactNode } from "react";
import Link from "next/link";
import type { AdminBreadcrumb } from "@/lib/admin-nav";

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: {
  title?: string;
  description?: string;
  breadcrumbs?: AdminBreadcrumb[];
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav aria-label="Ruta" className="mb-2 flex flex-wrap items-center gap-1 text-xs text-zinc-500">
            {breadcrumbs.map((crumb, i) => (
              <span key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                {i > 0 ? <span aria-hidden>/</span> : null}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-sky-700">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-zinc-700">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        {title ? (
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
        ) : null}
        {description ? <p className="mt-1 text-sm text-zinc-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
