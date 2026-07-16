const projectsView = document.querySelector("#projects-view");
const storyboardView = document.querySelector("#storyboard-view");
const scriptPanel = document.querySelector("#script-panel");
const storyboardPanel = document.querySelector("#storyboard-panel");
const assetsPanel = document.querySelector("#assets-panel");
const projectsGrid = document.querySelector("#projects-grid");
const projectCardTemplate = document.querySelector("#project-card-template");
const body = document.querySelector("#shots-body");
const shotTemplate = document.querySelector("#shot-row-template");
const saveStatus = document.querySelector("#save-status");
const durationTotal = document.querySelector("#duration-total");
const selectPortal = document.querySelector("#select-portal");
const generateAllButton = document.querySelector("#generate-all");
const projectDialog = document.querySelector("#project-dialog");
const projectForm = document.querySelector("#project-form");
const projectNameInput = document.querySelector("#project-name-input");
const ratioOptions = document.querySelector("#ratio-options");
const deleteDialog = document.querySelector("#delete-dialog");
const mediaUpload = document.querySelector("#media-upload");
const projectDesignOption = document.querySelector("#project-design-option");
const projectDesignUpload = document.querySelector("#project-design-upload");
const designUpload = document.querySelector("#design-upload");
const designDialog = document.querySelector("#design-dialog");
const removeDesignDialog = document.querySelector("#remove-design-dialog");
const designMenu = document.querySelector("#design-menu");
const designMenuTrigger = document.querySelector("#design-menu-trigger");
const designMenuPopover = document.querySelector("#design-menu-popover");
const lightbox = document.querySelector("#lightbox");
const lightboxStage = document.querySelector("#lightbox-stage");
const coverPanel = document.querySelector("#cover-panel");
const coverPreviewFrame = document.querySelector("#cover-preview-frame");
const coverPreview = document.querySelector("#cover-preview");
const coverStatus = document.querySelector("#cover-status");
const coverPreset = document.querySelector("#cover-preset");
const coverTitle = document.querySelector("#cover-title");
const coverPromptField = document.querySelector("#cover-prompt-field");
const coverPrompt = document.querySelector("#cover-prompt");
const coverUpload = document.querySelector("#cover-upload");
const coverReferenceUpload = document.querySelector("#cover-reference-upload");
const coverReferencePreview = document.querySelector("#cover-reference-preview");
const toast = document.querySelector("#toast");
const themeButtons = document.querySelectorAll("[data-theme-toggle]");
const themeStorageKey = "codex-storyboard-theme";
const scriptDraft = document.querySelector("#script-draft");
const scriptCount = document.querySelector("#script-count");
const assetsGrid = document.querySelector("#assets-grid");
const presenter = document.querySelector("#presenter");
const presenterStage = document.querySelector("#presenter-stage");
const presenterStrip = document.querySelector("#presenter-strip");
const arollPlaceholderUrl = "/assets/aroll-placeholder.png";
const stylesView = document.querySelector("#styles-view");
const stylesGrid = document.querySelector("#styles-grid");
const stylesFilters = document.querySelector("#styles-filters");
const styleDetailDialog = document.querySelector("#style-detail-dialog");
const styleApplyDialog = document.querySelector("#style-apply-dialog");

const ratios = ["9:16", "16:9", "3:4", "4:3", "1:1"];
const selectOptions = {
  rollType: [
    { value: "A-ROLL", label: "A-ROLL" },
    { value: "B-ROLL", label: "B-ROLL" }
  ],
  mediaType: [
    { value: "image", label: "图片" },
    { value: "video", label: "视频" }
  ],
  generator: [
    { value: "manual", label: "手动素材" },
    { value: "image-gen", label: "Image Generation" },
    { value: "hyperframes", label: "HyperFrames" },
    { value: "remotion", label: "Remotion" }
  ]
};

const coverPresets = [
  {
    value: "clean-explainer",
    label: "干净知识封面",
    skill: "clean-video-cover",
    buildPrompt: ({ topic, titleRule, ratio }) => `Use case: ads-marketing
Asset type: clean ${ratio} Chinese short-video cover
Source skill: clean-video-cover / video-cover-maker

Primary request:
Create a simple, clean Chinese short-video cover for this topic:
${topic}

Style formula:
大标题关键词 + 产品 logo / 主体符号 + 一个清晰隐喻。
只保留一个核心隐喻，不要拼贴，不要复杂 UI，不要过多图标。

Visual style:
- Background: off-white / light grey with subtle paper grain.
- Typography: oversized ultra-bold condensed Chinese block lettering, slightly slanted or irregular, rough paper-grain texture inside letters, subtle blue offset shadow, strong dark charcoal fill.
- Accent color: only one cyan / blue / green accent.
- Layout: logo or subject symbol near top, big keyword in the middle, short subtitle below, one simple metaphor at bottom.
- Keep enough negative space. Feed-size readability first.

Text rules:
- ${titleRule}
- Chinese text must be perfectly legible and correctly spelled.
- No extra slogans, fake logos, watermarks, UI chrome, or unrelated captions.
- Final image aspect ratio: ${ratio}.`
  },
  {
    value: "black-overlay",
    label: "黑蒙版白字",
    skill: "short-video-cover",
    buildPrompt: ({ topic, titleRule, ratio }) => `Use case: short-video talking-head cover
Asset type: ${ratio} Chinese short-video cover
Source skill: short-video-cover / video-cover-maker

Primary request:
Create a direct口播 style cover for this topic:
${topic}

Visual style:
- Use a photographic background or a provided reference photo if available.
- Add a full-canvas semi-transparent black overlay around 45% opacity.
- Add a huge white Chinese title in bold Songti / serif style, centered in the middle visual area.
- Title should occupy roughly 45%-65% of the cover width.
- If a face is present, do not cover the eyes.

Rules:
- ${titleRule}
- Chinese text must be perfectly legible and correctly spelled.
- No extra subtitles, logos, stickers, borders, UI elements, beautification, or unrelated decoration.
- Final image aspect ratio: ${ratio}.`
  },
  {
    value: "viral-head",
    label: "真人抠头爆款",
    skill: "viral-head-cover",
    buildPrompt: ({ topic, titleRule, ratio }) => `Use case: viral Chinese short-video thumbnail
Asset type: ${ratio} cover
Source skill: viral-head-cover / video-cover-maker

Primary request:
Create a high-impact viral Chinese short-video cover for this topic:
${topic}
If a portrait reference is provided, cut out only the person's head and hair, preserve identity, then place the head onto a stylized thumbnail character body in a clean exaggerated scene.

Scene direction:
Use a simple metaphor scene related to the title. Keep the background clean and high contrast. Do not create a messy poster collage.

Typography:
- Big Chinese headline with yellow or white fill, black stroke, strong thumbnail readability.
- Split into 2-4 compact lines if needed.
- ${titleRule}

Rules:
- Preserve identity when a real portrait is provided.
- Chinese text must be perfectly legible and correctly spelled.
- No extra text, fake UI, stickers, watermarks, or unrelated props.
- Final image aspect ratio: ${ratio}.`
  },
  {
    value: "custom",
    label: "自定义 / 导入",
    skill: "custom",
    buildPrompt: () => ""
  }
];

let project = null;
let projects = [];
let saveTimer;
let savePromise = Promise.resolve();
let pollTimer;
let activeSelect;
let dialogMode = "create";
let editingProjectId = "";
let deletingProjectId = "";
let uploadShotId = "";
let lightboxShotId = "";
let toastTimer;
let pendingProjectDesign = null;
let designMenuPinned = false;
let designMenuCloseTimer;
let activeCoverType = "vertical";
let activeProjectTab = "storyboard";
let activeAssetFilter = "all";
let presenterItems = [];
let presenterIndex = 0;
let activeHomeTab = "projects";
let activeStyleFilter = "all";
let styleData = [];
let pendingStyleId = "";
let targetProjectId = "";

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers["content-type"] = "application/json";
  const response = await fetch(path, { ...options, headers });
  const value = await response.json();
  if (!response.ok) {
    const error = new Error(value.error || "请求失败");
    error.status = response.status;
    throw error;
  }
  return value;
}

function currentTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function updateThemeButtons() {
  const isDark = currentTheme() === "dark";
  themeButtons.forEach((button) => {
    button.setAttribute("aria-label", isDark ? "切换到浅色主题" : "切换到深色主题");
    button.title = isDark ? "切换到浅色主题" : "切换到深色主题";
  });
}

function toggleTheme() {
  const next = currentTheme() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(themeStorageKey, next);
  } catch {
    // 浏览器禁用本地存储时，本次切换仍然生效。
  }
  updateThemeButtons();
}

function showToast(message, type = "info") {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.dataset.type = type;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2600);
}

function emptyShot() {
  return {
    rollType: "B-ROLL",
    mediaType: "image",
    duration: 5,
    dialogue: "",
    visualPrompt: "",
    generator: "image-gen",
    mediaUrl: "",
    notes: "",
    generationStatus: "idle",
    generationTaskId: "",
    generationError: ""
  };
}

