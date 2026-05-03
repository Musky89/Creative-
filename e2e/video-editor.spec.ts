import { existsSync } from "fs";
import { mkdir } from "fs/promises";
import path from "path";
import { spawnSync } from "child_process";
import { expect, test } from "@playwright/test";

const fixtureDir = path.join(process.cwd(), "tmp", "video-editor-e2e");
const takeAPath = path.join(fixtureDir, "take-a.mp4");
const takeBPath = path.join(fixtureDir, "take-b.mp4");

function ffmpegAvailable() {
  return spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;
}

function createFixtureVideo(outputPath: string, pattern: string, tone: string) {
  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `${pattern}=size=320x180:rate=30`,
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=${tone}:sample_rate=48000`,
      "-t",
      "4",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      outputPath,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || `Could not create ${outputPath}`);
  }
}

test.beforeAll(async () => {
  test.skip(!ffmpegAvailable(), "ffmpeg is required for video editor E2E fixtures");
  await mkdir(fixtureDir, { recursive: true });
  if (!existsSync(takeAPath)) createFixtureVideo(takeAPath, "testsrc", "440");
  if (!existsSync(takeBPath)) createFixtureVideo(takeBPath, "testsrc2", "660");
});

test("video editor uploads, drafts clean clips, and renders an MP4", async ({
  page,
}) => {
  await page.goto("/video-editor");
  await expect(
    page.getByRole("heading", { name: "Advanced Video Editor" }),
  ).toBeVisible();

  const uploaders = page.locator('input[type="file"]');
  await uploaders.nth(0).setInputFiles(takeAPath);
  await uploaders.nth(1).setInputFiles(takeBPath);
  await expect(page.getByText("take-a.mp4")).toBeVisible();
  await expect(page.getByText("take-b.mp4")).toBeVisible();

  await page
    .getByPlaceholder(/00:00-00:05 intro/)
    .fill("00:00-00:01 clean intro\n00:01-00:02 um bad restart\n00:02-00:04 final thought");
  await expect(page.getByText("Detected removals: 1")).toBeVisible();

  await page.getByRole("button", { name: "Build clean draft from active take" }).click();
  await expect(page.getByText("Clean pass 1")).toBeVisible();
  await expect(page.getByText("Clean pass 2")).toBeVisible();

  await page.getByRole("button", { name: "Render downloadable MP4" }).click();
  await expect(page.getByRole("link", { name: "Download final cut" })).toBeVisible({
    timeout: 45_000,
  });
});
