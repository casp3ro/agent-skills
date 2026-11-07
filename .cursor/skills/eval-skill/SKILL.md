---
name: eval-skill
description: Measures a skill with fresh-context subagents, running every task eval with the skill and against a baseline, grading expectations with evidence, judging trigger accuracy, and writing a benchmark report. Invoke with /eval-skill <name> [--baseline=none|previous].
disable-model-invocation: true
---

# /eval-skill

Input: the text after `/eval-skill`: a skill name and an optional baseline. Default baseline: `previous` (the version at `HEAD`) when the skill exists in git history with changes, otherwise `none`.

Protocol: `.cursor/docs/eval-protocol.md`. Thresholds: `.cursor/docs/quality-bar.md` section 3.

```text
/eval-skill <name>
- [ ] 1. Prepare     gate: run folder created; baseline snapshot ready; evals valid
- [ ] 2. Run         gate: every eval has with_skill and baseline outputs
- [ ] 3. Grade       gate: grading.json for every run
- [ ] 4. Triggers    gate: recall and false-positive rate computed
- [ ] 5. Analyze     gate: regressions, non-discriminating and flaky evals listed
- [ ] 6. Report      gate: evals/<name>/benchmark.md written; verdict against thresholds
```

1. **Prepare.** `node scripts/validate.mjs --skill=<name>` must pass for the evals files. Create `evals/<name>/runs/<YYYY-MM-DD>-<label>/`. For `--baseline=previous`, export the committed version: `git archive HEAD skills/<name> | tar -x -C evals/<name>/runs/<run>/baseline-skill --strip-components=2`.
2. **Run.** For each eval in `evals/<name>/evals.json`, launch two `skill-eval-runner` subagents **in parallel, in the same message**, each with a fresh context: `variant: with_skill` with `skill_path: skills/<name>/SKILL.md`, and the baseline (`variant: baseline` with no skill, or `old_skill` with the snapshot path). Pass the prompt, fixtures (`evals/<name>/<file>`), and `output_dir: evals/<name>/runs/<run>/eval-<id>-<eval-name>/<variant>/`. Never pass the expectations to runners.
3. **Grade.** For every run, launch a `skill-grader` subagent with that eval's expectations and the run directory. Save each JSON reply to `<output_dir>/grading.json`.
4. **Triggers.** Launch one `skill-grader` in trigger mode with every skill's name and description from `skills/*/SKILL.md` and all queries from `evals/<name>/triggers.json`. Save to `evals/<name>/runs/<run>/triggers.json`.
5. **Analyze.** Compute pass rates per variant and the lift. List regressions (pass in baseline, fail with skill), non-discriminating expectations (pass in both), and grader `eval_feedback`.
6. **Report.** Write `evals/<name>/benchmark.md` in the format from the eval protocol. State PASS or FAIL against each threshold. For each failure, name the probable cause in the skill (file and section) and the fix to try. Do not edit the skill in this workflow unless the user asks.

`evals/*/runs/` is git-ignored; only `benchmark.md` is committed.
