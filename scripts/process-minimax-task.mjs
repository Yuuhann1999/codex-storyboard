#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { MiniMaxVideoProvider } from "../lib/providers/minimax-video.mjs";
import { readUserEnvironmentVariable } from "../lib/local-environment.mjs";

const mimeTypes = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".gif", "image/gif"]
]);

function parseArgs(argv) {
  const parsed = { appUrl: "http://127.0.0.1:43218" };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--task-id") parsed.taskId = argv[++index];
    else if (value === "--app-url") parsed.appUrl = argv[++index];
  }
  if (!parsed.taskId) throw new Error("需要 --task-id");
  return parsed;
}

async function appRequest(appUrl, path, options = {}) {
  const response = await fetch(`${appUrl.replace(/\/$/, "")}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) }
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || `分镜台 HTTP ${response.status}`);
  return value;
}

async function firstFrameDataUrl(path) {
  if (!path) return "";
  const mimeType = mimeTypes.get(extname(path).toLowerCase());
  if (!mimeType) throw new Error("首帧图片格式不受支持");
  const data = await readFile(path);
  if (data.byteLength > 20 * 1024 * 1024) throw new Error("首帧图片不能超过 20MB");
  return `data:${mimeType};base64,${data.toString("base64")}`;
}

async function retryTemporary(operation, retries = 3) {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (!error.retryable || attempt >= retries) throw error;
      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const listed = await appRequest(args.appUrl, "/api/generation/tasks?status=pending,processing");
  let task = listed.tasks.find((item) => item.taskId === args.taskId);
  if (!task) throw new Error("找不到可处理的生成任务");
  if (task.generator !== "api-video" || task.provider !== "minimax") {
    throw new Error("该任务不是 MiniMax API 视频任务");
  }

  if (task.status === "pending") {
    const claimed = await appRequest(
      args.appUrl,
      `/api/generation/tasks/${encodeURIComponent(task.taskId)}/claim`,
      { method: "POST", body: "{}" }
    );
    task = claimed.task;
  }

  const provider = new MiniMaxVideoProvider({
    apiKey: await readUserEnvironmentVariable("MINIMAX_API_KEY")
  });
  let providerTaskId = task.providerTaskId;
  try {
    if (!providerTaskId) {
      const firstFrameImage = await firstFrameDataUrl(task.firstFrameImagePath);
      const submitted = await retryTemporary(() => provider.submit({
        model: task.model,
        prompt: task.effectivePrompt,
        duration: task.duration,
        resolution: task.resolution,
        firstFrameImage
      }));
      providerTaskId = submitted.providerTaskId;
      await appRequest(
        args.appUrl,
        `/api/generation/tasks/${encodeURIComponent(task.taskId)}/provider`,
        {
          method: "POST",
          body: JSON.stringify({
            providerTaskId,
            providerStatus: "submitted",
            incrementAttempt: true
          })
        }
      );
    }

    while (true) {
      const status = await retryTemporary(() => provider.query(providerTaskId));
      await appRequest(
        args.appUrl,
        `/api/generation/tasks/${encodeURIComponent(task.taskId)}/provider`,
        {
          method: "POST",
          body: JSON.stringify({ providerTaskId, providerStatus: status.status })
        }
      );
      if (status.status === "fail") throw new Error("MiniMax 视频生成失败");
      if (status.succeeded) {
        await mkdir(task.outputDir, { recursive: true });
        const outputPath = join(task.outputDir, "minimax-output.mp4");
        await writeFile(outputPath, await retryTemporary(() => provider.download(status.fileId)));
        await appRequest(
          args.appUrl,
          `/api/generation/tasks/${encodeURIComponent(task.taskId)}/complete`,
          {
            method: "POST",
            body: JSON.stringify({ sourcePath: outputPath, mediaType: "video" })
          }
        );
        process.stdout.write(`${outputPath}\n`);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  } catch (error) {
    const message = error.category === "quota"
      ? `MiniMax 额度不足：${error.message}`
      : error.category === "policy"
        ? `MiniMax 内容审核未通过：${error.message}`
        : error.message;
    await appRequest(
      args.appUrl,
      `/api/generation/tasks/${encodeURIComponent(task.taskId)}/fail`,
      { method: "POST", body: JSON.stringify({ error: message }) }
    ).catch(() => {});
    throw error;
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
