import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getVisualAssetStorageRoot } from "@/server/storage";
import type { VideoProject } from "@/lib/video-editor/types";

const PROJECT_ROOT_SEGMENT = "video-editor";
const PROJECT_FILE = "project.json";

/** Root directory for all video-editor projects. */
export function videoEditorRoot(): string {
  return path.join(getVisualAssetStorageRoot(), PROJECT_ROOT_SEGMENT);
}

export function projectDir(projectId: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(projectId)) {
    throw new Error("Invalid project id.");
  }
  return path.join(videoEditorRoot(), projectId);
}

export function projectFilePath(projectId: string): string {
  return path.join(projectDir(projectId), PROJECT_FILE);
}

/** Resolve a project-relative path to absolute, rejecting traversal. */
export function projectAbsolutePath(projectId: string, relPath: string): string {
  const root = projectDir(projectId);
  const normalised = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const abs = path.resolve(root, normalised);
  const rootSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (!abs.startsWith(rootSep) && abs !== root) {
    throw new Error("Invalid project path: escapes project root.");
  }
  return abs;
}

export async function ensureProjectDir(projectId: string): Promise<string> {
  const dir = projectDir(projectId);
  await mkdir(dir, { recursive: true });
  await mkdir(path.join(dir, "clips"), { recursive: true });
  await mkdir(path.join(dir, "renders"), { recursive: true });
  return dir;
}

export async function listProjects(): Promise<VideoProject[]> {
  try {
    const root = videoEditorRoot();
    const entries = await readdir(root, { withFileTypes: true });
    const projects: VideoProject[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const p = await loadProject(entry.name);
        projects.push(p);
      } catch {
        /* skip corrupt project dirs */
      }
    }
    projects.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    return projects;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

export async function loadProject(projectId: string): Promise<VideoProject> {
  const filePath = projectFilePath(projectId);
  const raw = await readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw) as VideoProject;
  return parsed;
}

/**
 * Atomic write of `project.json` (write tmp, rename). The whole project file
 * is small (~tens of KB even with full transcripts), so rewrites are cheap.
 */
export async function saveProject(project: VideoProject): Promise<void> {
  await ensureProjectDir(project.id);
  const filePath = projectFilePath(project.id);
  const tmp = `${filePath}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(project, null, 2), "utf-8");
  await rename(tmp, filePath);
}

/**
 * Coarse mutex per project to prevent concurrent updates from clobbering
 * project.json. Keyed by project id; lives only in this Node process.
 *
 * Since the editor is a single-user founder tool, in-process locking is
 * sufficient. If we ever go multi-process we'd swap this for a proper
 * file lock or a DB row.
 */
const inflight = new Map<string, Promise<unknown>>();

export async function withProjectLock<T>(
  projectId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const previous = inflight.get(projectId) ?? Promise.resolve();
  let release: () => void;
  const next = new Promise<void>((res) => {
    release = res;
  });
  inflight.set(projectId, previous.then(() => next));
  try {
    await previous;
    return await fn();
  } finally {
    release!();
    if (inflight.get(projectId) === previous.then(() => next)) {
      inflight.delete(projectId);
    }
  }
}

export async function mutateProject(
  projectId: string,
  mutator: (p: VideoProject) => VideoProject | Promise<VideoProject>,
): Promise<VideoProject> {
  return withProjectLock(projectId, async () => {
    const current = await loadProject(projectId);
    const next = await mutator(current);
    next.updatedAt = new Date().toISOString();
    await saveProject(next);
    return next;
  });
}

export async function createProject(name: string): Promise<VideoProject> {
  const id = `proj_${Date.now().toString(36)}_${randomUUID().slice(0, 6)}`;
  await ensureProjectDir(id);
  const now = new Date().toISOString();
  const project: VideoProject = {
    id,
    name: name.trim() || "Untitled project",
    createdAt: now,
    updatedAt: now,
    status: "draft",
    clips: [],
    timeline: [],
    renders: [],
  };
  await saveProject(project);
  return project;
}

export async function deleteProject(projectId: string): Promise<void> {
  const dir = projectDir(projectId);
  await rm(dir, { recursive: true, force: true });
}

export async function fileExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}
