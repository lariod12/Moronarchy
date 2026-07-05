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

## Reporting

Final responses should briefly include:

- changed files
- behavior or workflow changed
- checks run and whether they passed
- any remaining risks or follow-up notes
