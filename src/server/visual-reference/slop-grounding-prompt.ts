/** Injected into every assembled image prompt — deterministic anti-slop + realism grounding. */
export const VISUAL_SLOP_AND_REALISM_BLOCK = [
  "REALISM & ANTI-SLOP (non-negotiable for this generation):",
  "- The image must feel like a **real-world campaign photograph** (plausible camera, lens, and set) — not CGI, not a video-game render.",
  "- Avoid hyper-real CGI rendering, plastic skin, wax food, and oversaturated \"AI polish\".",
  "- Avoid overly perfect symmetry and centered stock compositions unless the spec explicitly demands symmetry.",
  "- Use **natural imperfections**: subtle grain, micro texture, believable micro-contrast; no sterile perfection.",
  "- **Lighting must follow real-world physics**: motivated sources, plausible shadows, consistent direction and color temperature.",
  "- Prefer **shallow depth of field** only when it matches the spec — not as a default crutch.",
].join("\n");
