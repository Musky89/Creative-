"use client";

import { useActionState } from "react";
import {
  saveBrandBibleFormAction,
  type FormState,
} from "@/app/actions/brand-bible";
import { FieldHint, Label, Textarea } from "@/components/ui/forms";
import { jsonArrayToLines } from "@/lib/json-form";
import type { BrandBible } from "@/generated/prisma/client";

function EnumSelect({
  id,
  name,
  label,
  options,
  defaultValue,
}: {
  id: string;
  name: string;
  label: string;
  options: readonly string[];
  defaultValue: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
      >
        {options.map((v) => (
          <option key={v} value={v}>
            {v.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </div>
  );
}

export function BrandBibleForm({
  clientId,
  initial,
}: {
  clientId: string;
  initial: BrandBible | null;
}) {
  const [state, formAction, pending] = useActionState(
    saveBrandBibleFormAction,
    null as FormState,
  );

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="clientId" value={clientId} />
      {state && "error" in state && state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}
      {state && "ok" in state ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Saved.
        </p>
      ) : null}
      <div>
        <Label htmlFor="positioning">Positioning</Label>
        <Textarea
          id="positioning"
          name="positioning"
          required
          rows={4}
          defaultValue={initial?.positioning ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="targetAudience">Target audience</Label>
        <Textarea
          id="targetAudience"
          name="targetAudience"
          required
          rows={3}
          defaultValue={initial?.targetAudience ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="toneOfVoice">Tone of voice</Label>
        <Textarea
          id="toneOfVoice"
          name="toneOfVoice"
          required
          rows={3}
          defaultValue={initial?.toneOfVoice ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="messagingPillars">Messaging pillars</Label>
        <Textarea
          id="messagingPillars"
          name="messagingPillars"
          rows={4}
          defaultValue={jsonArrayToLines(initial?.messagingPillars)}
        />
        <FieldHint>One pillar per line.</FieldHint>
      </div>
      <div>
        <Label htmlFor="visualIdentity">Visual identity notes</Label>
        <Textarea
          id="visualIdentity"
          name="visualIdentity"
          rows={3}
          defaultValue={jsonArrayToLines(initial?.visualIdentity)}
        />
        <FieldHint>One bullet per line.</FieldHint>
      </div>
      <div>
        <Label htmlFor="channelGuidelines">Channel guidelines</Label>
        <Textarea
          id="channelGuidelines"
          name="channelGuidelines"
          rows={3}
          defaultValue={jsonArrayToLines(initial?.channelGuidelines)}
        />
        <FieldHint>One line per channel or rule.</FieldHint>
      </div>
      <div>
        <Label htmlFor="mandatoryInclusions">Mandatory inclusions</Label>
        <Textarea
          id="mandatoryInclusions"
          name="mandatoryInclusions"
          rows={3}
          defaultValue={jsonArrayToLines(initial?.mandatoryInclusions)}
        />
      </div>
      <div>
        <Label htmlFor="thingsToAvoid">Things to avoid</Label>
        <Textarea
          id="thingsToAvoid"
          name="thingsToAvoid"
          rows={3}
          defaultValue={jsonArrayToLines(initial?.thingsToAvoid)}
        />
      </div>

      <div className="border-t border-zinc-100 pt-6">
        <h3 className="text-sm font-semibold text-zinc-900">Brand Operating System</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Structured rules injected into all agent prompts (language, emotion, creative patterns,
          visual language).
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <EnumSelect
            id="vocabularyStyle"
            name="vocabularyStyle"
            label="Vocabulary style"
            options={["SIMPLE", "ELEVATED", "TECHNICAL", "POETIC", "MIXED"]}
            defaultValue={initial?.vocabularyStyle ?? "SIMPLE"}
          />
          <EnumSelect
            id="sentenceStyle"
            name="sentenceStyle"
            label="Sentence style"
            options={["SHORT", "MEDIUM", "LONG", "VARIED"]}
            defaultValue={initial?.sentenceStyle ?? "MEDIUM"}
          />
          <EnumSelect
            id="primaryEmotion"
            name="primaryEmotion"
            label="Primary emotion"
            options={[
              "ASPIRATION",
              "TRUST",
              "DESIRE",
              "URGENCY",
              "CALM",
              "BOLD",
            ]}
            defaultValue={initial?.primaryEmotion ?? "TRUST"}
          />
          <EnumSelect
            id="persuasionStyle"
            name="persuasionStyle"
            label="Persuasion style"
            options={["SUBTLE", "DIRECT", "STORY_LED", "PROOF_LED"]}
            defaultValue={initial?.persuasionStyle ?? "DIRECT"}
          />
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="bannedPhrases">Banned phrases</Label>
            <Textarea
              id="bannedPhrases"
              name="bannedPhrases"
              rows={3}
              defaultValue={jsonArrayToLines(initial?.bannedPhrases)}
            />
            <FieldHint>One phrase per line. Agents must not use these (quality loop enforces).</FieldHint>
          </div>
          <div>
            <Label htmlFor="preferredPhrases">Preferred phrases / lexicon</Label>
            <Textarea
              id="preferredPhrases"
              name="preferredPhrases"
              rows={3}
              defaultValue={jsonArrayToLines(initial?.preferredPhrases)}
            />
            <FieldHint>One per line.</FieldHint>
          </div>
          <div>
            <Label htmlFor="signaturePatterns">Signature patterns</Label>
            <Textarea
              id="signaturePatterns"
              name="signaturePatterns"
              rows={2}
              defaultValue={jsonArrayToLines(initial?.signaturePatterns)}
            />
            <FieldHint>Recurring devices, rhythms, or constructions — one per line.</FieldHint>
          </div>
          <div>
            <Label htmlFor="emotionalToneDescription">Emotional tone (how it should feel)</Label>
            <Textarea
              id="emotionalToneDescription"
              name="emotionalToneDescription"
              rows={3}
              defaultValue={initial?.emotionalToneDescription ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="emotionalBoundaries">Emotional boundaries (never do X)</Label>
            <Textarea
              id="emotionalBoundaries"
              name="emotionalBoundaries"
              rows={3}
              defaultValue={jsonArrayToLines(initial?.emotionalBoundaries)}
            />
            <FieldHint>One boundary per line.</FieldHint>
          </div>
          <div>
            <Label htmlFor="hookStyles">Hook styles to favor</Label>
            <Textarea
              id="hookStyles"
              name="hookStyles"
              rows={2}
              defaultValue={jsonArrayToLines(initial?.hookStyles)}
            />
            <FieldHint>One per line.</FieldHint>
          </div>
          <div>
            <Label htmlFor="narrativeStyles">Narrative styles to favor</Label>
            <Textarea
              id="narrativeStyles"
              name="narrativeStyles"
              rows={2}
              defaultValue={jsonArrayToLines(initial?.narrativeStyles)}
            />
            <FieldHint>One per line.</FieldHint>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-100 pt-6">
        <h3 className="text-sm font-semibold text-zinc-900">Visual language</h3>
        <p className="mt-1 text-xs text-zinc-500">
          For art direction and tone-matching copy; image generation can plug in later.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="visualStyle">Visual style</Label>
            <Textarea
              id="visualStyle"
              name="visualStyle"
              rows={2}
              defaultValue={initial?.visualStyle ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="colorPhilosophy">Color philosophy</Label>
            <Textarea
              id="colorPhilosophy"
              name="colorPhilosophy"
              rows={2}
              defaultValue={initial?.colorPhilosophy ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="compositionStyle">Composition</Label>
            <Textarea
              id="compositionStyle"
              name="compositionStyle"
              rows={2}
              defaultValue={initial?.compositionStyle ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="textureFocus">Texture focus</Label>
            <Textarea
              id="textureFocus"
              name="textureFocus"
              rows={2}
              defaultValue={initial?.textureFocus ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="lightingStyle">Lighting</Label>
            <Textarea
              id="lightingStyle"
              name="lightingStyle"
              rows={2}
              defaultValue={initial?.lightingStyle ?? ""}
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save Brand Bible"}
      </button>
    </form>
  );
}