function emptyCover(type) {
  return {
    type,
    preset: "custom",
    title: "",
    prompt: "",
    referenceUrl: "",
    mediaUrl: "",
    generationStatus: "idle",
    generationTaskId: "",
    generationError: ""
  };
}

function coverRatioLabel() {
  return activeCoverType === "horizontal" ? "16:9 horizontal" : "9:16 vertical";
}

function coverPromptContext() {
  const title = coverTitle.value.trim();
  const topic = title || project?.title || "当前短视频主题";
  return {
    topic,
    ratio: coverRatioLabel(),
    titleRule: title
      ? `Main headline exactly: ${title}`
      : "No fixed headline is provided. Use a short readable Chinese title only if it improves the cover; do not render placeholder text."
  };
}

function coverPresetByValue(value) {
  return coverPresets.find((preset) => preset.value === value) || coverPresets[0];
}

function renderCoverPresetOptions() {
  coverPreset.replaceChildren(
    ...coverPresets.map((preset) => {
      const option = document.createElement("option");
      option.value = preset.value;
      option.textContent = preset.label;
      return option;
    })
  );
}

function applyCoverPreset(value) {
  if (!project) return;
  ensureCovers();
  const cover = project.covers[activeCoverType];
  const preset = coverPresetByValue(value);
  cover.preset = preset.value;
  if (preset.value !== "custom") {
    cover.prompt = preset.buildPrompt({
      ...coverPromptContext()
    });
  }
  renderCoverPanel();
  queueSave();
}

function ensureCovers() {
  if (!project) return;
  project.covers ||= {};
  project.covers.vertical ||= emptyCover("vertical");
  project.covers.horizontal ||= emptyCover("horizontal");
}

function formatDuration(seconds) {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function generationLabel(shot) {
  if (shot.generator === "manual") return shot.mediaUrl ? "本地素材" : "等待上传";
  return {
    idle: "未生成",
    pending: "等待处理",
    processing: "生成中",
    ready: "已完成",
    failed: shot.generationError || "生成失败"
  }[shot.generationStatus] || "未生成";
}

function coverGenerationLabel(cover) {
  return {
    idle: cover.mediaUrl ? "已完成" : "未生成",
    pending: "等待处理",
    processing: "生成中",
    ready: "已完成",
    failed: cover.generationError || "生成失败"
  }[cover.generationStatus] || "未生成";
}

function coverGenerateLabel(cover) {
  if (cover.generationStatus === "pending") return "取消队列";
  if (cover.generationStatus === "processing") return "生成中";
  if (!canGenerateCover(cover)) return "填写封面提示词";
  return cover.generationStatus === "ready" || cover.generationStatus === "failed"
    ? "重新生成封面"
    : "加入 Image Generation 队列";
}

function coverUsesCustomPrompt(cover) {
  return (cover.preset || "custom") === "custom";
}

function canGenerateCover(cover) {
  return !coverUsesCustomPrompt(cover) || Boolean(cover.prompt.trim());
}

function generationButtonLabel(shot) {
  if (shot.generator === "manual") return shot.mediaUrl ? "重新上传" : "本地上传";
  if (shot.generationStatus === "pending") return "取消队列";
  if (shot.generationStatus === "processing") return "生成中";
  if (!shot.visualPrompt.trim() && !["pending", "processing"].includes(shot.generationStatus)) {
    return "填写画面描述";
  }
  if (shot.generationStatus === "ready" || shot.generationStatus === "failed") return "重新生成";
  return "生成素材";
}

function isBatchGeneratable(shot) {
  return (
    shot.generator !== "manual" &&
    Boolean(shot.visualPrompt.trim()) &&
    shot.generationStatus !== "ready"
  );
}

function updateBatchButton() {
  const count = project?.shots.filter(isBatchGeneratable).length || 0;
  generateAllButton.disabled = count === 0;
  generateAllButton.textContent = count > 0 ? `批量生成 ${count}` : "批量生成";
}

function safeFileName(value) {
  return String(value || "codex-storyboard")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "codex-storyboard";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function textBlock(value, fallback = "无") {
  return String(value || "").trim() || fallback;
}

function downloadText(fileName, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  downloadUrl(fileName, url);
  URL.revokeObjectURL(url);
}

function downloadUrl(fileName, url) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
}

async function downloadBlob(fileName, path) {
  const response = await fetch(path);
  if (!response.ok) {
    let message = "导出失败";
    try {
      message = (await response.json()).error || message;
    } catch {
      // 非 JSON 错误响应时保留默认提示。
    }
    throw new Error(message);
  }
  const url = URL.createObjectURL(await response.blob());
  downloadUrl(fileName, url);
  URL.revokeObjectURL(url);
}

function exportMetadataLines() {
  const duration = project.shots.reduce((sum, shot) => sum + Number(shot.duration || 0), 0);
  return [
    `项目：${project.title}`,
    `画面比例：${project.aspectRatio}`,
    `镜头数量：${project.shots.length}`,
    `总时长：${formatDuration(duration)}`,
    `视觉规范：${project.hasDesign ? "已配置 DESIGN.md" : "未配置"}`,
    `导出时间：${new Date().toLocaleString("zh-CN")}`
  ];
}

function buildMarkdownExport() {
  const lines = [
    `# ${project.title}`,
    "",
    ...exportMetadataLines().map((line) => `- ${line}`),
    "",
    "## 分镜脚本",
    ""
  ];

  project.shots.forEach((shot, index) => {
    lines.push(
      `### ${String(index + 1).padStart(2, "0")} · ${shot.rollType || "B-ROLL"}`,
      "",
      `- 媒体：${selectLabel("mediaType", shot.mediaType)}`,
      `- 时长：${Number(shot.duration || 0)} 秒`,
      `- 生成方式：${selectLabel("generator", shot.generator)}`,
      `- 状态：${generationLabel(shot)}`,
      "",
      "**台词文案**",
      "",
      textBlock(shot.dialogue),
      "",
      "**画面描述 / 生成提示词**",
      "",
      textBlock(shot.visualPrompt),
      "",
      "**备注**",
      "",
      textBlock(shot.notes),
      ""
    );
  });

  return `${lines.join("\n").trim()}\n`;
}

function buildPlainExport() {
  return buildMarkdownExport()
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*/g, "");
}

function renderExportParagraph(value) {
  return escapeHtml(textBlock(value)).replace(/\n/g, "<br>");
}

function buildHtmlExport() {
  const duration = project.shots.reduce((sum, shot) => sum + Number(shot.duration || 0), 0);
  const rows = project.shots.map((shot, index) => `
      <tr>
        <td class="num">${index + 1}</td>
        <td class="type">${escapeHtml(shot.rollType || "B-ROLL")}</td>
        <td class="duration">${Number(shot.duration || 0)}s</td>
        <td>${renderExportParagraph(shot.dialogue)}</td>
        <td>${renderExportParagraph(shot.visualPrompt)}</td>
        <td>${renderExportParagraph(shot.notes)}</td>
      </tr>
    `).join("");

  const meta = [
    `形式：${project.aspectRatio}，约 ${formatDuration(duration)}，共 ${project.shots.length} 个镜头，素材预览不在本文档展示。`,
    `视觉规范：${project.hasDesign ? "已配置 DESIGN.md" : "未配置"}。`,
    `导出时间：${new Date().toLocaleString("zh-CN")}。`
  ].join(" ");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="Codex Storyboard · Kami">
  <title>${escapeHtml(project.title)} · 分镜脚本</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 14mm;
    }
    :root {
      --paper: #f5f4ed;
      --ivory: #faf9f5;
      --brand: #1B365D;
      --ink: #141413;
      --dark-warm: #3d3d3a;
      --muted: #504e49;
      --stone: #6b6a64;
      --border: #e8e6dc;
      --border-soft: #e5e3d8;
      --table-head: #EEF2F7;
      --serif: "TsangerJinKai02", "Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", "STSong", Georgia, serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--paper);
      color: var(--ink);
      font-family: var(--serif);
      letter-spacing: .02em;
      line-height: 1.42;
    }
    .sheet {
      width: min(1180px, calc(100vw - 28px));
      margin: 28px auto;
      padding: 28px 30px 34px;
      border: 1px solid var(--border);
      border-radius: 16px;
      background: var(--ivory);
      box-shadow: 0 14px 48px rgba(20, 20, 19, .06);
    }
    .eyebrow {
      margin: 0 0 8px;
      color: var(--brand);
      font-size: 12px;
      font-weight: 500;
      letter-spacing: .12em;
    }
    h1 {
      margin: 0;
      color: var(--ink);
      font-size: clamp(28px, 4vw, 42px);
      font-weight: 500;
      line-height: 1.16;
      letter-spacing: -.01em;
    }
    .meta-line {
      max-width: 980px;
      margin: 14px 0 22px;
      color: var(--muted);
      font-size: 16px;
    }
    .section-title {
      margin: 22px 0 12px;
      color: var(--ink);
      font-size: 21px;
      font-weight: 500;
      line-height: 1.25;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      background: #fffefa;
      border: 1px solid var(--border);
      font-size: 15px;
    }
    th,
    td {
      border: 1px solid var(--border-soft);
      padding: 12px 13px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: var(--table-head);
      color: var(--dark-warm);
      font-weight: 500;
      white-space: nowrap;
    }
    td {
      min-height: 72px;
      color: var(--ink);
      word-break: break-word;
    }
    .num {
      width: 52px;
      color: var(--brand);
      letter-spacing: 0;
      text-align: center;
    }
    .type {
      width: 88px;
      color: var(--brand);
    }
    .duration {
      width: 66px;
      white-space: nowrap;
    }
    .dialogue { width: 28%; }
    .visual { width: 30%; }
    .notes { width: 18%; }
    .empty {
      margin: 18px 0 0;
      color: var(--stone);
      font-size: 15px;
    }
    .footer {
      margin-top: 18px;
      color: var(--stone);
      font-size: 12px;
      text-align: right;
      letter-spacing: .04em;
    }
    tr {
      break-inside: avoid;
    }
    @media print {
      body { background: white; }
      .sheet {
        width: auto;
        margin: 0;
        padding: 0;
        border: 0;
        border-radius: 0;
        box-shadow: none;
      }
      table { font-size: 10pt; }
      th, td { padding: 6pt 7pt; }
    }
    @media (max-width: 720px) {
      .sheet { padding: 24px 18px; }
      .table-wrap { overflow-x: auto; }
      table { min-width: 920px; }
    }
  </style>
