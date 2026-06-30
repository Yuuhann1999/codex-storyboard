import test from "node:test";
import assert from "node:assert/strict";

import {
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
