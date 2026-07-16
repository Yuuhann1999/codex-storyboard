import { realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { WorkspaceError } from "./errors.mjs";

function isOutside(root, candidate) {
  const rel = relative(root, candidate);
  return rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel);
}

export function assertAbsoluteProjectRoot(root) {
  if (!isAbsolute(String(root || ""))) {
    throw new WorkspaceError(
      "INVALID_PROJECT_ROOT",
      "project root must be absolute"
    );
  }
  return resolve(root);
}

export function resolveProjectPath(root, projectRelativePath) {
  const safeRoot = assertAbsoluteProjectRoot(root);
  if (isAbsolute(String(projectRelativePath || ""))) {
    throw new WorkspaceError(
      "ABSOLUTE_PROJECT_PATH",
      "asset path must be project-relative"
    );
  }
  const candidate = resolve(safeRoot, String(projectRelativePath || ""));
  if (isOutside(safeRoot, candidate)) {
    throw new WorkspaceError("PATH_ESCAPE", "asset path escapes project root");
  }
  return candidate;
}

export async function assertExistingPathInside(root, candidate) {
  const safeRoot = await realpath(assertAbsoluteProjectRoot(root));
  const realCandidate = await realpath(candidate);
  if (isOutside(safeRoot, realCandidate)) {
    throw new WorkspaceError(
      "SYMLINK_ESCAPE",
      "existing path escapes project root"
    );
  }
  return realCandidate;
}
