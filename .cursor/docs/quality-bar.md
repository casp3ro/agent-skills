# Skill Quality Bar

The definition of "done" for any skill in this repository. Three layers, all required before a skill (or a change to one) ships:

1. **Hard gates**: automated, enforced by `npm run check`, the post-edit hook, the stop hook, and CI.
2. **Review rubric**: scored by the `skill-reviewer` subagent (`/review-skill`).
3. **Eval gate**: measured by `/eval-skill` with fresh-context subagents.

## Contents

- [1. Hard Gates (automated)](#1-hard-gates-automated)
- [2. Review Rubric](#2-review-rubric)
- [3. Eval Gate](#3-eval-gate)
- [4. Blockers](#4-blockers)
- [5. Sources](#5-sources)

## 1. Hard Gates (automated)

`node scripts/validate.mjs` fails on any of these. Do not work around a gate; fix the skill or change the gate in a separate, reviewed commit.

| Area | Gate |
|---|---|
| Spec | `name`: 1–64 chars, `a-z0-9` and single hyphens, equals the directory, no `anthropic`/`claude`, not generic (`helper`, `utils`, `tools`, ...) |
| Spec | `description`: 1–1024 chars, no angle brackets, third person (no I/me/my/you/your), contains a "Use when ..." clause |
| Size | `SKILL.md` ≤ 500 lines |
| Structure | Only `SKILL.md`, `README.md`, `AGENTS.md`, `metadata.json`, `LICENSE*`, `rules/`, `references/`, `scripts/`, `assets/` inside `skills/<name>/` |
| Links | Every relative link and every backticked `references/`, `rules/`, `scripts/`, `assets/` path resolves; forward slashes only |
| References | Files over 100 lines start with a table of contents (first 40 lines) |
| Scripts | Shebang on every script; `set -e` in shell scripts |
| Completeness | No `TODO`, `TBD`, `{{...}}` or lorem ipsum anywhere in the skill or its evals |
| Evals | `evals/<name>/evals.json`: ≥ 3 evals, each with integer `id`, realistic `prompt` (≥ 40 chars), `expected_output`, ≥ 2 `expectations` |
| Evals | `evals/<name>/triggers.json`: ≥ 10 queries with both `should_trigger: true` and near-miss `false` |
| Registry | A `### <name>` section in the root `README.md` |
| Rule skills | Rule format, sections, impact levels, incorrect + correct examples with language tags, generated files current, `metadata.json` version equals `SKILL.md` `metadata.version` |

Warnings (review them, they are usually right): time-sensitive wording, description under 120 chars, nested reference links, missing `license`, skill missing from `skills.sh.json`, missing `Reference:` line in a rule.

## 2. Review Rubric

Score each criterion 0 (fails), 1 (acceptable), 2 (excellent). **Ship only with no zeros and a total of at least 16/20.** Below that the skill tends to add tokens without changing the agent's behavior, which is worse than no skill.

| # | Criterion | 2 = excellent looks like |
|---|---|---|
| 1 | **Trigger precision** | Description front-loads the capability, names each distinct branch once, includes the terms users actually type, and would not fire on the near-miss queries in `triggers.json` |
| 2 | **Earns its tokens** | Every paragraph changes behavior versus the model's default; no explanations of things the model knows; no no-op sentences ("be thorough", "write clean code") |
| 3 | **Right degree of freedom** | Fragile operations are exact (scripts, fixed commands, "do not modify"); judgment calls are heuristics; one default per choice with one escape hatch |
| 4 | **Progressive disclosure** | `SKILL.md` holds what every branch needs; branch-specific detail lives in `references/` or `rules/`, linked one level deep with a "read when ..." pointer |
| 5 | **Concrete examples** | Input/output pairs or incorrect/correct code for the patterns that matter; examples are realistic, minimal and correct |
| 6 | **Workflow and completion criteria** | Multi-step tasks are ordered; every step ends on a checkable criterion; validation loops ("run validator, fix, repeat") for quality-critical steps |
| 7 | **Correctness and currency** | Facts verified against primary sources in `docs/research/<name>.md`; versions and APIs current; no relative-time phrasing; code compiles or runs |
| 8 | **Consistency** | One term per concept across all files; positive phrasing ("write X") over prohibitions, except hard guardrails paired with the positive target |
| 9 | **Scripts solve, not punt** | Deterministic work is scripted; scripts handle errors with actionable messages; no unexplained constants; dependencies stated |
| 10 | **Safety and scope** | Does exactly what the description promises; no secrets, no destructive defaults, no surprising side effects; licensed sources attributed |

## 3. Eval Gate

Run with `/eval-skill <name>` (protocol: `.cursor/docs/eval-protocol.md`).

| Measure | Threshold | Why this number |
|---|---|---|
| With-skill expectation pass rate | ≥ 0.80 | Below this, users hit failures on most non-trivial tasks |
| Lift over baseline (no skill, or previous version) | ≥ +0.20 | Smaller lifts are within run-to-run noise for 3–5 evals; the skill is not demonstrably helping |
| Regressions | 0 expectations that pass in baseline but fail with the skill | A skill must never make the agent worse at something it already did |
| Trigger recall (should_trigger: true judged as triggering) | ≥ 0.80 | Undertriggering is the most common skill failure |
| Trigger false-positive rate (should_trigger: false judged as triggering) | ≤ 0.20 | Overtriggering wastes context in unrelated tasks |

Record results in `evals/<name>/benchmark.md` (committed). Raw run outputs go to `evals/<name>/runs/` (git-ignored).

## 4. Blockers

Any one of these fails review regardless of score:

- Factual errors or code that does not compile or run
- Content copied from another repository without a compatible license and attribution
- Instructions that would leak secrets, run destructive commands by default, or act outside the stated scope
- A description that promises capabilities the body does not deliver
- Evals that a baseline answer passes trivially (non-discriminating expectations)

## 5. Sources

- [Agent Skills specification](https://agentskills.io/specification)
- [Anthropic: Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [anthropics/skills: skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator) (eval methodology, grader, trigger evals)
- [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) (rule-based skill structure and build)
- [mattpocock/skills: writing-for-agents](https://github.com/mattpocock/skills) (context pointers, no-ops, completion criteria)