</head>
<body>
  <main class="sheet">
    <p class="eyebrow">CODEX STORYBOARD</p>
    <h1>${escapeHtml(project.title)}</h1>
    <p class="meta-line">${escapeHtml(meta)}</p>
    <h2 class="section-title">镜头脚本</h2>
    ${rows ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="num">镜头</th>
              <th class="type">类型</th>
              <th class="duration">时长</th>
              <th class="dialogue">口播/字幕</th>
              <th class="visual">录屏/画面</th>
              <th class="notes">备注</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    ` : "<p class=\"empty\">当前项目暂无镜头。</p>"}
    <p class="footer">Exported from Codex Storyboard · Kami table</p>
  </main>
</body>
</html>
`;
}

async function exportProject(format) {
  if (!project) return;
  try {
    await flushSave();
    const baseName = safeFileName(`${project.title}-分镜脚本`);
    closeDesignMenu(true);

    if (format === "markdown") {
      downloadText(`${baseName}.md`, buildMarkdownExport(), "text/markdown;charset=utf-8");
      showToast("Markdown 已导出");
      return;
    }

    if (format === "html") {
      downloadText(`${baseName}.html`, buildHtmlExport(), "text/html;charset=utf-8");
      showToast("HTML 已导出");
      return;
    }

    if (format === "word") {
      await downloadBlob(
        `${baseName}.docx`,
        `/api/projects/${encodeURIComponent(project.id)}/export/docx`
      );
      showToast("Word 已导出");
      return;
    }

    if (format === "copy") {
      await navigator.clipboard.writeText(buildPlainExport());
      showToast("脚本文本已复制");
    }
  } catch (error) {
    showToast(error.message || "导出失败", "error");
  }
}

function projectPath(projectId) {
  return `/project/${encodeURIComponent(projectId)}`;
}

function currentProjectId() {
  return decodeURIComponent(location.pathname.match(/^\/project\/([^/]+)\/?$/)?.[1] || "");
}

function navigate(path) {
  history.pushState({}, "", path);
  route();
}

function openProjectDialog(mode, target = null) {
  dialogMode = mode;
  editingProjectId = target?.id || "";
  document.querySelector("#project-dialog-title").textContent =
    mode === "create" ? "新建项目" : "重命名项目";
  document.querySelector("#project-submit").textContent =
    mode === "create" ? "创建项目" : "保存名称";
  projectNameInput.value = target?.title || "";
  ratioOptions.hidden = mode === "rename";
  projectDesignOption.hidden = mode === "rename";
  if (mode === "create") {
    ratioOptions.querySelector('input[value="9:16"]').checked = true;
    pendingProjectDesign = null;
    projectDesignUpload.value = "";
    document.querySelector("#project-design-file-name").textContent = "未选择 DESIGN.md";
  }
  projectDialog.showModal();
  requestAnimationFrame(() => projectNameInput.focus());
}

function renderRatioOptions() {
  ratios.forEach((ratio) => {
    const label = document.createElement("label");
    label.className = "ratio-option";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "aspectRatio";
    input.value = ratio;
    const shapeStage = document.createElement("span");
    shapeStage.className = "ratio-shape-stage";
    const shape = document.createElement("span");
    shape.className = "ratio-shape";
    shape.style.aspectRatio = ratio.replace(":", " / ");
    const [ratioWidth, ratioHeight] = ratio.split(":").map(Number);
    if (ratioWidth <= ratioHeight) shape.style.height = "34px";
    else shape.style.width = "38px";
    shapeStage.append(shape);
    const text = document.createElement("strong");
    text.textContent = ratio;
    label.append(input, shapeStage, text);
    ratioOptions.append(label);
  });
}

async function loadProjects() {
  const result = await api("/api/projects");
  projects = result.projects;
  renderProjects();
}

function renderProjects() {
  projectsGrid.replaceChildren();
  document.querySelector("#project-count").textContent = `${projects.length} 个项目`;

  projects.forEach((item) => {
    const card = projectCardTemplate.content.firstElementChild.cloneNode(true);
    card.dataset.id = item.id;
    card.style.setProperty("--project-ratio", item.aspectRatio.replace(":", " / "));
    card.querySelector(".project-card-title").textContent = item.title;
    card.querySelector(".project-meta").textContent =
      `${item.shotCount} 个镜头 · ${formatDuration(item.duration)} · ${item.aspectRatio}`;
    card.querySelector(".project-placeholder strong").textContent = item.aspectRatio;
    const image = card.querySelector(".project-cover img");
    if (item.coverUrl) {
      image.src = item.coverUrl;
      image.alt = `${item.title} 项目封面`;
      card.classList.add("has-cover");
    }
    card.querySelector(".project-open").addEventListener("click", () => navigate(projectPath(item.id)));
    card.querySelector(".rename-project").addEventListener("click", () => openProjectDialog("rename", item));
    card.querySelector(".delete-project").addEventListener("click", () => {
      deletingProjectId = item.id;
      document.querySelector("#delete-message").textContent =
        `“${item.title}”包含 ${item.shotCount} 个镜头。删除后项目和全部素材将无法恢复。`;
      deleteDialog.showModal();
    });
    projectsGrid.append(card);
  });

  const add = document.createElement("button");
  add.className = "new-project-card";
  add.type = "button";
  add.innerHTML = "<span>＋</span><strong>新建项目</strong><small>选择名称与画面比例</small>";
  add.addEventListener("click", () => openProjectDialog("create"));
  projectsGrid.append(add);
}

async function loadProject(projectId) {
  try {
    project = await api(`/api/projects/${encodeURIComponent(projectId)}`);
    renderStoryboard();
    startPolling();
  } catch (error) {
    showToast("项目不存在或已被删除", "error");
    history.replaceState({}, "", "/");
    await showProjectsView();
  }
}

function showProjectsView() {
  clearInterval(pollTimer);
  closeDesignMenu(true);
  closePresenter();
  closeLightbox();
  project = null;
  showHomeTab("projects");
  return loadProjects();
}

function showStoryboardView(projectId) {
  projectsView.hidden = true;
  stylesView.hidden = true;
  document.querySelector(".home-sidebar").hidden = true;
  storyboardView.hidden = false;
  document.querySelector("#home-actions").hidden = true;
  document.querySelector("#storyboard-actions").hidden = false;
  return loadProject(projectId);
}

function showHomeTab(tab) {
  activeHomeTab = tab;
  document.querySelectorAll("[data-home-tab]").forEach((button) => {
    button.setAttribute("aria-current", button.dataset.homeTab === tab ? "page" : "false");
  });
  projectsView.hidden = tab !== "projects";
  stylesView.hidden = tab !== "styles";
  document.querySelector(".home-sidebar").hidden = false;
  storyboardView.hidden = true;
  document.querySelector("#home-actions").hidden = false;
  document.querySelector("#storyboard-actions").hidden = true;
  document.title = "Codex 分镜台";
  if (tab === "styles") loadStylesView();
}

function route() {
  const projectId = currentProjectId();
  return projectId ? showStoryboardView(projectId) : showProjectsView();
}

function renderProjectTabs() {
  document.querySelectorAll("[data-project-tab]").forEach((button) => {
    const selected = button.dataset.projectTab === activeProjectTab;
    button.setAttribute("aria-current", selected ? "page" : "false");
  });
  scriptPanel.hidden = activeProjectTab !== "script";
  storyboardPanel.hidden = activeProjectTab !== "storyboard";
  assetsPanel.hidden = activeProjectTab !== "assets";
  document.querySelector("#add-shot-top").hidden = activeProjectTab !== "storyboard";
  generateAllButton.hidden = activeProjectTab !== "storyboard";
}

function renderScriptPanel() {
  const value = project.scriptDraft || "";
  if (scriptDraft.value !== value) scriptDraft.value = value;
  scriptCount.textContent = `${value.trim().length} 字`;
}

