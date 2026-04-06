import Link from "next/link";

const tabs = [
  { href: "", label: "Overview" },
  { href: "/brand-bible", label: "Brand Bible" },
  { href: "/service-blueprint", label: "Service Blueprint" },
  { href: "/briefs", label: "Briefs" },
] as const;

export function ClientTabs({
  clientId,
  current,
}: {
  clientId: string;
  current: "overview" | "brand" | "blueprint" | "briefs";
}) {
  const key =
    current === "overview"
      ? ""
      : current === "brand"
        ? "/brand-bible"
        : current === "blueprint"
          ? "/service-blueprint"
          : "/briefs";

  return (
    <nav className="flex flex-wrap gap-1 border-b border-zinc-800">
      {tabs.map((t) => {
        const path = `/clients/${clientId}${t.href}`;
        const active = t.href === key;
        return (
          <Link
            key={t.href || "overview"}
            href={path}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "text-zinc-50 after:absolute after:right-3 after:bottom-0 after:left-3 after:h-0.5 after:rounded-full after:bg-zinc-100"
                : "text-zinc-500 hover:text-zinc-200"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
