export function SectionTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`text-xs font-medium tracking-wide text-zinc-500 uppercase ${className}`}
    >
      {children}
    </h2>
  );
}

/** Muted section label for dark surfaces (cards on zinc-950). */
export function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
      {children}
    </p>
  );
}

export function PageHeader({
  title,
  description,
  action,
  tone = "default",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Muted copy for internal tools / daily-use surfaces. */
  tone?: "default" | "muted";
}) {
  const descCls =
    tone === "muted"
      ? "mt-1 max-w-2xl text-sm text-zinc-500"
      : "mt-1 max-w-xl text-sm text-zinc-400";
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          {title}
        </h1>
        {description ? <p className={descCls}>{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = "",
  padding = "md",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md";
  id?: string;
}) {
  const p =
    padding === "none" ? "" : padding === "sm" ? "p-4" : "p-5";
  return (
    <div
      id={id}
      className={`rounded-xl border border-zinc-800/90 bg-zinc-900/50 shadow-sm ${p} ${className}`}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="text-center">
      <p className="text-sm font-medium text-zinc-100">{title}</p>
      {description ? (
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </Card>
  );
}
