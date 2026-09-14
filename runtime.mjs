import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL(".", import.meta.url));
export const runtimeHome = process.env.CODEX_STORYBOARD_RUNTIME || join(root, ".runtime-voice");
const localBinary = (name, fallback) => existsSync(join(runtimeHome, name)) ? join(runtimeHome, name) : fallback;
export function run(command, args, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, shell: false, env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
    let output = "";
    const timer = setTimeout(() => { child.kill(); reject(new Error(`${command}: 执行超时`)); }, timeout);
    child.stdout.on("data", data => { output = (output + data).slice(-16000); });
    child.stderr.on("data", data => { output = (output + data).slice(-16000); });
    child.on("error", error => { clearTimeout(timer); reject(error); });
    child.on("close", code => { clearTimeout(timer); code === 0 ? resolve(output) : reject(new Error(output || `${command}: ${code}`)); });
  });
}
const venvPython = join(root, ".venv-voice", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
export const python = process.env.CODEX_STORYBOARD_PYTHON || (existsSync(venvPython) ? venvPython : "python");
export const ffmpeg = process.env.CODEX_STORYBOARD_FFMPEG || localBinary("ffmpeg/bin/ffmpeg.exe", "ffmpeg");
export const ffprobe = process.env.CODEX_STORYBOARD_FFPROBE || localBinary("ffmpeg/bin/ffprobe.exe", "ffprobe");
export const whisper = process.env.CODEX_STORYBOARD_WHISPER || localBinary("whisper/whisper-cli.exe", "whisper-cli");
export const whisperModel = process.env.CODEX_STORYBOARD_WHISPER_MODEL || join(runtimeHome, "ggml-large-v3-turbo-q5_0.bin");
export async function inspectEnvironment() {
  const checks = [{ name: "Node.js", status: "ready", detail: process.version }];
  for (const [name, command, args] of [
    ["Python 3.10+", python, ["-c", "import sys; assert sys.version_info >= (3,10); print(sys.version.split()[0])"]],
    ["VoxCPM 客户端", python, ["-c", "import gradio_client; print(gradio_client.__version__)"]],
    ["FFmpeg", ffmpeg, ["-version"]], ["FFprobe", ffprobe, ["-version"]], ["Whisper.cpp", whisper, ["--help"]]
  ]) {
    try { checks.push({ name, status: "ready", detail: (await run(command, args, 5000)).split(/\r?\n/)[0] }); }
    catch { checks.push({ name, status: "missing", detail: "未检测到；配音需要 Python / gradio_client，时长分析需要 FFmpeg / FFprobe" }); }
  }
  checks.push({ name: "Whisper 本地模型", status: existsSync(whisperModel) ? "ready" : "missing", detail: whisperModel });
  for (const name of ["Image Generation", "Remotion", "HyperFrames"]) {
    checks.push({ name, status: "session", detail: "需由当前 Codex 会话确认工具或 skill 可用；本机检测不能代表会话权限" });
  }
  return { checks, voiceService: "VoxCPM 在线服务，实际连接在生成时验证" };
}
