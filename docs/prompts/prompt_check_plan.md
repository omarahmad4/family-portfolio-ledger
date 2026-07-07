# Plan Execution Readiness Checklist

**Usage**: Run this prompt before executing any plan: "Review [plan-file.md] against this checklist. For each item, respond with ✅ PASS, ⚠️ WARNING, or ❌ FAIL + specific issue. Fix all CRITICAL failures and MEDIUM warnings before marking execution-ready."

---

## 🔴 CRITICAL - Blocks Execution

### 0a. Execution Contract Present
**Check**: Does the Implementation Plan section include the ⛔ EXECUTION CONTRACT block?

**Why**: Agents frequently make unilateral decisions to skip, defer, or simplify planned tasks. The execution contract is a mandatory preamble that categorically prevents this. Without it, agents treat plans as suggestions rather than contracts.

**How to verify**:
- Search for "⛔ EXECUTION CONTRACT" in the Implementation Plan section
- Confirm it includes: MUST NOT skip/defer/simplify, MUST ask before changing scope, MUST execute in order
- Confirm it explicitly states that violating the contract is a plan execution failure

**Example failures**:
- ❌ Implementation Plan section has no execution contract
- ❌ Contract is present but uses weak language ("should try to", "ideally")
- ❌ Contract is in the wrong section (e.g., in Risks instead of Implementation Plan)

**Example passes**:
- ✅ "⛔ EXECUTION CONTRACT" block appears immediately at the top of the Implementation Plan section
- ✅ Uses mandatory language: "MUST NOT skip", "MUST NOT defer", "stop and ask the user"

**Fix**: Copy the execution contract block from `docs/features/PLAN_TEMPLATE.md` into the Implementation Plan section.

---

### 0b. Non-Blocking Verification Commands
**Check**: Do all verification commands exit immediately? No tailing/following log commands?

**Why**: Commands that never exit (like `make app-logs | grep` or `tail -f`) cause orchestrator timeouts and task failures. The executor waits for verification commands to complete, so blocking commands prevent task completion.

**How to verify**:
- Search for: `make app-logs`, `tail -f`, `docker compose logs -f`, `follow`, `watch`
- Check if any verification commands use `-f` flag (follow mode)
- Verify grep commands have `|| echo` fallback
- Ensure all commands complete in <5 seconds

**Example failures**:
- ❌ `make app-logs | grep "pattern"` (hangs - `make app-logs` uses `docker compose logs -f`)
- ❌ `tail -f logs/file.log | grep` (hangs - follows logs indefinitely)
- ❌ `docker compose logs -f app | grep` (hangs - never exits)
- ❌ Commands without `|| echo` fallback that might not find matches

**Example passes**:
- ✅ `docker compose logs --tail=100 app | grep "pattern" || echo "No matches"` (exits immediately)
- ✅ `tail -100 logs/file.log | grep || echo "No matches"` (shows last 100 lines, always exits)
- ✅ All commands complete quickly and exit

**Fix**: Replace all blocking commands with non-blocking alternatives:
- `make app-logs | grep` → `docker compose logs --tail=100 app | grep || echo "No matches"`
- `tail -f file.log | grep` → `tail -100 file.log | grep || echo "No matches"`
- Add `|| echo "message"` to all grep commands to ensure they exit even if no matches found

---

### 0c. GitHub Issue Tracking
**Check**: Does the plan header list GitHub issue numbers? Does each task reference an issue?

**Why**: All work items must be tracked as GitHub issues for visibility, prioritization, and commit linkage. Plans without issue references create untraceable work.

**How to verify**:
- Plan header has `**GitHub Issues**: #<number>, ...` (not empty, not "TBD")
- Each task has a `**GitHub Issue**: #<number>` line
- Multiple tasks may share an issue (same deliverable), but no task should be unlinked
- Issue labels are specified (`bug`, `feature`, or `chore`)

**Example failures**:
- Plan header has no GitHub Issues field
- Tasks have no issue references
- Plan says "GitHub Issues: TBD" — issues must exist before execution

**Example passes**:
- `**GitHub Issues**: #98, #102, #105`
- Each task references one of those issues
- Labels specified for any issues that need creation

