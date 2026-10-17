# AI development instructions — emotion-games

## Objective
Complete **004 きえないで。** to release quality before expanding the 20-game catalog. Treat the latest `main`, open PRs, and CI as source of truth; use Issue #29 as the consolidated backlog and Issues #22, #23, #27, #31 as detail. Do not reimplement completed work.

## Execution loop (for a continuously running coding agent)
1. Read `main`, open PRs, failing workflows and linked issues. Reconcile any in-flight branches before selecting work.
2. Select the highest-impact **uncompleted acceptance criterion**, not a tiny cosmetic change. Prefer implementation over updating management documents.
3. Make a focused code/asset change on a branch, with meaningful tests. Do not weaken or skip failing tests.
4. Run `npm run verify`, `node scripts/capture-social.mjs`, `node scripts/qa-endings.mjs`, and applicable visual QA. Test 390×844 and 360×640; check WebKit where available.
5. Inspect screenshots and logs, fix root causes, open/update one PR for the feature, wait for CI to finish, merge only when required checks pass and output has been reviewed.
6. Repeat with the next criterion. Record evidence in the PR. Update Issues only when their actual status changes.
7. If blocked by permissions, missing secrets, unavailable real devices, or human playtest recruitment, document the exact blocker and an executable next action. Continue with independent work instead of polling or repeatedly reporting the same status.

## Latest baseline (synced 2026-10-17)

The following are already merged and must not be reimplemented:
- PR #41: painted character states, room prologue, chapter overlays, five flame expressions, eight gameplay poses, five ending poses.
- PR #42: immersive full-screen layout and touch-first controls.
- PR #43: layered snowfall, wind streaks, breath, embers, frost and chapter grading.
- PR #44: restrained handmade art direction and frost overlay.
- PR #45: repaint of eight gameplay poses and five endings in a consistent gouache style; transparent source masters and runtime WebP pipeline.
- PR #46: transparent neutral hero master, hand/neutral masks, dawn lighting and runtime bitmap optimization.
- PR #47: thumb control deck and synchronized chapter/blizzard transitions.
- PR #48: removal of ghost frames and smoother pose changes.
- PR #49: ending-specific explanations, actual-state recap, and ending regression coverage.
- PR #36: this agent runbook.

PR #49's head checks were green: Verify/deploy and Browser QA/social captures. Its reported coverage includes 60 tests, 21 pages, Chromium at 390x844 and 360x640, all five ending routes, sound, keyboard, intro/reduced motion, and about 50fps. Treat this as the latest known evidence, not proof of physical-device or human-playtest completion.

## Remaining work priorities — reconcile against Issue #29 before coding

1. **P0 — close real gameplay gaps:** verify that the late-game gust, player input, silence, window response and ending outcomes are causally linked; add deterministic tests and browser evidence for each relevant state. Do not just restyle text.
2. **P1 — audio completeness:** inspect actual implementation for flame/wind/breath/silence/rescue mixing, mute persistence, user-gesture restrictions, and WebKit behavior. Add tests for audio-off and reduced-motion. Do not claim Safari support from Chromium-only runs.
3. **P1 — chapter art acceptance:** the painted source/runtime pipeline exists. Review current screenshots/contact sheets and source assets; only repaint a scene if there is a concrete visible defect or a missing required state. Do not recreate backgrounds that are already integrated.
4. **P1 — save/data migration:** test legacy collection and ending data through the production `/kienaide/` route, including first run, upgrade and repeat play. Preserve old keys and prove no data loss.
5. **P1 — final cross-browser and viewport gate:** run `npm run verify`, `node scripts/qa-endings.mjs`, `node scripts/capture-social.mjs`, and `node scripts/qa-kienaide-visual.mjs chromium` plus `webkit` where the runner supports it. Inspect screenshots at 390x844 and 360x640; include landscape, keyboard, sound off, reduced motion, intro skip/replay, four chapters, shield/held state and all five endings. Do not lower thresholds to get green.
6. **P2 — social assets:** verify 6–12 second clips show a clear hook and route to the playable game. Reuse the existing capture pipeline; do not regenerate the entire catalog unless the outputs are missing or invalid.
7. **P2 — studio-playbook:** extract the verified reusable production/QA process only after the game-specific workflow passes.
8. **External human study (separate, not a technical blocker):** recruit players and record first-play comprehension, perceived tension/relief/surprise, completion and retry intent. Automation cannot substitute for this.

Issue #29 is older than PRs #41–#49 and has stale checkboxes. Use current main and merged PR evidence as source of truth; update the issue only when the underlying acceptance criterion has been verified. Keep new-game production paused.

## Guardrails
- Do not discard changes from `main` via bulk ours/theirs conflict resolution.
- Do not modify existing 20 prototypes except to repair regressions caused by shared code.
- Do not claim complete without playable build, screenshot/video evidence, tests and successful merge.
- Do not repeat already successful checks merely to create activity. Run checks after substantive changes.
- If an agent cannot continue in the background, say so; this document does not itself launch a worker.
