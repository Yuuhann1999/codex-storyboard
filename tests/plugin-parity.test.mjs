import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
test("bundled plugin matches the development app", async () => {
  for (const path of ["server.mjs", "task-state.mjs", "runtime.mjs", "audio.mjs", "timing.mjs", "voice/voxcpm.py", "public/app.js", "public/index.html", "public/styles.css", "public/autosave.js", "public/pacing.js"]) {
    assert.equal(await readFile(path, "utf8"), await readFile(`plugins/codex-storyboard/app/${path}`, "utf8"), path);
  }
});