**Fix**: Create missing GitHub issues before marking plan execution-ready. Add issue references to plan header and each task.

**Project board transition tasks**: Each phase MUST include a `Task X.0: Move GitHub issue(s) to In Progress` as its first task. Verify this exists in every phase. If a phase shares issues already moved by a prior phase, the task can note "already in progress" and be pre-checked, but it must still exist.

**⚠️ CRITICAL — `item-edit` vs `item-add`**: Task X.0 MUST use `gh project item-edit` to change status, NOT `gh project item-add` (which only adds an item to the board without changing its status). Verify that the plan's Task X.0 steps use the correct command. A plan that uses `item-add` to move status will silently fail.

**Example failures**:
- ❌ Phase 1 starts with Task 1.1 (no Task 1.0 for project board transition)
- ❌ Phase has a comment about moving issues but no explicit task
- ❌ Task X.0 uses `gh project item-add` instead of `gh project item-edit` to change status

**Example passes**:
- ✅ `#### Task 1.0: Move GitHub issue(s) to In Progress`
- ✅ `#### Task 2.0: Move GitHub issue(s) to In Progress` (with note: "already moved in Phase 1")
- ✅ Task X.0 uses `gh project item-edit --field-id ... --single-select-option-id ...`

**Fix**: Add a `Task X.0: Move GitHub issue(s) to In Progress` as the first task in each phase. Ensure it uses `gh project item-edit` (not `item-add`) and includes a verification step to confirm the status actually changed.

---

### 0d. Scope Decisions Explicitly Resolved
**Check**: If the plan contains decision branches (e.g., "flag for user decision", "defer", "optional", "decision point"), is the selected option explicitly recorded with user decision source and task alignment?

**Why**: Unresolved scope branches cause unilateral agent decisions, partial execution, and ambiguous outcomes. Plans must resolve scope before execution starts.

**How to verify**:
- Search for: `decision point`, `flag for user decision`, `defer`, `optional`, `future phase`
- Confirm there is a recorded selected option for each branch
- Confirm decision source is explicit (user message/link/date)
- Confirm tasks reflect the selected option end-to-end
- Confirm no unresolved branches remain in scope-related sections

**Example failures**:
- ❌ "Scope decision: refactor summary only vs all methods" with no selected option
- ❌ "Defer metric pages to future plan" without explicit user approval source
- ❌ Recommended option exists, but no evidence user chose it

**Example passes**:
- ✅ Each decision branch has selected option + explicit user decision source + date
- ✅ Tasks and phases align exactly with the selected option

**Fix**: Block execution until each scope decision branch has explicit user choice recorded and plan tasks updated to match that choice.

---

### 1. Open Questions & Research
**Check**: Are there "TODO: verify", "needs research", "unknown if...", or similar unresolved items?

**Why**: Plans must be execution-focused, not discovery-focused. Research should be completed before the plan.

**How to verify**:
- Search for: "?", "TODO", "needs verification", "unknown", "may need", "might require"
- Check if any sections end with questions instead of decisions

**Example failures**:
- ❌ "Does `/api/endpoint` support filtering? Needs verification."
- ❌ "May need to add backend support if filtering doesn't work"
- ❌ "Unknown if hook accepts this parameter"

**Example passes**:
- ✅ "Backend confirmed working via curl test (2026-01-06)"
- ✅ "Hook accepts parameter (verified at line 42)"

**Fix**: Complete all research NOW, update plan with findings and concrete next steps.

---

### 2. Out of Scope Items
**Check**: If there is an "out of scope" section, are those items truly excluded and not required to meet the goal or success criteria?

**Why**: Out-of-scope sections are allowed for clarity, but they must not hide required work.

**How to verify**:
- Search for: "out of scope", "future", "later", "phase 2", "v2", "nice to have"
- Confirm excluded items are not referenced by goals, success criteria, or verification steps
- Ensure any deferred items that are actually required are promoted to tasks

**Example failures**:
- ❌ "Add dark mode support (out of scope for now)" but success criteria requires dark mode
- ❌ "Performance optimization - defer to future PR" when the goal is improved performance

