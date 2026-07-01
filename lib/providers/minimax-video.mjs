const defaultBaseUrl = "https://api.minimaxi.com/v1";

export class MiniMaxApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "MiniMaxApiError";
    Object.assign(this, details, classifyMiniMaxError({ ...details, message }));
  }
}

export function classifyMiniMaxError({ httpStatus = 0, statusCode = 0, message = "" } = {}) {
  const normalized = String(message).toLowerCase();
  const quotaFailure = /quota|insufficient|余额|额度|次数/.test(normalized);
  const policyFailure = /audit|policy|safety|审核|违规/.test(normalized);
  const temporary = !quotaFailure && !policyFailure &&
    (httpStatus === 408 || httpStatus === 429 || httpStatus >= 500 || statusCode === 1002);
  return {
    retryable: temporary,
    category: quotaFailure ? "quota" : policyFailure ? "policy" : temporary ? "temporary" : "request"
  };
}

export class MiniMaxVideoProvider {
  constructor({ apiKey, fetchImpl = fetch, baseUrl = defaultBaseUrl } = {}) {
    if (!apiKey) throw new Error("MINIMAX_API_KEY 未配置");
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async request(path, options = {}) {
    let response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...options,
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
          ...(options.headers || {})
        }
      });
    } catch (error) {
      throw new MiniMaxApiError(`MiniMax 网络请求失败：${error.message}`, { httpStatus: 0 });
    }
    const payload = await response.json().catch(() => ({}));
    const statusCode = Number(payload.base_resp?.status_code || 0);
    if (!response.ok || statusCode !== 0) {
      throw new MiniMaxApiError(
        payload.base_resp?.status_msg || payload.message || `MiniMax HTTP ${response.status}`,
        { httpStatus: response.status, statusCode, payload }
      );
    }
    return payload;
  }

  async submit(task) {
    const body = {
      model: task.model,
      prompt: task.prompt,
      duration: task.duration,
      resolution: task.resolution || "768P",
      prompt_optimizer: task.promptOptimizer !== false
    };
    if (task.firstFrameImage) body.first_frame_image = task.firstFrameImage;
    const payload = await this.request("/video_generation", {
      method: "POST",
      body: JSON.stringify(body)
    });
    if (!payload.task_id) throw new MiniMaxApiError("MiniMax 未返回 task_id", { payload });
    return { providerTaskId: String(payload.task_id), status: "submitted", raw: payload };
  }

  async ensureSubmitted(task) {
    if (task.providerTaskId) {
      return { providerTaskId: String(task.providerTaskId), status: "resuming" };
    }
    return this.submit(task);
  }

  async query(providerTaskId) {
    const payload = await this.request(
      `/query/video_generation?task_id=${encodeURIComponent(providerTaskId)}`,
      { method: "GET" }
    );
    const status = String(payload.status || "").toLowerCase();
    return {
      providerTaskId: String(providerTaskId),
      status,
      done: status === "success" || status === "fail",
      succeeded: status === "success",
      fileId: payload.file_id ? String(payload.file_id) : "",
      raw: payload
    };
  }

  async getDownloadUrl(fileId) {
    const payload = await this.request(
      `/files/retrieve?file_id=${encodeURIComponent(fileId)}`,
      { method: "GET" }
    );
    const downloadUrl = payload.file?.download_url;
    if (!downloadUrl) throw new MiniMaxApiError("MiniMax 未返回视频下载地址", { payload });
    return String(downloadUrl);
  }

  async download(fileId) {
    const downloadUrl = await this.getDownloadUrl(fileId);
    const response = await this.fetchImpl(downloadUrl);
    if (!response.ok) {
      throw new MiniMaxApiError(`视频下载失败：HTTP ${response.status}`, {
        httpStatus: response.status
      });
    }
    return Buffer.from(await response.arrayBuffer());
  }
}
