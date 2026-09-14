import assert from "node:assert/strict";
const url = process.env.CODEX_STORYBOARD_URL || "http://127.0.0.1:43218";
const call = async (path, body, method = body ? "POST" : "GET") => {
  const response = await fetch(`${url}${path}`, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
};
const project = await call("/api/projects", { title: "VoxCPM + Whisper 实测", shots: [
  { dialogue: "雨停了，街灯照亮了回家的路。", duration: 5 },
  { dialogue: "我们放慢脚步，享受这一刻的安静。", duration: 5 },
  { dialogue: "", duration: 2 }
] });
const path = `/api/projects/${project.id}`;
await call(path, { ...project, scriptDraft: project.shots.map(s => s.dialogue).filter(Boolean).join("\n") }, "PUT");
console.log(`Test project: ${url}/project/${project.id}`);
const wait = async () => {
  const deadline = Date.now() + 35 * 60 * 1000;
  while (Date.now() < deadline) {
    const current = await call(path);
    if (current.audio.status === "failed") throw new Error(current.audio.error);
    if (current.audio.status === "ready") return current;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error("Voice smoke test timed out");
};
await call(`${path}/audio/generate`, { instruction: "自然清晰的普通话，温暖平静" });
let current = await wait();
const take = current.audio.takes.at(-1);
assert.ok(take.durationMs > 0);
const media = await fetch(`${url}${take.url}`);
assert.equal(media.status, 200);
assert.ok((await media.arrayBuffer()).byteLength > 1000);
console.log(`Online voice succeeded: ${take.durationMs} ms`);
await call(`${path}/audio/align`, {});
current = await wait();
const aligned = current.audio.takes.at(-1);
assert.ok(aligned.alignEngine.startsWith("whisper"));
assert.equal(aligned.timeline.length, 2);
assert.ok(aligned.recognition.length > 0);
current = await call(`${path}/audio/apply-durations`, {});
assert.equal(current.shots[2].duration, 2);
assert.ok(Math.abs(current.shots[0].duration + current.shots[1].duration - take.durationMs / 1000) < 0.02);
const stale = structuredClone(current);
stale.shots[0].dialogue += "台词已改";
const changed = await call(path, stale, "PUT");
await assert.rejects(() => call(`${path}/audio/apply-durations`, {}), /台词或镜头顺序/);
changed.shots[0].dialogue = current.shots[0].dialogue;
await call(path, changed, "PUT");
console.log(JSON.stringify({ projectId: project.id, audioUrl: take.url, durationMs: take.durationMs, engine: aligned.alignEngine, recognition: aligned.recognition, timeline: aligned.timeline, durations: current.shots.map(s => s.duration), staleProtection: "passed" }, null, 2));