function buildStoryboardPrompt() {
  const draft = (project.scriptDraft || "").trim();
  const ratio = project.aspectRatio || "16:9";
  return [
    `请基于下面的完整脚本，为 Codex 分镜台项目「${project.title}」生成分镜。`,
    "",
    "要求：",
    `- 画面比例：${ratio}`,
    "- 按镜头拆分，每个镜头包含 rollType、mediaType、duration、dialogue、visualPrompt、generator、notes。",
    "- A-ROLL 用于真人口播或主讲；B-ROLL 用于画面补充、录屏、数据图、动画。",
    "- generator 只能使用 manual、image-gen、hyperframes、remotion。",
    "- visualPrompt 要能直接指导图片或视频素材生成。",
    "",
    "完整脚本：",
    draft || "（这里还没有填写脚本草稿）"
  ].join("\n");
}

async function copyStoryboardPrompt() {
  if (!project) return;
  await flushSave();
  await navigator.clipboard.writeText(buildStoryboardPrompt());
  showToast("生成分镜指令已复制");
}

function coverAssets() {
  if (!project?.covers) return [];
  return Object.values(project.covers)
    .filter((cover) => cover.mediaUrl)
    .map((cover) => ({
      id: `cover-${cover.type}`,
      title: cover.type === "horizontal" ? "横屏封面" : "竖屏封面",
      type: "cover",
      mediaType: "image",
      mediaUrl: cover.mediaUrl,
      aspectRatio: cover.type === "horizontal" ? "16 / 9" : "9 / 16",
      description: cover.title || cover.prompt || "短视频封面"
    }));
}

function shotAssets() {
  return (project?.shots || []).map((shot, index) => ({
    id: shot.id,
    title: `镜头 ${String(index + 1).padStart(2, "0")}`,
    type: "shot",
    shot,
    shotIndex: index,
    rollType: shot.rollType,
    mediaType: shot.mediaUrl ? shot.mediaType : "image",
    sourceMediaType: shot.mediaType,
    mediaUrl: shot.mediaUrl || (shot.rollType === "A-ROLL" ? arollPlaceholderUrl : ""),
    aspectRatio: project.aspectRatio.replace(":", " / "),
    isPlaceholder: !shot.mediaUrl,
    description: shot.visualPrompt || shot.dialogue || shot.notes || "暂无描述"
  }));
}

function projectAssets() {
  return [...coverAssets(), ...shotAssets()];
}

function renderAssetsPanel() {
  document.querySelectorAll("[data-asset-filter]").forEach((button) => {
    const selected = button.dataset.assetFilter === activeAssetFilter;
    button.setAttribute("aria-selected", String(selected));
  });
  const assets = projectAssets().filter((item) => {
    if (activeAssetFilter === "all") return true;
    if (activeAssetFilter === "cover") return item.type === "cover";
    return item.type === "shot" && item.mediaType === activeAssetFilter;
  });

  assetsGrid.replaceChildren();
  if (assets.length === 0) {
    const empty = document.createElement("div");
    empty.className = "assets-empty";
    empty.textContent = "当前筛选下暂无素材。";
    assetsGrid.append(empty);
    return;
  }

  assets.forEach((item) => {
    const card = document.createElement("article");
    card.className = "asset-card";
    if (item.isPlaceholder) card.classList.add("is-placeholder");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "asset-preview";
    button.style.aspectRatio = item.aspectRatio;
    if (item.mediaUrl) {
      const media = item.mediaType === "video"
        ? Object.assign(document.createElement("video"), { muted: true, preload: "metadata" })
        : document.createElement("img");
      media.src = item.mediaUrl;
      media.alt = item.description;
      button.append(media);
      button.addEventListener("click", () => openAssetPreview(item));
    } else {
      const empty = document.createElement("span");
      empty.className = "empty-preview";
      empty.textContent = "等待素材";
      button.append(empty);
      button.disabled = true;
    }
    const kind = document.createElement("span");
    kind.className = "media-kind";
    kind.textContent = item.type === "cover"
      ? "COVER"
      : item.mediaType === "video" ? "VIDEO" : "IMAGE";
    button.append(kind);

    const bodyElement = document.createElement("div");
    bodyElement.className = "asset-card-body";
    const title = document.createElement("strong");
    title.textContent = item.title;
    const meta = document.createElement("span");
    meta.textContent = item.type === "cover"
      ? "封面素材"
      : `${item.rollType} · ${item.isPlaceholder ? "占位" : selectLabel("mediaType", item.sourceMediaType)}`;
    bodyElement.append(title, meta);
    card.append(button, bodyElement);
    assetsGrid.append(card);
  });
}

function openAssetPreview(item) {
  if (item.type === "shot" && !item.isPlaceholder) return openLightbox(item.shot, item.shotIndex);
  lightboxShotId = "";
  lightboxStage.replaceChildren();
  const image = document.createElement("img");
  image.src = item.mediaUrl;
  image.alt = item.description;
  lightboxStage.append(image);
  document.querySelector("#lightbox-caption").textContent = item.isPlaceholder
    ? `${item.title} · A-ROLL 占位`
    : item.title;
  document.querySelector("#lightbox-upload").hidden = true;
  lightbox.hidden = false;
  document.body.classList.add("lightbox-open");
  document.querySelector("#lightbox-close").focus();
}

function renderPreview(shot, index) {
  const frame = document.createElement("div");
  frame.className = "preview-frame";
  frame.style.aspectRatio = project.aspectRatio.replace(":", " / ");
  const [ratioWidth, ratioHeight] = project.aspectRatio.split(":").map(Number);
  if (ratioWidth < ratioHeight) frame.classList.add("portrait-preview");

  const preview = document.createElement("button");
  preview.type = "button";
  preview.className = "preview";
  frame.append(preview);

  if (!shot.mediaUrl) {
    if (shot.rollType === "A-ROLL") {
      const image = document.createElement("img");
      image.src = arollPlaceholderUrl;
      image.alt = `镜头 ${index + 1} A-ROLL 口播占位`;
      preview.classList.add("aroll-placeholder");
      preview.append(image);
      const label = document.createElement("span");
      label.className = "media-kind";
      label.textContent = "A-ROLL";
      preview.append(label);
      if (shot.generator === "manual") {
        preview.classList.add("is-uploadable");
        preview.addEventListener("click", () => chooseUpload(shot.id));
      } else {
        preview.disabled = true;
      }
      return frame;
    }
    const empty = document.createElement("span");
    empty.className = "empty-preview";
    empty.textContent = shot.generator === "manual"
      ? "点击上传图片/视频"
      : shot.mediaType === "video" ? "等待视频素材" : "等待图片素材";
    preview.append(empty);
    if (shot.generator === "manual") {
      preview.classList.add("is-uploadable");
      preview.addEventListener("click", () => chooseUpload(shot.id));
    } else {
      preview.disabled = true;
    }
    return frame;
  }

  const media = shot.mediaType === "video"
    ? Object.assign(document.createElement("video"), { muted: true, preload: "metadata" })
    : document.createElement("img");
  media.src = shot.mediaUrl;
  media.alt = shot.visualPrompt || `镜头 ${index + 1} 素材`;
  preview.append(media);

  const label = document.createElement("span");
  label.className = "media-kind";
  label.textContent = shot.mediaType === "video" ? "VIDEO" : "IMAGE";
  preview.append(label);
  preview.addEventListener("click", () => openLightbox(shot, index));

  if (shot.generationStatus !== "processing") {
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-media";
    removeButton.setAttribute("aria-label", "删除素材");
    removeButton.title = "删除素材";
    removeButton.textContent = "×";
    removeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteMedia(shot);
    });
    frame.append(removeButton);
  }
  return frame;
}

function chooseUpload(shotId) {
  uploadShotId = shotId;
  mediaUpload.value = "";
  mediaUpload.click();
}

async function uploadMedia(file) {
  if (!project || !uploadShotId || !file) return;
  const form = new FormData();
  form.append("file", file);
  saveStatus.textContent = "上传中…";
  try {
    project = await api(
      `/api/projects/${encodeURIComponent(project.id)}/shots/${encodeURIComponent(uploadShotId)}/media`,
      { method: "POST", body: form }
    );
    closeLightbox();
    renderStoryboard();
    saveStatus.textContent = "已保存";
    showToast("素材已上传");
  } catch (error) {
    saveStatus.textContent = "上传失败";
    showToast(error.message, "error");
  }
}

async function deleteMedia(shot) {
  saveStatus.textContent = "删除素材…";
  try {
    project = await api(
      `/api/projects/${encodeURIComponent(project.id)}/shots/${encodeURIComponent(shot.id)}/media`,
      { method: "DELETE" }
    );
    closeLightbox();
    renderStoryboard();
    saveStatus.textContent = "已保存";
    showToast("素材已删除");
  } catch (error) {
    saveStatus.textContent = "删除失败";
    showToast(error.message, "error");
  }
}

