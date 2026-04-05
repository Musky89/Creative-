/**
 * Run: npx tsx scripts/check-env.ts
 * Fails non-zero if deployment env validation fails (for CI / pre-deploy).
 */
import "dotenv/config";
import { validateDeploymentEnv } from "../src/server/env/deployment-env";

const r = validateDeploymentEnv();
for (const w of r.warnings) {
  console.warn(`[agenticforce:env] ${w}`);
}
if (!r.ok) {
  console.error("[agenticforce:env] Fix the following before deploy:");
  for (const e of r.errors) {
    console.error(`  - ${e}`);
  }
  process.exit(1);
}
console.log("[agenticforce:env] OK");
process.exit(0);
