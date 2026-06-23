import { createServer } from "node:http";
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(rootDir, "public");
const dataDir = join(rootDir, "data");
const projectsDir = join(dataDir, "projects");
const projectsFile = join(dataDir, "projects.json");
const legacyDataFile = join(dataDir, "storyboard.json");
const legacyMediaDir = join(dataDir, "media");
const port = Number(process.env.PORT || 43218);
let generationMutationQueue = Promise.resolve();

const aspectRatios = {
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
  "3:4": { width: 1080, height: 1440 },
  "4:3": { width: 1440, height: 1080 },
  "1:1": { width: 1080, height: 1080 }
};

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime"
};

const allowedUploads = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
  ["video/mp4", ".mp4"],
  ["video/webm", ".webm"],
  ["video/quicktime", ".mov"]
]);

await mkdir(projectsDir, { recursive: true });
await migrateLegacyProject();

function sendJson(response, status, value) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(value));
  return true;
}

function sendError(response, status, message) {
  return sendJson(response, status, { error: message });
}

async function readBodyBuffer(request, limit = 100 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new Error("上传文件不能超过 100MB");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readBody(request) {
  const buffer = await readBodyBuffer(request, 5 * 1024 * 1024);
  if (buffer.length === 0) return {};
  return JSON.parse(buffer.toString("utf8"));
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function safeId(value) {
  return /^[a-zA-Z0-9_-]+$/.test(value);
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createTaskId() {
  return createId("task");
}

function normalizeAspectRatio(value) {
  return aspectRatios[value] ? value : "16:9";
}

function normalizeShot(shot = {}) {
  const generationStatus = ["idle", "pending", "processing", "ready", "failed"].includes(
    shot.generationStatus
  )
    ? shot.generationStatus
    : shot.mediaUrl
      ? "ready"
      : "idle";

  return {
    id: shot.id || createId("shot"),
    rollType: shot.rollType === "A-ROLL" ? "A-ROLL" : "B-ROLL",
    mediaType: shot.mediaType === "video" ? "video" : "image",
    duration: Number.isFinite(Number(shot.duration)) ? Number(shot.duration) : 5,
    dialogue: String(shot.dialogue || ""),
    visualPrompt: String(shot.visualPrompt || ""),
    generator: ["manual", "image-gen", "hyperframes", "remotion"].includes(shot.generator)
      ? shot.generator
      : "manual",
    mediaUrl: String(shot.mediaUrl || ""),
    notes: String(shot.notes || ""),
    generationStatus,
    generationTaskId: String(shot.generationTaskId || ""),
    generationError: String(shot.generationError || ""),
    generationRequestedAt: shot.generationRequestedAt || null,
    generationStartedAt: shot.generationStartedAt || null,
    generationCompletedAt: shot.generationCompletedAt || null
  };
}

function normalizeProject(project = {}) {
  const now = new Date().toISOString();
  return {
    id: String(project.id || createId("project")),
    title: String(project.title || "未命名项目").trim() || "未命名项目",
    aspectRatio: normalizeAspectRatio(project.aspectRatio),
    shots: Array.isArray(project.shots) ? project.shots.map(normalizeShot) : [],
    createdAt: project.createdAt || now,
    updatedAt: project.updatedAt || now
  };
}

function projectDir(projectId) {
  return join(projectsDir, projectId);
}

function projectFile(projectId) {
  return join(projectDir(projectId), "project.json");
}

function projectMediaDir(projectId) {
  return join(projectDir(projectId), "media");
}

async function readProjectsIndex() {
  return JSON.parse(await readFile(projectsFile, "utf8"));
}

async function saveProjectsIndex(index) {
  await writeFile(projectsFile, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  return index;
}

async function readProject(projectId) {
  if (!safeId(projectId)) throw Object.assign(new Error("Project not found"), { status: 404 });
  try {
    return normalizeProject(JSON.parse(await readFile(projectFile(projectId), "utf8")));
  } catch (error) {
    if (error.code === "ENOENT") throw Object.assign(new Error("Project not found"), { status: 404 });
    throw error;
  }
}

async function saveProject(project) {
  const next = normalizeProject({ ...project, updatedAt: new Date().toISOString() });
  await mkdir(projectMediaDir(next.id), { recursive: true });
  await writeFile(projectFile(next.id), `${JSON.stringify(next, null, 2)}\n`, "utf8");

  const index = await readProjectsIndex();
  const record = {
    id: next.id,
    title: next.title,
    aspectRatio: next.aspectRatio,
    createdAt: next.createdAt,
    updatedAt: next.updatedAt
  };
  const existing = index.projects.findIndex((item) => item.id === next.id);
  if (existing >= 0) index.projects[existing] = record;
  else index.projects.unshift(record);
  await saveProjectsIndex(index);
  return next;
}

function mediaUrl(projectId, fileName) {
  return `/media/${encodeURIComponent(projectId)}/${encodeURIComponent(fileName)}`;
}

function mediaFileNameFromUrl(url) {
  const parts = String(url).split("/");
  return decodeURIComponent(parts.at(-1) || "");
}

async function projectSummary(record) {
  const project = await readProject(record.id);
  const duration = project.shots.reduce((sum, shot) => sum + Number(shot.duration || 0), 0);
  const cover = project.shots.find((shot) => shot.mediaUrl)?.mediaUrl || "";
  return {
    ...record,
    shotCount: project.shots.length,
    duration,
    coverUrl: cover
  };
}

function generationTask(project, shot) {
  const dimensions = aspectRatios[project.aspectRatio];
  return {
    taskId: shot.generationTaskId,
    projectId: project.id,
    projectTitle: project.title,
    aspectRatio: project.aspectRatio,
    width: dimensions.width,
    height: dimensions.height,
    shotId: shot.id,
    shotIndex: project.shots.findIndex((item) => item.id === shot.id) + 1,
    status: shot.generationStatus,
    generator: shot.generator,
    mediaType: shot.mediaType,
    duration: shot.duration,
    dialogue: shot.dialogue,
    visualPrompt: shot.visualPrompt,
    notes: shot.notes,
    requestedAt: shot.generationRequestedAt,
    startedAt: shot.generationStartedAt,
    completedAt: shot.generationCompletedAt,
    error: shot.generationError
  };
}

async function attachMedia(project, shot, sourcePath, mediaType) {
  const resolvedSource = resolve(String(sourcePath));
  await stat(resolvedSource);
  const extension = extname(resolvedSource).toLowerCase();
  const fileName = `${shot.id}-${Date.now()}${extension}`;
  await copyFile(resolvedSource, join(projectMediaDir(project.id), fileName));
  shot.mediaUrl = mediaUrl(project.id, fileName);
  if (mediaType === "image" || mediaType === "video") shot.mediaType = mediaType;
  shot.generationStatus = "ready";
  shot.generationError = "";
  shot.generationCompletedAt = new Date().toISOString();
}

function parseMultipart(buffer, contentType) {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) throw new Error("缺少上传边界");
  const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`);
  const headerSeparator = Buffer.from("\r\n\r\n");
  let cursor = 0;

  while (cursor < buffer.length) {
    const boundaryStart = buffer.indexOf(boundary, cursor);
    if (boundaryStart < 0) break;
    const partStart = boundaryStart + boundary.length + 2;
    const headerEnd = buffer.indexOf(headerSeparator, partStart);
    if (headerEnd < 0) break;
    const headers = buffer.subarray(partStart, headerEnd).toString("utf8");
    const nextBoundary = buffer.indexOf(boundary, headerEnd + headerSeparator.length);
    if (nextBoundary < 0) break;
    const content = buffer.subarray(headerEnd + headerSeparator.length, nextBoundary - 2);
    const name = headers.match(/name="([^"]+)"/i)?.[1];
    const filename = headers.match(/filename="([^"]*)"/i)?.[1];
    const mimeType = headers.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim();
    if (name === "file" && filename) return { filename, mimeType, content };
    cursor = nextBoundary;
  }
  throw new Error("没有找到上传文件");
}

async function saveUploadedMedia(project, shot, request) {
  const contentType = request.headers["content-type"] || "";
  if (!contentType.startsWith("multipart/form-data")) throw new Error("需要 multipart/form-data");
  const file = parseMultipart(await readBodyBuffer(request), contentType);
  const extension = allowedUploads.get(file.mimeType);
  if (!extension) throw new Error("仅支持 PNG、JPEG、WebP、GIF、MP4、WebM 和 MOV");

  const mediaType = file.mimeType.startsWith("video/") ? "video" : "image";
  const fileName = `${shot.id}-${Date.now()}${extension}`;
  await writeFile(join(projectMediaDir(project.id), fileName), file.content);
  shot.mediaUrl = mediaUrl(project.id, fileName);
  shot.mediaType = mediaType;
  shot.generationStatus = "ready";
  shot.generationTaskId = "";
  shot.generationError = "";
  shot.generationCompletedAt = new Date().toISOString();
}

async function findTask(taskId) {
  const index = await readProjectsIndex();
  for (const record of index.projects) {
    const project = await readProject(record.id);
    const shot = project.shots.find((item) => item.generationTaskId === taskId);
    if (shot) return { project, shot };
  }
  return null;
}

function mutateGenerationTask(callback) {
  const mutation = generationMutationQueue.then(callback, callback);
  generationMutationQueue = mutation.catch(() => {});
  return mutation;
}

async function migrateLegacyProject() {
  if (await exists(projectsFile)) return;
  if (!(await exists(legacyDataFile))) {
    await saveProjectsIndex({ projects: [] });
    return;
  }

  const now = new Date().toISOString();
  const projectId = "project-codex-storyboard";
  let project = normalizeProject({
    id: projectId,
    title: "Codex 分镜台",
    aspectRatio: "16:9",
    shots: [],
    createdAt: now,
    updatedAt: now
  });

  const legacy = JSON.parse(await readFile(legacyDataFile, "utf8"));
  project = normalizeProject({
    ...legacy,
    id: projectId,
    title: legacy.title || "Codex 分镜台",
    aspectRatio: "16:9",
    createdAt: now
  });

  await mkdir(projectMediaDir(projectId), { recursive: true });
  if (await exists(legacyMediaDir)) {
    for (const fileName of await readdir(legacyMediaDir)) {
      await copyFile(join(legacyMediaDir, fileName), join(projectMediaDir(projectId), fileName));
    }
  }
  for (const shot of project.shots) {
    if (shot.mediaUrl) shot.mediaUrl = mediaUrl(projectId, mediaFileNameFromUrl(shot.mediaUrl));
  }

  await writeFile(projectFile(projectId), `${JSON.stringify(project, null, 2)}\n`, "utf8");
  await saveProjectsIndex({
    projects: [{
      id: project.id,
      title: project.title,
      aspectRatio: project.aspectRatio,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    }]
  });
}

async function serveFile(response, filePath, allowedRoots = [publicDir]) {
  const normalized = resolve(filePath);
  const allowed = allowedRoots.some((base) => {
    const normalizedBase = resolve(base);
    return normalized === normalizedBase || normalized.startsWith(`${normalizedBase}/`);
  });
  if (!allowed) return sendError(response, 403, "Forbidden");

  try {
    const file = await readFile(normalized);
    response.writeHead(200, {
      "content-type": contentTypes[extname(normalized).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-store"
    });
    response.end(file);
  } catch (error) {
    if (error.code === "ENOENT") return sendError(response, 404, "Not found");
    throw error;
  }
}

async function handleProjectsApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/projects") {
    const index = await readProjectsIndex();
    const projects = await Promise.all(index.projects.map(projectSummary));
    return sendJson(response, 200, { projects });
  }

  if (request.method === "POST" && url.pathname === "/api/projects") {
    const body = await readBody(request);
    const project = normalizeProject({
      id: createId("project"),
      title: body.title,
      aspectRatio: body.aspectRatio,
      shots: []
    });
    return sendJson(response, 201, await saveProject(project));
  }

  const projectMatch = url.pathname.match(/^\/api\/projects\/([^/]+)$/);
  if (!projectMatch) return false;
  const projectId = decodeURIComponent(projectMatch[1]);

  if (request.method === "GET") {
    return sendJson(response, 200, await readProject(projectId));
  }

  if (request.method === "PUT") {
    const current = await readProject(projectId);
    const body = await readBody(request);
    return sendJson(response, 200, await saveProject({
      ...current,
      title: body.title,
      aspectRatio: body.aspectRatio,
      shots: body.shots
    }));
  }

  if (request.method === "PATCH") {
    const project = await readProject(projectId);
    const body = await readBody(request);
    if (body.title !== undefined) project.title = String(body.title).trim() || project.title;
    if (body.aspectRatio !== undefined) project.aspectRatio = normalizeAspectRatio(body.aspectRatio);
    return sendJson(response, 200, await saveProject(project));
  }

  if (request.method === "DELETE") {
    const project = await readProject(projectId);
    await rm(projectDir(projectId), { recursive: true, force: false });
    const index = await readProjectsIndex();
    index.projects = index.projects.filter((item) => item.id !== projectId);
    await saveProjectsIndex(index);
    return sendJson(response, 200, { deleted: project.id });
  }

  return false;
}

async function handleShotsApi(request, response, url) {
  const collectionMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/shots$/);
  if (collectionMatch && request.method === "POST") {
    const project = await readProject(decodeURIComponent(collectionMatch[1]));
    const body = await readBody(request);
    const incoming = Array.isArray(body.shots) ? body.shots : [body.shot || body];
    project.shots.push(...incoming.map(normalizeShot));
    return sendJson(response, 201, await saveProject(project));
  }

  const shotMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/shots\/([^/]+)$/);
  if (shotMatch) {
    const project = await readProject(decodeURIComponent(shotMatch[1]));
    const shotId = decodeURIComponent(shotMatch[2]);
    const index = project.shots.findIndex((shot) => shot.id === shotId);
    if (index < 0) return sendError(response, 404, "Shot not found");

    if (request.method === "PATCH") {
      const body = await readBody(request);
      project.shots[index] = normalizeShot({ ...project.shots[index], ...body, id: shotId });
      return sendJson(response, 200, await saveProject(project));
    }

    if (request.method === "DELETE") {
      project.shots.splice(index, 1);
      return sendJson(response, 200, await saveProject(project));
    }
  }

  const mediaMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/shots\/([^/]+)\/media$/);
  if (mediaMatch && request.method === "POST") {
    const project = await readProject(decodeURIComponent(mediaMatch[1]));
    const shot = project.shots.find((item) => item.id === decodeURIComponent(mediaMatch[2]));
    if (!shot) return sendError(response, 404, "Shot not found");

    if ((request.headers["content-type"] || "").startsWith("multipart/form-data")) {
      await saveUploadedMedia(project, shot, request);
    } else {
      const body = await readBody(request);
      if (!body.sourcePath) return sendError(response, 400, "sourcePath is required");
      await attachMedia(project, shot, body.sourcePath, body.mediaType);
    }
    return sendJson(response, 200, await saveProject(project));
  }

  return false;
}

async function handleGenerationApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/generation/tasks") {
    const index = await readProjectsIndex();
    const statuses = (url.searchParams.get("status") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const tasks = [];
    for (const record of index.projects) {
      const project = await readProject(record.id);
      tasks.push(...project.shots
        .filter((shot) => shot.generationTaskId)
        .filter((shot) => statuses.length === 0 || statuses.includes(shot.generationStatus))
        .map((shot) => generationTask(project, shot)));
    }
    return sendJson(response, 200, { tasks });
  }

  if (request.method === "POST" && url.pathname === "/api/generation/tasks") {
    const body = await readBody(request);
    if (!body.projectId) return sendError(response, 400, "projectId is required");
    const project = await readProject(String(body.projectId));
    const requestedIds = Array.isArray(body.shotIds) ? new Set(body.shotIds.map(String)) : null;
    const force = body.force === true;
    const queued = [];
    const skipped = [];

    for (const shot of project.shots) {
      if (requestedIds && !requestedIds.has(shot.id)) continue;
      if (shot.generator === "manual") {
        skipped.push({ shotId: shot.id, reason: "manual" });
        continue;
      }
      if (!shot.visualPrompt.trim()) {
        skipped.push({ shotId: shot.id, reason: "missing-prompt" });
        continue;
      }
      if (["pending", "processing"].includes(shot.generationStatus)) {
        skipped.push({ shotId: shot.id, reason: shot.generationStatus });
        continue;
      }
      if (!force && shot.generationStatus === "ready") {
        skipped.push({ shotId: shot.id, reason: "ready" });
        continue;
      }

      shot.generationTaskId = createTaskId();
      shot.generationStatus = "pending";
      shot.generationError = "";
      shot.generationRequestedAt = new Date().toISOString();
      shot.generationStartedAt = null;
      shot.generationCompletedAt = null;
      queued.push(generationTask(project, shot));
    }

    const saved = await saveProject(project);
    return sendJson(response, 201, { project: saved, queued, skipped });
  }

  const taskMatch = url.pathname.match(
    /^\/api\/generation\/tasks\/([^/]+)\/(claim|complete|fail|cancel)$/
  );
  if (taskMatch && request.method === "POST") {
    return mutateGenerationTask(async () => {
      const [, taskId, action] = taskMatch;
      const found = await findTask(decodeURIComponent(taskId));
      if (!found) return sendError(response, 404, "Generation task not found");
      const { project, shot } = found;
      const body = await readBody(request);

      if (action === "claim") {
        if (shot.generationStatus !== "pending") {
          return sendError(response, 409, `Task is ${shot.generationStatus}`);
        }
        shot.generationStatus = "processing";
        shot.generationStartedAt = new Date().toISOString();
      }

      if (action === "complete") {
        if (!body.sourcePath) return sendError(response, 400, "sourcePath is required");
        await attachMedia(project, shot, body.sourcePath, body.mediaType);
      }

      if (action === "fail") {
        shot.generationStatus = "failed";
        shot.generationError = String(body.error || "生成失败");
        shot.generationCompletedAt = new Date().toISOString();
      }

      if (action === "cancel") {
        if (shot.generationStatus !== "pending") {
          return sendError(response, 409, `Task is ${shot.generationStatus}`);
        }
        shot.generationStatus = shot.mediaUrl ? "ready" : "idle";
        shot.generationTaskId = "";
        shot.generationError = "";
        shot.generationRequestedAt = null;
        shot.generationStartedAt = null;
        shot.generationCompletedAt = shot.mediaUrl ? shot.generationCompletedAt : null;
      }

      const saved = await saveProject(project);
      return sendJson(response, 200, {
        project: saved,
        task: generationTask(saved, saved.shots.find((item) => item.id === shot.id))
      });
    });
  }

  return false;
}

async function handleApi(request, response, url) {
  if (await handleProjectsApi(request, response, url)) return;
  if (await handleShotsApi(request, response, url)) return;
  if (await handleGenerationApi(request, response, url)) return;
  return sendError(response, 404, "API not found");
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) return await handleApi(request, response, url);

    const mediaMatch = url.pathname.match(/^\/media\/([^/]+)\/([^/]+)$/);
    if (mediaMatch) {
      const projectId = decodeURIComponent(mediaMatch[1]);
      const fileName = basename(decodeURIComponent(mediaMatch[2]));
      if (!safeId(projectId)) return sendError(response, 404, "Not found");
      return await serveFile(
        response,
        join(projectMediaDir(projectId), fileName),
        [projectMediaDir(projectId)]
      );
    }

    if (url.pathname === "/" || url.pathname.match(/^\/project\/[^/]+\/?$/)) {
      return await serveFile(response, join(publicDir, "index.html"));
    }
    return await serveFile(response, join(publicDir, decodeURIComponent(url.pathname.slice(1))));
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error(error);
    return sendError(response, status, error.message || "Internal server error");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Codex 分镜台已启动：http://127.0.0.1:${port}`);
});
