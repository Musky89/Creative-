/**
 * Editorial one-liner + primary next-step label for creative-director Studio surface.
 */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function clip(s: string, max: number) {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export type CreativeVerdictPack = {
  /** Single editorial sentence */
  verdictLine: string;
  /** One obvious next action label */
  primaryActionLabel: string;
};

export function computeCreativeVerdictPack(args: {
  reviewContent: unknown;
  qualityGateBlocked: boolean;
  qualityReasons: string[];
  nextExecutableStage: string | null;
  hasWorkflow: boolean;
  reviewWaiting: boolean;
  failedTaskCount: number;
  campaignCorePresent: boolean;
  hasStrategicOutput: boolean;
}): CreativeVerdictPack {
  const r = args.reviewContent;
  const rep = isRecord(r) ? r : null;

  let verdictLine =
    "Start here when you're ready — we'll shape the idea, routes, visuals, and messaging in one flow.";

  if (!args.hasWorkflow) {
    return {
      verdictLine,
      primaryActionLabel: "Generate campaign",
    };
  }

  if (args.failedTaskCount > 0) {
    return {
      verdictLine:
        "Something didn't land in the last pass — take another run at it before moving on.",
      primaryActionLabel: "Try again",
    };
  }

  if (args.reviewWaiting && rep) {
    const qv = String(rep.qualityVerdict ?? "");
    const bar = String(rep.creativeBarVerdict ?? "");
    const summary = String(rep.scoreSummary ?? "").trim();

    if (args.qualityGateBlocked && args.qualityReasons.length) {
      const hint = args.qualityReasons[0] ?? "";
      verdictLine = clip(
        hint
          ? `Strong bones, but ${hint.charAt(0).toLowerCase()}${hint.slice(1)}`
          : "Not quite ready to ship — tighten the work before you lock it in.",
        220,
      );
      return {
        verdictLine,
        primaryActionLabel: "Refine first",
      };
    }

    if (summary.length > 24) {
      verdictLine = clip(summary, 200);
    } else if (qv === "WEAK" || bar === "FAILS_BAR" || bar === "MARGINAL") {
      verdictLine =
        "The work is close, but the language or craft still reads safe — push for a sharper edge.";
    } else if (qv === "STRONG" || bar === "CLEAR_WIN") {
      verdictLine =
        "This holds together — clear idea, coherent craft, and a credible campaign feel.";
    } else {
      verdictLine =
        "Worth a careful read — decide what to keep and what to push before you sign off.";
    }

    return {
      verdictLine,
      primaryActionLabel: "Lock this in",
    };
  }

  if (args.nextExecutableStage === "STRATEGY" && !args.campaignCorePresent) {
    return {
      verdictLine: "The strategic spine isn't on the board yet — that's the first move.",
      primaryActionLabel: "Generate campaign",
    };
  }

  if (args.nextExecutableStage === "CONCEPTING") {
    return {
      verdictLine:
        "The idea is set — now we need distinct routes that feel worth presenting.",
      primaryActionLabel: "Develop routes",
    };
  }

  if (args.nextExecutableStage === "VISUAL_DIRECTION") {
    return {
      verdictLine: "Words are forming — next is how this world should look and feel.",
      primaryActionLabel: "Define the visual world",
    };
  }

  if (args.nextExecutableStage === "COPY_DEVELOPMENT") {
    return {
      verdictLine: "The frame is there — sharpen the language so it sounds unmistakably yours.",
      primaryActionLabel: "Shape messaging",
    };
  }

  if (args.nextExecutableStage === "REVIEW") {
    return {
      verdictLine: "Time for a clear-eyed pass before anything goes out the door.",
      primaryActionLabel: "Run brand check",
    };
  }

  if (args.nextExecutableStage === "EXPORT") {
    return {
      verdictLine: "Creative is in place — finish the pack when you're happy with the work.",
      primaryActionLabel: "Finalize assets",
    };
  }

  if (args.nextExecutableStage === "BRIEF_INTAKE") {
    return {
      verdictLine: "Brief is in — roll into the campaign when you're ready.",
      primaryActionLabel: "Continue",
    };
  }

  if (!args.nextExecutableStage && args.hasStrategicOutput) {
    verdictLine =
      "This pass looks complete — scan the work below or export when you're satisfied.";
    return {
      verdictLine,
      primaryActionLabel: "Download",
    };
  }

  return {
    verdictLine,
    primaryActionLabel: "Generate campaign",
  };
}
