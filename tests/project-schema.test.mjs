import assert from "node:assert/strict";
import test from "node:test";
import {
  SCHEMA_VERSION,
  createEmptyProject,
  validateProject
} from "../plugins/storyboard-workbench/app/lib/project-schema.mjs";

test("creates a phase-1 project with stable workflow fields", () => {
  const project = createEmptyProject({ title: "萌宝短片", aspectRatio: "9:16" });
  assert.equal(SCHEMA_VERSION, 1);
  assert.match(project.projectId, /^[0-9a-f-]{36}$/);
  assert.equal(project.title, "萌宝短片");
  assert.equal(project.aspectRatio, "9:16");
  assert.equal(project.stage, "brief");
  assert.deepEqual(project.current, {
    referenceAnalysisVersion: null,
    adaptationBriefVersion: null,
    scriptVersion: null,
    handoffId: null
  });
  assert.deepEqual(project.approvals, {
    referenceAnalysis: null,
    script: null,
    project: null
  });
  assert.deepEqual(project.shots, []);
  assert.equal(validateProject(project).valid, true);
});

test("rejects unsupported schema, stage, ratio, and missing project id", () => {
  const project = createEmptyProject({ title: "Test", aspectRatio: "16:9" });
  const invalid = {
    ...project,
    schemaVersion: 99,
    projectId: "",
    stage: "generated",
    aspectRatio: "2:1"
  };
  const result = validateProject(invalid);
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    "schemaVersion must equal 1",
    "projectId must be a UUID",
    "aspectRatio is unsupported: 2:1",
    "stage is unsupported: generated"
  ]);
});
