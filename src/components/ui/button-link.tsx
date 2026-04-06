import Link from "next/link";

const base =
  "inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

const variants = {
  primary:
    "bg-zinc-100 text-zinc-950 hover:bg-white focus-visible:outline-zinc-300",
  secondary:
    "border border-zinc-600 bg-zinc-900/60 text-zinc-100 hover:border-zinc-500 hover:bg-zinc-800/80 focus-visible:outline-zinc-500",
  ghost: "text-zinc-400 hover:bg-zinc-800/80 focus-visible:outline-zinc-500",
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}
