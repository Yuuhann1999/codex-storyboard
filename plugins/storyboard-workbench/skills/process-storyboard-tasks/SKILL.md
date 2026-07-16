---
name: process-storyboard-tasks
description: Process pending Codex Storyboard image and video generation tasks. Use when the user asks to generate storyboard assets, process the storyboard queue, generate all shots, generate a specific storyboard row, or return Image Generation, HyperFrames, or Remotion outputs to the local storyboard.
---

# Process Codex Storyboard Tasks

Process the local storyboard queue. The MCP tools start the bundled local app automatically when needed and default to `http://127.0.0.1:43218`.

If the current Codex session does not expose Storyboard MCP tools such as `list_storyboard_generation_tasks`, `claim_storyboard_generation_task`, or `complete_storyboard_generation_task`, first use `tool_search` to search for `codex storyboard` and load the deferred tools. Only if `tool_search` is unavailable or cannot find them, tell the user to start a new Codex conversation or restart Codex so plugin tools are reloaded.

## Workflow

1. Call `list_storyboard_generation_tasks` with status `pending`.
2. Inspect the generators used by the pending tasks and verify the matching local capabilities before claiming anything:

   - `image-gen` requires the built-in `imagegen` skill and image generation tool.
   - `hyperframes` requires the HyperFrames and HyperFrames CLI skills.
   - `remotion` requires the Remotion skill and its local rendering toolchain.

   If a required capability is unavailable, do not claim affected tasks. Report the exact missing capability and continue with tasks whose generators are available.

3. Probe the local environment with read-only checks before deciding to install anything:

   - Check Node.js, npm, and pnpm availability and versions.
   - Check whether the task `outputDir`, active workspace, or chosen render directory already has `package.json`, a lockfile, and `node_modules`.
   - Check for local CLIs with existing project commands such as `pnpm exec ...`, `npm run ...`, or executable files under `node_modules/.bin`.
   - Check for global CLIs only with non-installing commands such as `command -v`, `where`, or direct `--version` after the command is found.
   - Check whether Chromium, FFmpeg, or tool-specific render caches already exist when the selected renderer needs them.

   Do not use commands that can implicitly download packages as probes. Do not run `npx remotion`, `pnpm dlx`, or package-manager `exec` forms that will install missing packages merely to test availability.

4. Prefer existing render environments. Use local project dependencies first, then compatible global CLIs. Install only when a required tool is missing, incompatible, or no local dependency set exists. Any install must be explicit and must go into the task `outputDir` or a dedicated renderer cache, not into the user's unrelated project.
5. Process available tasks one at a time.
6. Before generating, call `claim_storyboard_generation_task`.
7. If the claimed task has `hasDesign: true`, read the complete Markdown file at the exact absolute `designPath` before generating anything. Apply it as the project-wide visual system:

   - `visualPrompt` defines the concrete shot subject and requested content.
   - `DESIGN.md` defines shared visual style, color, typography, composition, texture, and motion language.
   - An explicit shot requirement takes precedence if it conflicts with the general visual system.

8. Route by `generator`:

   - `image-gen`: use the built-in `imagegen` skill and built-in image generation tool. Treat `visualPrompt` as the primary prompt and honor the task's `aspectRatio`. If the task includes `referenceImagePath`, use that local image as the visual reference/input for the generation or edit. Copy the final verified image into the active workspace before completing the task.
   - `hyperframes`: use the HyperFrames and HyperFrames CLI skills. Create a self-contained composition using the task's `width`, `height`, duration, and `visualPrompt`, then lint, inspect, render to MP4, and verify the output.
   - `remotion`: use the Remotion skill. Create or reuse a Remotion composition using the task's `width` and `height`, render an MP4 matching the task duration, and verify the output.

9. Technically verify each generated video before completion: the file exists, is readable, has the requested `width` and `height`, has a duration close to the task duration, and has a valid video stream/codec. Then visually inspect representative frames to ensure the render is not blank, black, or the wrong composition.
10. Call `complete_storyboard_generation_task` with the exact absolute output path and correct media type.
11. If generation or verification fails, call `fail_storyboard_generation_task` with the concise cause.
12. Continue until no processable pending tasks remain.

## Output locations

Use the exact absolute `outputDir` supplied by the task. Keep all generated source code, intermediate files, and final outputs for that task inside this directory. The MCP completion tool copies the final image or video into the storyboard media directory.

## Guardrails

- Do not mark a task complete until the exact local file has been visually or technically verified.
- Do not silently switch a requested HyperFrames task to Remotion, or vice versa.
- Do not use external API keys for Image Generation when the built-in image tool is available.
- Do not process `manual` generator rows.
- Preserve the requested duration for video tasks.
- Preserve `projectId`, `aspectRatio`, `width`, and `height`; never return an asset to a different project.
- Never guess, truncate, or partially read `DESIGN.md` when `hasDesign` is true.
- Do not apply a DESIGN.md from the active workspace or another project; only use the task's exact `designPath`.
- Do not write video project files outside the task's exact `outputDir`.
