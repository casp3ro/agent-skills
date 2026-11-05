# AGENTS.md

Guidance for AI coding agents (Cursor, Claude Code, Codex, Copilot, and others) working in this repository.

## Repository Overview

A collection of Agent Skills published as `casp3ro/agent-skills` and installable with `npx skills add casp3ro/agent-skills`. Each skill is a directory under `skills/` with a `SKILL.md`. Rule-based skills (like `swift`) also have `rules/`, `metadata.json`, and a generated `AGENTS.md`.

## Commands

| Command | What it does |
|---|---|
| `npm run build` | Regenerates `skills/*/AGENTS.md`, the quick-reference block in `skills/*/SKILL.md`, and `evals/*/test-cases.json` |
| `npm run validate` | Validates every `SKILL.md` against the Agent Skills spec and every rule file against the rule format |
| `npm run check` | Fails if generated files are stale or validation fails (run before committing; CI runs it) |
| `cd validation/SwiftSkillValidation && swift build && swift test` | Compiles and tests the Swift examples (macOS, Xcode 26+) |

There are no npm dependencies; scripts use the Node.js 20+ standard library only.

## Never Edit by Hand

- `skills/*/AGENTS.md`
- The block between `<!-- quick-reference:start ... -->` and `<!-- quick-reference:end -->` in `skills/*/SKILL.md`
- `evals/*/test-cases.json`

Edit `rules/*.md`, `rules/_sections.md`, or `metadata.json`, then run `npm run build`.

## Adding a Rule to a Rule-Based Skill

1. Copy `skills/<skill>/rules/_template.md` to `skills/<skill>/rules/<prefix>-<description>.md` (kebab-case).
2. The prefix must match a section ID in `rules/_sections.md`.
3. Frontmatter: `title`, `impact` (`CRITICAL`, `HIGH`, `MEDIUM-HIGH`, `MEDIUM`, `LOW-MEDIUM`, `LOW`), `impactDescription`, `tags`.
4. Body: `## <title>` (must equal the frontmatter title), the `**Impact: LEVEL (description)**` line, the explanation, at least one `**Incorrect (...):**` and one `**Correct (...):**` example, each followed by a fenced code block with a language tag, then `Reference: [..](..)`.
5. Run `npm run build && npm run validate`.
6. For the `swift` skill: if the correct example is self-contained, add it to `validation/SwiftSkillValidation` and run `swift test` so CI compiles it.

## Swift Code Standards (for rule examples)

- Target the Swift 6 language mode with Approachable Concurrency (Swift 6.2+). Do not use APIs newer than the current Xcode release without saying so.
- Correct examples must compile as written, given the types defined elsewhere in the same rule or obviously named placeholders.
- No force unwraps, `try!`, or `as!` in correct examples except on literals, and in test helpers with a comment.
- Prefer platform APIs (Foundation, SwiftUI, SwiftData, Swift Testing) over third-party packages.
- Avoid type names that collide with Apple frameworks (`Scanner`, `Transaction`, `Alert`, `Shape` when SwiftUI is imported).

## Creating a New Skill

### Directory structure

```text
skills/
  {skill-name}/           # kebab-case; must equal the `name` in SKILL.md
    SKILL.md              # required
    references/           # optional: docs loaded on demand
    scripts/              # optional: executable helpers
    assets/               # optional: templates, data
    rules/                # optional: rule-based skills (also add metadata.json and README.md)
```

### SKILL.md format

```markdown
---
name: {skill-name}
description: {What the skill does and when to use it, with trigger phrases. Max 1024 characters.}
license: MIT
metadata:
  author: casp3ro
  version: "1.0.0"
---

# {Skill Title}

{Instructions, priorities, and links to supporting files.}
```

Spec constraints (enforced by `npm run validate`): `name` is 1–64 characters of `a-z`, `0-9`, and single hyphens, not starting or ending with a hyphen, and equal to the directory name; `description` is 1–1024 characters.

### Context efficiency

Agents load only `name` and `description` at startup and read `SKILL.md` when the skill activates.

- Keep `SKILL.md` under 500 lines; move detail into `rules/` or `references/`.
- Write a specific description with the situations and keywords that should trigger the skill.
- Link supporting files directly from `SKILL.md` (one level deep).
- Prefer scripts over inline code when a task is mechanical: only their output consumes context.

### Script requirements

- Bash: `#!/bin/bash` and `set -e`. Node: `#!/usr/bin/env node`, `.mjs`.
- Status messages to stderr, machine-readable output (JSON) to stdout.
- Clean up temporary files with a trap.

## End-User Installation (document in each skill's README section)

```bash
npx skills add casp3ro/agent-skills --skill {skill-name}
```

Manual: copy `skills/{skill-name}` to `~/.claude/skills/` (Claude Code), `.agents/skills/` or `~/.cursor/skills/` (Cursor), or zip it for upload on claude.ai.

## Commits

Conventional style: `feat(swift): add networking-openapi-generator rule`, `fix(swift): correct actor reentrancy example`, `chore: regenerate AGENTS.md`. Always commit regenerated files together with the rule changes that produced them.
