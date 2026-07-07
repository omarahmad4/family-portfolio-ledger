# Create Pull Request Against Dev (with Generated Title and Description)

**Usage**: When asked to create a pull request against the `dev` branch with a title and description based on AGENTS.md: follow this prompt. You can create the PR with the final title and description in one step—no need to create the PR first and then update it.

---

## When to Use

- User asks to "create a pull request against dev" and wants the title/description to follow project standards.
- User asks to "generate PR description and open PR" for the current branch targeting `dev`.

---

## Prerequisites

- Current branch has the desired commits (e.g. after merging from `dev`).
- Branch is pushed to `origin` (so `gh pr create` can open the PR from the remote branch). If ahead of `origin/<branch>`, run `git push origin <branch>` first.

---

## Steps (One-Go Workflow)

### 1. Generate the description (before creating the PR)

Follow AGENTS.md instructions for generating a PR description, but **without** a PR number:

1. **Target and source**: Target branch = `dev`, source branch = current branch (e.g. `alex`).
2. **Inspect changes**:
   - `git log dev..HEAD --oneline` — commits on current branch not in `dev`.
   - `git diff dev...HEAD --stat` — files changed (optionally `git diff dev...HEAD` for full diff).
3. **Review**: Do a concise review of the main themes (features, fixes, refactors, tests, docs).
4. **Template**: Use the PR template from `.github/pull_request_template.md`. Fill:
   - **Title**: `[Feature|Fix|Chore|Refactor] Short, descriptive title`.
   - **Overview**: 1–3 sentences (what and why).
   - **Related issues**: Include `Closes #N` for every GitHub issue included in the work that this PR resolves. If no issues are resolved, use `N/A`. Do not use plain links alone when the PR is intended to close the issue.
   - **Detailed changes**: By category (DB, backend, frontend, tests).
   - **Testing instructions**: Clear steps for reviewers.
   - **Breaking changes**: Yes/No.
   - **Migration notes**: Commands or config if needed.
   - **Checklist**: Leave checkboxes for author to complete.
5. **Save to docs/pr**: Write the filled description to `docs/pr/pr-<branch>-description.md` (e.g. `pr-alex-description.md`). Do **not** guess the PR number—it is only assigned by GitHub when the PR is created.

### 1b. Verify issue–PR linkage

Before creating the PR, verify that `Closes #N` is present for all GitHub issues being resolved:
1. List open issues: `gh issue list --repo nSightSurgical/nsight-platform --state open --json number,title`
2. Check commit messages: `git log dev..HEAD --oneline`
3. Cross-check: Every issue that this PR resolves MUST have a `Closes #N` in at least one commit message body **or** in the PR description body.
4. The PR description body is the preferred place for `Closes #N` directives, and the **Related Issues** section should include them for every included GitHub issue the PR resolves. Commits may also include them for traceability, but the PR body should not omit them.
5. **Note**: `Closes #N` only auto-closes issues when merged to the default branch (`main`). PRs merged to `dev` will not auto-close issues until `dev` is later merged to `main`.

### 2. Create the PR with that title and body

- **Create in one step**:
  ```bash
  gh pr create --base dev --title "<title from template>" --body-file docs/pr/pr-<branch>-description.md
  ```
- **Title**: Use the same title as in the doc (e.g. `Feature: Audio processing, top drivers cache, and efficiency improvements`).
- **Body**: The file content is used as the PR description; no need to create the PR first and then edit.
- **Note the PR number** from the command output (e.g. `https://github.com/.../pull/85` → number is 85).

### 3. Rename the description file to match the PR number

- Rename `docs/pr/pr-<branch>-description.md` to `docs/pr/pr-<number>-description.md` (e.g. `pr-alex-description.md` → `pr-85-description.md`) so the filename matches the actual PR. This keeps the repo consistent and makes it easy to find the description for a given PR.

### 4. Optional: Commit the description file

- The description file (e.g. `docs/pr/pr-85-description.md`) may be uncommitted. Commit and push it if you want it in the repo; the PR’s description on GitHub is already set from the file.

---

## Summary

| Question | Answer |
|----------|--------|
| Do you need to create the PR first and then update it? | **No.** Generate the description, save to `docs/pr/pr-<branch>-description.md`, run `gh pr create`, then rename the file to `pr-<number>-description.md` to match the PR number. |
| Why branch name first, then rename? | The PR number is only known after GitHub creates the PR. Using a branch-based filename avoids guessing; renaming afterward keeps filenames aligned with PR numbers. |
| Where does the workflow come from? | AGENTS.md: *When asked to generate a PR description: (1) Run gh pr view \<number\>…* — for **creating** a new PR, skip the number and use `dev` and current branch for diff/log instead. |
| What if the branch has diverged from dev? | Merge or rebase `dev` first if desired, then run this workflow so the description reflects the actual diff (e.g. `git diff dev...HEAD`). |

---

## Example Commands (reference)

```bash
# 1. Ensure branch is pushed
git push origin alex

# 2. See what will go into the PR
git log dev..HEAD --oneline
git diff dev...HEAD --stat

# 3. After writing docs/pr/pr-alex-description.md:
gh pr create --base dev --title "Feature: Your title here" --body-file docs/pr/pr-alex-description.md
# Output includes PR URL, e.g. https://github.com/.../pull/85 → number is 85

# 4. Rename file to match PR number
mv docs/pr/pr-alex-description.md docs/pr/pr-85-description.md
```