**Example passes**:
- ✅ "RDS Proxy integration (out of scope) — future scalability enhancement; not required for current investigation goal"

**Fix**: If an out-of-scope item is required to meet the goal, move it into tasks; otherwise, keep it with a clear rationale (and follow-up plan if needed).

---

### 3. Missing Prerequisites
**Check**: Are dependencies and prerequisites explicitly identified and verified?

**Why**: Starting work without required foundations causes cascading failures.

**How to verify**:
- Do backend changes complete before frontend changes depend on them?
- Are database migrations run before API uses new schema?
- Are shared types updated before components use them?
- Check "Dependencies" section exists and is complete
- For any automated measurements/tests: does the plan specify where server URL and login credentials come from (e.g., `.env`)?
- If the plan includes container/server restarts, does it specify `make down && make up` (or justify an alternative)?
- Do test/lint steps avoid top-level runs and specify scoped commands only?

**Example failures**:
- ❌ Phase 1 updates frontend, Phase 3 adds backend endpoint (wrong order)
- ❌ Task uses `NewType` but no task updates type definitions
- ❌ Missing "⚠️ PREREQUISITE: Phase X must complete first"

**Fix**: Reorder tasks, add prerequisite checks, verify dependency chain.
**Note**: Avoid `npm run lint` or full test suites; require scoped lint/tests targeting changed files.

---

### 4. Type & Interface Mismatches
**Check**: Do frontend and backend types align? Are parameter names consistent?

**Why**: Type mismatches cause runtime errors that tests may miss.

**How to verify**:
- Compare backend schema with frontend interfaces
- Check parameter names match (e.g., not `userId` backend vs `user` frontend)
- Verify number vs string types match (e.g., IDs should be consistent)
- Check optional vs required fields align

**Example failures**:
- ❌ Backend expects `circulatorId: number`, frontend sends `circulator: string`
- ❌ Backend requires `facilityId`, frontend makes it optional
- ❌ Backend returns `startTime: Date`, frontend expects `startTime: string`

**Fix**: Document type mismatches in research findings, add tasks to fix them.

---

### 5. Contradictory Sections
**Check**: Do different sections of the plan contradict each other?

**Why**: Contradictions indicate incomplete planning and cause confusion during execution.

**How to verify**:
- Does "Goal" match task list?
- Do success criteria match what tasks actually implement?
- Do tests verify the behavior described in features?

**Example failures**:
- ❌ Goal says "add filtering", tasks don't include filter implementation
- ❌ Success criteria requires 8 tests, Phase 5 only adds 3 tests
- ❌ Features section says "real-time updates", implementation uses polling

**Fix**: Align all sections, update contradictory parts, verify consistency.

---

### 5a. Regression Guard Tests For Bug Fixes
**Check**: If the plan fixes a bug, regression, or previously broken behavior, does it include test additions or updates that would fail if the bug returned?

**Why**: Bug-fix plans that only change implementation without adding or updating tests allow the same issue to reappear silently. Every bug fix should add a regression guard at the most appropriate level (unit, integration, E2E, or caller test).

**How to verify**:
- Search for issue labels/context indicating bug work: `bug`, `regression`, `fix`, `broken`, `incorrect`, `wrong`, `does not`
- Check whether the Testing Plan and task list include a test that directly exercises the bug scenario
- Confirm the test would fail if the buggy behavior were reintroduced
- If the change is in shared UI/component code, verify at least one test guards the wiring point that caused the bug
- If the plan claims "no tests needed", require a concrete justification tied to existing coverage

**Example failures**:
- ❌ Plan fixes tooltip formatting bug but only updates component code, no test asserts formatter wiring
- ❌ Plan fixes API filter bug but tests only cover happy-path rendering, not the broken filter case
- ❌ Plan says "manual verification only" for a repeatable bug with existing automated test coverage nearby

**Example passes**:
- ✅ New unit test asserts `Tooltip` receives formatter prop when provided, preventing the original bug from returning
- ✅ Existing integration test updated to cover the exact previously broken query/filter/path
- ✅ E2E spec extended to cover the user-visible regression scenario when unit/integration coverage is insufficient

