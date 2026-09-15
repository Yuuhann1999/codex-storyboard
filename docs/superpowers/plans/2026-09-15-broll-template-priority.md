# B-roll Template Priority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `plan_broll_motion` explicitly and consistently prioritize reusable templates and media from the two required open-source repositories, using adaptation only when reuse is unsuitable and avoiding scratch-built motion systems.

**Architecture:** Keep one canonical policy string in the MCP wrapper so tool metadata and initialization instructions describe the same behavior. Mirror the policy into the development process skill and the active installed plugin cache, while preserving the existing confirmation gate and repository requirements.

**Tech Stack:** Node.js ESM MCP server, Markdown skill instructions, Node test runner, Git.

---

### Task 1: Define and apply the canonical B-roll reuse policy

**Files:**
- Modify: `plugins/codex-storyboard/mcp/server.mjs`
- Mirror: `C:/Users/41232/.codex/plugins/cache/codex-storyboard/codex-storyboard/0.6.7+codex.20260914224348/mcp/server.mjs`

- [x] **Step 1: Add a reusable policy constant next to the required repository list.**

The policy must state the priority order: reuse an existing template/component/media from either required repository; adapt the closest existing skeleton if direct reuse is unsuitable; create a new motion system only after recording why both repositories and local templates do not fit. It must also require the selected source path and adaptation reason in the plan.

- [x] **Step 2: Include the policy in `plan_broll_motion` tool metadata and MCP initialization instructions.**

Keep the existing approval gate and required repository URLs intact. Use the same constant in both locations so future prompt changes cannot drift between the tool description and server instructions.

- [x] **Step 3: Preserve the policy in the persisted plan context.**

Add the policy text to the plan's research notes/context when no caller-provided note exists, without changing task IDs, shot data, or media behavior.

### Task 2: Update the development processing skill

**Files:**
- Modify: `plugins/codex-storyboard/skills/process-storyboard-tasks/SKILL.md`
- Mirror: `C:/Users/41232/.codex/plugins/cache/codex-storyboard/codex-storyboard/0.6.7+codex.20260914224348/skills/process-storyboard-tasks/SKILL.md`

- [x] **Step 1: Strengthen the mandatory B-roll research sequence.**

Require the worker to identify a concrete reusable template/component/media candidate from each repository before drafting a bespoke composition, then choose direct reuse or the closest adaptation and record the source path.

- [x] **Step 2: Add a no-scratch-build guardrail and evidence requirement.**

Require an explicit mismatch explanation before any new structure is introduced; require `selectedTemplate`, `motionSkeleton`, `sources`, and `researchNotes` to name the reused/adapted repository material and the minimal changes.

### Task 3: Verify parity and publish

**Files:**
- Test: `tests/plugin-parity.test.mjs`
- Modify only if needed: `docs/superpowers/plans/2026-09-15-broll-template-priority.md`

- [x] **Step 1: Run focused static checks for policy presence and mirrored file parity.**

Confirm the development MCP file and active cache MCP file are byte-for-byte identical, and do the same for the process skill files. Confirm both repository URLs and the no-scratch-build wording are present in each copy.

- [x] **Step 2: Run the repository test suite.**

Run `npm test`; expected result is exit code 0 with all tests passing.

- [x] **Step 3: Review the diff and commit only the development source and plan.**

Do not stage `.storyboard-runtime-cache/` or any generated media. Commit with message `feat: prioritize reusable broll templates`.

- [x] **Step 4: Push the commit to `origin` and verify the remote head.**

Push the current branch, then compare the local and remote commit IDs to confirm the requested publication completed.
