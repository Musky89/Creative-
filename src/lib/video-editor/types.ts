export interface VideoFile {
  id: string;
  name: string;
  path: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  size: number;
  thumbnailUrl: string;
  waveformUrl: string;
}

export interface Segment {
  id: string;
  videoId: string;
  label: string;
  startTime: number;
  endTime: number;
  isMuted: boolean;
  isSelected: boolean;
}

export interface SilenceRegion {
  start: number;
  end: number;
  duration: number;
}

export interface TimelineSegment extends Segment {
  orderIndex: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  videos: VideoFile[];
  segments: Segment[];
  timeline: TimelineSegment[];
}

export interface AnalysisResult {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  waveformUrl: string;
  thumbnailUrl: string;
  silenceRegions: SilenceRegion[];
}

export interface ExportRequest {
  projectId: string;
  segments: TimelineSegment[];
  format: "mp4" | "webm" | "mov";
  resolution: "original" | "1080p" | "720p" | "480p";
}

export interface ExportProgress {
  status: "queued" | "processing" | "done" | "error";
  progress: number;
  outputUrl?: string;
  error?: string;
}
