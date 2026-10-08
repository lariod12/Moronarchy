# Project Agent Instructions

## Default Workflow

Use the normal Codex workflow for this repository. The main assistant should read the relevant code, make scoped changes directly, run useful checks, and summarize the result.

## Subagents

- Do not spawn subagents by default.
- Use subagents only when the user explicitly asks for them or when a task is large enough that parallel investigation would clearly help.
- For ordinary code, test, script, documentation, and configuration work, keep the work in the main thread.

## GitNexus

- GitNexus is not required for this project.
- Do not run GitNexus checks during normal work.
- Do not add GitNexus dependencies, generated files, or workflow requirements unless the user explicitly asks for GitNexus again.

## Development Baseline

- Follow existing project docs, code style, and local patterns.
- Keep changes scoped to the request.
- Prefer simple, direct implementations over new abstractions.
- Preserve public behavior unless the requested change intentionally updates it.
- Run the narrowest useful test, lint, typecheck, or build command for the touched area.
- Do not commit secrets, environment files, tokens, private keys, credentials, or personal data.

## UI Completion Gate

These rules are mandatory for tasks that change interaction, visible state, DOM structure, responsive behavior, animation, or browser workflow in `apps/web`.

Before implementation:

- Write a task contract with Goal, Change Classification, Expected Results, Interaction Steps, and Test Workflow.
- Every Expected Result must be observable and mapped to logic/state, UI/DOM, browser interaction, visual review, or an explicit human decision.

Before claiming completion:

- Add or update gallery entries in `apps/web/src/dev/gallery/` and assertions in `tests/ui/` when the task introduces or changes an interaction or visible state.
- Add or update Vitest unit tests for new components and pure logic.
- Run quick smoke checks for the touched area only: targeted Vitest unit tests, typecheck, and lint (`pnpm --filter <package> test|typecheck|lint`, `pnpm lint:ui` / `pnpm typecheck:ui` when `tests/` changed). Rebuild `pnpm build:solo` when the owner reviews through the single-file prototype.
- Do NOT run `pnpm ui:check` or `pnpm e2e` (the Playwright suites take 10+ minutes). Run them only when the user explicitly asks. Report them as "not run (owner preference)".
- Report Expected vs Actual for every Expected Result, the exact checks run, and anything not verified, plus a short list of what the user should try in the browser to verify the change.
- Browser behaviour is verified by the user. Only the user may approve visual quality, UX feel, touch behavior on a real device, or move a frame to `Approved`.

When the user asks for the full browser gate: `cmd /c pnpm ui:check` (gallery, zero exit code required), `cmd /c pnpm ui:check:headed` for visible review, and `E2E_WEB_PORT=5190 E2E_SERVER_PORT=8010 cmd /c pnpm e2e` (port 5173 is often used by another project on this machine). To test on a phone, run `pnpm dev:web` (Vite listens on `0.0.0.0:5173`) and open `http://<LAN-IP>:5173/dev/gallery` or `/solo`.

## Reporting

Final responses should briefly include:

- changed files
- behavior or workflow changed
- checks run and whether they passed
- any remaining risks or follow-up notes
