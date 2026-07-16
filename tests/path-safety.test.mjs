import assert from "node:assert/strict";
import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  assertAbsoluteProjectRoot,
  assertExistingPathInside,
  resolveProjectPath
} from "../plugins/storyboard-workbench/app/lib/path-safety.mjs";

test("requires an absolute project root and rejects lexical traversal", () => {
  assert.throws(
    () => assertAbsoluteProjectRoot("relative/project"),
    /must be absolute/
  );
  const root = "/tmp/storyboard-root";
  assert.equal(
    resolveProjectPath(root, "shots/S01/shot.json"),
    join(root, "shots/S01/shot.json")
  );
  assert.throws(
    () => resolveProjectPath(root, "../outside.json"),
    /escapes project root/
  );
  assert.throws(
    () => resolveProjectPath(root, "/tmp/outside.json"),
    /must be project-relative/
  );
});

test("rejects an existing path that escapes through a symlink", async () => {
  const base = await mkdtemp(join(tmpdir(), "storyboard-path-"));
  const root = join(base, "project");
  const outside = join(base, "outside");
  await mkdir(root);
  await mkdir(outside);
  await writeFile(join(outside, "secret.txt"), "private");
  await symlink(outside, join(root, "linked"));
  await assert.rejects(
    () => assertExistingPathInside(root, join(root, "linked/secret.txt")),
    /escapes project root/
  );
});
