import type { ArtifactType, WorkflowStage } from "@/generated/prisma/client";
import { ArtifactByType } from "@/components/artifacts/artifact-viewer";

type TaskRow = {
  stage: WorkflowStage;
  artifacts: { type: ArtifactType; version: number; content: unknown }[];
};

function latestOfType(
  task: TaskRow | undefined,
  type: ArtifactType,
): unknown | null {
  if (!task) return null;
  const same = task.artifacts.filter((a) => a.type === type);
  if (same.length === 0) return null;
  return same.reduce((a, b) => (a.version >= b.version ? a : b)).content;
}

const SECTION_LABEL: Partial<Record<WorkflowStage, string>> = {
  STRATEGY: "Strategic foundation",
  CONCEPTING: "Creative routes",
  COPY_DEVELOPMENT: "Messaging",
  VISUAL_DIRECTION: "Visual world",
  REVIEW: "Brand read",
  EXPORT: "Final sign-off",
};

export function StudioCampaignShowcase({
  taskByStage,
  preferredFrameworkIds = [],
  heroImageUrl,
  primaryHeadline,
  cta,
  bodyLead,
}: {
  taskByStage: Map<WorkflowStage, TaskRow>;
  preferredFrameworkIds?: string[];
  heroImageUrl?: string | null;
  primaryHeadline?: string | null;
  cta?: string | null;
  bodyLead?: string | null;
}) {
  const rows: { stage: WorkflowStage; type: ArtifactType; label: string }[] = [
    { stage: "STRATEGY", type: "STRATEGY", label: SECTION_LABEL.STRATEGY! },
    { stage: "CONCEPTING", type: "CONCEPT", label: SECTION_LABEL.CONCEPTING! },
    { stage: "COPY_DEVELOPMENT", type: "COPY", label: SECTION_LABEL.COPY_DEVELOPMENT! },
    { stage: "VISUAL_DIRECTION", type: "VISUAL_SPEC", label: SECTION_LABEL.VISUAL_DIRECTION! },
    { stage: "REVIEW", type: "REVIEW_REPORT", label: SECTION_LABEL.REVIEW! },
    { stage: "EXPORT", type: "EXPORT", label: SECTION_LABEL.EXPORT! },
  ];

  const blocks = rows
    .map((r) => {
      const content = latestOfType(taskByStage.get(r.stage), r.type);
      if (content == null) return null;
      return { ...r, content };
    })
    .filter(Boolean) as {
    stage: WorkflowStage;
    type: ArtifactType;
    label: string;
    content: unknown;
  }[];

  const hasHero =
    !!heroImageUrl?.trim() ||
    !!primaryHeadline?.trim() ||
    !!cta?.trim() ||
    !!bodyLead?.trim();

  if (blocks.length === 0 && !hasHero) {
    return (
      <p className="py-16 text-center text-sm text-zinc-500">
        Creative output will appear here as the work comes together.
      </p>
    );
  }

  return (
    <div className="space-y-20 sm:space-y-24">
      {hasHero ? (
        <section className="border-b border-white/[0.06] pb-16 sm:pb-20">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Campaign board
          </p>
          <div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-start">
            {heroImageUrl?.trim() ? (
              <div className="overflow-hidden rounded-2xl bg-zinc-900/40 ring-1 ring-white/[0.06]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroImageUrl}
                  alt=""
                  className="aspect-[4/3] w-full object-cover sm:aspect-[16/10]"
                />
              </div>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-zinc-900/30 ring-1 ring-dashed ring-white/10 sm:aspect-[16/10]">
                <p className="max-w-xs text-center text-sm text-zinc-500">
                  Visual frames will land here once generation runs.
                </p>
              </div>
            )}
            <div className="space-y-6">
              {primaryHeadline?.trim() ? (
                <h2 className="text-3xl font-semibold leading-[1.12] tracking-tight text-zinc-50 sm:text-4xl lg:text-[2.75rem]">
                  {primaryHeadline.trim()}
                </h2>
              ) : null}
              {cta?.trim() ? (
                <p className="text-sm font-medium uppercase tracking-[0.12em] text-zinc-400">
                  {cta.trim()}
                </p>
              ) : null}
              {bodyLead?.trim() ? (
                <p className="text-base leading-relaxed text-zinc-400 sm:text-lg">
                  {bodyLead.trim()}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
      {blocks.map((b) => (
        <section key={b.stage} className="scroll-mt-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            {b.label}
          </p>
          <div className="mt-6">
            <ArtifactByType
              type={b.type}
              content={b.content}
              preferredFrameworkIds={preferredFrameworkIds}
              presentation="studio"
            />
          </div>
        </section>
      ))}
    </div>
  );
}
