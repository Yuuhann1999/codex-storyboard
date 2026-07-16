import { mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { readJsonFile, writeJsonAtomic } from "./atomic-json.mjs";
import { WorkspaceError } from "./errors.mjs";
import { createEmptyProject, validateProject } from "./project-schema.mjs";
import {
  assertAbsoluteProjectRoot,
  resolveProjectPath
} from "./path-safety.mjs";

const WORKSPACE_DIRS = [
  "references/videos",
  "references/images",
  "analysis",
  "scripts",
  "shots",
  "approvals",
  "generation",
  "handoff",
  ".storyboard/backups",
  ".storyboard/locks"
];

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function projectFile(root) {
  return resolveProjectPath(root, ".storyboard/project.json");
}

async function rememberWorkspace(configDir, root, title) {
  await mkdir(configDir, { recursive: true });
  const file = join(configDir, "recent-projects.json");
  const existing = (await exists(file))
    ? await readJsonFile(file)
    : { projects: [] };
  const record = { root, title, lastOpenedAt: new Date().toISOString() };
  const projects = [
    record,
    ...(existing.projects || []).filter((item) => item.root !== root)
  ].slice(0, 20);
  await writeJsonAtomic(file, { projects });
}

export async function listRecentWorkspaces(configDir) {
  const file = join(configDir, "recent-projects.json");
  if (!(await exists(file))) return [];
  const value = await readJsonFile(file);
  return Array.isArray(value.projects) ? value.projects : [];
}

export async function createWorkspace(
  root,
  { title, aspectRatio, configDir }
) {
  const safeRoot = assertAbsoluteProjectRoot(root);
  if (await exists(projectFile(safeRoot))) {
    throw new WorkspaceError(
      "WORKSPACE_EXISTS",
      `workspace already exists: ${safeRoot}`,
      409
    );
  }
  const project = createEmptyProject({ title, aspectRatio });
  const validation = validateProject(project);
  if (!validation.valid) {
    throw new WorkspaceError("INVALID_PROJECT", validation.errors.join("; "));
  }
  await Promise.all(
    WORKSPACE_DIRS.map((relative) =>
      mkdir(resolveProjectPath(safeRoot, relative), { recursive: true })
    )
  );
  await writeJsonAtomic(projectFile(safeRoot), project);
  await rememberWorkspace(configDir, safeRoot, project.title);
  return project;
}

export async function openWorkspace(root, { configDir } = {}) {
  const safeRoot = assertAbsoluteProjectRoot(root);
  const file = projectFile(safeRoot);
  if (!(await exists(file))) {
    throw new WorkspaceError(
      "WORKSPACE_NOT_FOUND",
      `workspace not found: ${safeRoot}`,
      404
    );
  }
  const project = await readJsonFile(file);
  const validation = validateProject(project);
  if (!validation.valid) {
    throw new WorkspaceError("INVALID_PROJECT", validation.errors.join("; "));
  }
  if (configDir) await rememberWorkspace(configDir, safeRoot, project.title);
  return project;
}

export async function saveWorkspace(root, project) {
  const safeRoot = assertAbsoluteProjectRoot(root);
  const current = await openWorkspace(safeRoot);
  if (current.projectId !== project.projectId) {
    throw new WorkspaceError(
      "PROJECT_ID_MISMATCH",
      "projectId does not match workspace",
      409
    );
  }
  const next = { ...project, updatedAt: new Date().toISOString() };
  const validation = validateProject(next);
  if (!validation.valid) {
    throw new WorkspaceError("INVALID_PROJECT", validation.errors.join("; "));
  }
  return writeJsonAtomic(projectFile(safeRoot), next, {
    backupDir: resolveProjectPath(safeRoot, ".storyboard/backups"),
    maxBackups: 5
  });
}
