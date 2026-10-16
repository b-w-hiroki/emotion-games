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

## Remaining work priorities
- P0: small-screen layout and intro regression; finish any existing PR before duplicating.
- P0: separate hero, flame, reflections and illumination. A fixed glow at flame=0 is a defect.
- P0: four visually distinct high-resolution chapter backgrounds, consistent camera and lighting, with separate foreground/midground/VFX.
- P1: animated 15–20s first-play intro, skip and reduced-motion/audio-off behavior.
- P1: finale input consequences (gust, silence, window reply), five distinguishable endings, audio, event variety and replay reasons.
- P2: preserve collection save data on production route migration, Safari/WebKit QA, accessible small screens, performance, social clips and release verification.
- P2: extract the verified workflow into studio-playbook.
- Separate external task: recruit actual players and evaluate understanding/emotions/retry rates. Never claim human evaluation from automated tests.

## Guardrails
- Do not discard changes from `main` via bulk ours/theirs conflict resolution.
- Do not modify existing 20 prototypes except to repair regressions caused by shared code.
- Do not claim complete without playable build, screenshot/video evidence, tests and successful merge.
- Do not repeat already successful checks merely to create activity. Run checks after substantive changes.
- If an agent cannot continue in the background, say so; this document does not itself launch a worker.
