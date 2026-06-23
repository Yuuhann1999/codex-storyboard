const projectsView = document.querySelector("#projects-view");
const storyboardView = document.querySelector("#storyboard-view");
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
const toast = document.querySelector("#toast");
const themeButtons = document.querySelectorAll("[data-theme-toggle]");
const themeStorageKey = "codex-storyboard-theme";

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
  project = null;
  projectsView.hidden = false;
  storyboardView.hidden = true;
  document.querySelector("#home-actions").hidden = false;
  document.querySelector("#storyboard-actions").hidden = true;
  document.title = "Codex 分镜台";
  return loadProjects();
}

function showStoryboardView(projectId) {
  projectsView.hidden = true;
  storyboardView.hidden = false;
  document.querySelector("#home-actions").hidden = true;
  document.querySelector("#storyboard-actions").hidden = false;
  return loadProject(projectId);
}

function route() {
  const projectId = currentProjectId();
  return projectId ? showStoryboardView(projectId) : showProjectsView();
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

function openLightbox(shot, index) {
  lightboxShotId = shot.id;
  lightboxStage.replaceChildren();
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
  document.body.classList.remove("lightbox-open");
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
  menu.style.width = `${Math.max(rect.width, 150)}px`;
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
  document.title = `${project.title} · Codex 分镜台`;
  document.querySelector("#project-title").textContent = project.title;
  document.querySelector("#project-ratio").textContent = project.aspectRatio;
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
        if (changedField === "generator" || changedField === "mediaType") renderStoryboard();
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
}

function renderDesignState() {
  const hasDesign = Boolean(project?.hasDesign);
  designMenu.dataset.active = String(hasDesign);
  document.querySelector("#design-status").textContent =
    hasDesign ? "已配置视觉规范" : "无视觉规范";
  document.querySelector("#design-description").textContent = hasDesign
    ? "生成素材时自动应用"
    : "生成素材时不应用统一视觉规范";
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
updateThemeButtons();

themeButtons.forEach((button) => button.addEventListener("click", toggleTheme));
document.querySelector("#create-project").addEventListener("click", () => openProjectDialog("create"));
document.querySelector("#brand-home").addEventListener("click", () => navigate("/"));
document.querySelector("#back-home").addEventListener("click", () => navigate("/"));
document.querySelector("#add-shot-top").addEventListener("click", addShot);
document.querySelector("#add-shot-bottom").addEventListener("click", addShot);

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
lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox || event.target === lightboxStage) closeLightbox();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !designMenuPopover.hidden) {
    closeDesignMenu(true);
    designMenuTrigger.focus();
  }
  if (event.key === "Escape" && !lightbox.hidden) closeLightbox();
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

route();
