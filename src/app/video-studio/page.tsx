import { VideoStudioApp } from "@/components/video-studio/video-studio-app";

export const metadata = {
  title: "Video Studio | AgenticForce",
  description:
    "Multi-take timeline editor: trim clips, stitch A/B sources, strip unwanted audio, export WebM.",
};

export default function VideoStudioPage() {
  return <VideoStudioApp />;
}