function renderCoverPanel() {
  if (!project) return;
  ensureCovers();
  const cover = project.covers[activeCoverType];
  const isHorizontal = activeCoverType === "horizontal";

  document.querySelectorAll("[data-cover-type]").forEach((button) => {
    const selected = button.dataset.coverType === activeCoverType;
    button.setAttribute("aria-selected", String(selected));
  });
  coverPreviewFrame.dataset.coverType = activeCoverType;
  coverPreset.value = cover.preset || "custom";
  coverTitle.value = cover.title || "";
  coverPrompt.value = cover.prompt || "";
  coverPromptField.hidden = !coverUsesCustomPrompt(cover);
  coverStatus.textContent = coverGenerationLabel(cover);
  coverStatus.dataset.status = cover.generationStatus || "idle";
  coverStatus.title = cover.generationError || "";
  document.querySelector("#generate-cover").textContent = coverGenerateLabel(cover);
  document.querySelector("#generate-cover").disabled =
    cover.generationStatus === "processing" ||
    (cover.generationStatus !== "pending" && !canGenerateCover(cover));
  document.querySelector("#delete-cover").disabled =
    cover.generationStatus === "processing" || !cover.mediaUrl;
  document.querySelector("#delete-cover-reference").disabled =
    cover.generationStatus === "processing" || !cover.referenceUrl;
  document.querySelector("#cover-folder-hint").textContent =
    `生成或上传后保存为 ${isHorizontal ? "cover-horizontal.png" : "cover-vertical.png"}，可在项目素材目录直接取用。`;

  coverReferencePreview.replaceChildren();
  if (cover.referenceUrl) {
    const image = document.createElement("img");
    image.src = cover.referenceUrl;
    image.alt = "封面参考图";
    coverReferencePreview.append(image);
  } else {
    const empty = document.createElement("span");
    empty.textContent = "未上传参考图";
    coverReferencePreview.append(empty);
  }

  coverPreview.replaceChildren();
  if (!cover.mediaUrl) {
    const empty = document.createElement("span");
    empty.className = "empty-preview";
    empty.textContent = isHorizontal ? "等待横屏封面" : "等待竖屏封面";
    coverPreview.append(empty);
    coverPreview.disabled = true;
    return;
  }

  const image = document.createElement("img");
  image.src = cover.mediaUrl;
  image.alt = cover.title || "短视频封面";
  coverPreview.disabled = false;
  coverPreview.append(image);
  const label = document.createElement("span");
  label.className = "media-kind";
  label.textContent = "COVER";
  coverPreview.append(label);
}

function openCoverPanel() {
  closeDesignMenu(true);
  ensureCovers();
  coverPanel.hidden = false;
  document.body.classList.add("lightbox-open");
  renderCoverPanel();
}

function closeCoverPanel() {
  coverPanel.hidden = true;
  document.body.classList.remove("lightbox-open");
}

async function uploadCover(file) {
  if (!project || !file) return;
  const form = new FormData();
  form.append("file", file);
  saveStatus.textContent = "上传封面…";
  try {
    project = await api(
      `/api/projects/${encodeURIComponent(project.id)}/covers/${activeCoverType}/media`,
      { method: "POST", body: form }
    );
    renderCoverPanel();
    saveStatus.textContent = "已保存";
    showToast("封面已上传");
  } catch (error) {
    saveStatus.textContent = "上传失败";
    showToast(error.message, "error");
  }
}

async function uploadCoverReference(file) {
  if (!project || !file) return;
  const form = new FormData();
  form.append("file", file);
  saveStatus.textContent = "上传参考图…";
  try {
    project = await api(
      `/api/projects/${encodeURIComponent(project.id)}/covers/${activeCoverType}/reference`,
      { method: "POST", body: form }
    );
    renderCoverPanel();
    saveStatus.textContent = "已保存";
    showToast("参考图已上传");
  } catch (error) {
    saveStatus.textContent = "上传失败";
    showToast(error.message, "error");
  }
}

async function deleteCoverReference() {
  if (!project) return;
  saveStatus.textContent = "删除参考图…";
  try {
    project = await api(
      `/api/projects/${encodeURIComponent(project.id)}/covers/${activeCoverType}/reference`,
      { method: "DELETE" }
    );
    renderCoverPanel();
    saveStatus.textContent = "已保存";
    showToast("参考图已删除");
  } catch (error) {
    saveStatus.textContent = "删除失败";
    showToast(error.message, "error");
  }
}

async function deleteCover() {
  if (!project) return;
  saveStatus.textContent = "删除封面…";
  try {
    project = await api(
      `/api/projects/${encodeURIComponent(project.id)}/covers/${activeCoverType}/media`,
      { method: "DELETE" }
    );
    renderCoverPanel();
    saveStatus.textContent = "已保存";
    showToast("封面已删除");
  } catch (error) {
    saveStatus.textContent = "删除失败";
    showToast(error.message, "error");
  }
}

async function queueCoverGeneration(force = false) {
  if (!project) return;
  ensureCovers();
  const cover = project.covers[activeCoverType];
  if (cover.generationStatus === "pending") return cancelCoverGeneration(cover);
  if (!coverUsesCustomPrompt(cover)) {
    cover.prompt = coverPresetByValue(cover.preset).buildPrompt(coverPromptContext());
  }
  saveStatus.textContent = "提交封面生成任务…";
  try {
    await flushSave();
    const result = await api("/api/generation/tasks", {
      method: "POST",
      body: JSON.stringify({ projectId: project.id, coverTypes: [activeCoverType], force })
    });
    project = result.project;
    renderCoverPanel();
    saveStatus.textContent = result.queued.length > 0 ? "已提交封面生成任务" : "封面任务已在队列中";
  } catch (error) {
    saveStatus.textContent = "提交失败";
    showToast(error.message, "error");
  }
}

async function cancelCoverGeneration(cover) {
  saveStatus.textContent = "取消封面生成任务…";
  try {
    const result = await api(
      `/api/generation/tasks/${encodeURIComponent(cover.generationTaskId)}/cancel`,
      { method: "POST", body: JSON.stringify({}) }
    );
    project = result.project;
    renderCoverPanel();
    saveStatus.textContent = "已取消封面生成任务";
  } catch (error) {
    project = await api(`/api/projects/${encodeURIComponent(project.id)}`);
    renderCoverPanel();
    saveStatus.textContent = "取消失败";
    showToast(error.message, "error");
  }
}

async function openMediaFolder() {
  if (!project) return;
  closeDesignMenu(true);
  try {
    const result = await api(`/api/projects/${encodeURIComponent(project.id)}/media-folder`, {
      method: "POST",
      body: JSON.stringify({})
    });
    showToast(`已打开素材目录：${result.path}`);
  } catch (error) {
    showToast(error.message, "error");
  }
}

function openLightbox(shot, index) {
  lightboxShotId = shot.id;
  lightboxStage.replaceChildren();
  document.querySelector("#lightbox-upload").hidden = false;
  const media = shot.mediaType === "video"
    ? Object.assign(document.createElement("video"), { controls: true, autoplay: true })
    : document.createElement("img");
  media.src = shot.mediaUrl;
  media.alt = shot.visualPrompt || `镜头 ${index + 1} 素材`;
  lightboxStage.append(media);
  document.querySelector("#lightbox-caption").textContent =
    `镜头 ${String(index + 1).padStart(2, "0")} · ${shot.mediaType === "video" ? "视频" : "图片"}`;
  lightbox.hidden = false;
  document.body.classList.add("lightbox-open");
  document.querySelector("#lightbox-close").focus();
}

function closeLightbox() {
  if (lightbox.hidden) return;
  lightboxStage.querySelector("video")?.pause();
  lightbox.hidden = true;
  lightboxStage.replaceChildren();
  lightboxShotId = "";
  document.querySelector("#lightbox-upload").hidden = false;
  document.body.classList.remove("lightbox-open");
}

function buildPresenterItems() {
  return (project?.shots || []).map((shot, index) => ({
    id: shot.id,
    title: `第 ${index + 1} 镜`,
    index,
    rollType: shot.rollType,
    mediaType: shot.mediaType,
    mediaUrl: shot.mediaUrl || (shot.rollType === "A-ROLL" ? arollPlaceholderUrl : ""),
    isPlaceholder: !shot.mediaUrl,
    description: shot.visualPrompt || shot.dialogue || shot.notes || "这一镜还没有内容描述。"
  }));
}

