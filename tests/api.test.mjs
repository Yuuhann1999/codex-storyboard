import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
test("project persistence, conflict detection, generation cancellation and recovery", async () => {
  const directory = await mkdtemp(join(tmpdir(), "codex-storyboard-test-"));
  const socket = createServer();
  await new Promise(resolve => socket.listen(0, "127.0.0.1", resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  const child = spawn(process.execPath, ["server.mjs", "--port", String(port), "--data-dir", directory], { windowsHide: true });
  const stopped = new Promise(resolve => child.on("close", resolve));
  let log = ""; child.stderr.on("data", d => { log += d; });
  child.stdout.on("data", d => { log += d; });
  const request = async (path, method = "GET", body) => {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  };
  try {
    for (let i = 0; i < 100; i++) {
      try { if ((await request("/api/health")).status === 200) break; } catch {}
      if (i === 99) throw Error(log);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    let { data: project } = await request("/api/projects", "POST", { title: "Integration", shots: [{ dialogue: "hello", visualPrompt: "rain", generator: "image-gen" }] });
    const path = `/api/projects/${project.id}`;
    const original = structuredClone(project);
    project.scriptDraft = "persistent draft";
    project = (await request(path, "PUT", project)).data;
    assert.equal((await request(path)).data.scriptDraft, "persistent draft");
    assert.equal((await request(path, "PUT", original)).status, 409);
    let queued = (await request("/api/generation/tasks", "POST", { projectId: project.id, shotIds: [project.shots[0].id] })).data;
    let task = queued.queued[0].taskId;
    assert.equal((await request(`/api/generation/tasks/${task}/claim`, "POST", {})).status, 200);
    assert.equal((await request(`/api/generation/tasks/${task}/heartbeat`, "POST", {})).status, 200);
    assert.equal((await request(`/api/generation/tasks/${task}/cancel`, "POST", {})).status, 200);
    assert.equal((await request(`/api/generation/tasks/${task}/complete`, "POST", { sourcePath: "missing.png" })).status, 404);
    queued = (await request("/api/generation/tasks", "POST", { projectId: project.id, shotIds: [project.shots[0].id] })).data;
    task = queued.queued[0].taskId;
    await request(`/api/generation/tasks/${task}/claim`, "POST", {});
    const file = join(directory, "projects", project.id, "project.json");
    const stored = JSON.parse(await readFile(file, "utf8"));
    stored.shots[0].generationHeartbeatAt = "2020-01-01T00:00:00Z";
    stored.audio = { takes: [], status: "generating" };
    await writeFile(file, JSON.stringify(stored));
    const recovered = (await request(path)).data;
    assert.equal(recovered.audio.status, "failed");
    assert.equal((await request(path)).data.shots[0].generationStatus, "failed");
    assert.equal((await request(`/api/generation/tasks/${task}/complete`, "POST", { sourcePath: "missing.png" })).status, 409);
  } finally {
    child.kill(); await stopped;
    await rm(directory, { recursive: true, force: true });
  }
});
