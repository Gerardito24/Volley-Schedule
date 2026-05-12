import { SiteHeader } from "@/components/SiteHeader";

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <SiteHeader />
      <div className="flex min-h-0 w-full flex-1 flex-col px-4 sm:px-6 lg:px-8 xl:px-12">
        {children}
      </div>
    </>
  );
}