function renderPresenter() {
  const item = presenterItems[presenterIndex];
  if (!item) return closePresenter();
  presenterStage.querySelector("video")?.pause();
  presenterStage.replaceChildren();
  document.querySelector("#presenter-project").textContent = project.title;
  document.querySelector("#presenter-title").textContent = item.title;
  document.querySelector("#presenter-kind").textContent = item.rollType;
  document.querySelector("#presenter-counter").textContent =
    `${presenterIndex + 1} / ${presenterItems.length}`;
  document.querySelector("#presenter-description").textContent = item.description;

  if (item.mediaUrl) {
    const media = item.mediaType === "video" && !item.isPlaceholder
      ? Object.assign(document.createElement("video"), { controls: true, autoplay: true })
      : document.createElement("img");
    media.src = item.mediaUrl;
    media.alt = item.description;
    presenterStage.append(media);
  } else {
    const empty = document.createElement("div");
    empty.className = "presenter-empty";
    empty.textContent = "等待素材";
    presenterStage.append(empty);
  }

  presenterStrip.replaceChildren();
  presenterItems.forEach((nextItem, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "presenter-thumb";
    button.setAttribute("aria-current", String(index === presenterIndex));
    if (nextItem.mediaUrl) {
      const media = nextItem.mediaType === "video" && !nextItem.isPlaceholder
        ? Object.assign(document.createElement("video"), { muted: true, preload: "metadata" })
        : document.createElement("img");
      media.src = nextItem.mediaUrl;
      media.alt = nextItem.title;
      button.append(media);
    } else {
      const empty = document.createElement("span");
      empty.textContent = String(index + 1).padStart(2, "0");
      button.append(empty);
    }
    const label = document.createElement("small");
    label.textContent = `${index + 1}`;
    button.append(label);
    button.addEventListener("click", () => {
      presenterIndex = index;
      renderPresenter();
    });
    presenterStrip.append(button);
  });
}

function openPresenter() {
  if (!project) return;
  presenterItems = buildPresenterItems();
  if (presenterItems.length === 0) {
    showToast("当前项目还没有镜头", "error");
    return;
  }
  presenterIndex = 0;
  presenter.hidden = false;
  document.body.classList.add("lightbox-open");
  renderPresenter();
  document.querySelector("#presenter-close").focus();
}

function closePresenter() {
  if (presenter.hidden) return;
  presenterStage.querySelector("video")?.pause();
  presenter.hidden = true;
  presenterStage.replaceChildren();
  presenterStrip.replaceChildren();
  document.body.classList.remove("lightbox-open");
}

function movePresenter(offset) {
  if (presenter.hidden || presenterItems.length === 0) return;
  presenterIndex = (presenterIndex + offset + presenterItems.length) % presenterItems.length;
  renderPresenter();
}

function selectLabel(field, value) {
  return selectOptions[field].find((option) => option.value === value)?.label || value;
}

function closeSelect({ restoreFocus = false } = {}) {
  if (!activeSelect) return;
  activeSelect.menu.remove();
  activeSelect.trigger.setAttribute("aria-expanded", "false");
  if (restoreFocus) activeSelect.trigger.focus();
  activeSelect = null;
}

function positionMenu(trigger, menu) {
  const rect = trigger.getBoundingClientRect();
  const gap = 5;
  const roomBelow = window.innerHeight - rect.bottom;
  const top = roomBelow >= menu.offsetHeight + gap
    ? rect.bottom + gap
    : Math.max(8, rect.top - menu.offsetHeight - gap);
  menu.style.left = `${Math.min(rect.left, window.innerWidth - menu.offsetWidth - 8)}px`;
  menu.style.top = `${top}px`;
  const contentWidth = menu.scrollWidth || 120;
  menu.style.width = `${Math.max(rect.width, Math.min(contentWidth + 10, 200))}px`;
}

function openSelect(trigger, field, shot, onChange) {
  if (activeSelect?.trigger === trigger) return closeSelect({ restoreFocus: true });
  closeSelect();
  const menu = document.createElement("div");
  menu.className = "select-menu";
  menu.setAttribute("role", "listbox");
  menu.setAttribute("aria-label", trigger.getAttribute("aria-label"));
  const options = selectOptions[field];

  options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "select-option";
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(option.value === shot[field]));
    button.dataset.index = String(index);
    button.textContent = option.label;
    button.addEventListener("click", () => {
      onChange(option.value);
      closeSelect({ restoreFocus: true });
    });
    button.addEventListener("keydown", (event) => {
      if (event.key === "Escape") return closeSelect({ restoreFocus: true });
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const next = event.key === "ArrowDown"
          ? Math.min(index + 1, options.length - 1)
          : Math.max(index - 1, 0);
        menu.querySelector(`[data-index="${next}"]`)?.focus();
      }
    });
    menu.append(button);
  });

  selectPortal.append(menu);
  trigger.setAttribute("aria-expanded", "true");
  activeSelect = { trigger, menu };
  positionMenu(trigger, menu);
  menu.querySelector('[aria-selected="true"]')?.focus();
}

function updateSelectTrigger(trigger, field, value) {
  const label = trigger.querySelector(".select-value");
  label.className = `select-value ${
    field === "rollType" ? (value === "A-ROLL" ? "roll-a" : "roll-b") : ""
  }`;
  label.textContent = selectLabel(field, value);
}

function renderSelect(container, field, shot, onChange) {
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "select-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-label", {
    rollType: "镜头类型",
    mediaType: "媒体类型",
    generator: "生成方式"
  }[field]);
  const value = document.createElement("span");
  value.className = `select-value ${
    field === "rollType" ? (shot[field] === "A-ROLL" ? "roll-a" : "roll-b") : ""
  }`;
  value.textContent = selectLabel(field, shot[field]);
  const chevron = document.createElement("span");
  chevron.className = "select-chevron";
  trigger.append(value, chevron);
  const activate = () => openSelect(trigger, field, shot, (nextValue) => {
    shot[field] = nextValue;
    updateSelectTrigger(trigger, field, nextValue);
    onChange(field);
  });
  trigger.addEventListener("click", activate);
  trigger.addEventListener("keydown", (event) => {
    if (["ArrowDown", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      activate();
    }
  });
  container.replaceChildren(trigger);
}

function updateSummary() {
  durationTotal.textContent = formatDuration(
    project.shots.reduce((sum, shot) => sum + Number(shot.duration || 0), 0)
  );
}

function queueSave() {
  saveStatus.textContent = "保存中…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    savePromise = saveProject();
  }, 450);
}

async function flushSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
    savePromise = saveProject();
  }
  await savePromise;
}

async function saveProject() {
  try {
    const saved = await api(`/api/projects/${encodeURIComponent(project.id)}`, {
      method: "PUT",
      body: JSON.stringify(project)
    });
    project.updatedAt = saved.updatedAt;
    saveStatus.textContent = "已保存";
  } catch (error) {
    saveStatus.textContent = "保存失败";
    showToast(error.message, "error");
  }
}

function renderStoryboard() {
  closeSelect();
  ensureCovers();
  project.scriptDraft = String(project.scriptDraft || "");
  document.title = `${project.title} · Codex 分镜台`;
  document.querySelector("#project-title").textContent = project.title;
  document.querySelector("#project-ratio").textContent = project.aspectRatio;
  renderProjectTabs();
  renderScriptPanel();
  renderDesignState();
  document.documentElement.style.setProperty("--preview-ratio", project.aspectRatio.replace(":", " / "));
  body.replaceChildren();

  project.shots.forEach((shot, index) => {
    const row = shotTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.id = shot.id;
    row.querySelector(".index-cell").textContent = String(index + 1).padStart(2, "0");

    row.querySelectorAll("[data-field]").forEach((control) => {
      const field = control.dataset.field;
      control.value = shot[field];
      control.addEventListener("input", () => {
        shot[field] = field === "duration" ? Number(control.value) : control.value;
        updateSummary();
        if (field === "visualPrompt") {
          updateBatchButton();
          const generateButton = row.querySelector(".generate-shot");
          generateButton.textContent = generationButtonLabel(shot);
          generateButton.disabled =
            shot.generationStatus === "processing" ||
            (shot.generationStatus !== "pending" && !shot.visualPrompt.trim());
        }
        queueSave();
      });
    });

    row.querySelectorAll("[data-select-field]").forEach((container) => {
      const field = container.dataset.selectField;
      renderSelect(container, field, shot, (changedField) => {
        if (changedField === "generator" || changedField === "mediaType" || changedField === "rollType") renderStoryboard();
        queueSave();
      });
    });

    row.querySelector(".preview-slot").append(renderPreview(shot, index));
    const status = row.querySelector(".generation-status");
    status.textContent = generationLabel(shot);
    status.dataset.status = shot.generationStatus || "idle";
    status.title = shot.generationError || "";

    const generateButton = row.querySelector(".generate-shot");
    generateButton.textContent = generationButtonLabel(shot);
    generateButton.disabled =
      shot.generationStatus === "processing" ||
      (shot.generator !== "manual" && !shot.visualPrompt.trim());
    generateButton.dataset.action = shot.generationStatus === "pending" ? "cancel" : "generate";
    generateButton.addEventListener("click", () => {
      if (shot.generator === "manual") return chooseUpload(shot.id);
      if (shot.generationStatus === "pending") return cancelGeneration(shot);
      return queueGeneration(
        [shot.id],
        shot.generationStatus === "ready" || shot.generationStatus === "failed"
      );
    });

    row.querySelector(".delete-shot").addEventListener("click", async () => {
      await api(
        `/api/projects/${encodeURIComponent(project.id)}/shots/${encodeURIComponent(shot.id)}`,
        { method: "DELETE" }
      );
      project.shots.splice(index, 1);
      renderStoryboard();
    });
    body.append(row);
  });

  updateSummary();
  updateBatchButton();
  renderAssetsPanel();
  if (!coverPanel.hidden) renderCoverPanel();
}

