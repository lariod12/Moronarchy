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

## Interactive Design Completion Gate

These rules are mandatory for tasks that change interaction, visible state, DOM structure, responsive behavior, animation, or browser workflow in `design/`.

Before implementation:

- Write a task contract with Goal, Change Classification, Expected Results, Interaction Steps, and Test Workflow.
- Every Expected Result must be observable and mapped to logic/state, UI/DOM, browser interaction, visual review, or an explicit human decision.

Before claiming completion:

- Add or update assertions in `tests/design/` when the task introduces or changes an interaction or visible state.
- Run `cmd /c pnpm design:check` and require a zero exit code.
- Report Expected vs Actual for every Expected Result, the exact checks run, console/page error count, and anything not verified.
- A skipped or unavailable browser check means the interactive task is not verified; report the blocker instead of claiming completion.
- AI may report `Automated Verified` after executable checks pass. Only the user may approve subjective visual quality, UX feel, touch behavior on a real device, or move a frame to `Approved`.

`design:check` is the minimum automated gate. Use `cmd /c pnpm design:check:headed` or `cmd /c pnpm design:mobile` for visible/manual review when layout, animation, touch, scroll, or viewport behavior changes.

## Reporting

Final responses should briefly include:

- changed files
- behavior or workflow changed
- checks run and whether they passed
- any remaining risks or follow-up notes