**Fix**: Add or update automated tests that directly cover the original bug/regression path. In the plan, call out the regression guard explicitly in task steps and the Testing Plan.

---

### 6. Invalid File Paths
**Check**: Do all referenced files and imports exist in the current repo structure?

**Why**: Plans referencing non-existent files waste time and break builds.

**How to verify**:
- Use `rg --files` (or `rg --files -g` filters) to verify each file path exists
- Check imports reference correct paths (especially after refactors)
- Verify component names match actual exports

**Example failures**:
- ❌ Plan references `src/hooks/useOldHook.ts` but file was renamed
- ❌ Import from `@/components/Button` but actual path is `@/components/ui/button`
- ❌ References line 42 but file only has 30 lines

**Fix**: Update all file paths, verify with Glob, check line numbers are current.

---

### 7. Task Numbering Format (CRITICAL for Orchestrator)
**Check**: Are task numbers numeric-only, unique, and in ascending order?

**Why**: The orchestrator parser only recognizes numeric task IDs. Alphanumeric tasks will be skipped. Out-of-order or duplicate numbers cause confusion and potential execution issues.

**How to verify**:
- Search for task headers: `#### Task`
- Verify all task numbers match pattern: `\d+\.\d+` (digits and periods only)
- Check for invalid patterns: `\d+\.\d+[a-zA-Z]` (numbers followed by letters)
- Verify tasks appear in ascending numeric order (1.0, 1.01, 1.02, 1.1, 1.2...)
- Verify no duplicate task numbers

**Example failures**:
- ❌ `#### Task 1.0a: Create folder` (alphanumeric - will be skipped)
- ❌ Tasks ordered: 1.01, 1.0, 1.02 (out of order - confusing)
- ❌ Two tasks numbered 1.1 (duplicate - ambiguous)

**Example passes**:
- ✅ `#### Task 1.0: Feature flags`
- ✅ `#### Task 1.01: Folder structure`
- ✅ `#### Task 1.02: Verify usage`
- ✅ Tasks in ascending order: 1.0 < 1.01 < 1.02 < 1.1 < 1.2
- ✅ All task numbers unique

**Fix**:
1. Renumber alphanumeric tasks (1.0a → 1.01, 1.4a → 1.41)
2. Reorder tasks in ascending numeric order
3. Ensure all task numbers are unique

---

### 8. Verification Commands Accuracy & Non-Blocking
**Check**: Do verification commands target the correct files, symbols, and expected outputs? Are all commands non-blocking?

**Why**: Incorrect commands can falsely pass or fail, blocking real verification. Blocking commands (that never exit) cause orchestrator timeouts and task failures.

**How to verify**:
- Each command references the actual file where the change lives
- Symbol names match real implementations (function name vs class method)
- Checks validate return/output shapes, not just variable declarations
- Commands match the plan's own implementation details
- **CRITICAL**: No commands that tail/follow logs indefinitely (must exit immediately)
- **CRITICAL**: No commands that wait for user input or never exit
- Commands use `--tail=N` instead of `-f` for log viewing
- Grep commands have `|| echo` fallback to ensure exit even if no matches

**Example failures**:
- ❌ Grep checks a symbol in the wrong file
- ❌ Command expects `this.someFn` when a free function exists
- ❌ Verification checks outdated header tags/classes
- ❌ `make app-logs | grep "pattern"` (hangs - uses `docker compose logs -f` which never exits)
- ❌ `tail -f logs/file.log | grep` (hangs - follows logs indefinitely)
- ❌ Commands that wait for user input

**Example passes**:
- ✅ Grep targets `server/services/...` where the set is defined
- ✅ Command validates return object keys for new metrics
- ✅ UI checks search for the exact class/tag used in the code
- ✅ `docker compose logs --tail=100 app | grep "pattern" || echo "No matches"` (exits immediately)
- ✅ `tail -100 logs/file.log | grep || echo "No matches"` (shows last 100 lines, always exits)
- ✅ Commands that complete in <5 seconds and exit

**Fix**: 
- Update commands to match actual code locations and implementation patterns
- Replace blocking commands with non-blocking alternatives (use `--tail=N` not `-f`, add `|| echo` fallback)

