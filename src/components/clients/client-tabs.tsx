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
    <nav className="flex flex-wrap gap-1 border-b border-zinc-200">
      {tabs.map((t) => {
        const path = `/clients/${clientId}${t.href}`;
        const active = t.href === key;
        return (
          <Link
            key={t.href || "overview"}
            href={path}
            className={`relative px-3 py-2.5 text-sm font-medium ${
              active
                ? "text-zinc-900 after:absolute after:right-2 after:bottom-0 after:left-2 after:h-0.5 after:rounded-full after:bg-zinc-900"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
