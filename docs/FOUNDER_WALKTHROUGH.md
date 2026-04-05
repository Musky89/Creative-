# Founder walkthrough — demo & QA script

Use this for **recorded demos** (Loom / OBS / QuickTime) or **live validation**. Assumes **Postgres up**, **migrations applied**, **dev server running**, and ideally **LLM keys** set.

## Before you record

1. `npm run preflight` — all OK  
2. Optional: `npm run qa:bootstrap` — pre-seeded clients/briefs (or create your own below)  
3. Close unrelated apps; 1920×1080 browser window is enough for a clean capture  

**Capture suggestions**

- **0:00** — Terminal: `npm run preflight` success (proves DB)  
- **0:30** — Browser: Dashboard with clients (or after creating one)  
- **2:00** — Studio: timeline + Execute / Approve  
- **5:00** — Artifact cards (strategy / concept)  
- **8:00** — Visual direction approved → prompt package visible  
- **10:00** — Generate visual asset → thumbnail or explicit FAILED state  
- **12:00** — Identity brief: identity strategy + routes + route selection form  

---

## Path A — Campaign workflow (existing brand)

### 1. Client hub

1. Open **`/`** — confirm dashboard loads (no “Database unreachable”).  
2. **`/clients/new`** — create client (or use **Loom & Lumen Atelier** if you ran `qa:bootstrap`).  
3. **`/clients/{id}`** — client overview.

**Verify:** Client appears on dashboard and client list.

### 2. Brand Bible / Brand OS

1. **`/clients/{id}/brand-bible`**  
2. Fill **positioning, audience, tone, pillars** (required for agent gate).  
3. Fill **Brand OS** sections (banned phrases, visual language) if testing quality loop.

**Verify:** Save succeeds; no empty required fields.

### 3. Service blueprint

1. **`/clients/{id}/service-blueprint`**  
2. Set template + quality threshold; save.

### 4. Brief + Studio

1. **`/clients/{id}/briefs/new`** — create campaign brief (leave **identity workflow** unchecked for pure campaign path).  
2. Open **`/clients/{id}/briefs/{briefId}/studio`**.

**Verify:** Brief title and deadline visible.

### 5. Workflow

1. Click **Initialize workflow** (if no tasks).  
2. **Execute next task** repeatedly; **Approve** at each review gate when prompted.  
3. Order to expect: **Brief intake** → **Strategy** → **Concepting** → **Visual direction** → **Copy** → **Review** → **Export**.

**Verify:** Timeline stages advance; artifacts appear under **Artifacts by stage**.

### 6. Visual prompt package

1. At **Visual direction**, after **Approve**, scroll to that stage.  
2. Confirm **VISUAL_PROMPT_PACKAGE** appears (deterministic assembly).

**Verify:** Package JSON sections present (not “approve to create” message forever).

### 7. Visual asset

1. In visual section, **Generate visual asset** (pick provider target per your `.env`).  
2. Wait for **COMPLETED** or read **FAILED** message / notes.

**Verify:** Honest outcome — no fake image on failure. If completed, optional **Select / Reject** and review row.

### 8. Export

1. Use Studio **Download JSON** / **Markdown** or  
   `GET /api/export/briefs/{briefId}?clientId={clientId}&format=json`

**Verify:** File downloads; stages present.

---

## Path B — Identity workflow (new brand)

1. **`/clients/new`** or use **Verdant Circuit Skincare** from `qa:bootstrap`.  
2. Complete **Brand Bible** (same gate as campaign).  
3. **`/clients/{id}/briefs/new`** — check **Identity workflow (new brand / identity build)**.  
4. **Studio** → Initialize → Execute through **Strategy**, then **Identity strategy**, **Identity routes**, then concepting…  

**Verify:** Extra stages appear in timeline; **IDENTITY_STRATEGY** and **IDENTITY_ROUTES_PACK** artifacts render; **Founder route selection** form appears under identity routes.

---

## Path C — Internal evaluation page

1. **`/clients/{id}/internal-testing`**  
2. **Ensure test briefs** (optional)  
3. Start session; log evaluations per stage  

**Verify:** Records save; summary aggregates update.

---

## What “good” looks like

- No unexplained **500** on dashboard, Studio, or Brand Bible.  
- Review gates **block** until approve; revision returns task to **REVISE_REQUIRED**.  
- With keys: artifacts read **specific** to brief + Brand OS; placeholders are **explicitly labeled** without keys.  
- Image gen: **COMPLETED** with file **or** **FAILED** with readable error — never silent success on error.