---

### 9. Task List Format & Structure
**Check**: Does plan have a Changelog section documenting decisions and research?

**Why**: Future maintainers need context for architectural decisions. This is required for execution-ready plans.

**How to verify**:
- Is there a "Changelog" section?
- Are major decisions documented with rationale?
- Is research captured (dates, methods, findings)?
- Are alternatives considered and rejected explicitly documented?

**Example entries**:
- ✅ "2026-01-06: Research confirmed backend supports filtering (curl test)"
- ✅ "Decision: Keep 2-page architecture due to different data structures"
- ✅ "Considered Option A (contextual page) but rejected due to type differences"

**Fix**: Add a Changelog section, document decisions with rationale, capture research findings. Mark as CRITICAL if missing.
**Check**: Do verification commands target the correct files, symbols, and expected outputs?

**Why**: Incorrect commands can falsely pass or fail, blocking real verification.

**How to verify**:
- Each command references the actual file where the change lives
- Symbol names match real implementations (function name vs class method)
- Checks validate return/output shapes, not just variable declarations
- Commands match the plan's own implementation details

**Example failures**:
- ❌ Grep checks a symbol in the wrong file
- ❌ Command expects `this.someFn` when a free function exists
- ❌ Verification checks outdated header tags/classes

**Example passes**:
- ✅ Grep targets `server/services/...` where the set is defined
- ✅ Command validates return object keys for new metrics
- ✅ UI checks search for the exact class/tag used in the code

**Fix**: Update commands to match actual code locations and implementation patterns.

---

### 8. Task List Format & Structure
**Check**: Are tasks properly formatted for automated execution (orchestrator compatibility)?

**Why**: Orchestrator tools parse and execute tasks automatically. Improper formatting blocks automation or causes incorrect execution.

**How to verify**:
- Are tasks clearly identified with unique IDs? (e.g., "#### Task 1.1:", "#### Task 2.3a:")
- Is each task a single, atomic unit of work? (not 10 unrelated steps bundled together)
- Are subtasks manageable? (ideally ≤5 checkboxes per task, not 20+ steps)
- Are manual-only tasks clearly marked? (e.g., "**Manual verification:**" sections)
- Does each task have clear acceptance criteria or verification command?
- Are tasks in correct sequential order with dependencies explicit?

**Example failures**:
- ❌ Task heading: "Add instrumentation and collect data and analyze results" (too broad, should be 3 tasks)
- ❌ Task has 15 checkbox steps mixing code changes, manual tests, and analysis (not atomic)
- ❌ "Task 1: Update backend" followed by "Task 2: Update types" (wrong order, types needed first)
- ❌ "Navigate to page, click button, verify console logs" (manual-only, no automation note)
- ❌ Tasks numbered "Task A", "Task B", "Another task" (inconsistent IDs)

**Example passes**:
- ✅ "#### Task 1.1: Add Prisma middleware for query timing" (atomic, specific)
- ✅ Each task has ≤5 checkboxes for related steps
- ✅ "**Manual verification:**" section clearly separates automatable from manual steps
- ✅ Tasks numbered consistently: Task 1.0a, 1.0b, 1.1, 1.2, 1.3...
- ✅ "**Verification:**" section with concrete bash commands after implementation steps
- ✅ "⚠️ PREREQUISITE: Task 1.1 must complete first" (dependencies explicit)

