# CLAUDE.md

## Working principles

### Think Before Coding
Before touching any file, state the problem and the intended fix in one sentence. If you cannot, stop and ask. Read every file you intend to change before changing it. Understand why the current code is written the way it is — delete nothing without knowing what it does.

### Simplicity First
Prefer the shortest correct solution. No abstractions that serve only one call site. No helpers for hypothetical future use. No extra config, flags, or options beyond what the task requires. Three similar lines of code beats a premature utility function. When two approaches work, pick the one with fewer moving parts.

### Surgical Changes
Change only what the task requires. Do not reformat, rename, or refactor surrounding code. Do not add comments, docstrings, or type annotations to code you did not touch. Do not introduce new dependencies unless the task is impossible without them — and confirm with the user first.

### Goal-Driven Execution
Work toward the stated goal, not a gold-plated version of it. Verify the change achieves the goal before reporting done. For UI work, open the dev server and exercise the feature manually — type checking alone is not acceptance. If the goal is unclear, ask before writing a line.

---

## Things to avoid

- Mocking internals in tests when integration tests are feasible.
- Force-pushing or destructive git operations without explicit user confirmation.
- Committing without being asked.
- Adding error handling, fallbacks, or validation for scenarios that cannot happen.
- Backwards-compatibility shims for code that has no external consumers.
