import { AdvancedVideoEditor } from "@/components/video-editor/advanced-video-editor";
import { PageHeader } from "@/components/ui/section";

export default function VideoEditorPage() {
  return (
    <>
      <PageHeader
        title="Advanced Video Editor"
        description="Combine two takes, remove filler, mark keep/cut ranges, and export an edit decision list."
        tone="muted"
      />
      <AdvancedVideoEditor />
    </>
  );
}
