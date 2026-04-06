import type { BrandBible, TaskStatus } from "@/generated/prisma/client";
import { assessBrandBibleReadiness } from "@/server/brand/readiness";
import fs from "node:fs";
import path from "node:path";

export type VisualGenReadinessLine = { level: "ok" | "warn" | "block"; text: string };

export function getVisualGenerationReadiness(args: {
  brandBible: BrandBible | null;
  hasPromptPackage: boolean;
  visualDirectionTaskStatus: TaskStatus | null;
}): VisualGenReadinessLine[] {
  const lines: VisualGenReadinessLine[] = [];
  const bb = assessBrandBibleReadiness(args.brandBible);
  if (!bb.ok) {
    lines.push({
      level: "block",
      text: `Brand Bible incomplete (${bb.missing.join("; ")}). Complete Brand Bible before agent stages and image generation.`,
    });
  } else {
    lines.push({ level: "ok", text: "Brand Bible meets minimum bar for AI stages." });
  }

  if (args.visualDirectionTaskStatus == null) {
    lines.push({
      level: "block",
      text: "Visual direction stage not in workflow yet — initialize workflow and advance to VISUAL_DIRECTION.",
    });
  } else if (!args.hasPromptPackage) {
    if (args.visualDirectionTaskStatus === "AWAITING_REVIEW") {
      lines.push({
        level: "block",
        text: "Approve the Visual direction task in Actions — that assembles the VISUAL_PROMPT_PACKAGE required for generation.",
      });
    } else if (
      args.visualDirectionTaskStatus === "COMPLETED" ||
      args.visualDirectionTaskStatus === "READY" ||
      args.visualDirectionTaskStatus === "RUNNING"
    ) {
      lines.push({
        level: "warn",
        text: "No prompt package on the visual task yet. If direction is completed, approve it; if stuck, check orchestrator logs.",
      });
    } else {
      lines.push({
        level: "block",
        text: `Visual direction task status: ${args.visualDirectionTaskStatus}. Complete prior stages first.`,
      });
    }
  } else {
    lines.push({ level: "ok", text: "Prompt package exists — generation can run." });
  }

  const openai = !!process.env.OPENAI_API_KEY?.trim();
  const gemini =
    !!process.env.GEMINI_API_KEY?.trim() || !!process.env.GOOGLE_API_KEY?.trim();
  if (!openai && !gemini) {
    lines.push({
      level: "block",
      text: "No image API keys: set OPENAI_API_KEY (DALL·E) and/or GEMINI_API_KEY or GOOGLE_API_KEY (Imagen).",
    });
  } else {
    lines.push({
      level: "ok",
      text: `Image provider keys present (${openai ? "OpenAI" : ""}${openai && gemini ? " + " : ""}${gemini ? "Gemini/Google" : ""}).`,
    });
  }

  const root = process.env.STORAGE_ROOT?.trim() || path.join(process.cwd(), "storage");
  try {
    fs.mkdirSync(root, { recursive: true });
    fs.accessSync(root, fs.constants.W_OK);
    lines.push({ level: "ok", text: `Storage writable (${root}).` });
  } catch {
    lines.push({
      level: "block",
      text: `STORAGE_ROOT not writable (${root}). Set STORAGE_ROOT to a writable path.`,
    });
  }

  return lines;
}
