/**
 * Canonical internal test briefs — loaded into DB per client via ensureInternalTestBriefs().
 * Categories: campaign, premium_retail, new_brand, copy_heavy, visual_heavy
 */
import type { Prisma } from "@/generated/prisma/client";

export type InternalTestBriefTemplate = {
  testCategory: string;
  title: string;
  businessObjective: string;
  communicationObjective: string;
  targetAudience: string;
  keyMessage: string;
  deliverablesRequested: Prisma.InputJsonValue;
  tone: string;
  constraints: Prisma.InputJsonValue;
};

const in30d = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

export const INTERNAL_TEST_BRIEF_TEMPLATES: readonly InternalTestBriefTemplate[] = [
  {
    testCategory: "campaign",
    title: "[TEST] Campaign concept — summer launch",
    businessObjective:
      "Drive trial for a new functional beverage line in three West Coast metros within 90 days.",
    communicationObjective:
      "Make the product feel culturally current and worth trying on first sight — not another ‘wellness’ cliché.",
    targetAudience:
      "Urban professionals 25–40 who track fitness casually, buy premium groceries, and share lifestyle content.",
    keyMessage:
      "Real ingredients, unreal refresh — built for how you actually live, not how ads think you should.",
    deliverablesRequested: [
      "Campaign concept territories",
      "Key visual direction",
      "Social-first copy bank",
      "OOH headline options",
    ],
    tone: "Bold, witty, confident — never preachy",
    constraints: [
      "No clinical claims without proof points",
      "Must work in 1:1 and 9:16",
      "Avoid ‘cleanse’ and ‘detox’ language",
    ],
  },
  {
    testCategory: "premium_retail",
    title: "[TEST] Premium retail — fabric & craft",
    businessObjective:
      "Increase AOV and repeat purchase for a DTC home textiles brand known for small-batch weaving.",
    communicationObjective:
      "Elevate material truth and tactile craft without sounding like generic ‘luxury lifestyle’ copy.",
    targetAudience:
      "Design-conscious homeowners 35–55 who read shelter magazines and pay for longevity over trends.",
    keyMessage:
      "The fabric is the story — weight, drape, and the hands that made it.",
    deliverablesRequested: [
      "Seasonal lookbook narrative",
      "Product page storytelling framework",
      "Email hook concepts",
    ],
    tone: "Warm, precise, understated premium",
    constraints: [
      "Emphasize material sourcing and care",
      "No fake heritage claims",
      "Photography must feel editorial, not stock-luxe",
    ],
  },
  {
    testCategory: "new_brand",
    title: "[TEST] New brand build — B2B analytics",
    businessObjective:
      "Establish credible positioning for a seed-stage analytics tool for mid-market ops teams.",
    communicationObjective:
      "Differentiate from ‘AI dashboards’ noise with a clear POV on operational clarity.",
    targetAudience:
      "Ops directors and CFOs at 50–500 employee companies drowning in spreadsheets.",
    keyMessage:
      "See the business clearly before the quarter ends — decisions in hours, not weeks.",
    deliverablesRequested: [
      "Positioning narrative",
      "Messaging hierarchy",
      "Launch narrative arc",
    ],
    tone: "Direct, trustworthy, slightly irreverent about buzzwords",
    constraints: [
      "No unverifiable ROI promises",
      "Avoid ‘revolutionize’ and ‘paradigm’",
    ],
  },
  {
    testCategory: "copy_heavy",
    title: "[TEST] Copy-heavy — financial newsletter",
    businessObjective:
      "Grow paid subscriptions through sharper positioning and conversion copy.",
    communicationObjective:
      "Make complex macro ideas feel accessible without dumbing down or sounding like clickbait finance.",
    targetAudience:
      "Sophisticated retail investors who skim dozens of substacks weekly.",
    keyMessage:
      "One clear thesis per issue — what changed, why it matters, what to watch next.",
    deliverablesRequested: [
      "Landing page long copy",
      "5 email subject line patterns",
      "Paid ad variants (search + social)",
    ],
    tone: "Smart friend at the bar — never a shouting pundit",
    constraints: [
      "No guaranteed returns language",
      "Cite uncertainty where appropriate",
    ],
  },
  {
    testCategory: "visual_heavy",
    title: "[TEST] Visual-heavy — outdoor gear drop",
    businessObjective:
      "Sell through a limited capsule collection tied to a conservation partnership.",
    communicationObjective:
      "Create a visceral outdoor narrative that feels documentary, not catalog.",
    targetAudience:
      "Weekend hikers and trail runners who care about durability and ethical sourcing.",
    keyMessage:
      "Built to get dirty — designed to come back season after season.",
    deliverablesRequested: [
      "Hero campaign visual territories",
      "Packaging storyboard notes",
      "Social reel story beats",
    ],
    tone: "Gritty, honest, cinematic restraint",
    constraints: [
      "No fake outdoor athletes or CGI vistas as hero",
      "Show real wear patterns and texture",
    ],
  },
] as const;

export function deadlineForTestBrief(): Date {
  return in30d();
}
