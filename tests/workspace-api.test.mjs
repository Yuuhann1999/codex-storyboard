import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { startApp } from "./helpers/app-process.mjs";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

async function withApp(run) {
  const base = await mkdtemp(join(tmpdir(), "storyboard-workbench-api-"));
  const dataDir = join(base, "config");
  const app = await startApp({ repoRoot, dataDir });
  try {
    await run({ ...app, base, dataDir });
  } finally {
    app.child.kill("SIGTERM");
    await rm(base, { recursive: true, force: true });
  }
}

async function jsonRequest(url, path, body) {
  const response = await fetch(`${url}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  return { response, body: await response.json() };
}

test("workspace API creates, opens, and lists a project rooted in the user directory", async () => {
  await withApp(async ({ url, base }) => {
    const root = join(base, "my-storyboard");
    const created = await jsonRequest(url, "/api/workspaces", {
      root,
      title: "萌宝短片",
      aspectRatio: "9:16"
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.root, root);
    assert.equal(created.body.project.title, "萌宝短片");

    const opened = await jsonRequest(url, "/api/workspaces/open", { root });
    assert.equal(opened.response.status, 200);
    assert.equal(opened.body.project.projectId, created.body.project.projectId);

    const recentResponse = await fetch(`${url}/api/workspaces`);
    assert.equal(recentResponse.status, 200);
    const recent = await recentResponse.json();
    assert.equal(recent.projects[0].root, root);
  });
});

test("workspace API rejects relative roots and duplicate projects", async () => {
  await withApp(async ({ url, base }) => {
    const invalid = await jsonRequest(url, "/api/workspaces", {
      root: "relative/project",
      title: "Invalid",
      aspectRatio: "16:9"
    });
    assert.equal(invalid.response.status, 400);

    const invalidOpen = await jsonRequest(url, "/api/workspaces/open", {
      root: "relative/project"
    });
    assert.equal(invalidOpen.response.status, 400);

    const root = join(base, "duplicate");
    const first = await jsonRequest(url, "/api/workspaces", {
      root,
      title: "First",
      aspectRatio: "16:9"
    });
    assert.equal(first.response.status, 201);

    const duplicate = await jsonRequest(url, "/api/workspaces", {
      root,
      title: "Second",
      aspectRatio: "16:9"
    });
    assert.equal(duplicate.response.status, 409);
    assert.equal(duplicate.body.error, `workspace already exists: ${root}`);
  });
});
