# <Plan Title>

**Filename**: YYYYMMDD-short-description.md (e.g., 20260204-entity-list-dead-code-cleanup.md)
**Created**: YYYY-MM-DD
**Updated**: YYYY-MM-DD
**Status**: Planning | Ready | In Progress | Done
**Owner**: <name or team>
**Related**: <links to related plans/docs>
**GitHub Issues**: <list issue numbers this plan addresses, e.g., #98, #102, #105>

## Goal
<1-3 sentences describing the user-facing outcome>

## Scope
**In scope**
- <item>
- <item>

**Out of scope** (optional; include when it helps clarify boundaries)
- <item> → Explicitly excluded, rationale: <reason> (follow-up: <plan-name.md> if needed)
- <item> → Explicitly excluded, rationale: <reason>

**⚠️ For execution-ready plans, verify "Out of scope" items are true exclusions and not required to meet the goal or success criteria**

---

## Current State / Problem
<brief description of what exists and what is missing>

**Existing components/APIs**:
- ✅ <component/API> at <file-path> (line X) - confirmed working
- ⚠️ <component/API> at <file-path> - needs modification
- ❌ <missing component> - needs creation

---

## Research & Verification ✅
**Completion date**: YYYY-MM-DD
**Method**: <curl tests, file reads, Glob verification, etc.>

**Key findings**:
- ✅ <finding> (verified: method, date)
- ✅ <finding> (verified: method, date)

**Type alignment verified**:
- ✅ Frontend <Interface> matches backend schema (checked: file paths, line numbers)
- ✅ Parameter names consistent: <list>

**Open questions**: NONE ✅
<All research must be complete before plan is execution-ready>

---

## As-Built Documentation Impact
- **Affected area docs**: <list docs/current/<area>.md files, or "None">
- **Requirement IDs impacted**: <list IDs, or "None">
- **Traceability updates required**:
  - [ ] Requirement entries updated in area doc(s)
  - [ ] Test matrix updated for changed/new behavior
  - [ ] `docs/current/traceability-matrix.md` updated (required if adding a new area doc)

---

## Decisions / Assumptions
- <decision with rationale> (date, author)
- <decision with rationale> (date, author)

**Scope decisions that require explicit user choice** (REQUIRED when any decision branch exists)
- Decision point: <what requires user choice>
- Options: <option A>, <option B>, <option C>
- Selected option: <exact choice>
- Decision source: <link/message/date showing explicit user decision>
- Decision date: YYYY-MM-DD
- Task alignment: <phase/task IDs that implement selected option end-to-end>

**Execution readiness rule for scope decisions**:
- Plans that include phrases like "flag for user decision", "defer", "optional", or unresolved branches are **NOT execution-ready** until the selected option, explicit decision source, and task alignment are documented.

**Alternatives considered & rejected**:
- Option A: <description> - Rejected because: <reason>
- Option B: <description> - Rejected because: <reason>
- **Selected**: Option C because: <rationale>

---

## Architecture / Data Impact

**Data model**
- <schema/type changes>
- BREAKING CHANGES: <list or "None">

**API**
- <endpoint/payload changes>
- BREAKING CHANGES: <list or "None">

**Frontend**
- <component/page changes>
- BREAKING CHANGES: <list or "None">

**Type Alignment**
- [ ] Frontend and backend parameter names match
- [ ] Frontend and backend types match (string vs number, optional vs required)
- [ ] Shared interfaces documented with source file path
- [ ] All type imports verified (correct file paths)

**Styleguide** (for plans that add or change code)
- [ ] Planned paths, patterns, and conventions match `docs/styleguide/` and README, or deviations are documented and justified in the plan. If introducing a new pattern, the plan explicitly states so and includes updating README and styleguide.

---

## Implementation Plan

**⛔ EXECUTION CONTRACT — READ BEFORE STARTING:**
Every task, sub-task, and verification step below is **mandatory**. The executing agent:
- MUST NOT skip, defer, simplify, or omit any task — even if it seems unnecessary, redundant, or low-value.
- MUST NOT make unilateral decisions to change scope. If a task is blocked or seems wrong, **stop and ask the user** before proceeding.
- MUST execute tasks in the order listed and mark each complete only after full completion.
- Violating this contract (e.g., silently skipping a task, deferring with a one-line rationale, or rationalizing omission) is considered a failure of the entire plan execution.

**⚠️ Before starting**:
- [ ] Verify all referenced file paths exist (use `rg --files` or `rg --files -g`)
- [ ] Check for cross-plan coordination issues
- [ ] Review docs/prompts/prompt_check_plan.md checklist
- [ ] **Styleguide alignment** (for plans that add or change code): Confirm planned changes conform to `docs/styleguide/` and README (architecture, validation, routes, frontend, testing), or document intentional deviations in the plan. If introducing a new pattern, state so explicitly and include tasks to update both README and the styleguide.
- [ ] **As-built alignment**: Identify affected `docs/current/` area docs and include explicit update tasks in this plan.

