import test from "node:test";
import assert from "node:assert/strict";

import {
  MiniMaxApiError,
  MiniMaxVideoProvider,
  classifyMiniMaxError
} from "../lib/providers/minimax-video.mjs";

test("submits text-to-video with the Token Plan bearer key", async () => {
  const calls = [];
  const provider = new MiniMaxVideoProvider({
    apiKey: "test-token",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return Response.json({ task_id: "vendor-123", base_resp: { status_code: 0 } });
    }
  });

  const result = await provider.submit({
    model: "MiniMax-Hailuo-2.3",
    prompt: "雨夜街道",
    duration: 6,
    resolution: "768P"
  });

  assert.equal(result.providerTaskId, "vendor-123");
  assert.equal(calls[0].url, "https://api.minimaxi.com/v1/video_generation");
  assert.equal(calls[0].options.headers.authorization, "Bearer test-token");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    model: "MiniMax-Hailuo-2.3",
    prompt: "雨夜街道",
    duration: 6,
    resolution: "768P",
    prompt_optimizer: true
  });
});

test("requires a configured API key", () => {
  assert.throws(() => new MiniMaxVideoProvider(), /MINIMAX_API_KEY/);
});

test("maps MiniMax API errors without exposing the token", async () => {
  const fixtureToken = ["fixture", "token"].join("-");
  const provider = new MiniMaxVideoProvider({
    apiKey: fixtureToken,
    fetchImpl: async () => Response.json(
      { base_resp: { status_code: 1008, status_msg: "insufficient quota" } },
      { status: 200 }
    )
  });
  await assert.rejects(
    () => provider.submit({ model: "MiniMax-Hailuo-2.3", prompt: "x", duration: 6 }),
    (error) => error instanceof MiniMaxApiError && error.category === "quota" &&
      !error.message.includes(fixtureToken)
  );
});

test("maps transport failures to a retryable provider error", async () => {
  const provider = new MiniMaxVideoProvider({
    apiKey: "test-token",
    fetchImpl: async () => { throw new Error("socket closed"); }
  });
  await assert.rejects(
    () => provider.query("vendor-1"),
    (error) => error instanceof MiniMaxApiError && /网络请求失败/.test(error.message)
  );
});

test("queries, retrieves, and downloads a completed video", async () => {
  const calls = [];
  const provider = new MiniMaxVideoProvider({
    apiKey: "test-token",
    fetchImpl: async (url) => {
      calls.push(url);
      if (url.includes("/query/video_generation")) {
        return Response.json({
          task_id: "vendor-1",
          status: "Success",
          file_id: "file-1",
          base_resp: { status_code: 0 }
        });
      }
      if (url.includes("/files/retrieve")) {
        return Response.json({
          file: { download_url: "https://download.example/video.mp4" },
          base_resp: { status_code: 0 }
        });
      }
      return new Response(new Uint8Array([0, 1, 2]), { status: 200 });
    }
  });
  const status = await provider.query("vendor-1");
  assert.equal(status.succeeded, true);
  assert.equal(status.fileId, "file-1");
  const video = await provider.download(status.fileId);
  assert.deepEqual([...video], [0, 1, 2]);
  assert.equal(calls.length, 3);
});

test("rejects missing download URLs and failed downloads", async () => {
  const missing = new MiniMaxVideoProvider({
    apiKey: "test-token",
    fetchImpl: async () => Response.json({ file: {}, base_resp: { status_code: 0 } })
  });
  await assert.rejects(() => missing.getDownloadUrl("file-1"), /未返回视频下载地址/);

  const failed = new MiniMaxVideoProvider({
    apiKey: "test-token",
    fetchImpl: async (url) => url.includes("files/retrieve")
      ? Response.json({
          file: { download_url: "https://download.example/video.mp4" },
          base_resp: { status_code: 0 }
        })
      : new Response("failed", { status: 502 })
  });
  await assert.rejects(() => failed.download("file-1"), /视频下载失败/);
});

test("submits first-frame data URLs without changing the image", async () => {
  let body;
  const provider = new MiniMaxVideoProvider({
    apiKey: "test-token",
    fetchImpl: async (_url, options) => {
      body = JSON.parse(options.body);
      return Response.json({ task_id: "vendor-456", base_resp: { status_code: 0 } });
    }
  });
  await provider.submit({
    model: "MiniMax-Hailuo-2.3",
    prompt: "人物回头",
    duration: 10,
    resolution: "768P",
    firstFrameImage: "data:image/png;base64,AAAA"
  });
  assert.equal(body.first_frame_image, "data:image/png;base64,AAAA");
});

test("classifies temporary failures as retryable and quota failures as terminal", () => {
  assert.equal(classifyMiniMaxError({ httpStatus: 503 }).retryable, true);
  assert.equal(classifyMiniMaxError({ httpStatus: 429, message: "rate limit" }).retryable, true);
  assert.equal(classifyMiniMaxError({ httpStatus: 429, message: "insufficient quota" }).retryable, false);
  assert.equal(classifyMiniMaxError({ httpStatus: 400, message: "invalid parameter" }).retryable, false);
  assert.equal(classifyMiniMaxError({ statusCode: 1002, message: "rate limited" }).retryable, true);
  assert.equal(classifyMiniMaxError({ statusCode: 1004, message: "auth failed" }).retryable, false);
});

test("resumes an existing provider task instead of submitting another", async () => {
  let submissions = 0;
  const provider = new MiniMaxVideoProvider({
    apiKey: "test-token",
    fetchImpl: async (url) => {
      if (url.endsWith("/video_generation")) submissions += 1;
      return Response.json({ task_id: "vendor-789", status: "Processing", base_resp: { status_code: 0 } });
    }
  });
  const result = await provider.ensureSubmitted({ providerTaskId: "vendor-existing" });
  assert.equal(result.providerTaskId, "vendor-existing");
  assert.equal(submissions, 0);
});
