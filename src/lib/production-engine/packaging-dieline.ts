/**
 * Optional CPG dieline: panel map in normalized coordinates (0–1 of pack face)
 * to tighten safe zones and reserve legal/barcode bands.
 */

import { z } from "zod";
import type { CompositionPlanDocument } from "./composition-plan-schema";
import { compositionPlanDocumentSchema } from "./composition-plan-schema";

export const packagingDielinePanelSchema = z.object({
  id: z.string(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
  role: z.enum([
    "fop_hero",
    "claims",
    "legal",
    "barcode",
    "logo",
    "variant_band",
    "nutrition",
    "other",
  ]),
});

export const packagingDielineDocumentSchema = z.object({
  version: z.number().int().min(1).default(1),
  bleedPx: z.number().int().min(0).default(0),
  panels: z.array(packagingDielinePanelSchema).min(1),
});

export type PackagingDielineDocument = z.infer<typeof packagingDielineDocumentSchema>;

export function applyPackagingDielineToPlan(
  plan: CompositionPlanDocument,
  dieline: PackagingDielineDocument,
): CompositionPlanDocument {
  const H = plan.canvasHeight;
  let extraBottom = 0;
  let extraTop = 0;
  for (const p of dieline.panels) {
    if (p.role === "legal" || p.role === "barcode") {
      const bottomEdge = (p.y + p.height) * H;
      const reserveFromBottom = H - bottomEdge + dieline.bleedPx;
      extraBottom = Math.max(extraBottom, Math.floor(Math.max(0, reserveFromBottom) * 0.2));
    }
    if (p.role === "variant_band") {
      extraTop = Math.max(extraTop, Math.floor(p.height * H * 0.08));
    }
  }
  const m = plan.safeMargins;
  return compositionPlanDocumentSchema.parse({
    ...plan,
    safeMargins: {
      top: m.top + extraTop,
      right: m.right,
      bottom: m.bottom + extraBottom,
      left: m.left,
    },
    modeSpecificConstraints: {
      ...plan.modeSpecificConstraints,
      packagingDielineApplied: true,
      packagingDielinePanelCount: dieline.panels.length,
    },
  });
}