**Prerequisites / Gates** ✅
- <prerequisite with verification method>
- <prerequisite with verification method>

**Verification Commands Standard**:
- All commands must reference the correct file paths and symbol names
- Prefer checks tied to actual return objects (not only variable names)
- Include preflight checks for required services (e.g., API reachable)
- If test count is required, add an explicit count check
- If the plan fixes a bug/regression, include automated test additions or updates that act as a regression guard for the original failure mode
- **CRITICAL: All verification commands must be NON-BLOCKING** (exit immediately, never hang):
  - ❌ **FORBIDDEN**: `make app-logs | grep` (hangs - uses `docker compose logs -f` which never exits)
  - ❌ **FORBIDDEN**: `tail -f logs/file.log | grep` (hangs - follows logs indefinitely)
  - ❌ **FORBIDDEN**: Commands that wait for user input or never exit
  - ✅ **REQUIRED**: `docker compose logs --tail=100 app | grep` (shows last 100 lines, exits immediately)
  - ✅ **REQUIRED**: `tail -100 logs/file.log | grep || echo "No matches"` (shows last 100 lines, always exits)
  - ✅ **REQUIRED**: Add `|| echo "message"` fallback to grep commands so they exit even if no matches found

**Decision Points & Fallbacks**:
- If prerequisite X fails:
  - **Option A** (Recommended for <scenario>): <approach>
  - **Option B** (Recommended for <scenario>): <approach>
  - **Option C**: <approach>

**Decision-point execution rule**:
- Every decision point in this plan MUST either:
  - map to concrete implementation tasks for the selected option, or
  - be a blocking ask to the user before execution continues.
- Decision points MUST NOT be left as implied recommendations.

**Critical Path** (sequential dependencies):
1. Phase X must complete before Phase Y starts (because: <reason>)
2. Task A blocks Task B (because: <reason>)

**Parallel Work** (can run simultaneously):
- Phases 1 and 2 can run in parallel
- Tasks X and Y are independent

**⚠️ Task Formatting Requirements** (for orchestrator compatibility):
- **CRITICAL**: Use NUMERIC-ONLY task IDs: `#### Task X.Y: <name>` (e.g., Task 1.1, 1.2, 1.3, 1.41, 1.42)
  - ❌ INVALID: Task 1.0a, Task 1.0b, Task 1.4a (alphanumeric suffixes will be SKIPPED by orchestrator)
  - ✅ VALID: Task 1.01, Task 1.02, Task 1.41, Task 1.42 (decimal numbering works)
- **CRITICAL**: Tasks must appear in ASCENDING NUMERIC ORDER in the file
  - ❌ INVALID: Task 1.01, Task 1.0, Task 1.02 (out of order)
  - ✅ VALID: Task 1.0, Task 1.01, Task 1.02, Task 1.1, Task 1.2 (ascending order)
- **CRITICAL**: Task numbers must be UNIQUE (no duplicates)
  - ❌ INVALID: Two tasks numbered 1.1
  - ✅ VALID: Each task has a distinct number
- Keep tasks atomic (one focused change per task, not 10 unrelated steps)
- **GitHub issue mapping**: Each task should reference a GitHub issue. Multiple tasks can share one issue if they implement the same deliverable. One issue = one independently-testable deliverable (not per checkbox, not per phase). Issues are closed by the PR, not by individual tasks.
- **Project board transitions**: Each phase MUST include a `Task X.0: Move GitHub issue(s) to In Progress` as its first task (where X is the phase number). This task moves the phase's referenced issues to **In Progress** on the project board. Issues move to **Done** automatically when the PR merges with `Closes #N`. If a phase shares the same issues as a prior phase that already moved them, the Task X.0 can note "already in progress" and be pre-checked.
- Limit subtasks to ≤5 checkboxes per task (split if more complex)
- Separate implementation steps from manual verification sections
- Mark manual-only tasks clearly (e.g., "**Manual verification:**")
- Include verification commands for automatable checks

---

### Phase 1: <name>

**Goal**: <specific outcome>

**⚠️ Coordination**:
- <other-plan.md> also modifies <file> - coordinate or complete one first
- No conflicts ✅

