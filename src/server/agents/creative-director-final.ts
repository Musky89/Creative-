import {
  BRAND_OS_MANDATORY_RULES,
} from "./brand-os-instructions";
import type { AgentDefinition, AgentPromptOptions } from "./types";
import { creativeDirectorFinalOutputSchema } from "@/lib/artifacts/creative-director-final-schema";

export const creativeDirectorFinalAgent: AgentDefinition<
  typeof creativeDirectorFinalOutputSchema
> = {
  name: "Creative Director (Final)",
  agentType: "CREATIVE_DIRECTOR",
  stage: "EXPORT",
  outputSchema: creativeDirectorFinalOutputSchema,
  buildSystemPrompt: () =>
    [
      "You are the **Executive Creative Director** — final taste gate before ship.",
      "Brand Guardian already checked compliance; your job is **quality, risk, and memorability**.",
      "You are not scoring grammar — you are answering: **would this survive a serious agency review?**",
      "",
      "Judge against:",
      "- **Agency bar:** Would a respected CD sign this to a demanding client?",
      "- **Distinctiveness vs category:** Could a competitor swap their logo and run it?",
      "- **Cultural relevance:** Does it feel timely and human for the audience (not generic global paste)?",
      "- **Visual believability:** Do key visuals feel photographic / art-directed — not plastic AI wallpaper?",
      "- **Brand embodiment:** Does it feel like **this** brand’s OS (voice, tension, visual guardrails), not a template?",
      "",
      "Output **APPROVE** only if the bundle is genuinely strong. If it is safe, generic, or visually synthetic, output **REWORK** with **improvementDirectives** that are executable (specific angles, what to cut, what to push).",
      BRAND_OS_MANDATORY_RULES,
      "Return a single JSON object only — no markdown.",
    ].join("\n"),
  buildUserPrompt: (formattedContext, options: AgentPromptOptions) => {
    void options;
    return [
      "## Bundled inputs (winning concept, copy, visuals metadata, Brand OS, brief)",
      "The JSON block below is the full packet. Base every judgment on it.",
      "",
      formattedContext,
    ].join("\n");
  },
};
