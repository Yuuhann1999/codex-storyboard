# MiniMax video provider TDD evidence

## Source

Journeys were derived from the product interview in the implementation thread.

## User journeys

- A creator can choose MiniMax Hailuo 2.3 at project level and override it per shot.
- A creator can use text-only or first-frame video generation while retaining shared style and character context.
- Codex can resume a submitted vendor task without spending quota on a duplicate submission.
- Unsupported duration and resolution combinations are rejected locally.

## Evidence

| Guarantee | Test | Type | Result |
|---|---|---|---|
| Hailuo exposes text and first-frame modes with valid durations | `test/video-models.test.mjs` | Unit | PASS |
| 1080P is normalized to 6 seconds | `test/video-models.test.mjs` | Unit | PASS |
| Project style and character descriptions are merged into the shot prompt | `test/video-models.test.mjs` | Unit | PASS |
| MiniMax uses bearer auth and the documented request shape | `test/minimax-provider.test.mjs` | Unit | PASS |
| Existing vendor task IDs resume without a second submission | `test/minimax-provider.test.mjs` | Unit | PASS |
| Temporary errors retry while quota and parameter errors stop | `test/minimax-provider.test.mjs` | Unit | PASS |
| Queued API tasks inherit model settings and effective prompt context | `test/server-generation-api.test.mjs` | Integration | PASS |
| Settings dialog, API-video selector, model inheritance and duration snapping render correctly | In-app browser against local server | E2E | PASS |

## RED/GREEN checkpoints

- RED: `npm test` failed because `lib/video-models.mjs` and `lib/providers/minimax-video.mjs` did not exist.
- GREEN: `npm test` passed all provider, model capability, and server integration tests after implementation.

## Known gap

No paid MiniMax request was issued because the Token Plan Key was not provided to the process. The transport is covered with mocked API responses; one real 6-second generation remains the final credential-gated smoke test.

Coverage command: `npm run test:coverage` — 99.48% lines, 81.94% branches, 94.44% functions across the provider modules.
