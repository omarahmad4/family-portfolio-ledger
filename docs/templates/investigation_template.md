# <Investigation Title>

**Filename**: YYYYMMDD-short-description-investigation.md (e.g., 20260226-cost-utilization-investigation.md)
**Created**: YYYY-MM-DD
**Updated**: YYYY-MM-DD
**Status**: Open | In Progress | Complete
**Owner**: <name or team>
**Related Issue/Context**: <link to bug, plan, or remaining_work section>

## 🎯 Goal
<1-3 sentences describing the core question being answered or the bug being investigated>

## 🐛 Observed Issue / Problem Statement
<Detailed description of the bug, anomaly, or architectural question>
- **What is happening?** <e.g., Metric X shows 0>
- **Where does it happen?** <e.g., Safety summary dashboard>
- **Why does it matter?** <e.g., Misleading for users, blocks feature release>

## 🧪 Repro / How to Validate
<Step-by-step instructions to reproduce the issue or baseline state>
1. Run `make db-demo` to seed data
2. Navigate to `...`
3. Observe that `...`

## 🔍 Investigation Scope & Constraints
**In scope**
- <systems, endpoints, or flows to investigate>
- <specific files or repositories>

**Out of scope**
- <areas explicitly excluded from this investigation to maintain focus>

---

## 🕵️ Files & Symbols Inspected
*(Keep a running log of where you looked and what you found. This allows other agents/humans to resume work without repeating steps.)*

| File | Symbols/Functions | What it reveals |
|------|-------------------|-----------------|
| `server/services/example.ts` | `calculateMetric()` | <Shows that value is hardcoded> |
| `prisma/schema.prisma` | `ExampleModel` | <Missing required column> |

---

## 💡 Findings (Proved, Not Guessed)
*(List the concrete facts discovered during the investigation. Link to specific lines of code or log outputs where possible. Separate facts from hypotheses.)*
1. **Fact 1**: <e.g., The denorm read path `aggregateSummaryMetricsFromTotalTables` does not select `standardDeviation`.>
2. **Fact 2**: <e.g., The metric key `COST_SPREAD` is classified as `'average'` in `metric-types.ts` instead of `'sum'`.>

## 🕸️ System / Architectural Impact (Scope)
*(Where else does this pattern appear? Does fixing this impact other dashboards or services?)*
- <Impact 1>
- <Impact 2>

## 💥 Root Cause Analysis
*(Synthesize the findings into a clear root cause. Why is this happening structurally?)*
<Explanation of the root cause, bringing together the "Why" behind the facts.>

---

## 🚧 Alternative Approaches / Proposed Solutions
*(List potential ways to solve the problem, with pros/cons. For simple bugs, this section may be brief.)*

**Option A: <Short name>**
- **Description**: <How it works>
- **Pros**: <e.g., Fastest time to implement>
- **Cons**: <e.g., Increases technical debt, doesn't align with architecture>

**Option B: <Short name>**
- **Description**: <How it works>
- **Pros**: <e.g., Reusable, architectural alignment>
- **Cons**: <e.g., Requires data migration>

## 🚀 Recommended Next Steps / Implementation Plan
*(What should be done next? Outline the high-level steps for the chosen solution.)*
1. <Step 1>
2. <Step 2>

> [!NOTE]
> *For any and all executions, create a formal [PLAN_TEMPLATE](../features/PLAN_TEMPLATE.md) based on these findings instead of executing directly.*

## ❓ Open Questions
*(What is still unknown? What needs user input before proceeding?)*
- [ ] Question 1?
- [ ] Question 2?

---

## 📝 Execution History / Investigation Log
*(To be populated during the investigation process if it spans multiple sessions, detailing dead-ends and pivot points.)*

---

## 📋 Pre-Completion Checklist
*(To be checked off before status is moved to Complete)*
- [ ] Root cause definitively identified (or explicitly stated why it can't be)
- [ ] All relevant files inspected and documented
- [ ] Impact scope clearly defined
- [ ] Recommended next steps are actionable
