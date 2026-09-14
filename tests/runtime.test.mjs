import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findWindowsBinary, findWhisperModel } from "../runtime.mjs";

test("finds FFmpeg binaries installed through WinGet", async () => {
  const root = await mkdtemp(join(tmpdir(), "codex-runtime-"));
  try {
    const bin = join(root, "Microsoft", "WinGet", "Packages", "Gyan.FFmpeg_Test", "ffmpeg-9.0.1-full_build", "bin");
    await mkdir(bin, { recursive: true });
    const expected = join(bin, "ffmpeg.exe");
    await writeFile(expected, "test");
    assert.equal(findWindowsBinary("ffmpeg.exe", root, "win32"), expected);
    assert.equal(findWindowsBinary("ffprobe.exe", root, "win32"), null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("uses the DSH Whisper cache when the bundled model is absent", async () => {
  const root = await mkdtemp(join(tmpdir(), "codex-runtime-whisper-"));
  try {
    const model = join(root, ".cache", "dsh-whisper", "ggml-large-v3-turbo.bin");
    await mkdir(join(root, ".cache", "dsh-whisper"), { recursive: true });
    await writeFile(model, "test model");
    assert.equal(findWhisperModel({ runtimeHome: join(root, "runtime"), home: root }), model);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
