import { writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { run, python, ffmpeg, ffprobe } from "./runtime.mjs";

export async function audioDuration(path) {
  const result = await run(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "json", path]);
  const duration = Number(JSON.parse(result).format?.duration);
  if (!(duration > 0) || !Number.isFinite(duration)) throw new Error("无法读取音频时长");
  return Math.round(duration * 1000);
}

export async function generateVoice({ directory, id, text, instruction }) {
  const input = join(directory, `${id}.json`);
  const raw = join(directory, `${id}-raw.wav`);
  const output = join(directory, `${id}.wav`);
  await run(python, ["-c", "import gradio_client"], 10000);
  await run(ffmpeg, ["-version"]);
  await run(ffprobe, ["-version"]);
  await writeFile(input, JSON.stringify({ text, instruction, output: raw }), "utf8");
  try {
    await run(python, [fileURLToPath(new URL("./voice/voxcpm.py", import.meta.url)), input], 10 * 60 * 1000);
    await run(ffmpeg, ["-y", "-i", raw, "-ar", "48000", "-ac", "1", output], 60000);
    return { fileName: `${id}.wav`, durationMs: await audioDuration(output) };
  } finally {
    await rm(input, { force: true });
    await rm(raw, { force: true });
  }
}
