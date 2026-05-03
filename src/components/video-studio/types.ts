export type TrackId = "A" | "B";

export type TimelineSegment = {
  id: string;
  /** Which source file this segment uses */
  track: TrackId;
  /** Start time within the chosen source video (seconds) */
  sourceIn: number;
  /** End time within the chosen source video (exclusive, seconds) */
  sourceOut: number;
};

/** Relative to segment start: mute audio in [from, to) within the segment */
export type MuteSpan = { from: number; to: number };