**Fix**:
- Split large tasks into atomic units (one task = one focused change)
- Use consistent task IDs (#### Task X.Y: format)
- Limit subtasks to ≤5 steps per task
- Separate implementation steps from manual verification
- Add verification commands for automatable checks
- Mark manual-only tasks clearly
- Ensure sequential dependencies are explicit

---

## 🟡 MEDIUM - May Cause Issues

### 10. Missing or Broken Tests
**Check**: Are tests included per PROMPT-update-create-tests.md requirements, and are existing tests identified/updated for modified files?

**Why**: Untested code leads to regressions and bugs in production.

**How to verify**:
- Unit tests for each new component/hook/function?
- Integration tests for multi-component workflows?
- E2E tests for user-facing features?
- Negative test cases (error handling, edge cases)?
- Tests for both happy path AND failure modes?
- For every modified source file in the plan, search for related existing tests (`.test.ts` / `.test.tsx`) and confirm the plan lists updates where behavior/contracts changed
- Verification step: run a modified-file test discovery check (example pattern: `rg --files | rg '<modified-file-base>.*\\.test\\.(ts|tsx)$'`) for each modified file

**Example failures**:
- ❌ Adds 3 new hooks, no unit tests planned
- ❌ Changes API behavior, no integration tests
- ❌ User-facing feature, no E2E test
- ❌ Only tests happy path, ignores error cases
- ❌ Plan modifies `server/routes/foo.ts` but does not identify/update `server/routes/foo.test.ts`
- ❌ Plan modifies `client/src/components/X.tsx` but no check for `client/src/components/X.test.tsx`
- ❌ Existing tests are listed but assertions are not updated for changed response shape/UI behavior

**Example passes**:
- ✅ Plan adds tests for new logic and updates existing tests for changed files
- ✅ Plan explicitly maps modified files to existing `.test.ts`/`.test.tsx` files and required assertion updates
- ✅ Verification includes a command to locate/confirm existing tests for each modified file

**Fix**: Add comprehensive test tasks, follow PROMPT-update-create-tests.md structure.

---

### 11. Vague Success Criteria
**Check**: Are acceptance criteria specific, measurable, and testable?

**Why**: Vague criteria make it impossible to verify completion objectively.

**How to verify**:
- Can each criterion be verified with a specific test or measurement?
- Are qualitative terms (e.g., "consistent", "clean") replaced with concrete checks?
- Are comparisons specific (e.g., "14px" not "similar size")?

**Example failures**:
- ❌ "Ensure styling is consistent" (how?)
- ❌ "UI should look clean" (subjective)
- ❌ "Performance is acceptable" (what threshold?)
- ❌ "Colors match" (which hex values?)

**Example passes**:
- ✅ "Font size must be 14px on both pages (verify with DevTools)"
- ✅ "Response time < 200ms for 95th percentile (measure with k6)"
- ✅ "Background color #F3F4F6 on both tables (compare hex values)"

**Fix**: Make all criteria measurable with specific thresholds and verification methods.

---

### 12. Test Selector Issues
**Check**: Are test selectors valid for the actual UI? No invalid roles, missing test-ids, or fragile patterns?

**Why**: Invalid selectors cause test failures that waste debugging time.

**How to verify**:
- Check if `getByRole("link", { href: "..." })` used (RTL doesn't support href in role options)
- Verify `data-testid` attributes exist in referenced components
- Ensure aria-labels match actual rendered values
- Check button/link names aren't hardcoded (might change with i18n)

**Example failures**:
- ❌ `screen.getByRole("link", { href: "/path" })` (invalid - RTL doesn't support)
- ❌ `getByTestId("submit-btn")` but no such test-id in component
- ❌ `getByRole("button", { name: "Submit Form" })` but button text is "Submit"
- ❌ Using button text for selection (fragile, changes with copy)

**Example passes**:
- ✅ `screen.getAllByRole("link").find(link => link.getAttribute("href") === "/path")`
- ✅ `getByTestId("submit-btn")` + verify test-id exists in component
- ✅ `getByRole("button", { name: /submit/i })` (regex, case-insensitive)

**Fix**: Use valid RTL patterns, add test-ids where needed, use structural selectors.

---

### 13. Unclear Prerequisite Chains
**Check**: Is task sequencing explicit? Are dependencies clear?

**Why**: Unclear sequencing causes blocked work and wasted effort.

**How to verify**:
- Can tasks be reordered and still work?
- Are "must complete first" prerequisites explicitly marked?
- Is there a critical path diagram or clear sequencing?
- Do parallel vs sequential tasks make sense?

**Example failures**:
- ❌ Tasks can run in any order but some depend on others (not specified)
- ❌ "Phase 3" modifies types used in "Phase 1" but 1 runs first
- ❌ No "⚠️ PREREQUISITE" warnings for dependent tasks

**Fix**: Add prerequisite notes, reorder tasks, create critical path section.

---

### 14. Missing Fallback Strategies
**Check**: If prerequisites fail, is there a plan B?

**Why**: Blocked work needs options: ship partial, defer, or implement prerequisite first.

**How to verify**:
- If backend API doesn't work, what happens to frontend work?
- If tests fail, is there a rollback plan?
- Are there "Option A / Option B / Option C" fallback strategies?

**Example failures**:
- ❌ Plan assumes backend API works, no fallback if it doesn't
- ❌ "Must complete backend first" but no plan if backend fails

**Example passes**:
- ✅ "If backend filtering doesn't work: Option A (ship without), Option B (block until fixed), Option C (hybrid)"
- ✅ "If tests fail: investigate cause, fix implementation, or update test expectations"

**Fix**: Add decision trees for critical gates, provide fallback options.

---

## 🟢 LOW - Nice to Have

### 15. Cross-Plan Coordination
**Check**: Are other plans modifying the same files? Risk of merge conflicts?

**Why**: Prevents wasted work from conflicting changes.

**How to verify**:
- Search other plan files for same file paths
- Check if shared components/types being updated elsewhere
- Look for "⚠️ Coordination Note" in plan

**Example warnings**:
- ⚠️ "cost-summary-restructure also editing summary.tsx"
- ⚠️ "New plan updating shared CostAnalyticsFilters interface"

**Fix**: Add coordination notes, consider completing one plan first, or merge plans.

---

### 16. Changelog & Documentation (REQUIRED)
**Check**: Does plan have a Changelog section documenting decisions and research?

**Why**: Future maintainers need context for architectural decisions. This is required for execution-ready plans.

**How to verify**:
- Is there a "Changelog" section?
- Are major decisions documented with rationale?
- Is research captured (dates, methods, findings)?
- Are alternatives considered and rejected explicitly documented?

**Example entries**:
- ✅ "2026-01-06: Research confirmed backend supports filtering (curl test)"
- ✅ "Decision: Keep 2-page architecture due to different data structures"
- ✅ "Considered Option A (contextual page) but rejected due to type differences"

**Fix**: Add a Changelog section, document decisions with rationale, capture research findings. Mark as CRITICAL if missing.

---

### 17. Styleguide and README Alignment
**Check**: For plans that add or modify code, do planned paths, patterns, and conventions match `docs/styleguide/` and README? If not, are deviations documented and justified?

**Why**: The styleguide and README are the source of truth for architecture, validation, routes, frontend, and testing. New code should align unless a plan intentionally introduces a new pattern—in which case the plan must state so and include updating both README and styleguide.

**How to verify**:
- Does the plan reference or imply alignment with `docs/styleguide/` (and README) for affected areas?
- If the plan introduces a new pattern or convention, does it explicitly say so and include tasks to update README and the styleguide?
- Are any intentional deviations from styleguide/README called out with rationale?

**Example failures**:
- ❌ Plan adds new routes in a way that contradicts styleguide (e.g. new server/validations) with no deviation noted
- ❌ Plan introduces a new architectural pattern but has no task to update README or styleguide

**Example passes**:
- ✅ Plan states "Changes align with docs/styleguide/ (routes, validation per 3.routes-and-api.md)"
- ✅ Plan explicitly introduces a new pattern and includes tasks "Update README §X" and "Update docs/styleguide/ Y.md"
- ✅ Plan documents deviation: "Using X instead of styleguide's Y because …"

**Fix**: Add a sentence or subsection confirming alignment or documenting deviations; if introducing a new pattern, add tasks to update README and styleguide.

---

### 18. Implementation Patterns Alignment
**Check**: Does plan follow existing codebase patterns?

**Why**: Consistency reduces cognitive load and maintenance burden.

**How to verify**:
- Does naming match conventions (camelCase, PascalCase, kebab-case)?
- Does structure match similar features?
- Are imports following project patterns?
- Example: Does cost dashboard match efficiency dashboard structure?

**Example checks**:
- ✅ File naming: `useHookName.ts` not `HookName.ts`
- ✅ Component structure: Matches existing dashboard layout patterns
- ✅ API structure: Follows established endpoint conventions

**Fix**: Align with codebase patterns, reference similar implementations.

---

### 19. Breaking Changes & Migrations
**Check**: Are breaking changes identified? Migration steps included?

**Why**: Breaking changes need careful handling to avoid production issues.

**How to verify**:
- Changing existing API/type signatures?
- Modifying database schema?
- Removing deprecated features?
- Are migration steps explicit?
- Is backward compatibility considered?

**Example checks**:
- ✅ "BREAKING: Changes CostAnalyticsFilters interface (all consumers must update)"
- ✅ "Migration: Run DB migration before deploying API changes"
- ✅ "Backward compat: Keep old parameter for 1 release cycle"

**Fix**: Document breaking changes, add migration tasks, consider backward compatibility.

---

### 20. Dependency Verification
**Check**: Do imported functions/hooks/types actually exist where plan says they do?

**Why**: Incorrect imports cause TypeScript errors and broken builds.

**How to verify**:
- Verify shared types imported from correct source file
- Check component exports match what's imported
- Confirm hook functions exist at referenced paths

**Example failures**:
- ❌ Imports `CostAnalyticsFilters` from wrong file
- ❌ References `useOldHook` but actual name is `useNewHook`

**Fix**: Verify all imports with Read tool, update incorrect references.

---

### 21. Edge Cases & Error Handling
**Check**: Are edge cases and error scenarios addressed?

**Why**: Production code needs robust error handling beyond happy paths.

**How to verify**:
- What happens if API returns 500?
- What if data is empty/null/undefined?
- What if user has no permissions?
- Are loading/error states handled?

**Example checks**:
- ✅ "Test: Displays error message when API fails"
- ✅ "Test: Shows empty state when no data"
- ✅ "Task: Add error boundary for component failures"

**Fix**: Add tests for edge cases, implement error handling, test failure modes.

---

### 22. Scope Creep Check
**Check**: Is scope aligned with stated goal? No extra features sneaking in?

**Why**: Scope creep extends timelines and reduces focus.

**How to verify**:
- Do all tasks relate directly to the stated goal?
- Are there "while we're at it" additions?
- Is refactoring included that's not required?

**Example failures**:
- ❌ Goal: "Add data links", Task: "Refactor entire dashboard layout"
- ❌ Goal: "Fix bug X", Task: "Also add feature Y"

**Fix**: Remove tasks not directly supporting the goal, create separate plans for extras.

---

### 23. Test Coverage Completeness
**Check**: Is test coverage comprehensive across all test types?

**Why**: Different test types catch different issues.

**How to verify**:
- **Unit tests**: Each function/hook/component?
- **Integration tests**: Multi-component workflows?
- **E2E tests**: User journeys and critical paths?
- **Negative tests**: Error handling and edge cases?
- **Accessibility tests**: ARIA labels, keyboard navigation?
- **Performance tests**: Load times, large datasets?

**Example comprehensive coverage**:
- ✅ Unit: Test hook returns correct data structure
- ✅ Integration: Test hook + component integration
- ✅ E2E: Test user clicks link → navigates to page
- ✅ Negative: Test hook handles API error gracefully
- ✅ A11y: Test keyboard navigation works
- ✅ Perf: Test renders 1000 rows without lag

**Fix**: Add missing test types, ensure coverage across the pyramid (unit > integration > E2E).

---

## Quick Reference: Severity Levels

| Level | Description | Action Required |
|-------|-------------|-----------------|
| 🔴 CRITICAL | Blocks execution, causes failures | MUST FIX before starting |
| 🟡 MEDIUM | May cause issues, reduces quality | SHOULD FIX before starting |
| 🟢 LOW | Nice to have, improves maintainability | CAN FIX during execution |

---

## Execution Command

After running this checklist, use this prompt to confirm readiness:

```
I've reviewed [plan-file.md] against the execution readiness checklist:

✅ All CRITICAL items pass
✅ All MEDIUM items addressed or have acceptable workarounds
✅ LOW items documented for future improvement

Plan is EXECUTION-READY. Proceeding with implementation.
```
