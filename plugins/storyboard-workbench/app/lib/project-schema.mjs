import { randomUUID } from "node:crypto";

export const SCHEMA_VERSION = 1;
export const ASPECT_RATIOS = Object.freeze(["9:16", "16:9", "3:4", "4:3", "1:1"]);
export const PROJECT_STAGES = Object.freeze([
  "brief",
  "reference_analyzed",
  "script_approved",
  "storyboard_in_progress",
  "shots_approved",
  "ready_for_handoff"
]);

export function createEmptyProject({
  title,
  aspectRatio,
  now = new Date().toISOString()
}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    projectId: randomUUID(),
    title: String(title || "未命名项目").trim() || "未命名项目",
    aspectRatio,
    stage: "brief",
    createdAt: now,
    updatedAt: now,
    current: {
      referenceAnalysisVersion: null,
      adaptationBriefVersion: null,
      scriptVersion: null,
      handoffId: null
    },
    approvals: {
      referenceAnalysis: null,
      script: null,
      project: null
    },
    shots: [],
    integrity: { status: "unchecked", checkedAt: null, errors: [] }
  };
}

export function validateProject(project) {
  const errors = [];
  if (project?.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`schemaVersion must equal ${SCHEMA_VERSION}`);
  }
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      project?.projectId || ""
    )
  ) {
    errors.push("projectId must be a UUID");
  }
  if (!ASPECT_RATIOS.includes(project?.aspectRatio)) {
    errors.push(`aspectRatio is unsupported: ${project?.aspectRatio}`);
  }
  if (!PROJECT_STAGES.includes(project?.stage)) {
    errors.push(`stage is unsupported: ${project?.stage}`);
  }
  if (!Array.isArray(project?.shots)) errors.push("shots must be an array");
  return { valid: errors.length === 0, errors };
}
