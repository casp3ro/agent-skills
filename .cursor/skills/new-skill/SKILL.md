---
name: new-skill
description: Creates a new published skill end to end with research, evals first, scaffold, minimal content, validation, independent review and measured evals. Invoke with /new-skill <name> "<purpose>".
disable-model-invocation: true
---

# /new-skill

Input: the text after `/new-skill`: a kebab-case name and a one-line purpose. If either is missing or ambiguous, ask up to three questions (purpose, audience, the situations it must handle) and stop until answered.

Copy this checklist into your reply and keep it updated. Do not start a phase until the previous phase's gate is met.

```text
/new-skill <name>
- [ ] 1. Intake        gate: scope note agreed with the user
- [ ] 2. Research      gate: docs/research/<name>.md saved; recommendation is "build"
- [ ] 3. Evals first   gate: evals.json + triggers.json written; baseline failures recorded
- [ ] 4. Scaffold      gate: scripts/new-skill.mjs succeeded
- [ ] 5. Write         gate: every TODO replaced; content addresses each recorded baseline failure
- [ ] 6. Validate      gate: npm run build && npm run validate exit 0
- [ ] 7. Review        gate: skill-reviewer verdict SHIP
- [ ] 8. Eval          gate: eval thresholds in quality-bar.md section 3 met
- [ ] 9. Register      gate: README + skills.sh.json updated; npm run check exits 0; summary delivered
```

## 1. Intake

Write a scope note (5–8 lines): name, purpose, audience, the distinct situations (branches) it must handle, what is out of scope, simple vs rule-based (see `.cursor/docs/authoring-guide.md`, "Choosing the Skill Type"). Check `skills/` for overlap with existing skills; if a skill already covers most of it, propose extending that skill instead. Confirm the note with the user.

## 2. Research

Delegate to the `skill-researcher` subagent with the scope note. Save its brief verbatim to `docs/research/<name>.md`. If the recommendation is "extend" or "skip", stop and report to the user.

## 3. Evals first

Following `.cursor/docs/eval-protocol.md`:

1. Write `evals/<name>/evals.json`: 3–5 realistic prompts covering the branches, one edge case, one wrong premise. Use the template in `.cursor/templates/evals/`.
2. Write `evals/<name>/triggers.json`: 8–10 should-trigger queries with varied phrasing and 8–10 near-miss negatives.
3. Baseline: for each eval, launch a `skill-eval-runner` subagent (fresh context, `variant: baseline`, `output_dir: evals/<name>/runs/<date>-baseline/eval-<id>-<eval-name>/baseline/`), all in parallel. Read the answers and list concrete failures and missing knowledge. These gaps are the skill's requirements; add them to the research brief under "Baseline failures".

## 4. Scaffold

```bash
node scripts/new-skill.mjs <name> --type=<simple|rules> --title="<Title>" --description="<draft description>"
```

This copies the templates and adds a README entry. It keeps the eval files from step 3 and only adds eval templates when none exist.

## 5. Write

- Description: third person, capability first, "Use when ..." with each branch once (rules in `.cursor/rules/skill-authoring.mdc`).
- Body: the minimum that fixes each baseline failure. Concrete examples for every pattern; defaults with one escape hatch; workflows with checkable completion criteria.
- Branch-specific depth goes to `references/` (rule-based: one rule per idea in `rules/`).
- Deterministic operations become scripts in `scripts/` (see `.cursor/rules/scripts.mdc`).
- Every version-specific claim must trace to the research brief.

## 6. Validate

Run `npm run build && npm run validate`. Fix every error; review every warning. Repeat until both exit 0. The post-edit hook already reports per-file errors; this step confirms the whole repository.

## 7. Review

Delegate to the `skill-reviewer` subagent with the skill name. Apply every fix it lists, then run it again. Repeat until the verdict is SHIP. If two rounds still return FIX FIRST on the same criterion, stop and ask the user.

## 8. Eval

Run the `/eval-skill` procedure for `<name>` (read `.cursor/skills/eval-skill/SKILL.md` and follow it). If thresholds are not met, return to step 5 with the grader's findings, then repeat steps 6–8. Save `evals/<name>/benchmark.md`.

## 9. Register

1. Replace the README entry with the final description and a "Use when" list, matching the format of existing entries.
2. Add the skill to a grouping in `skills.sh.json`.
3. Run `npm run check`.
4. Reply with: what the skill does, file list, review score, benchmark summary (with-skill vs baseline, triggers), open risks, and a proposed commit message `feat(<name>): add <name> skill`. Do not commit or push unless the user asks.
