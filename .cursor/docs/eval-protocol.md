# Eval Protocol

How skills in this repository are evaluated. Adapted from Anthropic's evaluation-driven development guidance and the `skill-creator` methodology: write evals before the skill, measure a baseline, and compare with fresh-context runs.

## Contents

- [Files](#files)
- [evals.json](#evalsjson)
- [triggers.json](#triggersjson)
- [Run Procedure](#run-procedure)
- [Grading](#grading)
- [Benchmark Report](#benchmark-report)
- [Writing Good Evals](#writing-good-evals)

## Files

```text
evals/<skill>/
├── evals.json          # task evals (committed, written before the skill)
├── triggers.json       # trigger evals (committed)
├── test-cases.json     # generated from rule examples (rule-based skills only)
├── benchmark.md        # latest results table (committed)
└── runs/<date>-<label>/ # raw outputs, transcripts, grading.json (git-ignored)
```

## evals.json

```json
{
  "skill_name": "example-skill",
  "evals": [
    {
      "id": 1,
      "name": "short-kebab-name",
      "prompt": "A realistic multi-step request, phrased the way a user types it",
      "expected_output": "What a great answer contains",
      "files": ["fixtures/input.csv"],
      "expectations": [
        "An objectively checkable statement about the output",
        "A statement a baseline answer would likely fail"
      ]
    }
  ]
}
```

`files` are relative to `evals/<skill>/`. Minimum: 3 evals, 2 expectations each (the validator enforces it). Aim for 5 covering the skill's main branches, one edge case, and one request with a wrong premise the skill should correct.

## triggers.json

```json
[
  { "query": "realistic request that should load the skill", "should_trigger": true },
  { "query": "near miss that shares keywords but needs something else", "should_trigger": false }
]
```

At least 10 queries; aim for 8–10 of each kind. Should-trigger queries vary phrasing (formal, casual, error messages, skill not named). Should-not-trigger queries are **near misses**: adjacent technologies, homonyms, same keywords with a different task. "Write a fibonacci function" is a useless negative for a Swift skill; "Write a Kotlin data class" is a good one.

Queries must be substantive. Agents skip skills for trivial one-step requests regardless of the description, so trivial queries measure nothing.

## Run Procedure

Executed by `/eval-skill <name>`. Every run happens in a **fresh-context subagent** (`skill-eval-runner`) so the author's context cannot leak into the result.

1. **Snapshot the baseline.** New skill: the baseline is no skill. Changed skill: copy the previous version (`git show HEAD:skills/<name>/...` into `evals/<name>/runs/<run>/baseline-skill/`).
2. **Launch all runs in parallel**, one pair per eval: `with_skill` (runner told to read `skills/<name>/SKILL.md` first and follow it) and `baseline`. Same prompt, same fixtures. Outputs go to `evals/<name>/runs/<run>/eval-<id>-<name>/{with_skill,baseline}/`.
3. **Grade** each run with the `skill-grader` subagent against that eval's `expectations`. Programmatically checkable expectations (file exists, code compiles, JSON valid) are checked with commands, not by reading.
4. **Trigger check.** Give the `skill-grader` the list of all skill names and descriptions in `skills/` plus each query from `triggers.json`; it answers whether this skill would be the one consulted. Compute recall and false-positive rate.
5. **Analyze.** Flag non-discriminating expectations (pass in both runs), regressions (pass in baseline, fail with skill), and flaky evals.
6. **Report** in `evals/<name>/benchmark.md` and compare against the thresholds in `.cursor/docs/quality-bar.md`.

## Grading

`grading.json` per run:

```json
{
  "eval_id": 1,
  "variant": "with_skill",
  "expectations": [
    { "text": "Expectation text", "passed": true, "evidence": "Quote or file reference proving it" }
  ],
  "pass_rate": 1.0,
  "eval_feedback": "Expectations that were trivially satisfied or important outcomes no expectation checks"
}
```

A pass needs evidence of genuine completion, not surface compliance (a file with the right name but wrong content fails).

## Benchmark Report

```markdown
# <skill> benchmark

Run: <YYYY-MM-DD> · model: <model> · skill version: <x.y.z> · baseline: <none | previous version>

| Eval | With skill | Baseline | Delta |
|---|---|---|---|
| 1 fix-swift6-sendable-errors | 4/4 | 1/4 | +0.75 |

Overall pass rate: 0.92 with skill vs 0.48 baseline (lift +0.44). Regressions: 0.
Triggers: recall 0.9 (9/10), false positives 0.1 (1/8).

Findings: non-discriminating expectations, flaky evals, follow-ups.
```

## Writing Good Evals

- Derive evals from real failures: run the task without the skill first and write down what went wrong. Those gaps are what the skill must fix.
- Expectations describe outcomes ("converts the class to an actor"), not wording ("mentions actors").
- Include at least one expectation the baseline will likely fail; otherwise the eval cannot show lift.
- When an eval passes in both variants on every run, strengthen it or replace it.
- Do not tune the skill to the exact eval prompts. Keep a held-out eval or two that you do not look at while editing.
