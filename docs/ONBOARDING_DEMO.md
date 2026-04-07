# Smart onboarding & demo brands (internal)

## AI quick onboard

1. Go to **Clients → New client**.
2. Use **Quick onboard with AI**: rough inputs → **Generate AI draft** (requires `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`).
3. Review the JSON preview, then **Create client & apply draft**.
4. Refine **Brand Bible** and **brief**; saving clears the **Needs review** banner.

Drafts are stored with `onboardingSource: ai_draft` and `aiOnboardingNeedsReview: true` until you save the Brand Bible (brief clears on brief save).

## Seeded demo clients (Coca-Cola & McDonald’s — SA)

Public-brand-style data only — **not** confidential materials. Clients are labeled **Demo**.

**CLI:**

```bash
npm run seed:demo-brands
```

**In app:** same page as AI onboard — **Seed demo brands (idempotent)**.

Creates:

- `Coca-Cola (Demo — SA)` — summer campaign brief, full pipeline initialized  
- `McDonald's (Demo — SA)` — value/family seasonal brief, full pipeline initialized  

Open **Studio** on each brief, use **Run next step** with LLM keys to produce real artifacts; approve **Visual direction** to get a prompt package, then **Generate** with image keys.

## Env flags

| Variable | Effect |
|----------|--------|
| `AGENTICFORCE_ALLOW_DEMO_SEED=1` | Allow demo seed server action outside `development` |
