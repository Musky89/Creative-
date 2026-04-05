/**
 * TEMPORARY SCAFFOLD — NOT AI OUTPUT
 *
 * Deterministic placeholder JSON aligned with Zod artifact contracts for offline / no-LLM runs.
 */

import type { ArtifactType, WorkflowStage } from "@/generated/prisma/client";
import type { Brief } from "@/generated/prisma/client";

const SCAFFOLD_MARKER = {
  _agenticforcePlaceholder: true,
  _message:
    "Structured placeholder generated for development only — not model output.",
} as const;

export type PlaceholderContext = {
  brief: Pick<
    Brief,
    | "id"
    | "title"
    | "businessObjective"
    | "communicationObjective"
    | "targetAudience"
    | "keyMessage"
  >;
};

export function buildPlaceholderArtifactContent(
  stage: WorkflowStage,
  artifactType: ArtifactType,
  ctx: PlaceholderContext,
): Record<string, unknown> {
  const base = { ...SCAFFOLD_MARKER, stage, artifactType, briefId: ctx.brief.id };

  switch (artifactType) {
    case "INTAKE_SUMMARY":
      return {
        ...base,
        summary: `Brief captured: ${ctx.brief.title}`,
        objectives: {
          business: ctx.brief.businessObjective,
          communication: ctx.brief.communicationObjective,
        },
        audience: ctx.brief.targetAudience,
        keyMessage: ctx.brief.keyMessage,
      };
    case "IDENTITY_STRATEGY":
      return {
        ...base,
        brandCoreIdea: `[Placeholder] Single-minded identity idea for ${ctx.brief.title} — symbolic system before any mark.`,
        symbolicTerritories: [
          "[Placeholder] Territory A — metaphor space the identity can own.",
          "[Placeholder] Territory B — adjacent cultural or category space.",
        ],
        identityArchetypes: [
          "[Placeholder] Primary archetype tension (e.g. caregiver + rebel) grounded in brief.",
          "[Placeholder] Secondary archetype — how the brand shows up under stress.",
        ],
        semanticDirections: [
          "[Placeholder] Meaning direction 1 — what the identity should read as before form.",
          "[Placeholder] Meaning direction 2 — proof the system must carry.",
        ],
        visualTensions: [
          "[Placeholder] Productive tension A vs B (e.g. precision vs warmth).",
        ],
        whatTheIdentityMustSignal: [
          "[Placeholder] Signal 1 — category truth the mark must encode.",
          "[Placeholder] Signal 2 — trust or desire hook at small scale.",
        ],
        whatTheIdentityMustAvoid: [
          "[Placeholder] Cliché trope to reject (e.g. generic globe nodes).",
          "[Placeholder] Trend aesthetic to reject for this brand.",
        ],
        explorationHooks: [
          "[Optional] System note for future mark exploration — not a final prompt.",
        ],
      };
    case "IDENTITY_ROUTES_PACK":
      return {
        ...base,
        frameworkUsed:
          "[Placeholder] Canon-informed pack: Minimalist Premium + Cultural Relevance (scaffold).",
        routeDifferentiationSummary:
          "[Placeholder] Route A emphasizes typographic authority; Route B is symbolic geometry; Route C combines mark + word — scaffold contrast only.",
        routes: [
          {
            routeName: "[Placeholder] Route A — Wordmark system",
            routeType: "wordmark" as const,
            coreConcept:
              "[Placeholder] Name-forward system where letterforms carry the strategic idea — spacing and rhythm do the persuasion.",
            symbolicLogic:
              "[Placeholder] How the word itself becomes the symbol through construction discipline and negative space logic.",
            typographyLogic:
              "[Placeholder] Voice of letterforms: stance, aperture, contrast — modularity at small sizes.",
            geometryLogic:
              "[Placeholder] Underlying grid and proportion rules so the wordmark scales to favicon and signage.",
            distinctivenessRationale:
              "[Placeholder] Why competitors cannot swap their name into this system without breaking the logic.",
            whyItWorksForBrand:
              "[Placeholder] Ties to Brand OS emotional register and positioning (scaffold).",
            risks: ["[Placeholder] Risk: legibility at extreme small sizes."],
            avoidList: [
              "[Placeholder] Generic tech sans cliché",
              "[Placeholder] Trendy monoline script",
            ],
            coreTension:
              "[Placeholder] Authority of the wordmark vs the softness of home textiles — discipline without coldness.",
            emotionalCenter:
              "[Placeholder] Calm confidence — the customer trusts the specification.",
            whyBeatsCategoryNorm:
              "[Placeholder] Competes on fiber truth and light behavior instead of discount banners and stock loft clichés.",
            whyCouldFail:
              "[Placeholder] Could read as too quiet if headlines are not paired with proof.",
            distinctVisualWorld:
              "[Placeholder] North-lit studio, folded yardage, chalk and oat palette, serif lead with humanist spec type — never neon sale graphics.",
          },
          {
            routeName: "[Placeholder] Route B — Monogram / letterform mark",
            routeType: "monogram" as const,
            coreConcept:
              "[Placeholder] Compressed initials encode a ritual or motion from the product story.",
            symbolicLogic:
              "[Placeholder] What the monogram stands for beyond letters — the gesture or proof it recalls.",
            typographyLogic:
              "[Placeholder] How strokes are built: weight transitions, join logic, counter shapes.",
            geometryLogic:
              "[Placeholder] Modular construction for motion, stitch, emboss, and single-color lockups.",
            distinctivenessRationale:
              "[Placeholder] Why this monogram is not interchangeable with category defaults.",
            whyItWorksForBrand:
              "[Placeholder] Reinforces trust or desire per Brand OS (scaffold).",
            risks: ["[Placeholder] Risk: reads as generic if geometry is too symmetric."],
            avoidList: [
              "[Placeholder] Hexagon + letter mashups",
              "[Placeholder] Infinite-loop S curves",
            ],
            coreTension:
              "[Placeholder] Compression vs legibility — mark must read at stamp size yet feel crafted.",
            emotionalCenter:
              "[Placeholder] Craft secret — insiders recognize the join logic.",
            whyBeatsCategoryNorm:
              "[Placeholder] Owns initials as ritual (drape, fold, install) instead of generic monogram jewelry tropes.",
            whyCouldFail:
              "[Placeholder] Risk of looking like any tech monogram if geometry is too symmetric.",
            distinctVisualWorld:
              "[Placeholder] Embossed paper proofs, single ink, tight counters, stitch-adjacent rhythm in stroke — no gradient orbits.",
          },
          {
            routeName: "[Placeholder] Route C — Abstract symbol",
            routeType: "abstract" as const,
            coreConcept:
              "[Placeholder] Non-literal form carries a single proof from the strategy — not decoration.",
            symbolicLogic:
              "[Placeholder] What the abstract shape indexes in culture or category without literal illustration.",
            typographyLogic:
              "[Placeholder] How type pairs with the symbol: lockup rules, clearspace, voice match.",
            geometryLogic:
              "[Placeholder] Build logic (grid, symmetry or intentional asymmetry) and scalability rules.",
            distinctivenessRationale:
              "[Placeholder] Why this abstraction is ownable vs stock geometry.",
            whyItWorksForBrand:
              "[Placeholder] Aligns with Brand OS visual tensions (scaffold).",
            risks: ["[Placeholder] Risk: reads as generic blob without tight rationale."],
            avoidList: [
              "[Placeholder] Random gradient orbits",
              "[Placeholder] Meaningless nodes and lines",
            ],
            coreTension:
              "[Placeholder] Abstract form vs literal product — must index strategy proof without illustration.",
            emotionalCenter:
              "[Placeholder] Wonder within restraint — one clear metaphor.",
            whyBeatsCategoryNorm:
              "[Placeholder] Offers a single ownable shape language vs pattern banks of globes and swooshes.",
            whyCouldFail:
              "[Placeholder] Blob risk if geometry is not tied to a named strategic proof.",
            distinctVisualWorld:
              "[Placeholder] Flat ink on paper white, one forest anchor, botanical geometry without cute illustration — poster-scale symbol tests.",
          },
        ],
        pairwiseDifferentiation: {
          pairComparisons: [
            {
              leftIndex: 0,
              rightIndex: 1,
              overlapNotes:
                "[Placeholder] Both privilege craft and restraint; both avoid loud retail tropes — overlap in calm premium register.",
              howTheyDiffer:
                "[Placeholder] A is typographic system-first; B is mark-first compression and emboss logic.",
              strongerRouteThisPair: "tie" as const,
            },
            {
              leftIndex: 0,
              rightIndex: 2,
              overlapNotes:
                "[Placeholder] Shared discipline and negative space; both avoid stock lifestyle photography language.",
              howTheyDiffer:
                "[Placeholder] A stays name-readable at all scales; C is symbol-led and needs lockup rules with type.",
              strongerRouteThisPair: "left" as const,
            },
            {
              leftIndex: 1,
              rightIndex: 2,
              overlapNotes:
                "[Placeholder] Both can feel 'designed' — risk of similar grid if geometry is not pushed apart.",
              howTheyDiffer:
                "[Placeholder] B is initials/ritual; C is abstract proof-shape — different recognition paths.",
              strongerRouteThisPair: "right" as const,
            },
          ],
          aggregateOverlap:
            "[Placeholder] All three reject loud category retail; divergence is typographic authority vs monogram ritual vs abstract proof.",
          strongestRouteIndex: 0,
          weakestRouteIndex: 2,
          differentiationSummary:
            "[Placeholder] Route A wins clarity and scale; B wins craft signal for trade audiences; C wins poster memorability but needs tight proof tie — scaffold pairwise only.",
        },
      };
    case "STRATEGY":
      return {
        ...base,
        objective: `[Placeholder] Strategic objective derived from: ${ctx.brief.title}`,
        audience: ctx.brief.targetAudience,
        insight: "[Placeholder] Audience tension / opportunity statement.",
        proposition: "[Placeholder] Single-minded proposition.",
        messagePillars: [
          "[Placeholder] Pillar 1",
          "[Placeholder] Pillar 2",
          "[Placeholder] Pillar 3",
        ],
        strategicAngles: [
          {
            frameworkId: "transformation",
            angle:
              "[Placeholder] Before/after arc for this brief (Canon: Transformation).",
          },
          {
            frameworkId: "problem-agitation",
            angle:
              "[Placeholder] Pain → stakes → relief structure (Canon: Problem Agitation).",
          },
        ],
      };
    case "CONCEPT":
      return {
        ...base,
        frameworkUsed:
          "[Placeholder] Two routes: Transformation + Problem Agitation (scaffold only).",
        concepts: [
          {
            frameworkId: "transformation",
            conceptName: "[Placeholder] Route A",
            hook: "[Placeholder] Before → after hook using transformation logic.",
            rationale: "[Placeholder] Why this fits the strategy.",
            visualDirection: "[Placeholder] Visual notes for Route A.",
            whyItWorksForBrand:
              "[Placeholder] How Route A reinforces positioning and Brand OS emotional register.",
            coreTension:
              "[Placeholder] Aspiration vs proof — show the after-state without fantasy staging.",
            emotionalCenter:
              "[Placeholder] Relief and pride when the room finally behaves.",
            whyBeatsCategoryNorm:
              "[Placeholder] Leads with outcome truth instead of feature laundry lists common in the category.",
            whyCouldFail:
              "[Placeholder] After-state could feel generic if not tied to this product truth.",
            distinctVisualWorld:
              "[Placeholder] Natural light on real materials, editorial crop, no stock-smile humans — transformation shown through space, not slogans.",
          },
          {
            frameworkId: "problem-agitation",
            conceptName: "[Placeholder] Route B",
            hook: "[Placeholder] Pain-forward hook using agitation logic.",
            rationale: "[Placeholder] Why this fits the strategy.",
            visualDirection: "[Placeholder] Visual notes for Route B.",
            whyItWorksForBrand:
              "[Placeholder] How Route B reinforces positioning and Brand OS emotional register.",
            coreTension:
              "[Placeholder] Urgency vs trust — agitate without fear-mongering.",
            emotionalCenter:
              "[Placeholder] Competent ally calling out the hidden cost of waiting.",
            whyBeatsCategoryNorm:
              "[Placeholder] Names the stakes the category usually smooths over with 'solutions' language.",
            whyCouldFail:
              "[Placeholder] Could read as negative if pain is not balanced with a credible fix.",
            distinctVisualWorld:
              "[Placeholder] Tighter frames, higher contrast, proof objects in frame — clinical but warm, not alarm-red retail.",
          },
        ],
        pairwiseDifferentiation: {
          pairComparisons: [
            {
              leftIndex: 0,
              rightIndex: 1,
              overlapNotes:
                "[Placeholder] Both serve the same proposition; both avoid category fluff phrases in scaffold.",
              howTheyDiffer:
                "[Placeholder] A is transformation arc; B is pain→stakes→relief — narrative engine and visual temperature differ.",
              strongerConceptThisPair: "tie" as const,
            },
          ],
          aggregateOverlap:
            "[Placeholder] Shared strategic goal; split is narrative mechanism and default visual temperature.",
          strongestConceptIndex: 0,
          differentiationSummary:
            "[Placeholder] Route A optimizes for desire and after-state; Route B optimizes for urgency and credibility — pick by brief bias (scaffold).",
        },
      };
    case "VISUAL_SPEC":
      return {
        ...base,
        frameworkUsed: "transformation",
        conceptName: "[Placeholder] Route A",
        visualObjective:
          "[Placeholder] Establish a distinctive visual system for this brief grounded in the chosen concept route — not generic category imagery.",
        whyItWorksForBrand:
          "[Placeholder] Ties to Brand OS visual language and emotional profile (scaffold only).",
        mood: "[Placeholder] Specific mood with concrete sensory cues, not a single adjective.",
        emotionalTone:
          "[Placeholder] How the frame should feel relative to primaryEmotion in Brand OS.",
        composition:
          "[Placeholder] Framing, hierarchy, negative space, subject scale — actionable.",
        colorDirection:
          "[Placeholder] Palette logic, contrast, restraint vs saturation — specific.",
        textureDirection: "[Placeholder] Materials and surface behavior.",
        lightingDirection: "[Placeholder] Key quality, direction, hardness, color temperature.",
        typographyDirection:
          "[Placeholder] Role of type: scale, voice, pairing, motion if any.",
        imageStyle:
          "[Placeholder] Medium and capture approach (e.g. large-format still life, not “premium stock”).",
        referenceLogic:
          "[Placeholder] What references are for; what to avoid (e.g. no generic tech stock).",
        distinctivenessNotes:
          "[Placeholder] What makes this direction non-interchangeable with competitors.",
        avoidList: [
          "[Placeholder] AI-slop trope to exclude",
          "[Placeholder] Off-brand visual cliché to exclude",
        ],
        optionalPromptSeed:
          "[Optional] Concrete noun-heavy seed for a future image pipeline — scaffold placeholder.",
      };
    case "COPY":
      return {
        ...base,
        frameworkUsed: "transformation",
        headlineOptions: [
          "[Placeholder] Headline A",
          "[Placeholder] Headline B",
          "[Placeholder] Headline C",
        ],
        bodyCopyOptions: [
          "[Placeholder] Short body variant.",
          "[Placeholder] Long body variant.",
        ],
        ctaOptions: ["[Placeholder] CTA 1", "[Placeholder] CTA 2"],
      };
    case "REVIEW_REPORT":
      return {
        ...base,
        scoreSummary: "[Placeholder] Aggregate checklist / score summary",
        verdict: "[Placeholder] PASS_WITH_NOTES",
        issues: ["[Placeholder] Issue 1", "[Placeholder] Issue 2"],
        recommendations: [
          "[Placeholder] Recommendation 1",
          "[Placeholder] Recommendation 2",
        ],
        frameworkAssessment:
          "[Placeholder] Scaffold — framework execution not evaluated.",
        frameworkExecution: "NOT_APPLICABLE" as const,
        qualityVerdict: "ACCEPTABLE" as const,
        distinctivenessAssessment: "[Placeholder] Not evaluated in scaffold.",
        brandAlignmentAssessment: "[Placeholder] Not evaluated in scaffold.",
        toneAlignment: "[Placeholder] Brand OS tone vs draft — not evaluated in scaffold.",
        languageCompliance: "WARN" as const,
        bannedPhraseViolations: [],
        regenerationRecommended: false,
        regenerationReasons: [],
        technicallyCorrectButCreativelySafe:
          "[Placeholder] Scaffold — no LLM review; assume not evaluated for creative risk vs safety.",
        frameworkNamedButNotExpressed:
          "[Placeholder] Scaffold — framework expression not evaluated without real upstream artifacts.",
        categoryClicheRisk:
          "[Placeholder] Scaffold — category cliché risk not evaluated in placeholder mode.",
        polishedButNotMemorable:
          "[Placeholder] Scaffold — memorability not evaluated in placeholder mode.",
        visualDistinctivenessAudit:
          "[Placeholder] N/A or not evaluated — replace when VISUAL_SPEC exists from a real run.",
        identityOwnabilityAudit:
          "[Placeholder] N/A or not evaluated — replace when identity artifacts exist from a real run.",
        creativeBarVerdict: "MARGINAL" as const,
        comparisonRankings: {
          strongestOutput: "[Placeholder] Not ranked — scaffold",
          weakestOutput: "[Placeholder] Not ranked — scaffold",
          mostGeneric: "[Placeholder] Not ranked — scaffold",
          mostOnBrand: "[Placeholder] Not ranked — scaffold",
        },
      };
    case "EXPORT":
      return {
        ...base,
        exportStatus: "PLACEHOLDER_READY",
        formats: ["markdown", "json"],
        metadata: {
          packageName: `${ctx.brief.title}-export-placeholder`,
          generatedAt: new Date().toISOString(),
        },
      };
    default:
      return {
        ...base,
        note: "Unknown artifact type for placeholder factory.",
      };
  }
}

export function buildPlaceholderAgentRunInput(
  ctx: PlaceholderContext,
  stage: WorkflowStage,
): Record<string, unknown> {
  return {
    ...SCAFFOLD_MARKER,
    kind: "orchestrator_scaffold_input",
    briefId: ctx.brief.id,
    stage,
  };
}
