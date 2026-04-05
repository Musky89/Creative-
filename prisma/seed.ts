/**
 * Optional: `npx prisma db seed` — creates an internal test client and canonical test briefs.
 */
import "dotenv/config";
import {
  createClient,
  listClients,
} from "../src/server/domain/clients";
import { ensureInternalTestBriefs } from "../src/server/internal-test/ensure-test-briefs";

const LAB_NAME = "[INTERNAL] AgenticForce test lab";

async function main() {
  const existing = await listClients();
  const found = existing.find((c) => c.name === LAB_NAME);
  let labId: string;
  if (!found) {
    const createdLab = await createClient({
      name: LAB_NAME,
      industry: "Internal validation",
    });
    labId = createdLab.id;
    console.log(`Created test lab client: ${labId}`);
  } else {
    labId = found.id;
    console.log(`Using existing test lab client: ${labId}`);
  }
  const { created, existing: ex } = await ensureInternalTestBriefs(labId);
  console.log(`Test briefs: ${created} created, ${ex} already present.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