#### Task 1.0: Move GitHub issue(s) to In Progress
- [ ] Get item ID: `gh project item-list $GH_PROJECT_NUMBER --owner $GH_PROJECT_OWNER --format json | jq '.items[] | select(.content.number == <ISSUE_NUMBER>) | .id'`
- [ ] Move issue #<number> to **In Progress**: `gh project item-edit --project-id $GH_PROJECT_ID --id <ITEM_ID> --field-id $GH_PROJECT_STATUS_FIELD_ID --single-select-option-id $GH_PROJECT_STATUS_IN_PROGRESS`

#### Task 1.1: <task name>
**GitHub Issue**: #<number> (create if not exists; label: `bug` | `feature` | `chore`)
- [ ] Open [<file-path>](<file-path>) (line X)
- [ ] <specific action>
- [ ] Verify: <how to check it worked>
- [ ] Save file

**Verification:**
```bash
# Command to verify task completion (must exit immediately - no tailing/following)
# ✅ GOOD: docker compose logs --tail=100 app | grep "pattern" || echo "No matches found"
# ❌ BAD: make app-logs | grep "pattern" (hangs forever)
<verification command>
```

**Tests:**
- [ ] Create unit test: path/to/file.test.ts
- [ ] Update integration test: path/to/integration.test.ts
- [ ] Regression guard: test that fails if the original bug/regression returns (required for bug-fix plans)

#### Task 1.2: <task name>
- [ ] <action>

**Verification:**
```bash
<verification command>
```

#### Task 1.3: Manual verification
- [ ] Test: <specific test case>
- [ ] Expected result: <concrete outcome>
- [ ] If fails: <fallback action>

---

### Phase 2: <name>

**Goal**: <specific outcome>

**⚠️ PREREQUISITE**: Phase 1 must complete first

<repeat task structure>

---

## Testing Plan

**⚠️ Test Selector Requirements**:
- Use valid RTL patterns (no `getByRole("link", { href: "..." })`)
- Find links: `getAllByRole("link").find(link => link.getAttribute("href") === "...")`
- Verify data-testid exists in component before using in test
- Use structural selectors, avoid fragile text/label matching

**Unit tests** (per `docs/ai/PROMPT-frontend-tests.md` and `docs/ai/PROMPT-backend-tests.md`)
- [ ] <test file + scenario> - Tests: <specific behavior>
- [ ] Error handling: <test file + error scenario>
- [ ] Edge case: <test file + edge case scenario>
- [ ] Negative test: <test file + failure scenario>

**Integration tests**
- [ ] <test file + multi-component workflow>

**E2E tests** (per `e2e/README.md`)
- [ ] <spec file + happy path scenario>
- [ ] <spec file + error path scenario>
- [ ] <spec file + edge case scenario>

**Existing tests to update** (REQUIRED when modifying existing files)
<!-- For every modified source file, identify existing .test.ts/.test.tsx that cover that file or behavior, then explicitly list updates needed. -->
- [ ] <existing test file + what must change due to this plan>
- [ ] <existing test file + assertion/fixture updates>

**Test coverage targets**:
- Unit: Each new function/hook/component
- Integration: All workflows touching 2+ components
- E2E: All user-facing features and critical paths
- Existing: All existing tests still pass
- If exact test count is required, add a count verification command

---

## Success Criteria

