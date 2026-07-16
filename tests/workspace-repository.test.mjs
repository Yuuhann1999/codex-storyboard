import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createWorkspace,
  listRecentWorkspaces,
  openWorkspace,
  saveWorkspace
} from "../plugins/storyboard-workbench/app/lib/workspace-repository.mjs";

test("project directory is authoritative and recents store only navigation metadata", async () => {
  const base = await mkdtemp(join(tmpdir(), "storyboard-workspace-"));
  const root = join(base, "my-project");
  const configDir = join(base, "config");
  const created = await createWorkspace(root, {
    title: "Local Project",
    aspectRatio: "9:16",
    configDir
  });

  assert.equal(created.title, "Local Project");
  for (const relative of [
    "references/videos",
    "references/images",
    "analysis",
    "scripts",
    "shots",
    "approvals",
    "generation",
    "handoff",
    ".storyboard/backups"
  ]) {
    assert.equal(existsSync(join(root, relative)), true, relative);
  }

  created.title = "Saved In Project";
  await saveWorkspace(root, created);
  const opened = await openWorkspace(root, { configDir });
  assert.equal(opened.title, "Saved In Project");

  const recents = await listRecentWorkspaces(configDir);
  assert.deepEqual(Object.keys(recents[0]).sort(), [
    "lastOpenedAt",
    "root",
    "title"
  ]);
  assert.equal(recents[0].root, root);
  const rawRecents = await readFile(
    join(configDir, "recent-projects.json"),
    "utf8"
  );
  assert.equal(rawRecents.includes(created.projectId), false);

  const projectFile = join(root, ".storyboard/project.json");
  const direct = JSON.parse(await readFile(projectFile, "utf8"));
  direct.title = "Direct Project Truth";
  await writeFile(projectFile, `${JSON.stringify(direct, null, 2)}\n`);
  assert.equal(
    (await openWorkspace(root, { configDir })).title,
    "Direct Project Truth"
  );
});

test("refuses duplicate creation and mismatched project ids", async () => {
  const base = await mkdtemp(join(tmpdir(), "storyboard-workspace-"));
  const root = join(base, "project");
  const configDir = join(base, "config");
  const project = await createWorkspace(root, {
    title: "One",
    aspectRatio: "16:9",
    configDir
  });
  await assert.rejects(
    () => createWorkspace(root, { title: "Two", aspectRatio: "16:9", configDir }),
    /already exists/
  );
  await assert.rejects(
    () => saveWorkspace(root, { ...project, projectId: randomUUID() }),
    /projectId does not match/
  );
});
