# Antigravity Agent Rules - LedgerAlpha

These rules govern code standards, testing, documentation, and processes for the LedgerAlpha workspace. Antigravity must follow these rules at all times.

---

## 1. Code Documentation Standards
We enforce a strict documentation policy to maintain code clarity and support AI-native development:
- **File-Level Header**: Every new or heavily modified code file must begin with a docstring comment describing the purpose of the file, its dependencies, and its position in the architecture.
- **Function/Method JSDoc**: Every function, method, and hook must have a JSDoc/TSDoc block detailing:
  - What the function does.
  - Expected parameters (`@param`) with descriptions.
  - Return values (`@returns`) and types.
- **Inline Logic Comments**: Any complex logic (especially in `lib/accounting/` and `lib/scoring/`) must contain clear inline comments explaining *why* the mathematical calculation is done that way, not just *what* the code does.

---

## 2. Testing Regime
- All accounting formulas, FIFO lot manipulations, and pool unit pricing models must be fully unit tested using **Vitest**.
- **Rule**: Before completing a task, execute the unit test suite (`npm test`). If code modifications affect accounting math, new tests must be written or existing tests updated to prevent regressions.
- All code changes must keep tests passing.

---

## 3. Linting and Quality Checks
- Execute ESLint (`npm run lint`) to maintain consistent styling and catch basic syntax or variable errors.
- Do not bypass lint errors; correct them immediately.

---

## 4. Documentation Lifecycle ("As-Built" Specs)
- The documentation in the `docs/` directory is treated as **as-built documentation** (the repository's source of architectural truth).
- **Rule**: If a feature is modified, added, or deleted, you MUST update the corresponding specification file under `docs/` (e.g. `docs/prd/02_accounting_model.md` or `docs/prd/03_data_model.md`) in the same turn.

---

## 5. Prompts and Templates
- We maintain standardized prompts under `docs/prompts/` and templates under `docs/templates/`, as well as GitHub issue templates under `docs/github_issues/`.
- **Rule**: Before starting a major subtask (such as writing an implementation plan, creating a PR, or performing a code refactor), check if a prompt or template file exists in these folders and follow its instructions/format.


---

## 6. Git Commit Hygiene
- **Rule**: Make frequent, atomic commits. Do not bundle multiple unrelated features, refactors, or fixes into a single massive commit. Commit after completing each logical sub-step or fixing a specific bug.

---

## 7. Command Simplicity & Automation
- **Rule**: Avoid running excessively complex, chained, or registry-dependent shell command strings (e.g. querying registry values to alter paths). Instead, use standard scripts, simple PATH prepends (e.g. `$env:Path = "C:\Program Files\nodejs;" + $env:Path`), npm scripts, or the provided [Makefile](file:///c:/Users/omar_/Desktop/Porfolio%20Tracker/Makefile) commands to execute repeatable development tasks.


