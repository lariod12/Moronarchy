# Project Agent Instructions

## Subagent Orchestration Preference

Use this workflow for code, test, script, and configuration tasks in this repository unless the user explicitly overrides it.

### Controller Role

- The main assistant stays as controller, architect, and reviewer.
- Before delegating implementation, the controller should classify the task, read the relevant repo context, and define the intended code shape.
- The controller should not hand off vague work. Each subagent prompt must include the implementation overview, file ownership, constraints, acceptance criteria, and tests/checks to run.

### Model Selection

- For trivial or very small edits, delegate the edit to a subagent using `gpt-5.4-mini` when the subagent tool supports model overrides.
- For simple or substantial implementation work, delegate edits to a subagent using `gpt-5.4` when the subagent tool supports model overrides.
- For testing and verification, always delegate to a tester subagent. Use `gpt-5.4-mini` for small/trivial checks and `gpt-5.4` for broader or riskier verification.
- If subagent tools or requested model overrides are unavailable, state the limitation and use the closest available workflow.

### Delegation Prompt Requirements

Every coding subagent prompt should describe:

- the overall code approach the controller wants followed
- files or modules the subagent may read
- files or modules the subagent may modify
- expected structure, data flow, APIs, components, or function shapes
- constraints and files/modules that must not be changed
- acceptance criteria
- tests, lint, typecheck, build, or manual checks to run
- final report format with changed files, behavior changed, checks run, and residual concerns

### Review Loop

- The controller reviews subagent changes before finalizing.
- Review should check file structure, module boundaries, repo conventions, implementation scope, and test results.
- If the implementation is not aligned, the controller should send specific feedback back to a subagent for revision instead of silently rewriting the work locally.
- The final response should summarize changed files, behavior changed, checks run, pass/fail results, and remaining risks.
