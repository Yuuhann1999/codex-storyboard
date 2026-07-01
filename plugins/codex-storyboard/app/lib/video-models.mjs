const modelCatalog = Object.freeze({
  minimax: Object.freeze({
    "MiniMax-Hailuo-2.3": Object.freeze({
      label: "MiniMax Hailuo 2.3",
      durations: Object.freeze([6, 10]),
      durationsByResolution: Object.freeze({
        "768P": Object.freeze([6, 10]),
        "1080P": Object.freeze([6])
      }),
      modes: Object.freeze(["text", "first-frame"]),
      resolutions: Object.freeze(["768P", "1080P"]),
      defaultResolution: "768P"
    })
  })
});

export const defaultGenerationSettings = Object.freeze({
  provider: "minimax",
  model: "MiniMax-Hailuo-2.3",
  duration: 6,
  resolution: "768P"
});

export function listVideoModels() {
  return Object.entries(modelCatalog).flatMap(([provider, models]) =>
    Object.entries(models).map(([model, capabilities]) => ({
      provider,
      model,
      ...capabilities
    }))
  );
}

export function getModelCapabilities(provider, model) {
  return modelCatalog[provider]?.[model] || null;
}

export function getAllowedDurations(provider, model, resolution) {
  const capabilities = getModelCapabilities(provider, model);
  if (!capabilities) return [];
  return capabilities.durationsByResolution?.[resolution] || capabilities.durations;
}

export function normalizeGenerationSettings(value = {}) {
  const requestedProvider = String(value.provider || defaultGenerationSettings.provider);
  const requestedModel = String(value.model || defaultGenerationSettings.model);
  const known = getModelCapabilities(requestedProvider, requestedModel);
  const provider = known ? requestedProvider : defaultGenerationSettings.provider;
  const model = known ? requestedModel : defaultGenerationSettings.model;
  const capabilities = getModelCapabilities(provider, model);
  const resolution = capabilities.resolutions.includes(value.resolution)
    ? value.resolution
    : capabilities.defaultResolution;
  const allowedDurations = getAllowedDurations(provider, model, resolution);
  const duration = allowedDurations.includes(Number(value.duration))
    ? Number(value.duration)
    : allowedDurations[0];
  return { provider, model, duration, resolution };
}

export function resolveShotModel(project = {}, shot = {}) {
  const projectSettings = normalizeGenerationSettings(project.generation);
  const provider = String(shot.provider || "");
  const model = String(shot.model || "");
  if (provider && model && getModelCapabilities(provider, model)) return { provider, model };
  return {
    provider: projectSettings.provider,
    model: projectSettings.model
  };
}

export function buildGenerationPrompt({ stylePrompt, characterPrompt, shotPrompt } = {}) {
  return [
    stylePrompt && `统一视觉风格：${String(stylePrompt).trim()}`,
    characterPrompt && `主角固定设定：${String(characterPrompt).trim()}`,
    shotPrompt && `本镜头：${String(shotPrompt).trim()}`
  ].filter(Boolean).join("\n");
}
