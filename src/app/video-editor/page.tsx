import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/section";
import { VideoEditorWorkbench } from "@/components/video-editor/video-editor-workbench";

export const metadata: Metadata = {
  title: "Video Editor",
  description:
    "Upload two takes, remove rough sections, assemble the best timeline, and render a final MP4.",
};

export default function VideoEditorPage() {
  return (
    <>
      <PageHeader
        title="Advanced Video Editor"
        description="Upload two takes, remove filler sections, assemble clean story beats, and render a downloadable final cut."
        tone="muted"
      />
      <VideoEditorWorkbench />
    </>
  );
}
