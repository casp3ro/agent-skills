# Cursor Harness

Rules, workflows, subagents and hooks that make Cursor produce skills that meet this repository's quality bar. Nothing in `.cursor/` is published: the skills CLI only ships `skills/`.

## Contents

- [How it fits together](#how-it-fits-together)
- [Workflows](#workflows)
- [Rules](#rules)
- [Subagents](#subagents)
- [Hooks](#hooks)
- [Docs and templates](#docs-and-templates)
- [Maintaining the harness](#maintaining-the-harness)

## How it fits together

```text
/new-skill ──► skill-researcher ──► docs/research/<name>.md
     │
     ├──► evals/<name>/evals.json + triggers.json ──► skill-eval-runner (baseline)
     ├──► scripts/new-skill.mjs (scaffold from .cursor/templates)
     ├──► write content ◄── rules (skill-authoring, rule-files, scripts) + postToolUse hook (validate)
     ├──► skill-reviewer (quality-bar rubric) ──► fix loop
     ├──► /eval-skill: skill-eval-runner × (with_skill, baseline) ──► skill-grader ──► benchmark.md
     └──► register in README + skills.sh.json ──► stop hook: npm run check must pass
```

Three layers enforce quality:

1. **Guidance**: rules load when relevant files are in context; workflows encode the process.
2. **Guardrails**: hooks block bad edits and dangerous commands, and validate after every edit.
3. **Gates**: `npm run check` (stop hook and CI), the reviewer's rubric, and measured evals.

## Workflows

Type `/` in Agent chat. All are user-invoked only (`disable-model-invocation: true`).

| Command | Does |
|---|---|
| `/new-skill <name> "<purpose>"` | Full pipeline: intake → research → evals first + baseline → scaffold → write → validate → review → eval → register |
| `/new-rule <skill> <prefix> "<title>"` | One verified rule with correct examples, compiled when possible |
| `/research-skill <topic>` | Prior art on skills.sh/GitHub + primary sources → `docs/research/` |
| `/review-skill <name> [--fix]` | Independent rubric review, optionally applying fixes until SHIP |
| `/eval-skill <name>` | With-skill vs baseline runs in fresh contexts, graded with evidence, plus trigger accuracy |
| `/release-skill <name> <bump>` | Version bump, changelog, gates, proposed tag and release (asks before pushing) |

Best in **Plan mode** for `/new-skill` and `/release-skill`: review the plan, then let Agent execute.

## Rules

| Rule | Applies |
|---|---|
| `00-core.mdc` | Always: workflows, definition of done, guardrails |
| `skill-authoring.mdc` | `skills/**/SKILL.md`, references, assets, README |
| `rule-files.mdc` | `skills/*/rules/**`, `metadata.json` |
| `evals.mdc` | `evals/**` |
| `scripts.mdc` | `scripts/**`, `skills/*/scripts/**`, `.cursor/hooks/**` |
| `research-sources.mdc` | Agent-requested when researching sources |
| `harness.mdc` | `.cursor/**`, `AGENTS.md`, `CLAUDE.md` |

## Subagents

| Subagent | Mode | Role |
|---|---|---|
| `skill-researcher` | read-only | Prior art, primary sources, gaps, recommendation |
| `skill-reviewer` | read-only | Hard gates + 10-criterion rubric + blockers → SHIP / FIX FIRST / REJECT |
| `skill-eval-runner` | writes to `evals/*/runs/` only | Executes one eval prompt with or without the skill, fresh context |
| `skill-grader` | read-only | Grades expectations with evidence; judges trigger queries |

## Hooks

Configured in `.cursor/hooks.json`; scripts in `.cursor/hooks/` (Node.js 20+, no dependencies).

| Event | Script | Behavior |
|---|---|---|
| `sessionStart` | `session-context.mjs` | Adds skill list, quality-gate status and workflow names to context |
| `preToolUse` (Write, Delete) | `guard-edits.mjs` | Denies edits to generated files, non-skill files inside `skills/<name>/`, workflow skills in published dirs, and secrets |
| `beforeShellExecution` | `guard-shell.mjs` | Denies force-push, `--no-verify`, hard resets, recursive deletes of core dirs, `curl \| sh`, writes to generated files; asks before push, tags, releases |
| `postToolUse` (Write) | `validate-on-edit.mjs` | Rebuilds the edited rule-based skill and feeds validation errors back to the agent |
| `stop` | `check-on-stop.mjs` | Runs `build --check`, `validate`, and the harness self-test when relevant files changed; sends the agent back on failure (max 3 loops) |

Project hooks run only in trusted workspaces. Check **Settings → Hooks** in Cursor to see them loaded and their output.

## Docs and templates

- `docs/quality-bar.md`: hard gates, rubric, eval thresholds, blockers (single source of truth with `scripts/validate.mjs`)
- `docs/eval-protocol.md`: eval file formats, run procedure, grading, benchmark report
- `docs/authoring-guide.md`: how to write skills, with sources
- `templates/`: scaffolds for simple and rule-based skills and evals (`scripts/new-skill.mjs` uses them; TODO markers keep validation failing until filled)

## Maintaining the harness

- `npm run test:harness` runs 23 checks against every hook, the validator and the scaffolder using realistic payloads and fixture repositories. CI runs it through `npm run check`.
- Add a test case for every new guardrail.
- Hook scripts accept `--agent=claude` to speak Claude Code's hook protocol, so they can be registered in `.claude/settings.json` later without changes.