function renderDesignState() {
  const hasDesign = Boolean(project?.hasDesign);
  designMenu.dataset.active = String(hasDesign);
  const designLight = document.querySelector("#design-light");
  designLight.dataset.active = String(hasDesign);
  designLight.title = hasDesign ? "已配置视觉规范" : "未配置视觉规范";
  document.querySelector("#view-design").hidden = !hasDesign;
  document.querySelector("#remove-design").hidden = !hasDesign;
  document.querySelector("#import-design").textContent = hasDesign
    ? "替换 DESIGN.md"
    : "导入 DESIGN.md";
}

function openDesignMenu() {
  clearTimeout(designMenuCloseTimer);
  designMenuPopover.hidden = false;
  designMenuTrigger.setAttribute("aria-expanded", "true");
}

function closeDesignMenu(force = false) {
  clearTimeout(designMenuCloseTimer);
  if (designMenuPinned && !force) return;
  designMenuPinned = false;
  designMenuPopover.hidden = true;
  designMenuTrigger.setAttribute("aria-expanded", "false");
}

function scheduleDesignMenuClose() {
  clearTimeout(designMenuCloseTimer);
  if (designMenuPinned) return;
  designMenuCloseTimer = setTimeout(() => closeDesignMenu(), 100);
}

async function uploadProjectDesign(projectId, file) {
  const form = new FormData();
  form.append("file", file);
  return api(`/api/projects/${encodeURIComponent(projectId)}/design`, {
    method: "POST",
    body: form
  });
}

async function importCurrentDesign(file) {
  if (!project || !file) return;
  const replacing = project.hasDesign;
  saveStatus.textContent = replacing ? "替换视觉规范…" : "导入视觉规范…";
  try {
    project = await uploadProjectDesign(project.id, file);
    renderDesignState();
    saveStatus.textContent = "已保存";
    showToast(replacing ? "视觉规范已更新" : "视觉规范已导入");
  } catch (error) {
    saveStatus.textContent = "导入失败";
    showToast(error.message, "error");
  }
}

async function viewCurrentDesign() {
  try {
    const result = await api(`/api/projects/${encodeURIComponent(project.id)}/design`);
    document.querySelector("#design-content").textContent = result.content;
    designDialog.showModal();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function removeCurrentDesign() {
  try {
    project = await api(`/api/projects/${encodeURIComponent(project.id)}/design`, {
      method: "DELETE"
    });
    removeDesignDialog.close();
    renderDesignState();
    saveStatus.textContent = "已保存";
    showToast("视觉规范已移除");
  } catch (error) {
    showToast(error.message, "error");
  }
}

// ── 风格库 ──

async function loadStyleData() {
  if (styleData.length) return styleData;
  try {
    const response = await fetch("/styles-data.json");
    styleData = await response.json();
  } catch {
    styleData = [];
  }
  return styleData;
}

async function loadStylesView() {
  const data = await loadStyleData();
  if (!data.length) return;
  renderStyleFilters(data);
  renderStylesGrid(data);
}

function renderStyleFilters(data) {
  const categories = [...new Set(data.map((s) => s.category))];
  const existingButtons = stylesFilters.querySelectorAll("button[data-style-filter]");
  existingButtons.forEach((b) => { if (b.dataset.styleFilter !== "all") b.remove(); });
  categories.forEach((cat) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.styleFilter = cat;
    button.textContent = cat;
    button.addEventListener("click", () => {
      activeStyleFilter = cat;
      renderStyleFiltersState();
      renderStylesGrid(data);
    });
    stylesFilters.append(button);
  });
  renderStyleFiltersState();
}

function renderStyleFiltersState() {
  document.querySelectorAll("[data-style-filter]").forEach((button) => {
    button.setAttribute("aria-current", button.dataset.styleFilter === activeStyleFilter ? "page" : "false");
  });
}

function renderStylesGrid(data) {
  const filtered = activeStyleFilter === "all"
    ? data
    : data.filter((s) => s.category === activeStyleFilter);
  stylesGrid.innerHTML = "";
  filtered.forEach((style) => {
    const card = document.createElement("article");
    card.className = "style-card";
    card.innerHTML = `
      <div class="style-card-preview" aria-hidden="true">
        <img src="/assets/styles/${style.id}.png" alt="${style.name} 风格预览" loading="lazy" />
      </div>
      <div class="style-card-body">
        <span class="style-card-category">${style.category}</span>
        <strong class="style-card-name">${style.name}</strong>
        <p class="style-card-desc">${style.description}</p>
      </div>
    `;
    card.addEventListener("click", () => openStyleDetail(style));
    stylesGrid.append(card);
  });
}

function openStyleDetail(style) {
  document.querySelector("#style-detail-category").textContent = style.category;
  document.querySelector("#style-detail-name").textContent = style.name;
  document.querySelector("#style-detail-desc").textContent = style.description;
  document.querySelector("#style-detail-content").textContent = style.designContent;
  const preview = document.querySelector("#style-detail-preview");
  preview.innerHTML = `<img src="/assets/styles/${style.id}.png" alt="${style.name} 预览" style="width:100%;border-radius:12px;display:block;" />`;
  pendingStyleId = style.id;
  styleDetailDialog.showModal();
}

async function openStyleApplyDialog() {
  targetProjectId = "";
  document.querySelector("#style-apply-name").textContent =
    styleData.find((s) => s.id === pendingStyleId)?.name || "";
  document.querySelector("#style-apply-confirm").disabled = true;
  const list = document.querySelector("#style-apply-project-list");
  list.innerHTML = "";

  let result;
  try {
    result = await api("/api/projects");
  } catch (error) {
    styleDetailDialog.close();
    showToast("获取项目列表失败，请检查服务是否正常", "error");
    return;
  }

  const projects = result.projects || result;
  if (!Array.isArray(projects) || !projects.length) {
    styleDetailDialog.close();
    showToast("还没有项目，请先创建一个项目", "info");
    return;
  }

  projects.forEach((p) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "style-apply-project-item";
    item.innerHTML = `<span>${p.title}</span><span class="style-apply-project-meta">${p.aspectRatio}</span>`;
    item.addEventListener("click", () => {
      list.querySelectorAll(".style-apply-project-item").forEach((b) =>
        b.removeAttribute("aria-selected"));
      item.setAttribute("aria-selected", "true");
      targetProjectId = p.id;
      document.querySelector("#style-apply-confirm").disabled = false;
    });
    list.append(item);
  });

  styleDetailDialog.close();
  styleApplyDialog.showModal();
}

async function applyStyleToProject() {
  if (!targetProjectId || !pendingStyleId) return;
  const style = styleData.find((s) => s.id === pendingStyleId);
  if (!style) return;
  try {
    const blob = new Blob([style.designContent], { type: "text/markdown" });
    const file = new File([blob], "DESIGN.md", { type: "text/markdown" });
    await uploadProjectDesign(targetProjectId, file);
    styleApplyDialog.close();
    navigate(`/?project=${encodeURIComponent(targetProjectId)}`);
  } catch (error) {
    showToast(`应用风格失败：${error.message}`, "error");
  }
}

async function uploadProjectDesignFromContent(projectId, content) {
  const form = new FormData();
  const blob = new Blob([content], { type: "text/markdown" });
  form.append("file", blob, "DESIGN.md");
  return api(`/api/projects/${encodeURIComponent(projectId)}/design`, {
    method: "POST",
    body: form
  });
}

async function cancelGeneration(shot) {
  saveStatus.textContent = "取消生成任务…";
  try {
    const result = await api(
      `/api/generation/tasks/${encodeURIComponent(shot.generationTaskId)}/cancel`,
      { method: "POST", body: JSON.stringify({}) }
    );
    project = result.project;
    saveStatus.textContent = "已取消生成任务";
    renderStoryboard();
  } catch (error) {
    project = await api(`/api/projects/${encodeURIComponent(project.id)}`);
    renderStoryboard();
    if (error.status === 409) {
      saveStatus.textContent = "任务已开始生成";
      showToast("任务已被 Codex 领取，无法取消", "error");
      return;
    }
    saveStatus.textContent = "取消失败";
    showToast(error.message, "error");
  }
}

async function queueGeneration(shotIds, force = false) {
  saveStatus.textContent = "提交生成任务…";
  try {
    await flushSave();
    const result = await api("/api/generation/tasks", {
      method: "POST",
      body: JSON.stringify({ projectId: project.id, shotIds, force })
    });
    project = result.project;
    saveStatus.textContent = result.queued.length > 0
      ? `已提交 ${result.queued.length} 个生成任务`
      : "任务已在队列或生成中";
    renderStoryboard();
  } catch (error) {
    saveStatus.textContent = "提交失败";
    showToast(error.message, "error");
  }
}

async function addShot() {
  project = await api(`/api/projects/${encodeURIComponent(project.id)}/shots`, {
    method: "POST",
    body: JSON.stringify(emptyShot())
  });
  renderStoryboard();
  body.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function startPolling() {
  clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    if (!project || saveStatus.textContent === "保存中…") return;
    try {
      const remote = await api(`/api/projects/${encodeURIComponent(project.id)}`);
      if (remote.updatedAt !== project.updatedAt) {
        project = remote;
        renderStoryboard();
      }
    } catch {
      clearInterval(pollTimer);
      history.replaceState({}, "", "/");
      await showProjectsView();
      showToast("当前项目已在其他窗口中删除", "error");
    }
  }, 1500);
}