> ⚠️ **Gate-enforced (#735).** Before the feature→alex PR can merge, the `plan-completion-gate` CI check requires (a) every box in this section is `- [x]` and (b) a `docs/pr/<plan>-audit.md` with `VERDICT: PASS` exists. Tick a box ONLY after an independent `plan-audit` agent verifies it against the code (or mark it DATA-PENDING/EXTERNAL in the audit with a reason). An item that genuinely cannot complete yet may stay `- [ ]` only if the line itself is annotated `DATA-PENDING`/`EXTERNAL: <reason>` (the gate exempts those); everything else must be `- [x]`. Each item must be a *checkable* outcome with a `verify:` command/test — a vague or unrunnable criterion can't be audited.

**Functional** (must all pass):
- [ ] <specific outcome> (verify: <test file or manual step>)
- [ ] <specific outcome> (verify: <test file or manual step>)

**Performance** (if applicable):
- [ ] <metric> < <threshold> (measure with: <tool>)
- [ ] <metric> > <threshold> (measure with: <tool>)

**Quality**:
- [ ] All tests pass (unit + integration + E2E)
- [ ] TypeScript compiles with no errors (`npm run lint:client`)
- [ ] No console errors or warnings in browser
- [ ] As-built docs in `docs/current/` are updated for behavior changes (requirements + test matrix + traceability index when needed)

**Measurable outcomes** (not subjective):
- [ ] Font size is 14px on both pages (verify: DevTools computed styles)
- [ ] Background color #F3F4F6 matches (verify: DevTools hex comparison)
- [ ] All 10 entity pages have data view links (verify: manual check + E2E test)

---

## Changelog (REQUIRED)
- YYYY-MM-DD: <summary of decisions, research, and scope changes>

---

## Risks / Mitigations

| Risk | Impact | Status | Mitigation |
|------|--------|--------|------------|
| <risk> | High/Medium/Low | ❌ Open / ✅ Resolved | <mitigation plan> |
| <risk> | High/Medium/Low | ❌ Open / ✅ Resolved | <mitigation plan> |

**CRITICAL risks** (🔴 blocks execution):
- <risk> → <mitigation completed>

**MEDIUM risks** (🟡 may cause issues):
- <risk> → <mitigation plan>

**LOW risks** (🟢 monitoring):
- <risk> → <acceptable because...>

---

## Cross-Plan Coordination

**Potential conflicts**:
- ⚠️ <plan-name.md> also modifies <file-path> - Decision: <complete plan X first / merge plans / coordinate timing>
- ⚠️ <plan-name.md> updates shared <component/type> - Decision: <coordination plan>
- ✅ No conflicts detected

**Migration coordination** (if breaking changes):
- [ ] Step 1: <migration step> (before: <what>)
- [ ] Step 2: <migration step> (after: <what>)

---

## Validation / Rollout

**Manual verification steps**:
- [ ] <specific test case> → Expected: <outcome>
- [ ] <specific test case> → Expected: <outcome>

**Rollout plan** (if applicable):
- [ ] Feature flag: <flag-name> (default: <on/off>)
- [ ] Gradual rollout: <percentage> → <percentage> → 100%
- [ ] Rollback plan: <steps to revert>

**Monitoring** (if applicable):
- [ ] Watch metric: <metric-name> (expected: <threshold>)
- [ ] Alert on: <condition>

---

## Cleanup
- [ ] Remove temporary test output files
- [ ] Remove temporary scripts or scratch files
- [ ] Remove debug logging or commented-out code

---

## Execution History

Automated execution logs from orchestrator (if applicable):
- [Session YYYY-MM-DD-HHMMSS](docs/features/orchestrator-states/<session-id>/) - Status: Complete, Tasks: X/Y completed

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| YYYY-MM-DD | Initial plan created | <name> |
| YYYY-MM-DD | Research complete - <key findings> | <name> |
| YYYY-MM-DD | Updated <section> - <reason> | <name> |

---

## Pre-Execution Checklist

Before starting implementation, verify against `docs/prompts/prompt_check_plan.md`:

- [ ] 🔴 CRITICAL: GitHub issues created for all deliverables, listed in plan header, and referenced by tasks
- [ ] 🔴 CRITICAL: Execution contract present in Implementation Plan section (⛔ EXECUTION CONTRACT block)
- [ ] 🔴 CRITICAL: All open questions resolved (research complete)
- [ ] 🔴 CRITICAL: "Out of scope" items are true exclusions (not required to meet goal/success criteria)
- [ ] 🔴 CRITICAL: Prerequisites verified and documented
- [ ] 🔴 CRITICAL: Type alignment confirmed (frontend ↔ backend)
- [ ] 🔴 CRITICAL: No contradictions between sections
- [ ] 🔴 CRITICAL: All file paths verified (use `rg --files`)
- [ ] 🔴 CRITICAL: Each phase has a `Task X.0: Move GitHub issue(s) to In Progress` as its first task
- [ ] 🔴 CRITICAL: Task list properly formatted (consistent IDs, atomic units, ≤5 subtasks, verification commands)
- [ ] 🟡 MEDIUM: Tests included per PROMPT-update-create-tests.md
- [ ] 🟡 MEDIUM: Existing tests identified and updated for modified files
- [ ] 🟡 MEDIUM: Success criteria are measurable (not vague)
- [ ] 🟡 MEDIUM: Test selectors use valid RTL patterns
- [ ] 🟡 MEDIUM: Verification commands reference correct files/symbols and include preflight checks where needed
- [ ] 🔴 CRITICAL: All verification commands are non-blocking (no tailing/following, always exit immediately)
- [ ] 🟡 MEDIUM: Task sequencing explicit (critical path clear)
- [ ] 🟡 MEDIUM: Fallback strategies defined for critical gates
- [ ] 🟡 MEDIUM: Styleguide alignment (for code-changing plans): align with docs/styleguide/ and README or document deviations; if new pattern, state so and update both
- [ ] 🟡 MEDIUM: Pre-PR issue linkage: plan includes a verification step (before PR creation) to confirm `Closes #N` is present (in PR body and/or commits) for every GitHub issue in the plan header

**Status**: ✅ EXECUTION-READY / ⚠️ NEEDS WORK
