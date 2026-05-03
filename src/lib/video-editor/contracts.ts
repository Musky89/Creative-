import { z } from "zod";

export const videoSourceIdSchema = z.enum(["a", "b"]);

export const editSegmentSchema = z.object({
  id: z.string().min(1),
  sourceId: videoSourceIdSchema,
  start: z.number().finite().min(0),
  end: z.number().finite().positive(),
  label: z.string().trim().max(120).optional(),
});

export const editDecisionListSchema = z.object({
  projectName: z.string().trim().min(1).max(120),
  segments: z
    .array(editSegmentSchema)
    .min(1)
    .max(80)
    .refine((segments) => segments.every((segment) => segment.end > segment.start), {
      message: "Every segment must end after it starts.",
    }),
});

export type VideoSourceId = z.infer<typeof videoSourceIdSchema>;
export type EditSegment = z.infer<typeof editSegmentSchema>;
export type EditDecisionList = z.infer<typeof editDecisionListSchema>;