renderRatioOptions();
renderCoverPresetOptions();
updateThemeButtons();

themeButtons.forEach((button) => button.addEventListener("click", toggleTheme));
document.querySelector("#create-project").addEventListener("click", () => openProjectDialog("create"));
document.querySelector("#brand-home").addEventListener("click", () => navigate("/"));
document.querySelector("#back-home").addEventListener("click", () => navigate("/"));
document.querySelector("#add-shot-top").addEventListener("click", addShot);
document.querySelector("#present-project").addEventListener("click", openPresenter);
document.querySelector("#copy-storyboard-prompt").addEventListener("click", copyStoryboardPrompt);
scriptDraft.addEventListener("input", () => {
  if (!project) return;
  project.scriptDraft = scriptDraft.value;
  renderScriptPanel();
  queueSave();
});
document.querySelectorAll("[data-project-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    activeProjectTab = button.dataset.projectTab;
    renderStoryboard();
  });
});
document.querySelectorAll("[data-asset-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    activeAssetFilter = button.dataset.assetFilter;
    renderAssetsPanel();
  });
});

projectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = projectNameInput.value.trim();
  if (!title) return projectNameInput.focus();

  if (dialogMode === "create") {
    const aspectRatio = new FormData(projectForm).get("aspectRatio");
    const created = await api("/api/projects", {
      method: "POST",
      body: JSON.stringify({ title, aspectRatio })
    });
    projectDialog.close();
    if (pendingProjectDesign) {
      try {
        await uploadProjectDesign(created.id, pendingProjectDesign);
      } catch (error) {
        navigate(projectPath(created.id));
        showToast(`项目已创建，但视觉规范导入失败：${error.message}`, "error");
        return;
      }
    }
    navigate(projectPath(created.id));
    return;
  }

  await api(`/api/projects/${encodeURIComponent(editingProjectId)}`, {
    method: "PATCH",
    body: JSON.stringify({ title })
  });
  projectDialog.close();
  await loadProjects();
});

document.querySelector("#confirm-delete").addEventListener("click", async (event) => {
  event.preventDefault();
  await api(`/api/projects/${encodeURIComponent(deletingProjectId)}`, { method: "DELETE" });
  deleteDialog.close();
  deletingProjectId = "";
  await loadProjects();
  showToast("项目已永久删除");
});

generateAllButton.addEventListener("click", async () => {
  closeDesignMenu(true);
  const shotIds = project.shots.filter(isBatchGeneratable).map((shot) => shot.id);
  await queueGeneration(shotIds, true);
});

mediaUpload.addEventListener("change", () => uploadMedia(mediaUpload.files?.[0]));
document.querySelector("#choose-project-design").addEventListener("click", () => {
  projectDesignUpload.value = "";
  projectDesignUpload.click();
});
projectDesignUpload.addEventListener("change", () => {
  pendingProjectDesign = projectDesignUpload.files?.[0] || null;
  document.querySelector("#project-design-file-name").textContent =
    pendingProjectDesign ? "已选择 DESIGN.md" : "未选择 DESIGN.md";
});
document.querySelector("#import-design").addEventListener("click", () => {
  closeDesignMenu(true);
  designUpload.value = "";
  designUpload.click();
});
designUpload.addEventListener("change", () => importCurrentDesign(designUpload.files?.[0]));
document.querySelector("#view-design").addEventListener("click", () => {
  closeDesignMenu(true);
  viewCurrentDesign();
});
document.querySelector("#remove-design").addEventListener("click", () => {
  closeDesignMenu(true);
  removeDesignDialog.showModal();
});
document.querySelector("#open-media-folder").addEventListener("click", openMediaFolder);
document.querySelector("#open-cover-panel").addEventListener("click", openCoverPanel);
document.querySelector("#export-markdown").addEventListener("click", () => exportProject("markdown"));
document.querySelector("#export-html").addEventListener("click", () => exportProject("html"));
document.querySelector("#export-word").addEventListener("click", () => exportProject("word"));
document.querySelector("#copy-script").addEventListener("click", () => exportProject("copy"));
document.querySelector("#confirm-remove-design").addEventListener("click", removeCurrentDesign);
designMenu.addEventListener("mouseenter", openDesignMenu);
designMenu.addEventListener("mouseleave", scheduleDesignMenuClose);
designMenuTrigger.addEventListener("click", () => {
  if (designMenuPinned) return closeDesignMenu(true);
  designMenuPinned = true;
  openDesignMenu();
});
document.querySelector("#lightbox-close").addEventListener("click", closeLightbox);
document.querySelector("#lightbox-upload").addEventListener("click", () => {
  if (lightboxShotId) chooseUpload(lightboxShotId);
});
document.querySelector("#presenter-close").addEventListener("click", closePresenter);
document.querySelector("#presenter-prev").addEventListener("click", () => movePresenter(-1));
document.querySelector("#presenter-next").addEventListener("click", () => movePresenter(1));
document.querySelector("#close-cover-panel").addEventListener("click", closeCoverPanel);
document.querySelectorAll("[data-cover-close]").forEach((element) => {
  element.addEventListener("click", closeCoverPanel);
});
document.querySelectorAll("[data-cover-type]").forEach((button) => {
  button.addEventListener("click", () => {
    activeCoverType = button.dataset.coverType;
    renderCoverPanel();
  });
});
coverTitle.addEventListener("input", () => {
  ensureCovers();
  const cover = project.covers[activeCoverType];
  cover.title = coverTitle.value;
  if (!coverUsesCustomPrompt(cover)) {
    cover.prompt = coverPresetByValue(cover.preset).buildPrompt(coverPromptContext());
    coverPrompt.value = cover.prompt;
  }
  queueSave();
});
coverPreset.addEventListener("change", () => applyCoverPreset(coverPreset.value));
coverPrompt.addEventListener("input", () => {
  ensureCovers();
  const cover = project.covers[activeCoverType];
  cover.preset = "custom";
  cover.prompt = coverPrompt.value;
  coverPreset.value = "custom";
  document.querySelector("#generate-cover").textContent =
    coverGenerateLabel(cover);
  document.querySelector("#generate-cover").disabled =
    cover.generationStatus === "processing" ||
    (cover.generationStatus !== "pending" && !canGenerateCover(cover));
  queueSave();
});
document.querySelector("#upload-cover").addEventListener("click", () => {
  coverUpload.value = "";
  coverUpload.click();
});
coverUpload.addEventListener("change", () => uploadCover(coverUpload.files?.[0]));
document.querySelector("#upload-cover-reference").addEventListener("click", () => {
  coverReferenceUpload.value = "";
  coverReferenceUpload.click();
});
coverReferenceUpload.addEventListener("change", () => {
  uploadCoverReference(coverReferenceUpload.files?.[0]);
});
document.querySelector("#delete-cover").addEventListener("click", deleteCover);
document.querySelector("#delete-cover-reference").addEventListener("click", deleteCoverReference);
document.querySelector("#generate-cover").addEventListener("click", () => {
  const cover = project?.covers?.[activeCoverType];
  queueCoverGeneration(cover?.generationStatus === "ready" || cover?.generationStatus === "failed");
});
lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox || event.target === lightboxStage) closeLightbox();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !designMenuPopover.hidden) {
    closeDesignMenu(true);
    designMenuTrigger.focus();
  }
  if (event.key === "Escape" && !lightbox.hidden) closeLightbox();
  if (event.key === "Escape" && !presenter.hidden) closePresenter();
  if (event.key === "ArrowLeft" && !presenter.hidden) movePresenter(-1);
  if (event.key === "ArrowRight" && !presenter.hidden) movePresenter(1);
  if (event.key === "Escape" && !coverPanel.hidden) closeCoverPanel();
  if (event.key === "Tab" && !lightbox.hidden) {
    const controls = [
      document.querySelector("#lightbox-close"),
      document.querySelector("#lightbox-upload")
    ];
    const index = controls.indexOf(document.activeElement);
    event.preventDefault();
    controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length].focus();
  }
});
document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});
document.addEventListener("pointerdown", (event) => {
  if (!designMenuPopover.hidden && !designMenu.contains(event.target)) closeDesignMenu(true);
  if (!activeSelect) return;
  if (activeSelect.menu.contains(event.target) || activeSelect.trigger.contains(event.target)) return;
  closeSelect();
});
window.addEventListener("resize", () => closeSelect());
document.querySelector(".table-shell").addEventListener("scroll", () => closeSelect(), { passive: true });
window.addEventListener("popstate", route);

// ── 风格库事件 ──
document.querySelectorAll("[data-home-tab]").forEach((button) => {
  button.addEventListener("click", () => showHomeTab(button.dataset.homeTab));
});
document.querySelector("#style-apply").addEventListener("click", openStyleApplyDialog);
document.querySelector("#style-apply-confirm").addEventListener("click", applyStyleToProject);

route();
